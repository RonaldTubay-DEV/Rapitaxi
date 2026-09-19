<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Aportacion;
use App\Models\Socio;
use Illuminate\Http\Request;

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
                'modelo' => $v->modelo,
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
            'telefono' => 'nullable|digits:10',
            'correo' => 'nullable|email|max:100',
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
