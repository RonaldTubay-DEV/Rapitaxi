<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Revision;
use Illuminate\Http\Request;

class RevisionController extends Controller
{
    public function index()
    {
        // Traemos las revisiones junto con los datos del vehículo y su dueño
        $revisiones = Revision::with('vehiculo.socio')->orderBy('fecha_revision', 'desc')->get();
        return response()->json($revisiones, 200);
    }

    public function store(Request $request)
    {
        $request->validate([
            'vehiculo_id'    => 'required|exists:vehiculos,id',
            'fecha_revision' => 'required|date',
            'tipo'           => 'required|string|max:80',
            'estado'         => 'required|in:Aprobada,Rechazada,Pendiente',
            'observaciones'  => 'nullable|string|max:500',
        ]);

        $revision = Revision::create($request->all());
        $revision->load('vehiculo.socio');

        return response()->json([
            'message' => 'Revisión registrada con éxito.',
            'revision' => $revision
        ], 201);
    }

    public function show($id)
    {
        $revision = Revision::with('vehiculo.socio')->find($id);
        if (!$revision) {
            return response()->json(['message' => 'Revisión no encontrada.'], 404);
        }
        return response()->json($revision, 200);
    }

    public function update(Request $request, $id)
    {
        $revision = Revision::find($id);
        if (!$revision) {
            return response()->json(['message' => 'Revisión no encontrada.'], 404);
        }

        $request->validate([
            'vehiculo_id'    => 'required|exists:vehiculos,id',
            'fecha_revision' => 'required|date',
            'tipo'           => 'required|string|max:80',
            'estado'         => 'required|in:Aprobada,Rechazada,Pendiente',
            'observaciones'  => 'nullable|string|max:500',
        ]);

        $revision->update($request->all());
        $revision->load('vehiculo.socio');

        return response()->json([
            'message' => 'Revisión actualizada con éxito.',
            'revision' => $revision
        ], 200);
    }

    public function destroy($id)
    {
        $revision = Revision::find($id);
        if (!$revision) {
            return response()->json(['message' => 'Revisión no encontrada.'], 404);
        }
        $revision->delete();
        return response()->json(['message' => 'Revisión eliminada.'], 200);
    }
}
