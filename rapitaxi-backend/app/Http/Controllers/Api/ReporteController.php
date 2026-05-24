<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

class ReporteController extends Controller
{
    public function cuadroMaestro()
    {
        // Esta consulta hace un "JOIN" triple para armar la matriz idéntica a tu requerimiento
        $reporte = DB::table('socios as s')
            ->leftJoin('vehiculos as v', 's.id', '=', 'v.socio_id')
            ->leftJoin(DB::raw('(SELECT vehiculo_id, MAX(fecha_revision) as ultima_fecha FROM revisiones WHERE estado = \'Aprobada\' GROUP BY vehiculo_id) as r'), 'v.id', '=', 'r.vehiculo_id')
            ->select(
                's.numero_vehiculo',
                's.placa',
                's.nombre as accionista',
                'v.anio_fabricacion as anio_model',
                'r.ultima_fecha as fecha_ult_revision',
                's.observaciones'
            )
            ->orderBy('s.numero_vehiculo', 'asc')
            ->get();

        return response()->json($reporte, 200);
    }
}