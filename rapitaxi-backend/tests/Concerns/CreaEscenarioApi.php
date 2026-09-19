<?php

namespace Tests\Concerns;

use App\Models\Socio;
use App\Models\User;
use App\Models\Vehiculo;
use Database\Seeders\RolesAndPermissionsSeeder;

trait CreaEscenarioApi
{
    protected function prepararRoles(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    protected function crearUsuario(string $rol, array $atributos = []): User
    {
        $usuario = User::factory()->create($atributos + ['is_active' => true]);
        $usuario->assignRole($rol);

        return $usuario;
    }

    protected function tokenDe(User $usuario): string
    {
        return $usuario->createToken('test')->plainTextToken;
    }

    /**
     * Cada llamada arranca sin usuario en cache: en un mismo test el guard de
     * Sanctum recuerda al usuario de la peticion anterior y ocultaria los
     * cambios (token revocado, cuenta desactivada, etc.).
     */
    protected function api(?string $token = null): static
    {
        $this->app['auth']->forgetGuards();

        return $token ? $this->withToken($token) : $this->withoutToken();
    }

    protected function crearSocioConCuenta(array $socio = []): array
    {
        $usuario = $this->crearUsuario('socio');
        $registro = Socio::create($socio + [
            'nombre' => 'Socio de Prueba',
            'cedula' => $this->cedulaValida(1),
            'estado' => 'Activo',
            'observaciones' => 'NOTA INTERNA: solo para la administracion',
        ]);
        $registro->user_id = $usuario->id;
        $registro->save();

        return [$registro, $usuario];
    }

    protected function crearVehiculo(Socio $socio, array $atributos = []): Vehiculo
    {
        return Vehiculo::create($atributos + [
            'socio_id' => $socio->id,
            'numero_vehiculo' => '012-01',
            'placa' => 'MBC-4650',
            'marca' => 'KIA',
            'modelo' => 'Cerato',
            'anio_fabricacion' => 2015,
            'color' => 'Amarillo',
        ]);
    }

    /** Arma una cedula ecuatoriana valida (provincia 17) a partir de un numero cualquiera. */
    protected function cedulaValida(int $secuencia): string
    {
        $base = '17' . str_pad((string) $secuencia, 7, '0', STR_PAD_LEFT);
        $suma = 0;
        foreach (str_split($base) as $i => $digito) {
            $valor = (int) $digito * ($i % 2 === 0 ? 2 : 1);
            $suma += $valor > 9 ? $valor - 9 : $valor;
        }

        return $base . ((10 - ($suma % 10)) % 10);
    }
}
