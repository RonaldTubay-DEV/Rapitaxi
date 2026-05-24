<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Aportacion;
use Illuminate\Http\Request;

class AportacionController extends Controller
{
    // 1. Obtener todos los Aportacions (incluyendo la información del socio)
    public function index()
    {
        // Usamos with('socio') para que la API nos devuelva el nombre y placa de quien pagó
        $Aportacions = Aportacion::with('socio')->orderBy('id', 'desc')->get();
        return response()->json($Aportacions, 200);
    }

    // 2. Registrar un nuevo Aportacion
    public function store(Request $request)
    {
        $request->validate([
            'socio_id' => 'required|exists:socios,id',
            'mes_pagado' => 'required|integer|min:1|max:12',
            'anio_pagado' => 'required|integer|min:2000|max:2100',
            'monto' => 'required|numeric|min:0',
            'fecha_pago' => 'required|date',
            'metodo_pago' => 'nullable|string|max:50',
        ]);

        // Verificamos si ya existe un Aportacion de este socio para ese mes y año (para no cobrar doble)
        $AportacionExistente = Aportacion::where('socio_id', $request->socio_id)
            ->where('mes_pagado', $request->mes_pagado)
            ->where('anio_pagado', $request->anio_pagado)
            ->first();

        if ($AportacionExistente) {
            return response()->json([
                'message' => 'Este socio ya tiene un Aportacion registrado para este mes y año.'
            ], 422); // 422 significa "Entidad no procesable" (Error de validación de negocio)
        }

        $aportacion = Aportacion::create($request->all());

        // Cargamos los datos del socio recién asociado para devolverlos a React
        $aportacion->load('socio');

        return response()->json([
            'message' => 'Aportacion registrado exitosamente.',
            'aportacion' => $aportacion
        ], 201);
    }

    // 3. Eliminar un Aportacion (en caso de error del administrador)
    public function destroy($id)
    {
        $Aportacion = Aportacion::find($id);

        if (!$Aportacion) {
            return response()->json(['message' => 'Aportacion no encontrado.'], 404);
        }

        $Aportacion->delete();

        return response()->json(['message' => 'Aportacion eliminado exitosamente.'], 200);
    }
}