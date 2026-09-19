<?php

namespace Tests\Feature;

use App\Models\Aportacion;
use App\Models\Socio;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\CreaEscenarioApi;
use Tests\TestCase;

class SeguridadApiTest extends TestCase
{
    use CreaEscenarioApi, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararRoles();
        Storage::fake('s3');
    }

    // ---------------------------------------------------------------- acceso

    public function test_las_rutas_protegidas_exigen_autenticacion(): void
    {
        foreach (['socios', 'vehiculos', 'aportaciones', 'mantenimientos', 'usuarios', 'auditoria',
                  'dashboard/stats', 'mi-perfil', 'mis-aportaciones', 'libros-contables', 'notificaciones'] as $ruta) {
            $this->api()->getJson("/api/{$ruta}")->assertStatus(401);
        }
    }

    public function test_un_socio_no_puede_entrar_a_ninguna_ruta_del_panel(): void
    {
        [, $usuario] = $this->crearSocioConCuenta();
        $token = $this->tokenDe($usuario);

        foreach (['socios', 'vehiculos', 'aportaciones', 'mantenimientos', 'usuarios', 'auditoria',
                  'dashboard/stats', 'libros-contables', 'reportes/cuadro-maestro', 'expedientes'] as $ruta) {
            $this->api($token)->getJson("/api/{$ruta}")->assertStatus(403);
        }
    }

    public function test_un_operador_no_puede_gestionar_usuarios_ni_ver_auditoria_ni_configuracion(): void
    {
        $token = $this->tokenDe($this->crearUsuario('operador'));

        foreach (['usuarios', 'auditoria', 'configuraciones-mantenimiento'] as $ruta) {
            $this->api($token)->getJson("/api/{$ruta}")->assertStatus(403);
        }
        $this->api($token)->postJson('/api/usuarios', [
            'name' => 'X', 'email' => 'x@x.com', 'password' => 'Clave1234', 'role' => 'admin',
        ])->assertStatus(403);
    }

    public function test_el_staff_no_puede_usar_el_portal_del_socio(): void
    {
        $token = $this->tokenDe($this->crearUsuario('admin'));

        $this->api($token)->getJson('/api/mi-perfil')->assertStatus(403);
        $this->api($token)->getJson('/api/mis-aportaciones')->assertStatus(403);
    }

    // ----------------------------------------------------------------- login

    public function test_el_login_no_revela_si_el_correo_existe(): void
    {
        $this->crearUsuario('admin', ['email' => 'real@rapitaxi.test']);

        $existente = $this->api()->postJson('/api/login', ['email' => 'real@rapitaxi.test', 'password' => 'mala']);
        $inexistente = $this->api()->postJson('/api/login', ['email' => 'nadie@rapitaxi.test', 'password' => 'mala']);

        $this->assertSame($existente->json('errors.email'), $inexistente->json('errors.email'));
    }

    public function test_el_login_se_bloquea_tras_5_intentos_fallidos_del_mismo_correo(): void
    {
        $this->crearUsuario('admin', ['email' => 'real@rapitaxi.test']);

        for ($i = 0; $i < 5; $i++) {
            $this->api()->postJson('/api/login', ['email' => 'real@rapitaxi.test', 'password' => 'mala'])->assertStatus(422);
        }
        $this->api()->postJson('/api/login', ['email' => 'real@rapitaxi.test', 'password' => 'mala'])->assertStatus(429);
    }

    public function test_una_cuenta_desactivada_no_puede_iniciar_sesion_ni_usar_su_token(): void
    {
        $usuario = $this->crearUsuario('admin', ['email' => 'baja@rapitaxi.test', 'password' => 'Clave1234']);
        $token = $this->tokenDe($usuario);
        $usuario->update(['is_active' => false]);

        $this->api()->postJson('/api/login', ['email' => 'baja@rapitaxi.test', 'password' => 'Clave1234'])->assertStatus(422);
        $this->api($token)->getJson('/api/socios')->assertStatus(403);
    }

    public function test_los_tokens_tienen_vencimiento_configurado(): void
    {
        $minutos = config('sanctum.expiration');

        $this->assertNotNull($minutos, 'Los tokens de Sanctum nunca vencen.');
        $this->assertLessThanOrEqual(24 * 60, $minutos);
    }

    public function test_un_usuario_sin_rol_no_se_presenta_como_admin(): void
    {
        User::factory()->create(['email' => 'sinrol@rapitaxi.test', 'password' => 'Clave1234', 'is_active' => true]);

        $respuesta = $this->api()->postJson('/api/login', ['email' => 'sinrol@rapitaxi.test', 'password' => 'Clave1234']);

        $this->assertNotSame('admin', $respuesta->json('user.role'));
    }

    public function test_el_seeder_no_convierte_en_admin_a_usuarios_sin_rol(): void
    {
        $sinRol = User::factory()->create();

        $this->seed(RolesAndPermissionsSeeder::class);

        $this->assertFalse($sinRol->fresh()->hasRole('admin'));
    }

    // ------------------------------------------------- claves y sesiones

    public function test_las_claves_debiles_son_rechazadas(): void
    {
        $token = $this->tokenDe($this->crearUsuario('admin'));

        foreach (['12345678', 'abcdefgh', 'corta1'] as $clave) {
            $this->api($token)->postJson('/api/usuarios', [
                'name' => 'Nuevo', 'email' => "n{$clave}@rapitaxi.test", 'password' => $clave, 'role' => 'operador',
            ])->assertStatus(422)->assertJsonValidationErrors('password');
        }
    }

    public function test_cambiar_la_clave_de_un_usuario_cierra_sus_sesiones_abiertas(): void
    {
        $admin = $this->crearUsuario('admin');
        $operador = $this->crearUsuario('operador');
        $tokenOperador = $this->tokenDe($operador);

        $this->api($tokenOperador)->getJson('/api/socios')->assertOk();

        $this->api($this->tokenDe($admin))->putJson("/api/usuarios/{$operador->id}", [
            'name' => $operador->name, 'email' => $operador->email, 'role' => 'operador', 'password' => 'NuevaClave123',
        ])->assertOk();

        $this->api($tokenOperador)->getJson('/api/socios')->assertStatus(401);
    }

    public function test_dar_de_baja_a_un_socio_desactiva_su_cuenta_y_cierra_su_sesion(): void
    {
        [$socio, $usuario] = $this->crearSocioConCuenta();
        $tokenSocio = $this->tokenDe($usuario);
        $this->api($tokenSocio)->getJson('/api/mi-perfil')->assertOk();

        $this->api($this->tokenDe($this->crearUsuario('admin')))
            ->deleteJson("/api/socios/{$socio->id}", ['motivo_baja' => 'Retiro voluntario'])
            ->assertOk();

        $this->assertFalse($usuario->fresh()->is_active);
        $this->api($tokenSocio)->getJson('/api/mi-perfil')->assertStatus(401);
    }

    public function test_pasar_un_socio_a_inactivo_desactiva_su_cuenta(): void
    {
        [$socio, $usuario] = $this->crearSocioConCuenta();

        $this->api($this->tokenDe($this->crearUsuario('admin')))->putJson("/api/socios/{$socio->id}", [
            'nombre' => $socio->nombre, 'cedula' => $socio->cedula, 'estado' => 'Inactivo', 'motivo_baja' => 'Falta grave',
        ])->assertOk();

        $this->assertFalse($usuario->fresh()->is_active);
    }

    // ------------------------------------------- datos sensibles expuestos

    public function test_ninguna_respuesta_filtra_claves_ni_tokens(): void
    {
        $admin = $this->crearUsuario('admin');
        $token = $this->tokenDe($admin);
        $this->crearSocioConCuenta();

        foreach (['user', 'usuarios', 'socios'] as $ruta) {
            $cuerpo = $this->api($token)->getJson("/api/{$ruta}")->assertOk()->getContent();
            $this->assertStringNotContainsString('"password"', $cuerpo, "/{$ruta} expone el hash de la clave");
            $this->assertStringNotContainsString('remember_token', $cuerpo, "/{$ruta} expone remember_token");
        }
    }

    public function test_el_portal_no_muestra_notas_internas_de_la_administracion_al_socio(): void
    {
        [, $usuario] = $this->crearSocioConCuenta();

        $respuesta = $this->api($this->tokenDe($usuario))->getJson('/api/mi-perfil')->assertOk();

        $this->assertStringNotContainsString('NOTA INTERNA', $respuesta->getContent());
        $respuesta->assertJsonMissingPath('observaciones');
        $respuesta->assertJsonMissingPath('user_id');
    }

    public function test_el_portal_no_muestra_rutas_internas_ni_revisores_de_las_aportaciones(): void
    {
        [$socio, $usuario] = $this->crearSocioConCuenta();
        Aportacion::create([
            'socio_id' => $socio->id, 'mes_pagado' => 1, 'anio_pagado' => 2026, 'monto' => 20,
            'fecha_pago' => now(), 'estado' => 'Aprobado', 'comprobante_ruta' => 'comprobantes_aportaciones/secreto.jpg',
        ]);

        $respuesta = $this->api($this->tokenDe($usuario))->getJson('/api/mis-aportaciones')->assertOk();

        $this->assertStringNotContainsString('secreto.jpg', $respuesta->getContent());
        $respuesta->assertJsonMissingPath('0.comprobante_ruta');
        $respuesta->assertJsonMissingPath('0.revisado_por');
    }

    public function test_un_socio_solo_ve_sus_propias_aportaciones(): void
    {
        [$socioA, $usuarioA] = $this->crearSocioConCuenta();
        $socioB = Socio::create(['nombre' => 'Otro Socio', 'cedula' => $this->cedulaValida(2), 'estado' => 'Activo']);
        foreach ([$socioA, $socioB] as $i => $socio) {
            Aportacion::create([
                'socio_id' => $socio->id, 'mes_pagado' => $i + 1, 'anio_pagado' => 2026, 'monto' => 20 + $i,
                'fecha_pago' => now(), 'estado' => 'Aprobado',
            ]);
        }

        $lista = $this->api($this->tokenDe($usuarioA))->getJson('/api/mis-aportaciones')->assertOk()->json();

        $this->assertCount(1, $lista);
        $this->assertSame($socioA->id, Aportacion::find($lista[0]['id'])->socio_id);
    }

    public function test_el_socio_no_puede_cambiar_su_nombre_cedula_estado_ni_observaciones(): void
    {
        [$socio, $usuario] = $this->crearSocioConCuenta();

        $this->api($this->tokenDe($usuario))->putJson('/api/mi-perfil', [
            'telefono' => '0991234567', 'nombre' => 'HACKEADO', 'cedula' => '0000000000',
            'estado' => 'Inactivo', 'observaciones' => 'borrado', 'user_id' => 999,
        ])->assertOk();

        $socio->refresh();
        $this->assertSame('0991234567', $socio->telefono);
        $this->assertSame('Socio de Prueba', $socio->nombre);
        $this->assertSame('Activo', $socio->estado);
        $this->assertStringContainsString('NOTA INTERNA', $socio->observaciones);
    }

    public function test_un_socio_inactivo_no_puede_subir_comprobantes(): void
    {
        [$socio, $usuario] = $this->crearSocioConCuenta(['estado' => 'Inactivo']);

        $this->api($this->tokenDe($usuario))->post('/api/mis-aportaciones', [
            'mes_pagado' => 1, 'anio_pagado' => now()->year, 'monto' => 20,
            'comprobante' => UploadedFile::fake()->create('c.pdf', 100, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertStatus(403);
    }

    // -------------------------------------------------------- validaciones

    public function test_el_comprobante_rechaza_archivos_pesados_o_de_tipo_peligroso(): void
    {
        [, $usuario] = $this->crearSocioConCuenta();
        $token = $this->tokenDe($usuario);
        $base = ['mes_pagado' => 1, 'anio_pagado' => now()->year, 'monto' => 20];
        $json = ['Accept' => 'application/json'];

        $this->api($token)->post('/api/mis-aportaciones', $base + [
            'comprobante' => UploadedFile::fake()->create('grande.pdf', 6000, 'application/pdf'),
        ], $json)->assertStatus(422)->assertJsonValidationErrors('comprobante');

        $this->api($token)->post('/api/mis-aportaciones', $base + [
            'comprobante' => UploadedFile::fake()->create('virus.exe', 10, 'application/x-msdownload'),
        ], $json)->assertStatus(422)->assertJsonValidationErrors('comprobante');

        $this->api($token)->post('/api/mis-aportaciones', $base + [
            'comprobante' => UploadedFile::fake()->create('script.php', 10, 'application/x-php'),
        ], $json)->assertStatus(422)->assertJsonValidationErrors('comprobante');
    }

    public function test_un_monto_en_cero_o_negativo_es_rechazado(): void
    {
        [, $usuario] = $this->crearSocioConCuenta();
        $token = $this->tokenDe($usuario);

        foreach (['0', '0.00', '-5'] as $monto) {
            $this->api($token)->post('/api/mis-aportaciones', [
                'mes_pagado' => 1, 'anio_pagado' => now()->year, 'monto' => $monto,
                'comprobante' => UploadedFile::fake()->create('c.pdf', 100, 'application/pdf'),
            ], ['Accept' => 'application/json'])->assertStatus(422)->assertJsonValidationErrors('monto');
        }
    }

    public function test_no_se_puede_duplicar_el_comprobante_del_mismo_mes(): void
    {
        [, $usuario] = $this->crearSocioConCuenta();
        $token = $this->tokenDe($usuario);
        $datos = fn () => [
            'mes_pagado' => 1, 'anio_pagado' => now()->year, 'monto' => 20,
            'comprobante' => UploadedFile::fake()->create('c.pdf', 100, 'application/pdf'),
        ];

        $this->api($token)->post('/api/mis-aportaciones', $datos(), ['Accept' => 'application/json'])->assertStatus(201);
        $this->api($token)->post('/api/mis-aportaciones', $datos(), ['Accept' => 'application/json'])->assertStatus(422);
    }

    public function test_la_cedula_debe_tener_digito_verificador_valido(): void
    {
        $token = $this->tokenDe($this->crearUsuario('admin'));
        $socio = fn (string $cedula) => ['nombre' => 'Nuevo Socio', 'cedula' => $cedula, 'estado' => 'Activo'];

        $this->api($token)->postJson('/api/socios', $socio('1234567890'))->assertStatus(422)->assertJsonValidationErrors('cedula');
        $this->api($token)->postJson('/api/socios', $socio('9912345678'))->assertStatus(422)->assertJsonValidationErrors('cedula');
        $this->api($token)->postJson('/api/socios', $socio($this->cedulaValida(10)))->assertStatus(201);
    }

    public function test_no_se_repite_el_numero_de_unidad_entre_vehiculos_activos(): void
    {
        $token = $this->tokenDe($this->crearUsuario('admin'));
        [$socio] = $this->crearSocioConCuenta();
        $this->crearVehiculo($socio);

        $this->api($token)->postJson('/api/vehiculos', [
            'socio_id' => $socio->id, 'numero_vehiculo' => '012-01', 'placa' => 'PBA-1234',
            'marca' => 'Chevrolet', 'modelo' => 'Sail', 'anio_fabricacion' => 2020,
        ])->assertStatus(422)->assertJsonValidationErrors('numero_vehiculo');
    }

    public function test_el_texto_con_html_se_guarda_tal_cual_sin_ejecutarse(): void
    {
        $token = $this->tokenDe($this->crearUsuario('admin'));

        $respuesta = $this->api($token)->postJson('/api/socios', [
            'nombre' => '<script>alert(1)</script>', 'estado' => 'Activo',
        ])->assertStatus(201);

        $this->assertSame('<script>alert(1)</script>', $respuesta->json('socio.nombre'));
        $this->assertStringContainsString('application/json', $respuesta->headers->get('Content-Type'));
    }

    public function test_una_consulta_con_inyeccion_sql_no_rompe_ni_devuelve_de_mas(): void
    {
        $token = $this->tokenDe($this->crearUsuario('admin'));
        $this->crearSocioConCuenta();

        $respuesta = $this->api($token)->getJson('/api/socios?search=' . urlencode("' OR '1'='1"))->assertOk();

        $this->assertCount(0, $respuesta->json());
    }

    // ------------------------------------------------ mantenimiento

    private function datosMantenimientoCompletado(int $vehiculoId, array $cambios = []): array
    {
        return $cambios + [
            'vehiculo_id' => $vehiculoId, 'fecha_mantenimiento' => now()->toDateString(),
            'tipo_mantenimiento' => 'Suspensión', 'estado' => 'Completado', 'kilometraje_actual' => 50000,
            'costo' => 80, 'observaciones' => 'Cambio de amortiguadores',
            'comprobante' => UploadedFile::fake()->create('factura.pdf', 100, 'application/pdf'),
        ];
    }

    public function test_un_mantenimiento_completado_no_puede_tener_fecha_futura(): void
    {
        $token = $this->tokenDe($this->crearUsuario('admin'));
        [$socio] = $this->crearSocioConCuenta();
        $vehiculo = $this->crearVehiculo($socio);

        $this->api($token)->post('/api/mantenimientos', $this->datosMantenimientoCompletado($vehiculo->id, [
            'fecha_mantenimiento' => now()->addDays(10)->toDateString(),
        ]), ['Accept' => 'application/json'])->assertStatus(422)->assertJsonValidationErrors('fecha_mantenimiento');
    }

    public function test_el_kilometraje_no_puede_retroceder_respecto_al_ultimo_mantenimiento(): void
    {
        $token = $this->tokenDe($this->crearUsuario('admin'));
        [$socio] = $this->crearSocioConCuenta();
        $vehiculo = $this->crearVehiculo($socio);
        $json = ['Accept' => 'application/json'];

        $this->api($token)->post('/api/mantenimientos', $this->datosMantenimientoCompletado($vehiculo->id), $json)->assertStatus(201);

        $this->api($token)->post('/api/mantenimientos', $this->datosMantenimientoCompletado($vehiculo->id, [
            'kilometraje_actual' => 40000,
        ]), $json)->assertStatus(422)->assertJsonValidationErrors('kilometraje_actual');
    }

    // ------------------------------------------------------ dashboard

    public function test_el_dashboard_cuenta_solo_socios_activos(): void
    {
        $token = $this->tokenDe($this->crearUsuario('admin'));
        Socio::create(['nombre' => 'A', 'estado' => 'Activo']);
        Socio::create(['nombre' => 'B', 'estado' => 'Activo']);
        Socio::create(['nombre' => 'C', 'estado' => 'Inactivo']);

        $this->api($token)->getJson('/api/dashboard/stats')->assertOk()->assertJsonPath('kpis.socios_activos', 2);
    }

    public function test_el_gasto_del_mes_no_suma_el_mismo_mes_de_otros_anios(): void
    {
        $token = $this->tokenDe($this->crearUsuario('admin'));
        [$socio] = $this->crearSocioConCuenta();
        $vehiculo = $this->crearVehiculo($socio);
        $base = ['vehiculo_id' => $vehiculo->id, 'tipo_mantenimiento' => 'Frenos', 'estado' => 'Completado', 'kilometraje_actual' => 1000];

        \App\Models\Mantenimiento::create($base + ['fecha_mantenimiento' => now()->toDateString(), 'costo' => 100]);
        \App\Models\Mantenimiento::create($base + ['fecha_mantenimiento' => now()->subYear()->toDateString(), 'costo' => 900]);

        $this->assertEquals(100, $this->api($token)->getJson('/api/dashboard/stats')->assertOk()->json('kpis.gastos_mes'));
    }

    public function test_la_flota_al_dia_exige_una_revision_aprobada_reciente_de_un_vehiculo_vigente(): void
    {
        $token = $this->tokenDe($this->crearUsuario('admin'));
        [$socio] = $this->crearSocioConCuenta();
        $vigente = $this->crearVehiculo($socio, ['numero_vehiculo' => '012-01', 'placa' => 'AAA-1111']);
        $vencido = $this->crearVehiculo($socio, ['numero_vehiculo' => '012-02', 'placa' => 'BBB-2222']);
        $eliminado = $this->crearVehiculo($socio, ['numero_vehiculo' => '012-03', 'placa' => 'CCC-3333']);

        $revision = fn ($vehiculo, $fecha) => \App\Models\Revision::create([
            'vehiculo_id' => $vehiculo->id, 'fecha_revision' => $fecha, 'tipo' => 'RTV', 'estado' => 'Aprobada',
        ]);
        $revision($vigente, now()->subMonths(2)->toDateString());
        $revision($vencido, now()->subMonths(30)->toDateString());
        $revision($eliminado, now()->subMonth()->toDateString());
        $eliminado->delete();

        $kpis = $this->api($token)->getJson('/api/dashboard/stats')->assertOk()->json('kpis');

        $this->assertSame(2, $kpis['flota_total']);
        $this->assertSame(1, $kpis['vehiculos_al_dia']);
    }

    public function test_los_pendientes_de_taller_ignoran_vehiculos_eliminados(): void
    {
        $token = $this->tokenDe($this->crearUsuario('admin'));
        [$socio] = $this->crearSocioConCuenta();
        $vehiculo = $this->crearVehiculo($socio);
        \App\Models\Mantenimiento::create([
            'vehiculo_id' => $vehiculo->id, 'tipo_mantenimiento' => 'Frenos', 'estado' => 'En Proceso',
            'fecha_mantenimiento' => now()->toDateString(), 'kilometraje_actual' => 0,
        ]);
        $vehiculo->delete();

        $this->api($token)->getJson('/api/dashboard/stats')->assertOk()->assertJsonPath('kpis.taller_pendientes', 0);
    }

    // ------------------------------------------------ limites y cabeceras

    public function test_las_rutas_autenticadas_tienen_limite_de_peticiones(): void
    {
        $token = $this->tokenDe($this->crearUsuario('admin'));

        $respuesta = $this->api($token)->getJson('/api/socios')->assertOk();

        $this->assertNotNull($respuesta->headers->get('X-RateLimit-Limit'), 'La API autenticada no tiene rate limiting.');
    }

    public function test_las_subidas_de_archivos_tienen_un_limite_mas_estricto(): void
    {
        [, $usuario] = $this->crearSocioConCuenta();

        $respuesta = $this->api($this->tokenDe($usuario))->post('/api/mis-aportaciones', [
            'mes_pagado' => 1, 'anio_pagado' => now()->year, 'monto' => 20,
            'comprobante' => UploadedFile::fake()->create('c.pdf', 100, 'application/pdf'),
        ], ['Accept' => 'application/json']);

        $this->assertLessThanOrEqual(30, (int) $respuesta->headers->get('X-RateLimit-Limit'));
        $this->assertGreaterThan(0, (int) $respuesta->headers->get('X-RateLimit-Limit'));
    }

    // ------------------------------------------- uso normal no se rompe

    public function test_el_login_correcto_devuelve_token_y_rol(): void
    {
        $this->crearUsuario('operador', ['email' => 'op@rapitaxi.test', 'password' => 'Clave1234']);

        $this->api()->postJson('/api/login', ['email' => 'op@rapitaxi.test', 'password' => 'Clave1234'])
            ->assertOk()
            ->assertJsonPath('user.role', 'operador')
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email', 'role']]);
    }

    public function test_un_socio_puede_subir_su_comprobante_y_solo_ve_los_campos_publicos(): void
    {
        [, $usuario] = $this->crearSocioConCuenta();
        $token = $this->tokenDe($usuario);

        $respuesta = $this->api($token)->post('/api/mis-aportaciones', [
            'mes_pagado' => 3, 'anio_pagado' => now()->year, 'monto' => '20.00',
            'comprobante' => UploadedFile::fake()->create('c.jpg', 200, 'image/jpeg'),
        ], ['Accept' => 'application/json'])->assertStatus(201);

        $respuesta->assertJsonPath('aportacion.estado', 'Pendiente');
        $respuesta->assertJsonMissingPath('aportacion.comprobante_ruta');
        $this->assertCount(1, Storage::disk('s3')->allFiles('comprobantes_aportaciones'));
    }

    public function test_el_perfil_del_socio_incluye_sus_vehiculos_tras_editar_sus_datos(): void
    {
        [$socio, $usuario] = $this->crearSocioConCuenta();
        $this->crearVehiculo($socio);
        $token = $this->tokenDe($usuario);

        $this->api($token)->getJson('/api/mi-perfil')->assertOk()->assertJsonPath('vehiculos.0.placa', 'MBC-4650');
        $this->api($token)->putJson('/api/mi-perfil', ['telefono' => '0991234567'])
            ->assertOk()->assertJsonPath('socio.vehiculos.0.placa', 'MBC-4650');
    }

    public function test_el_admin_conserva_su_propia_sesion_al_cambiar_su_clave(): void
    {
        $admin = $this->crearUsuario('admin');
        $token = $this->tokenDe($admin);

        $this->api($token)->putJson("/api/usuarios/{$admin->id}", [
            'name' => $admin->name, 'email' => $admin->email, 'role' => 'admin', 'password' => 'OtraClave123',
        ])->assertOk();

        $this->api($token)->getJson('/api/socios')->assertOk();
    }

    public function test_una_revision_aprobada_no_puede_tener_fecha_futura_pero_una_pendiente_si(): void
    {
        $token = $this->tokenDe($this->crearUsuario('operador'));
        [$socio] = $this->crearSocioConCuenta();
        $vehiculo = $this->crearVehiculo($socio);
        $revision = fn (string $estado) => [
            'vehiculo_id' => $vehiculo->id, 'fecha_revision' => now()->addDays(15)->toDateString(),
            'tipo' => 'RTV', 'estado' => $estado,
        ];

        $this->api($token)->postJson('/api/revisiones', $revision('Aprobada'))
            ->assertStatus(422)->assertJsonValidationErrors('fecha_revision');
        $this->api($token)->postJson('/api/revisiones', $revision('Pendiente'))->assertStatus(201);
    }

    public function test_un_pago_manual_no_puede_ser_de_cero_ni_de_fecha_futura(): void
    {
        $token = $this->tokenDe($this->crearUsuario('admin'));
        [$socio] = $this->crearSocioConCuenta();
        $pago = fn (array $cambios) => $cambios + [
            'socio_id' => $socio->id, 'mes_pagado' => 2, 'anio_pagado' => now()->year,
            'monto' => 20, 'fecha_pago' => now()->toDateString(),
        ];

        $this->api($token)->postJson('/api/aportaciones', $pago(['monto' => 0]))->assertStatus(422);
        $this->api($token)->postJson('/api/aportaciones', $pago(['fecha_pago' => now()->addDays(3)->toDateString()]))->assertStatus(422);
        $this->api($token)->postJson('/api/aportaciones', $pago([]))->assertStatus(201);
    }

    public function test_el_socio_restaurado_no_recupera_la_cuenta_hasta_que_el_admin_la_reactive(): void
    {
        [$socio, $usuario] = $this->crearSocioConCuenta();
        $token = $this->tokenDe($this->crearUsuario('admin'));

        $this->api($token)->deleteJson("/api/socios/{$socio->id}", ['motivo_baja' => 'Prueba'])->assertOk();
        $this->api($token)->putJson("/api/socios/{$socio->id}/restaurar")->assertOk();
        $this->assertFalse($usuario->fresh()->is_active);

        $this->api($token)->putJson("/api/socios/{$socio->id}/cuenta/estado", ['activa' => true])->assertOk();
        $this->assertTrue($usuario->fresh()->is_active);
    }

    public function test_la_api_no_permite_que_los_datos_personales_queden_en_cache(): void
    {
        $token = $this->tokenDe($this->crearUsuario('admin'));

        $respuesta = $this->api($token)->getJson('/api/socios')->assertOk();

        $this->assertStringContainsString('no-store', (string) $respuesta->headers->get('Cache-Control'));
        $this->assertSame('nosniff', $respuesta->headers->get('X-Content-Type-Options'));
    }

    public function test_las_respuestas_de_error_tambien_llevan_las_cabeceras_de_seguridad(): void
    {
        $sinSesion = $this->api()->getJson('/api/socios')->assertStatus(401);
        $this->assertStringContainsString('no-store', (string) $sinSesion->headers->get('Cache-Control'));
        $this->assertSame('nosniff', $sinSesion->headers->get('X-Content-Type-Options'));

        $prohibido = $this->api($this->tokenDe($this->crearUsuario('socio')))->getJson('/api/socios')->assertStatus(403);
        $this->assertSame('nosniff', $prohibido->headers->get('X-Content-Type-Options'));
    }
}
