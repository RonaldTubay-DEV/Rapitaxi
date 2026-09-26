<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Aportacion;
use App\Models\ConfiguracionMantenimiento;
use App\Models\Mantenimiento;
use App\Models\Socio;
use App\Models\Vehiculo;
use App\Services\PlanMantenimiento;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Todo lo que un usuario con rol "socio" puede hacer por si mismo: ver su
 * propia ficha (sin poder tocar nombre/cedula/estado, eso lo controla el
 * staff), y subir el comprobante de su aportacion mensual para que un
 * admin/operador lo revise (ver AportacionController::aprobar/rechazar).
 */
class SocioPortalController extends Controller
{
    private function socioAutenticado(Request $request)
    {
        $socio = $request->user()->socio;

        if (! $socio) {
            abort(response()->json([
                'message' => 'Tu cuenta no esta vinculada a ningun socio. Contacta al administrador.',
            ], 422));
        }

        // Una baja debe cortar el acceso aunque la cuenta siga existiendo.
        if ($socio->estado !== 'Activo') {
            abort(response()->json([
                'message' => 'Tu cuenta de socio no esta activa. Contacta al administrador.',
            ], 403));
        }

        return $socio;
    }

    // Solo lo que el socio necesita ver de si mismo. Nunca se devuelve el
    // modelo completo: trae las observaciones internas del staff y ids de
    // cuenta que no le corresponden.
    private function perfilPublico(Socio $socio): array
    {
        $socio->loadMissing('vehiculos');

        return [
            'id' => $socio->id,
            'nombre' => $socio->nombre,
            'cedula' => $socio->cedula,
            'telefono' => $socio->telefono,
            'correo' => $socio->correo,
            'direccion' => $socio->direccion,
            'estado' => $socio->estado,
            'vehiculos' => $socio->vehiculos->map(fn ($v) => [
                'id' => $v->id,
                'numero_vehiculo' => $v->numero_vehiculo,
                'placa' => $v->placa,
                'marca' => $v->marca,
                'tipo_vehiculo' => $v->tipo_vehiculo,
                'combustible' => $v->combustible,
                'anio_fabricacion' => $v->anio_fabricacion,
                'color' => $v->color,
            ])->values(),
        ];
    }

    // Sin la ruta interna del archivo en el almacenamiento ni quien lo reviso.
    private function aportacionPublica(Aportacion $aportacion): array
    {
        return [
            'id' => $aportacion->id,
            'mes_pagado' => $aportacion->mes_pagado,
            'anio_pagado' => $aportacion->anio_pagado,
            'monto' => $aportacion->monto,
            'fecha_pago' => $aportacion->fecha_pago,
            'estado' => $aportacion->estado,
            'motivo_rechazo' => $aportacion->motivo_rechazo,
        ];
    }

    // 1. Ver mi propia ficha (datos personales + vehiculos a mi nombre)
    public function perfil(Request $request)
    {
        $socio = $this->socioAutenticado($request);

        return response()->json($this->perfilPublico($socio), 200);
    }

    // 2. Actualizar solo mis datos de contacto. Nombre, cedula y estado de
    // afiliacion los sigue controlando unicamente el staff.
    public function actualizarPerfil(Request $request)
    {
        $socio = $this->socioAutenticado($request);

        $validated = $request->validate([
            'telefono' => ['required', 'regex:/^0[0-9]{9}$/'],
            'correo' => 'required|email|max:100',
            'direccion' => 'nullable|string|max:150',
        ]);

        $socio->update($validated);

        return response()->json([
            'message' => 'Datos actualizados exitosamente.',
            'socio' => $this->perfilPublico($socio),
        ], 200);
    }

    // 3. Ver mi historial de aportaciones (aprobadas, pendientes y rechazadas)
    public function misAportaciones(Request $request)
    {
        $socio = $this->socioAutenticado($request);

        $aportaciones = Aportacion::where('socio_id', $socio->id)
            ->orderBy('anio_pagado', 'desc')
            ->orderBy('mes_pagado', 'desc')
            ->get()
            ->map(fn (Aportacion $a) => $this->aportacionPublica($a));

        return response()->json($aportaciones, 200);
    }

    // 5. Mis unidades con el estado de cada mantenimiento: que le toca a
    // cual y cuando. Si tengo varias unidades, cada una viene por separado
    // para saber a cual hay que llevar al taller.
    public function misUnidades(Request $request, PlanMantenimiento $plan)
    {
        $socio = $this->socioAutenticado($request);
        $vehiculos = $socio->vehiculos()->orderBy('numero_vehiculo')->get();

        $unidades = $plan->paraVehiculos($vehiculos);

        // Lo que ya envie y el staff todavia no revisa, para no pedirlo dos veces.
        $pendientes = Mantenimiento::whereIn('vehiculo_id', $vehiculos->pluck('id'))
            ->where('revision_estado', 'Pendiente')
            ->get(['id', 'vehiculo_id', 'tipo_mantenimiento', 'fecha_mantenimiento']);

        $rechazados = Mantenimiento::whereIn('vehiculo_id', $vehiculos->pluck('id'))
            ->where('revision_estado', 'Rechazado')
            ->orderByDesc('revisado_en')
            ->get(['id', 'vehiculo_id', 'tipo_mantenimiento', 'fecha_mantenimiento', 'motivo_rechazo']);

        // Ultima RTV aprobada de cada unidad: el proyecto promete avisar al
        // socio antes de que expire, no solo dejar constancia de que se hizo.
        $revisiones = \App\Models\Revision::whereIn('vehiculo_id', $vehiculos->pluck('id'))
            ->where('estado', 'Aprobada')
            ->orderByDesc('fecha_revision')
            ->get()
            ->groupBy('vehiculo_id');

        foreach ($unidades as &$unidad) {
            $unidad['pendientes_revision'] = $pendientes->where('vehiculo_id', $unidad['id'])->values();
            $unidad['rechazados'] = $rechazados->where('vehiculo_id', $unidad['id'])->values();

            $ultima = $revisiones->get($unidad['id'])?->first();
            $unidad['revision_tecnica'] = $ultima ? [
                'fecha_revision' => $ultima->fecha_revision?->toDateString(),
                'fecha_vencimiento' => $ultima->fecha_vencimiento?->toDateString(),
                'estado' => $ultima->estado_vigencia,
                'dias_para_vencer' => $ultima->dias_para_vencer,
            ] : null;
        }

        return response()->json([
            'unidades' => $unidades,
            'tipos_mantenimiento' => ConfiguracionMantenimiento::orderBy('tipo_mantenimiento')->pluck('tipo_mantenimiento'),
        ], 200);
    }

