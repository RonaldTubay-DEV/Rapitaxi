<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ConfiguracionMantenimiento;
use Illuminate\Http\Request;

class ConfiguracionMantenimientoController extends Controller
{
    // Obtener las configuraciones existentes
    public function index()
    {
        $tiposDefecto = [
            'Cambio de Aceite', 
            'Frenos', 
            'Suspensión', 
            'Llantas', 
            'Sistema Eléctrico'
        ];
        
        // Si la tabla está vacía, creamos los registros iniciales por defecto
        foreach ($tiposDefecto as $tipo) {
            ConfiguracionMantenimiento::firstOrCreate(
                ['tipo_mantenimiento' => $tipo],
                ['km_anticipacion' => 500, 'dias_anticipacion' => 7]
            );
        }

        return response()->json(ConfiguracionMantenimiento::all(), 200);
    }

    // Actualizar todas las configuraciones enviadas desde el formulario
    public function update(Request $request)
    {
        $request->validate([
            'configuraciones' => 'required|array',
            'configuraciones.*.id' => 'required|exists:configuraciones_mantenimiento,id',
            'configuraciones.*.km_anticipacion' => 'required|integer|min:0',
            'configuraciones.*.dias_anticipacion' => 'required|integer|min:0',
        ]);

        foreach ($request->configuraciones as $config) {
            ConfiguracionMantenimiento::where('id', $config['id'])->update([
                'km_anticipacion' => $config['km_anticipacion'],
                'dias_anticipacion' => $config['dias_anticipacion'],
            ]);
        }

        return response()->json(['message' => 'Parámetros de alerta actualizados con éxito.'], 200);
    }
}