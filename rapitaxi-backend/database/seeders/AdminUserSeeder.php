<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        User::create([
            'name' => 'Administrador RapiTaxi',
            'email' => 'admin@rapitaxi.com',
            'password' => Hash::make('admin1234'), // La contraseña se guarda encriptada
            'role' => 'admin',
        ]);
    }
}