    // 6. Registrar el mantenimiento que le hice a mi unidad. Igual que la
    // aportacion: queda "Pendiente" y solo pone la unidad al dia cuando el
    // staff confirma el respaldo (factura, orden de taller o foto).
    public function registrarMantenimiento(Request $request, $vehiculoId)
    {
        $socio = $this->socioAutenticado($request);

        $vehiculo = Vehiculo::where('id', $vehiculoId)->where('socio_id', $socio->id)->first();

        if (! $vehiculo) {
            return response()->json(['message' => 'Esta unidad no esta registrada a tu nombre.'], 404);
        }

        $tiposValidos = ConfiguracionMantenimiento::pluck('tipo_mantenimiento')->all();

        $request->validate([
            'tipo_mantenimiento' => ['required', Rule::in($tiposValidos)],
            'fecha_mantenimiento' => 'required|date|before_or_equal:today|after_or_equal:' . now()->subYear()->toDateString(),
            'kilometraje_actual' => 'required|integer|min:1|max:9999999',
            // Si fue por una falla o por mantenimiento planificado.
            'naturaleza' => 'required|in:Preventivo,Correctivo',
            'observaciones' => 'required|string|max:800',
            'comprobante' => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        $yaEnviado = Mantenimiento::where('vehiculo_id', $vehiculo->id)
            ->where('tipo_mantenimiento', $request->tipo_mantenimiento)
            ->where('revision_estado', 'Pendiente')
            ->exists();

        if ($yaEnviado) {
            return response()->json([
                'message' => 'Ya enviaste un registro de este tipo para esta unidad y sigue pendiente de revision.',
            ], 422);
        }

        // El odometro solo sube: un km menor al del ultimo trabajo aprobado
        // es un error de digitacion.
        app(MantenimientoController::class)->validarKilometrajeNoRetrocede(
            $vehiculo->id,
            (int) $request->kilometraje_actual,
            (string) $request->fecha_mantenimiento
        );

        $ruta = $request->file('comprobante')->store('comprobantes_mantenimiento', 's3');

        $mantenimiento = Mantenimiento::create([
            'vehiculo_id' => $vehiculo->id,
            'tipo_mantenimiento' => $request->tipo_mantenimiento,
            'fecha_mantenimiento' => $request->fecha_mantenimiento,
            'kilometraje_actual' => $request->kilometraje_actual,
            'naturaleza' => $request->naturaleza,
            'observaciones' => $request->observaciones,
            'comprobante_ruta' => $ruta,
            'estado' => 'Completado',
            'revision_estado' => 'Pendiente',
            'origen' => 'socio',
        ]);

        return response()->json([
            'message' => 'Registro enviado. La unidad quedara al dia cuando el administrador lo confirme.',
            'mantenimiento' => [
                'id' => $mantenimiento->id,
                'vehiculo_id' => $mantenimiento->vehiculo_id,
                'tipo_mantenimiento' => $mantenimiento->tipo_mantenimiento,
                'fecha_mantenimiento' => $mantenimiento->fecha_mantenimiento,
            ],
        ], 201);
    }

    // 4. Subir el comprobante de mi pago mensual. Queda "Pendiente" hasta
    // que el staff lo revise (ver tieneAportacionVigente: no se puede subir
    // dos veces para el mismo mes salvo que el intento anterior se rechazo).
    public function subirComprobante(Request $request)
    {
        $socio = $this->socioAutenticado($request);

        $request->validate([
            'mes_pagado' => 'required|integer|min:1|max:12',
            'anio_pagado' => 'required|integer|min:2020|max:' . (now()->year + 1),
            'monto' => 'required|numeric|min:0.01|max:99999.99',
            'comprobante' => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        $controladorAportaciones = app(AportacionController::class);
        if ($controladorAportaciones->tieneAportacionVigente($socio->id, $request->mes_pagado, $request->anio_pagado)) {
            return response()->json([
                'message' => 'Ya tienes una aportacion registrada o pendiente de revision para ese mes.',
            ], 422);
        }

        $ruta = $request->file('comprobante')->store('comprobantes_aportaciones', 's3');

        $aportacion = Aportacion::create([
            'socio_id' => $socio->id,
            'mes_pagado' => $request->mes_pagado,
            'anio_pagado' => $request->anio_pagado,
            'monto' => $request->monto,
            'fecha_pago' => now(),
            'metodo_pago' => 'Comprobante subido por el socio',
            'estado' => 'Pendiente',
            'comprobante_ruta' => $ruta,
        ]);

        return response()->json([
            'message' => 'Comprobante enviado. Quedara reflejado como pagado cuando el administrador lo confirme.',
            'aportacion' => $this->aportacionPublica($aportacion),
        ], 201);
    }
}
