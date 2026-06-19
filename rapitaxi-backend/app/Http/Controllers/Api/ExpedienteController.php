<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expediente;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ExpedienteController extends Controller
{
    // 1. Obtener los documentos de un socio específico
    public function index(Request $request)
    {
        $query = Expediente::query();
        
        // Si React nos pide los archivos de un socio en particular, los filtramos
        if ($request->filled('socio_id')) {
            $query->where('socio_id', $request->socio_id);
        }

        $expedientes = $query->orderBy('id', 'desc')->get();
        return response()->json($expedientes, 200);
    }

    // 2. Subir un nuevo documento
    public function store(Request $request)
    {
        // Validamos que venga un archivo real (máximo 5MB, formatos comunes)
        $request->validate([
            'socio_id'         => 'required|exists:socios,id',
            'nombre_documento' => 'required|string|max:80',
            'archivo'          => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120', 
        ]);

        // Capturamos el archivo físico
        $file = $request->file('archivo');
        
        // Lo guardamos en la carpeta public/expedientes del servidor
        $ruta = $file->store('expedientes', 'public');

        // Guardamos el registro en la base de datos
        $expediente = Expediente::create([
            'socio_id'         => $request->socio_id,
            'nombre_documento' => $request->nombre_documento,
            'tipo_documento'   => $file->getClientOriginalExtension(),
            'ruta_archivo'     => $ruta,
        ]);

        return response()->json([
            'message' => 'Documento subido correctamente.',
            'expediente' => $expediente
        ], 201);
    }

    // 3. Eliminar un documento (Borra el archivo físico y el registro)
    public function destroy($id)
    {
        $expediente = Expediente::find($id);

        if (!$expediente) {
            return response()->json(['message' => 'Documento no encontrado.'], 404);
        }

        // Borramos el archivo físico del disco duro del servidor
        if (Storage::disk('public')->exists($expediente->ruta_archivo)) {
            Storage::disk('public')->delete($expediente->ruta_archivo);
        }

        // Borramos el registro de PostgreSQL
        $expediente->delete();

        return response()->json(['message' => 'Documento eliminado correctamente.'], 200);
    }

    // 4. Descargar documento con nombre legible para el usuario
    public function download($id)
    {
        $expediente = Expediente::find($id);

        if (!$expediente) {
            return response()->json(['message' => 'Documento no encontrado.'], 404);
        }

        if (!Storage::disk('public')->exists($expediente->ruta_archivo)) {
            return response()->json(['message' => 'Archivo no encontrado.'], 404);
        }

        $base = preg_replace('/[^A-Za-z0-9_-]+/', '_', trim((string) $expediente->nombre_documento));
        $base = trim((string) $base, '_');
        $base = $base !== '' ? $base : 'documento';

        $extension = strtolower((string) $expediente->tipo_documento);
        $fileName = $extension !== '' ? $base . '.' . $extension : $base;

        return Storage::disk('public')->download($expediente->ruta_archivo, $fileName);
    }

}
