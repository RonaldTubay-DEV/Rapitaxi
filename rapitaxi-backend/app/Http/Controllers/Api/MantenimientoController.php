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
        // Traemos los mantenimientos junto con el auto y su dueño
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
            'tipo_mantenimiento'       => 'required|string|max:255',
            'mecanico'                 => 'nullable|string|max:100', // <-- Agregado
            'kilometraje_actual'       => 'required|integer|min:0',
            'proximo_mantenimiento_km' => 'nullable|integer|min:0',
            'costo'                    => 'required|numeric|min:0',
            'estado'                   => 'required|in:Completado,En Proceso,Programado', // <-- Actualizado
            'observaciones'            => 'nullable|string',
            'comprobante'              => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        $datos = $request->except('comprobante');

        // Si suben una factura, la guardamos
        if ($request->hasFile('comprobante')) {
            $archivo = $request->file('comprobante');
            $ruta = $archivo->store('comprobantes_mantenimiento', 'public');
            $datos['comprobante_ruta'] = $ruta;
        }

        $mantenimiento = Mantenimiento::create($datos);
        $mantenimiento->load('vehiculo.socio');

        return response()->json([
            'message' => 'Mantenimiento registrado con éxito.',
            'mantenimiento' => $mantenimiento
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $mantenimiento = Mantenimiento::find($id);
    
        if (!$mantenimiento) {
            return response()->json(['message' => 'Registro no encontrado.'], 404);
        }

        // Validamos el estado y permitimos la subida del comprobante
        $request->validate([
            'estado'      => 'required|in:Completado,En Proceso,Programado',
            'comprobante' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        // REGLA DE NEGOCIO: Si pasa a Completado, debe tener un archivo guardado o estarse subiendo uno ahora
        if ($request->estado === 'Completado' && !$mantenimiento->comprobante_ruta && !$request->hasFile('comprobante')) {
            return response()->json([
                'message' => 'Error de validación: Es obligatorio adjuntar el comprobante de pago para finalizar el mantenimiento.'
            ], 422);
        }

        $mantenimiento->estado = $request->estado;

        // Si se adjunta un archivo en este paso, lo procesamos
        if ($request->hasFile('comprobante')) {
            // Borramos el anterior si existía para no dejar basura en el disco
            if ($mantenimiento->comprobante_ruta && \Illuminate\Support\Facades\Storage::disk('public')->exists($mantenimiento->comprobante_ruta)) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($mantenimiento->comprobante_ruta);
            }
            
            $archivo = $request->file('comprobante');
            $ruta = $archivo->store('comprobantes_mantenimiento', 'public');
            $mantenimiento->comprobante_ruta = $ruta;
        }

        $mantenimiento->save();
        $mantenimiento->load('vehiculo.socio');
        
        return response()->json([
            'message' => 'Estado de mantenimiento actualizado con éxito.',
            'mantenimiento' => $mantenimiento
        ], 200);
    }

    public function destroy($id)
    {
        $mantenimiento = Mantenimiento::find($id);

        if (!$mantenimiento) {
            return response()->json(['message' => 'Registro no encontrado.'], 404);
        }

        // Si tenía factura guardada, la borramos del disco para ahorrar espacio
        if ($mantenimiento->comprobante_ruta && Storage::disk('public')->exists($mantenimiento->comprobante_ruta)) {
            Storage::disk('public')->delete($mantenimiento->comprobante_ruta);
        }

        $mantenimiento->delete();

        return response()->json(['message' => 'Mantenimiento eliminado.'], 200);
    }
}