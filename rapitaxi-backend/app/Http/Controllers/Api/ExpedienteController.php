<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expediente;
use App\Models\Socio;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use App\Services\ArchivoPrivado;

class ExpedienteController extends Controller
{
    // 1. Documentos de un socio (o todos). Acepta ?socio_id= y ?tipo=
    public function index(Request $request)
    {
        $query = Expediente::query();

        if ($request->filled('socio_id')) {
            $query->where('socio_id', $request->socio_id);
        }

        if ($request->filled('tipo')) {
            $query->where('tipo_expediente', $request->tipo);
        }

        return response()->json($query->orderBy('id', 'desc')->get(), 200);
    }

    // 2. Catalogo de tipos, para que el formulario sepa cuales ofrecer y
    // cuales piden fecha de vencimiento.
    public function catalogo()
    {
        $tipos = collect(Expediente::TIPOS)->map(fn ($datos, $clave) => [
            'valor' => $clave,
            'etiqueta' => $datos['etiqueta'],
            'vence' => $datos['vence'],
            'obligatorio' => $datos['obligatorio'],
        ])->values();

        return response()->json([
            'tipos' => $tipos,
            'dias_aviso_vencimiento' => Expediente::DIAS_AVISO_VENCIMIENTO,
        ], 200);
    }

    /**
     * 3. Estado del expediente de cada socio: que documentos obligatorios
     * tiene, cuales le faltan y cuales estan vencidos o por vencer.
     *
     * Es la consulta que antes no se podia responder: con el expediente como
     * "archivos con nombre libre" no habia forma de saber a quien le falta la
     * habilitacion ni que matriculas caducan este mes.
     */
    public function resumen(Request $request)
    {
        $socios = Socio::query()
            ->when($request->filled('socio_id'), fn ($q) => $q->where('id', $request->socio_id))
            ->orderBy('nombre')
            ->get(['id', 'nombre', 'cedula']);

        if ($socios->isEmpty()) {
            return response()->json(['socios' => [], 'obligatorios' => Expediente::tiposObligatorios()], 200);
        }

        $expedientes = Expediente::whereIn('socio_id', $socios->pluck('id'))->get();
        $obligatorios = Expediente::tiposObligatorios();

        $resumen = $socios->map(function (Socio $socio) use ($expedientes, $obligatorios) {
            $suyos = $expedientes->where('socio_id', $socio->id);
            $tiposPresentes = $suyos->pluck('tipo_expediente')->unique();

            $faltantes = collect($obligatorios)
                ->reject(fn ($tipo) => $tiposPresentes->contains($tipo))
                ->map(fn ($tipo) => ['tipo' => $tipo, 'etiqueta' => Expediente::TIPOS[$tipo]['etiqueta']])
                ->values();

            $porEstado = fn (string $estado) => $suyos
                ->filter(fn (Expediente $e) => $e->estado_vigencia === $estado)
                ->map(fn (Expediente $e) => [
                    'id' => $e->id,
                    'tipo' => $e->tipo_expediente,
                    'etiqueta' => $e->tipo_etiqueta,
                    'fecha_vencimiento' => $e->fecha_vencimiento?->toDateString(),
                    'dias_para_vencer' => $e->dias_para_vencer,
                ])->values();

            $vencidos = $porEstado(Expediente::VENCIDO);
            $porVencer = $porEstado(Expediente::POR_VENCER);

            return [
                'socio_id' => $socio->id,
                'nombre' => $socio->nombre,
                'cedula' => $socio->cedula,
                'total_documentos' => $suyos->count(),
                'obligatorios_presentes' => count($obligatorios) - $faltantes->count(),
                'obligatorios_totales' => count($obligatorios),
                'faltantes' => $faltantes,
                'vencidos' => $vencidos,
                'por_vencer' => $porVencer,
                'completo' => $faltantes->isEmpty() && $vencidos->isEmpty(),
            ];
        });

        return response()->json([
            'socios' => $resumen->values(),
            'obligatorios' => $obligatorios,
        ], 200);
    }

    // 4. Subir un documento al expediente de un socio
    public function store(Request $request)
    {
        $tiposValidos = array_keys(Expediente::TIPOS);

        $request->validate([
            'socio_id'          => ['required', Rule::exists('socios', 'id')->whereNull('deleted_at')],
            'nombre_documento'  => 'required|string|max:80',
            'tipo_expediente'   => ['required', Rule::in($tiposValidos)],
            'numero_documento'  => 'nullable|string|max:60',
            'fecha_emision'     => 'nullable|date|before_or_equal:today',
            // Un documento caduca despues de emitirse, nunca antes.
            'fecha_vencimiento' => 'nullable|date|after:fecha_emision',
            'archivo'           => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        // Si el tipo lleva control de caducidad, la fecha es obligatoria: sin
        // ella el documento no puede entrar en el control de vencimientos.
        if (Expediente::TIPOS[$request->tipo_expediente]['vence']) {
            $request->validate([
                'fecha_vencimiento' => 'required|date|after:today',
            ], [], ['fecha_vencimiento' => 'fecha de vencimiento']);
        }

        $file = $request->file('archivo');
        $ruta = $file->store('expedientes', 's3');

        $expediente = Expediente::create([
            'socio_id'          => $request->socio_id,
            'nombre_documento'  => $request->nombre_documento,
            'tipo_documento'    => strtolower($file->extension()),
            'tipo_expediente'   => $request->tipo_expediente,
            'numero_documento'  => $request->numero_documento,
            'fecha_emision'     => $request->fecha_emision,
            'fecha_vencimiento' => $request->fecha_vencimiento,
            'ruta_archivo'      => $ruta,
        ]);

        return response()->json([
            'message' => 'Documento subido correctamente.',
            'expediente' => $expediente,
        ], 201);
    }

    public function destroy($id)
    {
        $expediente = Expediente::find($id);

        if (!$expediente) {
            return response()->json(['message' => 'Documento no encontrado.'], 404);
        }

        Storage::disk('s3')->delete($expediente->ruta_archivo);
        $expediente->delete();

        return response()->json(['message' => 'Documento eliminado correctamente.'], 200);
    }

    // Enlace temporal (5 min) servido por R2, sin pasar por este servidor.
    public function download($id)
    {
        $expediente = Expediente::find($id);

        if (!$expediente) {
            return response()->json(['message' => 'Documento no encontrado.'], 404);
        }

        $nombreArchivo = ArchivoPrivado::nombreSeguro(
            $expediente->nombre_documento,
            $expediente->tipo_documento,
            'documento'
        );

        return response()->json([
            'url' => ArchivoPrivado::enlaceTemporal($expediente->ruta_archivo, $nombreArchivo),
        ], 200);
    }
}
