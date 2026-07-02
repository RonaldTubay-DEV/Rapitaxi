<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Artisan;

Route::get('/', function () {
    return view('welcome');
});
Route::get('/instalar-bd', function () {
    Artisan::call('migrate', ['--force' => true]);
    return '¡Migraciones ejecutadas con éxito en Render!';
});