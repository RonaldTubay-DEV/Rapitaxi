<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use App\Models\Aportacion; // <--- 1. Importamos el modelo oficial de aportaciones
use Carbon\Carbon;

class ReporteController extends Controller
{
    public function cuadroMaestro()
    {
        try {
            $mesActual = Carbon::now()->month;
            $anioActual = Carbon::now()->year;
            
            // 2. En lugar de adivinar con Schema, obtenemos el nombre real que el Modelo espera
            $tablaAportaciones = (new Aportacion)->getTable();

            $reporte = DB::table('socios as s')
                ->leftJoin('vehiculos as v', 's.id', '=', 'v.socio_id')
                ->leftJoin(DB::raw("(SELECT vehiculo_id, MAX(fecha_revision) as ultima_fecha FROM revisiones WHERE estado = 'Aprobada' GROUP BY vehiculo_id) as r"), 'v.id', '=', 'r.vehiculo_id')
                ->leftJoin(DB::raw("(SELECT socio_id, COUNT(*) as pagos_mes FROM {$tablaAportaciones} WHERE mes_pagado = {$mesActual} AND anio_pagado = {$anioActual} GROUP BY socio_id) as a"), 's.id', '=', 'a.socio_id')
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
                'message' => 'No se pudo generar el cuadro maestro. Revisa que las tablas y migraciones esten actualizadas.',
                'error_real_de_sql' => $e->getMessage()
            ], 500);
        }
    }
}