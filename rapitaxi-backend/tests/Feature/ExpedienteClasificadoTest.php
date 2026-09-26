<?php

namespace Tests\Feature;

use App\Models\Expediente;
use App\Models\Socio;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\CreaEscenarioApi;
use Tests\TestCase;

class ExpedienteClasificadoTest extends TestCase
{
    use CreaEscenarioApi, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararRoles();
        Storage::fake('s3');
    }

    private function documento(array $cambios = []): array
    {
        return $cambios + [
            'nombre_documento' => 'Habilitacion 2026',
            'tipo_expediente' => 'habilitacion',
            'fecha_vencimiento' => now()->addYear()->toDateString(),
            'archivo' => UploadedFile::fake()->create('doc.pdf', 100, 'application/pdf'),
        ];
    }

    /** Crea un documento directo en la base, saltando la validacion del alta. */
    private function guardar(Socio $socio, string $tipo, ?string $vencimiento = null): Expediente
    {
        return Expediente::create([
            'socio_id' => $socio->id,
            'nombre_documento' => 'Documento de prueba',
            'tipo_documento' => 'pdf',
            'tipo_expediente' => $tipo,
            'fecha_vencimiento' => $vencimiento,
            'ruta_archivo' => 'expedientes/prueba.pdf',
        ]);
    }

    // ------------------------------------------------- catalogo

    public function test_el_catalogo_dice_que_tipos_existen_y_cuales_vencen(): void
    {
        $respuesta = $this->api($this->tokenDe($this->crearUsuario('operador')))
            ->getJson('/api/expedientes/catalogo')->assertOk();

        $tipos = collect($respuesta->json('tipos'));

        $this->assertTrue($tipos->contains('valor', 'habilitacion'));
        $this->assertTrue($tipos->contains('valor', 'cesion'));
        $this->assertTrue($tipos->firstWhere('valor', 'matricula')['vence']);
        $this->assertFalse($tipos->firstWhere('valor', 'cesion')['vence']);
        $this->assertTrue($tipos->firstWhere('valor', 'cedula')['obligatorio']);
        $respuesta->assertJsonPath('dias_aviso_vencimiento', 30);
    }

    // ------------------------------------------------- clasificacion al subir

    public function test_al_subir_un_documento_se_exige_clasificarlo(): void
    {
        $token = $this->tokenDe($this->crearUsuario('operador'));
        [$socio] = $this->crearSocioConCuenta();

        $this->api($token)->post('/api/expedientes', $this->documento([
            'socio_id' => $socio->id, 'tipo_expediente' => null,
        ]), ['Accept' => 'application/json'])->assertStatus(422)->assertJsonValidationErrors('tipo_expediente');

        $this->api($token)->post('/api/expedientes', $this->documento([
            'socio_id' => $socio->id, 'tipo_expediente' => 'pasaporte_galactico',
        ]), ['Accept' => 'application/json'])->assertStatus(422)->assertJsonValidationErrors('tipo_expediente');
    }

    public function test_los_documentos_que_caducan_exigen_fecha_de_vencimiento(): void
    {
        $token = $this->tokenDe($this->crearUsuario('operador'));
        [$socio] = $this->crearSocioConCuenta();

        // La matricula caduca: sin fecha no entra al control de vencimientos.
        $this->api($token)->post('/api/expedientes', [
            'socio_id' => $socio->id, 'nombre_documento' => 'Matricula', 'tipo_expediente' => 'matricula',
            'archivo' => UploadedFile::fake()->create('m.pdf', 100, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertStatus(422)->assertJsonValidationErrors('fecha_vencimiento');

        // La carta de cesion no caduca: se acepta sin fecha.
        $this->api($token)->post('/api/expedientes', [
            'socio_id' => $socio->id, 'nombre_documento' => 'Cesion de acciones', 'tipo_expediente' => 'cesion',
            'archivo' => UploadedFile::fake()->create('c.pdf', 100, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertStatus(201);
    }

    public function test_un_documento_no_puede_vencer_antes_de_emitirse(): void
    {
        $token = $this->tokenDe($this->crearUsuario('operador'));
        [$socio] = $this->crearSocioConCuenta();

        $this->api($token)->post('/api/expedientes', $this->documento([
            'socio_id' => $socio->id,
            'fecha_emision' => now()->toDateString(),
            'fecha_vencimiento' => now()->subDay()->toDateString(),
        ]), ['Accept' => 'application/json'])->assertStatus(422)->assertJsonValidationErrors('fecha_vencimiento');
    }

    public function test_el_documento_guardado_conserva_su_clasificacion(): void
    {
        $token = $this->tokenDe($this->crearUsuario('operador'));
        [$socio] = $this->crearSocioConCuenta();

        $this->api($token)->post('/api/expedientes', $this->documento([
            'socio_id' => $socio->id,
            'numero_documento' => '011-HV-013-DTTTSV-2025',
            'fecha_emision' => now()->subMonth()->toDateString(),
        ]), ['Accept' => 'application/json'])->assertStatus(201)
            ->assertJsonPath('expediente.tipo_expediente', 'habilitacion')
            ->assertJsonPath('expediente.tipo_etiqueta', 'Resolución de habilitación')
            ->assertJsonPath('expediente.numero_documento', '011-HV-013-DTTTSV-2025')
            ->assertJsonPath('expediente.estado_vigencia', 'Vigente');
    }

    // ------------------------------------------------- vigencia

    public function test_el_estado_de_vigencia_se_calcula_segun_la_fecha(): void
    {
        $token = $this->tokenDe($this->crearUsuario('operador'));
        [$socio] = $this->crearSocioConCuenta();

        $vigente = $this->guardar($socio, 'matricula', now()->addMonths(6)->toDateString());
        $porVencer = $this->guardar($socio, 'licencia', now()->addDays(10)->toDateString());
        $vencido = $this->guardar($socio, 'seguro', now()->subDays(5)->toDateString());
        $sinFecha = $this->guardar($socio, 'cesion');

        $porId = collect($this->api($token)->getJson("/api/expedientes?socio_id={$socio->id}")->assertOk()->json())
            ->keyBy('id');

        $this->assertSame('Vigente', $porId[$vigente->id]['estado_vigencia']);
        $this->assertSame('Por vencer', $porId[$porVencer->id]['estado_vigencia']);
        $this->assertSame('Vencido', $porId[$vencido->id]['estado_vigencia']);
        $this->assertSame('Sin vencimiento', $porId[$sinFecha->id]['estado_vigencia']);

        $this->assertSame(-5, $porId[$vencido->id]['dias_para_vencer']);
        $this->assertNull($porId[$sinFecha->id]['dias_para_vencer']);
    }

    // ------------------------------------------------- completitud

    public function test_el_resumen_dice_que_documentos_obligatorios_faltan(): void
    {
        $token = $this->tokenDe($this->crearUsuario('operador'));
        [$socio] = $this->crearSocioConCuenta();

        // Solo tiene la cedula: le faltan habilitacion y matricula.
        $this->guardar($socio, 'cedula', now()->addYears(5)->toDateString());

        $resumen = collect($this->api($token)->getJson('/api/expedientes/resumen')->assertOk()->json('socios'))
            ->firstWhere('socio_id', $socio->id);

        $this->assertSame(1, $resumen['obligatorios_presentes']);
        $this->assertSame(3, $resumen['obligatorios_totales']);
        $this->assertFalse($resumen['completo']);

        $faltantes = collect($resumen['faltantes'])->pluck('tipo')->all();
        $this->assertContains('habilitacion', $faltantes);
        $this->assertContains('matricula', $faltantes);
        $this->assertNotContains('cedula', $faltantes);
    }

    public function test_un_expediente_con_todo_al_dia_figura_completo(): void
    {
        $token = $this->tokenDe($this->crearUsuario('operador'));
        [$socio] = $this->crearSocioConCuenta();

        foreach (['cedula', 'habilitacion', 'matricula'] as $tipo) {
            $this->guardar($socio, $tipo, now()->addYears(2)->toDateString());
        }

        $resumen = collect($this->api($token)->getJson('/api/expedientes/resumen')->assertOk()->json('socios'))
            ->firstWhere('socio_id', $socio->id);

        $this->assertTrue($resumen['completo']);
        $this->assertEmpty($resumen['faltantes']);
        $this->assertEmpty($resumen['vencidos']);
    }

    public function test_un_documento_obligatorio_vencido_deja_el_expediente_incompleto(): void
    {
        $token = $this->tokenDe($this->crearUsuario('operador'));
        [$socio] = $this->crearSocioConCuenta();

        $this->guardar($socio, 'cedula', now()->addYears(2)->toDateString());
        $this->guardar($socio, 'habilitacion', now()->addYears(2)->toDateString());
        // Presente pero caducada: el documento existe, pero ya no sirve.
        $this->guardar($socio, 'matricula', now()->subMonth()->toDateString());

        $resumen = collect($this->api($token)->getJson('/api/expedientes/resumen')->assertOk()->json('socios'))
            ->firstWhere('socio_id', $socio->id);

        $this->assertEmpty($resumen['faltantes']);
        $this->assertCount(1, $resumen['vencidos']);
        $this->assertSame('matricula', $resumen['vencidos'][0]['tipo']);
        $this->assertFalse($resumen['completo']);
    }

    public function test_el_resumen_avisa_de_los_documentos_por_vencer(): void
    {
        $token = $this->tokenDe($this->crearUsuario('operador'));
        [$socio] = $this->crearSocioConCuenta();
        $this->guardar($socio, 'matricula', now()->addDays(12)->toDateString());

        $resumen = collect($this->api($token)->getJson('/api/expedientes/resumen')->assertOk()->json('socios'))
            ->firstWhere('socio_id', $socio->id);

        $this->assertCount(1, $resumen['por_vencer']);
        $this->assertSame(12, $resumen['por_vencer'][0]['dias_para_vencer']);
    }

    public function test_el_resumen_se_puede_pedir_de_un_solo_socio(): void
    {
        $token = $this->tokenDe($this->crearUsuario('operador'));
        [$socioA] = $this->crearSocioConCuenta();
        Socio::create(['nombre' => 'Otro Socio', 'cedula' => $this->cedulaValida(44), 'estado' => 'Activo']);

        $this->api($token)->getJson("/api/expedientes/resumen?socio_id={$socioA->id}")->assertOk()
            ->assertJsonCount(1, 'socios')
            ->assertJsonPath('socios.0.socio_id', $socioA->id);
    }

    public function test_los_documentos_se_pueden_filtrar_por_tipo(): void
    {
        $token = $this->tokenDe($this->crearUsuario('operador'));
        [$socio] = $this->crearSocioConCuenta();
        $this->guardar($socio, 'cedula', now()->addYears(3)->toDateString());
        $this->guardar($socio, 'cesion');

        $this->api($token)->getJson('/api/expedientes?tipo=cesion')->assertOk()->assertJsonCount(1);
        $this->api($token)->getJson('/api/expedientes?tipo=cedula')->assertOk()->assertJsonCount(1);
        $this->api($token)->getJson('/api/expedientes')->assertOk()->assertJsonCount(2);
    }

    // ------------------------------------------------- permisos

    public function test_un_socio_no_puede_ver_ni_el_catalogo_ni_el_resumen(): void
    {
        [, $usuario] = $this->crearSocioConCuenta();
        $token = $this->tokenDe($usuario);

        $this->api($token)->getJson('/api/expedientes/catalogo')->assertStatus(403);
        $this->api($token)->getJson('/api/expedientes/resumen')->assertStatus(403);
    }
}
