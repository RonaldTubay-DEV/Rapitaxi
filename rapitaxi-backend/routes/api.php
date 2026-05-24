<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\SocioController; 
use App\Http\Controllers\Api\AportacionController;
use App\Http\Controllers\Api\ExpedienteController;
use App\Http\Controllers\Api\VehiculoController;
use App\Http\Controllers\Api\RevisionController;
use App\Http\Controllers\Api\MantenimientoController;
use App\Http\Controllers\Api\ReporteController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\LibroContableController;// ... dentro del middleware('auth:sanctum')
    Route::apiResource('revisiones', RevisionController::class);
// Endpoint público para el inicio de sesión
Route::post('/login', [AuthController::class, 'login']);

// Rutas protegidas (Requieren el token de Sanctum)
Route::middleware('auth:sanctum')->group(function () {
    
    // Ruta por defecto para obtener el usuario autenticado
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // Rutas CRUD para la gestión de socios (index, store, show, update, destroy)
    Route::apiResource('socios', SocioController::class);

    Route::apiResource('aportaciones', AportacionController::class)->only(['index', 'store', 'destroy']);
    Route::apiResource('expedientes', ExpedienteController::class)->only(['index', 'store', 'destroy']);
    Route::apiResource('vehiculos', VehiculoController::class);
    Route::apiResource('revisiones', RevisionController::class);
    Route::apiResource('mantenimientos', MantenimientoController::class)->only(['index', 'store', 'update', 'destroy']);    
    Route::get('/reportes/cuadro-maestro', [ReporteController::class, 'cuadroMaestro']);
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    Route::apiResource('libros-contables', LibroContableController::class)->only(['index', 'store', 'destroy']);
    
});