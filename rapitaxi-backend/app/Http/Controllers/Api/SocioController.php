<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notificacion;
use App\Models\Socio;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SocioController extends Controller
{
    // 1. Obtener todos los socios (Con soporte para el buscador de la interfaz)
    public function index(Request $request)
    {
        $query = Socio::orderBy('id', 'desc');

        // Si el usuario escribe algo en el buscador del frontend, filtramos la consulta.
        // LOWER() en ambos lados para que la busqueda no distinga mayusculas/minusculas
        // (en PostgreSQL, a diferencia de MySQL, LIKE por defecto SI distingue).
        if ($request->filled('search')) {
            $search = '%' . mb_strtolower($request->search) . '%';
            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(nombre) LIKE ?', [$search])
                  ->orWhereRaw('LOWER(cedula) LIKE ?', [$search])
                  ->orWhereHas('vehiculos', function ($vehiculosQuery) use ($search) {
                      $vehiculosQuery->whereRaw('LOWER(numero_vehiculo) LIKE ?', [$search])
                          ->orWhereRaw('LOWER(placa) LIKE ?', [$search]);
                  });
            });
        }

        // Precargamos tambien 'aportaciones' para que el accessor estado_pago_actual
        // no dispare una consulta nueva por cada socio de la lista.
        $socios = $query->with(['vehiculos', 'user', 'aportaciones'])->get();
        return response()->json($socios, 200);
    }

    // 2. Almacenar un nuevo socio con validaciones opcionales (cédula y teléfono)
    public function store(Request $request)
    {
        $request->validate([
            
            'nombre'          => 'required|string|max:80',
            'cedula'          => ['nullable', 'digits:10', Rule::unique('socios', 'cedula')->whereNull('deleted_at')],
            'telefono'        => 'nullable|digits:10',                      
            'correo'          => 'nullable|email|max:100',
            'direccion'       => 'nullable|string|max:150',
            'estado'          => 'required|in:Activo,Inactivo',
            'observaciones'   => 'nullable|string|max:500',
        ]);

        $socio = Socio::create($request->all());

        Notificacion::create([
            'tipo' => 'info',
            'titulo' => 'Socio registrado',
            'mensaje' => "Se registró el socio {$socio->nombre}.",
            'leida' => false
        ]);

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
           
            'nombre'          => 'required|string|max:80',
            'cedula'          => ['nullable', 'digits:10', Rule::unique('socios', 'cedula')->whereNull('deleted_at')->ignore($id)],
            'telefono'        => 'nullable|digits:10',                             
            'correo'          => 'nullable|email|max:100',
            'direccion'       => 'nullable|string|max:150',
            'estado'          => 'required|in:Activo,Inactivo',
            'observaciones'   => 'nullable|string|max:500',
            
        ]);

        $socio->update($request->all());

        return response()->json([
            'message' => 'Socio actualizado con éxito.',
            'socio' => $socio
        ], 200);
    }

    // 5. Eliminar un socio del sistema (borrado suave: se puede reactivar despues)
    public function destroy($id)
    {
        $socio = Socio::find($id);

        if (!$socio) {
            return response()->json(['message' => 'Socio no encontrado.'], 404);
        }

        $socio->delete();

        return response()->json(['message' => 'Socio eliminado con éxito.'], 200);
    }

    // 6. Listar socios dados de baja, para poder reactivarlos
    public function eliminados(Request $request)
    {
        $query = Socio::onlyTrashed()->orderBy('deleted_at', 'desc');

        if ($request->filled('search')) {
            $search = '%' . mb_strtolower($request->search) . '%';
            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(nombre) LIKE ?', [$search])
                  ->orWhereRaw('LOWER(cedula) LIKE ?', [$search]);
            });
        }

        return response()->json($query->get(), 200);
    }

    // 7. Reactivar un socio dado de baja, con todo su historial intacto
    public function restaurar($id)
    {
        $socio = Socio::onlyTrashed()->find($id);

        if (!$socio) {
            return response()->json(['message' => 'Socio eliminado no encontrado.'], 404);
        }

        // Si en el tiempo que estuvo dado de baja alguien mas tomo su cedula,
        // no lo dejamos reactivar hasta resolver ese choque.
        if ($socio->cedula && Socio::where('cedula', $socio->cedula)->whereNull('deleted_at')->exists()) {
            return response()->json([
                'message' => 'No se puede reactivar: ya existe otro socio activo con esta misma cedula.',
            ], 422);
        }

        $socio->restore();
        $socio->load(['vehiculos', 'user', 'aportaciones']);

        return response()->json([
            'message' => 'Socio reactivado con éxito.',
            'socio' => $socio,
        ], 200);
    }
}
