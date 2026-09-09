<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LibroContable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class LibroContableController extends Controller
{
    public function index()
    {
        return response()->json(LibroContable::orderBy('created_at', 'desc')->get(), 200);
    }

    public function store(Request $request)
    {
        $request->validate([
            'titulo' => 'required|string|max:80',
            'mes_anio' => 'required|string|max:30',
            'documento' => 'required|file|mimes:pdf|max:10240', // Solo PDF, hasta 10MB
            'descripcion' => 'nullable|string|max:500'
        ]);

        $ruta = $request->file('documento')->store('libros_contables', 's3');

        $libro = LibroContable::create([
            'titulo' => $request->titulo,
            'mes_anio' => $request->mes_anio,
            'descripcion' => $request->descripcion,
            'archivo_ruta' => $ruta
        ]);

        return response()->json(['libro' => $libro], 201);
    }

    public function destroy($id)
    {
        $libro = LibroContable::findOrFail($id);
        Storage::disk('s3')->delete($libro->archivo_ruta);
        $libro->delete();
        return response()->json(['message' => 'Eliminado'], 200);
    }

    // Genera un enlace temporal (5 min) para ver/descargar el PDF directo
    // desde R2. El archivo no pasa por este servidor.
    public function download($id)
    {
        $libro = LibroContable::findOrFail($id);

        $base = preg_replace('/[^A-Za-z0-9_-]+/', '_', trim((string) $libro->titulo));
        $base = trim($base, '_');
        $fileName = ($base !== '' ? $base : 'libro') . '.pdf';

        $url = Storage::disk('s3')->temporaryUrl(
            $libro->archivo_ruta,
            now()->addMinutes(5),
            ['ResponseContentDisposition' => 'inline; filename="' . $fileName . '"']
        );

        return response()->json(['url' => $url], 200);
    }
}
