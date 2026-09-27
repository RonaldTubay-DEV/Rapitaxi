<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Mantenimiento;
use App\Models\Revision;
use App\Models\Socio;
use App\Models\Vehiculo;
use Carbon\Carbon;

class DashboardController extends Controller
{
    // Cada revision aprobada guarda hasta cuando vale, que es lo que dice el
    // certificado. Esta ventana es solo el respaldo para las revisiones que se
    // cargaron antes de que existiera esa columna: de esas lo unico que se puede
    // deducir es que una RTV dura alrededor de un año.
    private const MESES_VIGENCIA_SIN_FECHA = 12;

    // Una unidad que lleva mas de medio año sin ningun mantenimiento
    // registrado es la que hay que ir a revisar: el socio paga sus propios
    // trabajos, pero la compañia necesita saber que la unidad sigue operativa.
    private const MESES_SIN_MANTENIMIENTO = 6;

    public function stats()
    {
        $hoy = Carbon::now();

        $sociosActivos = Socio::where('estado', 'Activo')->count();
        $flotaTotal = Vehiculo::count();

        // Trabajo pendiente en un vehiculo dado de baja ya no importa.
        $mantenimientosPendientes = Mantenimiento::whereIn('estado', ['Programado', 'En Proceso'])
            ->whereHas('vehiculo')
            ->count();

        // Unidades que no tienen ningun mantenimiento completado dentro de la
        // ventana: incluye tambien a las que nunca registraron ninguno.
        $unidadesSinMantenimiento = Vehiculo::whereDoesntHave('mantenimientos', function ($query) use ($hoy) {
            $query->where('estado', 'Completado')
                ->where('fecha_mantenimiento', '>=', $hoy->copy()->subMonths(self::MESES_SIN_MANTENIMIENTO)->toDateString());
        })->count();

        // Una unidad esta al dia si alguna de sus revisiones aprobadas sigue
        // vigente. Se mira la fecha de vencimiento real; solo si falta se cae a la
        // ventana de doce meses. Antes se usaba siempre la ventana, asi que una
        // unidad con la RTV vencida hace poco contaba como al dia y una con el
        // certificado todavia vigente pero revisado hace mas de un año no contaba.
        $vehiculosAlDia = Revision::where('estado', 'Aprobada')
            ->whereHas('vehiculo')
            ->where(function ($query) use ($hoy) {
                $query->where('fecha_vencimiento', '>=', $hoy->toDateString())
                    ->orWhere(function ($sinFecha) use ($hoy) {
                        $sinFecha->whereNull('fecha_vencimiento')
                            ->where('fecha_revision', '>=', $hoy->copy()->subMonths(self::MESES_VIGENCIA_SIN_FECHA)->toDateString());
                    });
            })
            ->distinct()
            ->count('vehiculo_id');

        // Solo los datos que la pantalla muestra: sin ruta del respaldo,
        // ni cedula, telefono u observaciones del socio.
        $actividadReciente = Mantenimiento::with('vehiculo.socio')
            ->whereHas('vehiculo')
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get()
            ->map(fn (Mantenimiento $m) => [
                'id' => $m->id,
                'tipo_mantenimiento' => $m->tipo_mantenimiento,
                'estado' => $m->estado,
                'fecha_mantenimiento' => $m->fecha_mantenimiento,
                'vehiculo' => [
                    'numero_vehiculo' => $m->vehiculo->numero_vehiculo,
                    'socio' => ['nombre' => $m->vehiculo->socio?->nombre],
                ],
            ]);

        return response()->json([
            'kpis' => [
                'socios_activos' => $sociosActivos,
                'flota_total' => $flotaTotal,
                'vehiculos_al_dia' => $vehiculosAlDia,
                'taller_pendientes' => $mantenimientosPendientes,
                'unidades_sin_mantenimiento' => $unidadesSinMantenimiento,
                'meses_sin_mantenimiento' => self::MESES_SIN_MANTENIMIENTO,
            ],
            'actividad_reciente' => $actividadReciente,
        ], 200);
    }
}
