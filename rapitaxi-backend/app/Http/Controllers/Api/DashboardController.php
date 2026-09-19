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
    // Una revision tecnica vehicular (RTV) vale un año: pasado ese tiempo la
    // unidad deja de contar como "al dia" aunque alguna vez la haya aprobado.
    private const MESES_VIGENCIA_REVISION = 12;

    public function stats()
    {
        $hoy = Carbon::now();

        $sociosActivos = Socio::where('estado', 'Activo')->count();
        $flotaTotal = Vehiculo::count();

        // Trabajo pendiente en un vehiculo dado de baja ya no importa.
        $mantenimientosPendientes = Mantenimiento::whereIn('estado', ['Programado', 'En Proceso'])
            ->whereHas('vehiculo')
            ->count();

        // El gasto es dinero realmente pagado: cuenta aunque el vehiculo se
        // haya dado de baja despues. Mes Y año, para no sumar el mismo mes de
        // años anteriores.
        $gastosMes = Mantenimiento::where('estado', 'Completado')
            ->whereYear('fecha_mantenimiento', $hoy->year)
            ->whereMonth('fecha_mantenimiento', $hoy->month)
            ->sum('costo');

        $vehiculosAlDia = Revision::where('estado', 'Aprobada')
            ->where('fecha_revision', '>=', $hoy->copy()->subMonths(self::MESES_VIGENCIA_REVISION)->toDateString())
            ->whereHas('vehiculo')
            ->distinct()
            ->count('vehiculo_id');

        // Solo los datos que la pantalla muestra: sin ruta del comprobante,
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
                'costo' => $m->costo,
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
                'gastos_mes' => $gastosMes,
            ],
            'actividad_reciente' => $actividadReciente,
        ], 200);
    }
}
