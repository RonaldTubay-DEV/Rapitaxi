<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Socio;
use Illuminate\Http\Request;

class SocioController extends Controller
{
    // 1. Obtener todos los socios (Con soporte para el buscador de la interfaz)
    public function index(Request $request)
    {
        $query = Socio::orderBy('id', 'desc');

        // Si el usuario escribe algo en el buscador del frontend, filtramos la consulta
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('nombre', 'like', '%' . $search . '%')
                  ->orWhere('cedula', 'like', '%' . $search . '%')
                  ->orWhereHas('vehiculos', function ($vehiculosQuery) use ($search) {
                      $vehiculosQuery->where('numero_vehiculo', 'like', '%' . $search . '%')
                          ->orWhere('placa', 'like', '%' . $search . '%');
                  });
            });
        }

        $socios = $query->with('vehiculos')->get();
        return response()->json($socios, 200);
    }

    // 2. Almacenar un nuevo socio con validaciones opcionales (cédula y teléfono)
    public function store(Request $request)
    {
        $request->validate([
            
            'nombre'          => 'required|string|max:255',
            'cedula'          => 'nullable|string|unique:socios,cedula|max:20', 
            'telefono'        => 'nullable|string|max:20',                      
            'correo'          => 'nullable|email|max:255',
            'direccion'       => 'nullable|string|max:255',
            'estado'          => 'required|in:Activo,Inactivo',
            'observaciones' => 'nullable|string',
        ]);

        $socio = Socio::create($request->all());

        return response()->json([
            'message' => 'Socio registrado con éxito.',
            'socio' => $socio
        ], 201);
    }

    // 3. Mostrar un socio específico por su ID
    public function show($id)
    {
        $socio = Socio::find($id);

        if (!$socio) {
            return response()->json(['message' => 'Socio no encontrado.'], 404);
        }

        return response()->json($socio, 200);
    }

    // 4. Actualizar los datos de un socio existente
    public function update(Request $request, $id)
    {
        $socio = Socio::find($id);

        if (!$socio) {
            return response()->json(['message' => 'Socio no encontrado.'], 404);
        }

        // Validamos la cédula asegurando que ignore el ID actual para permitir la actualización
        $request->validate([
           
            'nombre'          => 'required|string|max:255',
            'cedula'          => 'nullable|string|max:20|unique:socios,cedula,' . $id, 
            'telefono'        => 'nullable|string|max:20',                             
            'correo'          => 'nullable|email|max:255',
            'direccion'       => 'nullable|string|max:255',
            'estado'          => 'required|in:Activo,Inactivo',
            'observaciones' => 'nullable|string',
            
        ]);

        $socio->update($request->all());

        return response()->json([
            'message' => 'Socio actualizado con éxito.',
            'socio' => $socio
        ], 200);
    }

    // 5. Eliminar un socio del sistema
    public function destroy($id)
    {
        $socio = Socio::find($id);

        if (!$socio) {
            return response()->json(['message' => 'Socio no encontrado.'], 404);
        }

        $socio->delete();

        return response()->json(['message' => 'Socio eliminado con éxito.'], 200);
    }
}