<?php

use App\Http\Controllers\Api\AportacionController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ConfiguracionMantenimientoController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ExpedienteController;
use App\Http\Controllers\Api\LibroContableController;
use App\Http\Controllers\Api\MantenimientoController;
use App\Http\Controllers\Api\NotificacionController;
use App\Http\Controllers\Api\ReporteController;
use App\Http\Controllers\Api\RevisionController;
use App\Http\Controllers\Api\SocioController;
use App\Http\Controllers\Api\SocioCuentaController;
use App\Http\Controllers\Api\UsuarioController;
use App\Http\Controllers\Api\VehiculoController;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;

Route::post('/login', [AuthController::class, 'login']);

Route::get('/setup-primer-usuario', function () {
    try {
        if (Schema::hasTable('users') && User::count() > 0) {
            return response()->json([
                'status' => 'disabled',
                'message' => 'El setup inicial ya no esta disponible porque ya existen usuarios.',
            ], 403);
        }

        Artisan::call('migrate', ['--force' => true]);

        if (User::count() > 0) {
            return response()->json([
                'status' => 'disabled',
                'message' => 'El setup inicial ya no esta disponible porque ya existen usuarios.',
            ], 403);
        }

        User::create([
            'name' => 'Administrador',
            'email' => 'admin@rapitaxi.com',
            'password' => Hash::make('12345678'),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Usuario administrador inicial creado exitosamente.',
        ], 200);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => $e->getMessage(),
        ], 500);
    }
});

Route::middleware(['auth:sanctum', 'active'])->group(function () {
    // Estas dos son validas para cualquier usuario autenticado (admin, operador o socio).
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    Route::post('/logout', [AuthController::class, 'logout']);

    // Todo lo demas es el panel administrativo: nadie con rol "socio" puede
    // entrar aqui, ni desde la UI ni llamando a la API directamente.
    Route::middleware('role:admin|operador')->group(function () {
        Route::apiResource('socios', SocioController::class);
        Route::apiResource('aportaciones', AportacionController::class)->only(['index', 'store', 'destroy']);
        Route::apiResource('expedientes', ExpedienteController::class)->only(['index', 'store', 'destroy']);
        Route::get('expedientes/{id}/download', [ExpedienteController::class, 'download']);
        Route::apiResource('vehiculos', VehiculoController::class);
        Route::apiResource('revisiones', RevisionController::class);
        Route::apiResource('mantenimientos', MantenimientoController::class)->only(['index', 'store', 'update', 'destroy']);
        Route::apiResource('libros-contables', LibroContableController::class)->only(['index', 'store', 'destroy']);

        Route::get('/reportes/cuadro-maestro', [ReporteController::class, 'cuadroMaestro']);
        Route::get('/dashboard/stats', [DashboardController::class, 'stats']);

        Route::get('notificaciones', [NotificacionController::class, 'index']);
        Route::put('notificaciones/{id}/leer', [NotificacionController::class, 'marcarLeida']);
        Route::put('notificaciones/leer-todas', [NotificacionController::class, 'marcarTodasLeidas']);
    });

    // Solo el admin: gestion de personal interno, cuentas de socios y configuracion critica.
    Route::middleware('role:admin')->group(function () {
        Route::apiResource('usuarios', UsuarioController::class)->only(['index', 'store', 'update', 'destroy']);
        Route::post('socios/{socio}/cuenta', [SocioCuentaController::class, 'store']);
        Route::put('socios/{socio}/cuenta/estado', [SocioCuentaController::class, 'actualizarEstado']);

        Route::get('configuraciones-mantenimiento', [ConfiguracionMantenimientoController::class, 'index']);
        Route::put('configuraciones-mantenimiento', [ConfiguracionMantenimientoController::class, 'update']);
    });
});
