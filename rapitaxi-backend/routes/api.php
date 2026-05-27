<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Importaciones necesarias para el setup temporal
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\SocioController; 
use App\Http\Controllers\Api\AportacionController;
use App\Http\Controllers\Api\ExpedienteController;
use App\Http\Controllers\Api\VehiculoController;
use App\Http\Controllers\Api\RevisionController;
use App\Http\Controllers\Api\MantenimientoController;
use App\Http\Controllers\Api\ReporteController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\LibroContableController;
use App\Http\Controllers\Api\NotificacionController;
use App\Http\Controllers\Api\ConfiguracionMantenimientoController;

// Endpoint público para el inicio de sesión
Route::post('/login', [AuthController::class, 'login']);

// =========================================================================
// RUTA TEMPORAL DE CONFIGURACIÓN (ELIMINAR DESPUÉS DE USAR EN PRODUCCIÓN)
// =========================================================================
Route::get('/setup-produccion', function () {
    try {
        // 1. Limpiar la caché de rutas y configuración
        Artisan::call('optimize:clear');
        $meta1 = "1. Caché del sistema completamente limpia.\n";

        // 2. Verificar y crear (o actualizar) el administrador
        $emailAdmin = 'admin@rapitaxi.com';
        $user = User::where('email', $emailAdmin)->first();

        if (!$user) {
            User::create([
                'name' => 'Administrador',
                'email' => $emailAdmin,
                'password' => Hash::make('12345678'), // Contraseña de prueba
            ]);
            $meta2 = "2. Usuario administrador creado exitosamente con clave 12345678.";
        } else {
            $user->password = Hash::make('12345678');
            $user->save();
            $meta2 = "2. El usuario ya existía. La contraseña fue actualizada a 12345678.";
        }

        return response()->json([
            'status' => 'success',
            'message' => $meta1 . $meta2
        ], 200);

    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => $e->getMessage()
        ], 500);
    }
});
// =========================================================================

// Rutas protegidas
Route::middleware('auth:sanctum')->group(function () {
    
    // Ruta por defecto para obtener el usuario autenticado
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    Route::apiResource('socios', SocioController::class);
    Route::apiResource('aportaciones', AportacionController::class)->only(['index', 'store', 'destroy']);
    Route::apiResource('expedientes', ExpedienteController::class)->only(['index', 'store', 'destroy']);
    Route::apiResource('vehiculos', VehiculoController::class);
    Route::apiResource('revisiones', RevisionController::class);
    Route::apiResource('mantenimientos', MantenimientoController::class)->only(['index', 'store', 'update', 'destroy']);    
    
    Route::get('/reportes/cuadro-maestro', [ReporteController::class, 'cuadroMaestro']);
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    Route::apiResource('libros-contables', LibroContableController::class)->only(['index', 'store', 'destroy']);
    
    // Rutas de Notificaciones y Configuración
    Route::get('notificaciones', [NotificacionController::class, 'index']);
    Route::put('notificaciones/{id}/leer', [NotificacionController::class, 'marcarLeida']);
    Route::put('notificaciones/leer-todas', [NotificacionController::class, 'marcarTodasLeidas']);
    
    Route::get('configuraciones-mantenimiento', [ConfiguracionMantenimientoController::class, 'index']);
    Route::put('configuraciones-mantenimiento', [ConfiguracionMantenimientoController::class, 'update']);
});