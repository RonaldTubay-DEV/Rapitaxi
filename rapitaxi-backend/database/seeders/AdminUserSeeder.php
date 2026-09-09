<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Crea el usuario administrador inicial leyendo las credenciales desde
 * variables de entorno (ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME), para
 * que cada despliegue (ej. una instancia nueva de Render para un cliente)
 * quede con una cuenta funcional sin exponer ningun endpoint publico.
 *
 * Es idempotente: si ADMIN_EMAIL no esta definido, o si ya existe un
 * usuario con ese correo (por ejemplo porque el negocio ya cambio su
 * contrasena), no hace nada. Seguro de correr en cada arranque del
 * contenedor.
 */
class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('ADMIN_EMAIL');
        $password = env('ADMIN_PASSWORD');

        if (! $email || ! $password) {
            return;
        }

        $usuario = User::firstOrCreate(
            ['email' => $email],
            [
                'name' => env('ADMIN_NAME', 'Administrador'),
                'password' => $password,
                'is_active' => true,
            ]
        );

        if (! $usuario->hasRole('admin')) {
            $usuario->assignRole('admin');
        }
    }
}
