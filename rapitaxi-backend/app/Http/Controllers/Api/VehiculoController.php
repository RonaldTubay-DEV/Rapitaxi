<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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
        // Dentro de tus métodos store y update:
        $request->validate([
            'socio_id'         => 'required|exists:socios,id',
            'numero_vehiculo'  => 'required|string|max:50',
            'placa'            => 'required|string|max:20',
            'marca'            => 'required|string|max:100',
            'modelo'           => 'required|string|max:100',
            'anio_fabricacion' => 'required|integer|min:1980|max:' . (date('Y') + 1),
            'color'            => 'nullable|string|max:50',
        ]);

        $vehiculo = Vehiculo::create($request->all());
        $vehiculo->load('socio');

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
        $vehiculo = Vehiculo::find($id);

        if (!$vehiculo) {
            return response()->json(['message' => 'Vehículo no encontrado.'], 404);
        }

        // Dentro de tus métodos store y update:
        $request->validate([
            'socio_id'         => 'required|exists:socios,id',
            'numero_vehiculo'  => 'required|string|max:50',
            'placa'            => 'required|string|max:20',
            'marca'            => 'required|string|max:100',
            'modelo'           => 'required|string|max:100',
            'anio_fabricacion' => 'required|integer|min:1980|max:' . (date('Y') + 1),
            'color'            => 'nullable|string|max:50',
        ]);

        $vehiculo->update($request->all());
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