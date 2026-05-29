<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Mantenimiento;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MantenimientoController extends Controller
{
    public function index()
    {
        $mantenimientos = Mantenimiento::with('vehiculo.socio')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($mantenimientos, 200);
    }

    public function store(Request $request)
    {
        $request->validate([
            'vehiculo_id'              => 'required|exists:vehiculos,id',
            'fecha_mantenimiento'      => 'required|date',
            'tipo_mantenimiento'       => 'required|string|max:80',
            'mecanico'                 => 'nullable|string|max:80',
            'kilometraje_actual'       => 'nullable|integer|min:0|max:9999999',
            'proximo_mantenimiento_km' => 'nullable|integer|min:0|max:9999999',
            'costo'                    => 'nullable|numeric|min:0|max:999999.99',
            'estado'                   => 'required|in:Completado,En Proceso,Programado',
            'observaciones'            => 'nullable|string|max:800',
            'comprobante'              => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        if ($request->estado === 'Completado') {
            $request->validate([
                'costo' => 'required|numeric|min:0.01|max:999999.99',
                'kilometraje_actual' => 'required|integer|min:1|max:9999999',
                'observaciones' => 'required|string|max:800',
                'comprobante' => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
            ]);

            if (in_array($request->tipo_mantenimiento, ['Cambio de Aceite', 'Frenos', 'Llantas'], true)) {
                $request->validate([
                    'proximo_mantenimiento_km' => 'required|integer|gt:kilometraje_actual|max:9999999',
                ]);
            }
        }

        $datos = $request->except('comprobante');
        if ($request->estado !== 'Completado') {
            $datos['kilometraje_actual'] = 0;
            $datos['proximo_mantenimiento_km'] = null;
            $datos['costo'] = 0;
            $datos['observaciones'] = null;
        }

        if ($request->hasFile('comprobante')) {
            $datos['comprobante_ruta'] = $request->file('comprobante')
                ->store('comprobantes_mantenimiento', 'public');
        }

        $mantenimiento = Mantenimiento::create($datos);
        $mantenimiento->load('vehiculo.socio');

        return response()->json([
            'message' => 'Mantenimiento registrado con exito.',
            'mantenimiento' => $mantenimiento
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $mantenimiento = Mantenimiento::find($id);

        if (!$mantenimiento) {
            return response()->json(['message' => 'Registro no encontrado.'], 404);
        }

        if ($mantenimiento->estado === 'Completado') {
            return response()->json(['message' => 'No se puede modificar un mantenimiento completado.'], 422);
        }

        $request->validate([
            'estado'        => 'required|in:Completado,En Proceso,Programado',
            'kilometraje_actual' => 'nullable|integer|min:0|max:9999999',
            'proximo_mantenimiento_km' => 'nullable|integer|min:0|max:9999999',
            'costo'         => 'nullable|numeric|min:0|max:999999.99',
            'observaciones' => 'nullable|string|max:800',
            'comprobante'   => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        if ($mantenimiento->estado === 'En Proceso' && $request->estado === 'Programado') {
            return response()->json(['message' => 'El estado solo puede avanzar; no se puede regresar a Programado.'], 422);
        }

        if ($request->estado === 'Completado') {
            $request->validate([
                'costo' => 'required|numeric|min:0.01|max:999999.99',
                'kilometraje_actual' => 'required|integer|min:1|max:9999999',
                'observaciones' => 'required|string|max:800',
                'comprobante' => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
            ]);

            if (in_array($mantenimiento->tipo_mantenimiento, ['Cambio de Aceite', 'Frenos', 'Llantas'], true)) {
                $request->validate([
                    'proximo_mantenimiento_km' => 'required|integer|gt:kilometraje_actual|max:9999999',
                ]);
            }
        }

        $mantenimiento->estado = $request->estado;

        if ($request->estado === 'Completado') {
            $mantenimiento->kilometraje_actual = $request->kilometraje_actual;
            $mantenimiento->proximo_mantenimiento_km = $request->proximo_mantenimiento_km;
            $mantenimiento->costo = $request->costo;
            $mantenimiento->observaciones = $request->observaciones;
        }

        if ($request->hasFile('comprobante')) {
            if ($mantenimiento->comprobante_ruta && Storage::disk('public')->exists($mantenimiento->comprobante_ruta)) {
                Storage::disk('public')->delete($mantenimiento->comprobante_ruta);
            }

            $mantenimiento->comprobante_ruta = $request->file('comprobante')
                ->store('comprobantes_mantenimiento', 'public');
        }

        $mantenimiento->save();
        $mantenimiento->load('vehiculo.socio');

        return response()->json([
            'message' => 'Estado de mantenimiento actualizado con exito.',
            'mantenimiento' => $mantenimiento
        ], 200);
    }

    public function destroy($id)
    {
        $mantenimiento = Mantenimiento::find($id);

        if (!$mantenimiento) {
            return response()->json(['message' => 'Registro no encontrado.'], 404);
        }

        if ($mantenimiento->estado === 'Completado') {
            return response()->json(['message' => 'No se puede eliminar un mantenimiento completado.'], 422);
        }

        if ($mantenimiento->comprobante_ruta && Storage::disk('public')->exists($mantenimiento->comprobante_ruta)) {
            Storage::disk('public')->delete($mantenimiento->comprobante_ruta);
        }

        $mantenimiento->delete();

        return response()->json(['message' => 'Mantenimiento eliminado.'], 200);
    }
}
