<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ReporteController extends Controller
{
    public function cuadroMaestro()
    {
        try {
            $mesActual = Carbon::now()->month;
            $anioActual = Carbon::now()->year;

            // 1. Usamos la tabla 'pagos' que es la que realmente existe en PostgreSQL
            // 2. Usamos COALESCE en lugar de IFNULL
            $reporte = DB::table('socios as s')
                ->leftJoin('vehiculos as v', 's.id', '=', 'v.socio_id')
                ->leftJoin(DB::raw("(SELECT vehiculo_id, MAX(fecha_revision) as ultima_fecha FROM revisiones WHERE estado = 'Aprobada' GROUP BY vehiculo_id) as r"), 'v.id', '=', 'r.vehiculo_id')
                ->leftJoin(DB::raw("(SELECT socio_id, COUNT(*) as pagos_mes FROM pagos WHERE mes_pagado = {$mesActual} AND anio_pagado = {$anioActual} GROUP BY socio_id) as a"), 's.id', '=', 'a.socio_id')
                ->select(
                    'v.numero_vehiculo',
                    'v.placa',
                    's.nombre as accionista',
                    'v.anio_fabricacion as anio_model',
                    'r.ultima_fecha as fecha_ult_revision',
                    's.observaciones',
                    // Corrección específica para motor PostgreSQL
                    DB::raw("CASE WHEN COALESCE(a.pagos_mes, 0) > 0 THEN 'Al día' ELSE 'En mora' END as estado_aportacion")
                )
                ->orderBy('v.numero_vehiculo', 'asc')
                ->get();

            return response()->json($reporte, 200);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'El servidor se detuvo. Mira el error exacto:',
                'error_real_de_sql' => $e->getMessage()
            ], 500);
        }
    }
}