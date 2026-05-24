<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Socio;
use App\Models\Vehiculo;
use App\Models\Mantenimiento;
use App\Models\Revision;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function stats()
    {
        // 1. KPIs Generales
        $totalSocios = Socio::count();
        $totalVehiculos = Vehiculo::count();
        
        // 2. Control de Taller (Mes actual)
        $mesActual = Carbon::now()->month;
        $mantenimientosPendientes = Mantenimiento::whereIn('estado', ['Programado', 'En Proceso'])->count();
        $gastosMes = Mantenimiento::whereMonth('fecha_mantenimiento', $mesActual)->sum('costo');

        // 3. Control Legal (Flota al día)
        // Contamos cuántos vehículos únicos tienen al menos una revisión aprobada
        $vehiculosAlDia = Revision::where('estado', 'Aprobada')
                                  ->distinct('vehiculo_id')
                                  ->count('vehiculo_id');

        // 4. Actividad Reciente (Últimos 5 ingresos al taller)
        $actividadReciente = Mantenimiento::with('vehiculo.socio')
                                          ->orderBy('created_at', 'desc')
                                          ->take(5)
                                          ->get();

        return response()->json([
            'kpis' => [
                'socios_activos' => $totalSocios,
                'flota_total' => $totalVehiculos,
                'vehiculos_al_dia' => $vehiculosAlDia,
                'taller_pendientes' => $mantenimientosPendientes,
                'gastos_mes' => $gastosMes
            ],
            'actividad_reciente' => $actividadReciente
        ], 200);
    }
}