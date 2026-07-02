<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Artisan;
use App\Models\User; 
use Illuminate\Support\Facades\Hash; 

Route::get('/', function () {
    return view('welcome');
});

Route::get('/crear-admin', function () {
    if (User::where('email', 'admin@rapitaxi.com')->exists()) {
        return 'El usuario administrador ya existe en la base de datos.';
    }

    User::create([
        'name' => 'Administrador Rapitaxi',
        'email' => 'admin@rapitaxi.com', 
        'password' => Hash::make('12345678') 
    ]);

    return '¡Usuario administrador creado con éxito! Ya puedes iniciar sesión.';
});