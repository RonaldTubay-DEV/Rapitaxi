<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notificacion;
use App\Models\Vehiculo;
use Illuminate\Http\Request;

class VehiculoController extends Controller
{
    // 1. Listar todos los vehículos con los datos de su dueño
    public function index()
    {
        $vehiculos = Vehiculo::with('socio')->orderBy('id', 'desc')->get();
        return response()->json($vehiculos, 200);
    }

    // 2. Registrar las especificaciones de un vehículo
    public function store(Request $request)
    {
        $request->merge([
            'placa' => strtoupper($request->placa ?? ''),
        ]);
        // Dentro de tus métodos store y update:
        $request->validate([
            'socio_id'         => 'required|exists:socios,id',
            'numero_vehiculo'  => ['required', 'regex:/^[0-9]{3}-[0-9]{2}$/'],
            'placa'            => ['required', 'regex:/^[A-Z]{3}-[0-9]{4}$/', 'unique:vehiculos,placa'],
            'marca'            => 'required|string|max:50',
            'modelo'           => 'required|string|max:50',
            'anio_fabricacion' => 'required|integer|min:1980|max:' . (date('Y') + 1),
        ]);

        $datos = $request->all();
        $datos['placa'] = strtoupper($datos['placa']);
        $datos['color'] = 'Amarillo';

        $vehiculo = Vehiculo::create($datos);
        $vehiculo->load('socio');

        Notificacion::create([
            'tipo' => 'info',
            'titulo' => 'Vehiculo registrado',
            'mensaje' => "Se registró el vehículo unidad {$vehiculo->numero_vehiculo} con placa {$vehiculo->placa}.",
            'leida' => false
        ]);

        return response()->json([
            'message' => 'Vehículo registrado con éxito.',
            'vehiculo' => $vehiculo
        ], 201);
    }

    // 3. Mostrar un vehículo específico
    public function show($id)
    {
        $vehiculo = Vehiculo::with('socio')->find($id);

        if (!$vehiculo) {
            return response()->json(['message' => 'Vehículo no encontrado.'], 404);
        }

        return response()->json($vehiculo, 200);
    }

    // 4. Actualizar datos técnicos del auto
    public function update(Request $request, $id)
    {
        $request->merge([
            'placa' => strtoupper($request->placa ?? ''),
        ]);
        $vehiculo = Vehiculo::find($id);

        if (!$vehiculo) {
            return response()->json(['message' => 'Vehículo no encontrado.'], 404);
        }

        // Dentro de tus métodos store y update:
        $request->validate([
            'socio_id'         => 'required|exists:socios,id',
            'numero_vehiculo'  => ['required', 'regex:/^[0-9]{3}-[0-9]{2}$/'],
            'placa'            => ['required', 'regex:/^[A-Z]{3}-[0-9]{4}$/', 'unique:vehiculos,placa,' . $id],
            'marca'            => 'required|string|max:50',
            'modelo'           => 'required|string|max:50',
            'anio_fabricacion' => 'required|integer|min:1980|max:' . (date('Y') + 1),
        ]);

        $datos = $request->all();
        $datos['placa'] = strtoupper($datos['placa']);
        $datos['color'] = 'Amarillo';

        $vehiculo->update($datos);
        $vehiculo->load('socio');

        return response()->json([
            'message' => 'Vehículo actualizado con éxito.',
            'vehiculo' => $vehiculo
        ], 200);
    }

    // 5. Eliminar un vehículo de la flota
    public function destroy($id)
    {
        $vehiculo = Vehiculo::find($id);

        if (!$vehiculo) {
            return response()->json(['message' => 'Vehículo no encontrado.'], 404);
        }

        $vehiculo->delete();
        return response()->json(['message' => 'Vehículo eliminado con éxito.'], 200);
    }
}
