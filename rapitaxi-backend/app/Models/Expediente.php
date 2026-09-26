<?php

namespace App\Models;

use App\Traits\TapsActivityWithRequestMeta;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Expediente extends Model
{
    use HasFactory, LogsActivity, TapsActivityWithRequestMeta;

    /**
     * Catalogo de documentos del expediente, tomado del archivo fisico real de
     * la compania (337 documentos en 67 carpetas, una por unidad).
     *
     * - vence:       el documento tiene fecha de caducidad y se controla.
     * - obligatorio: cuenta para decir que el expediente de un socio esta completo.
     *
     * Se marcan como obligatorios los tres que aparecen en casi todas las
     * carpetas: habilitacion (79 documentos), cedula (74) y matricula (47).
     * La cesion es frecuente (56) pero solo existe si hubo traspaso, asi que
     * no puede exigirse a todos.
     */
    public const TIPOS = [
        'cedula' => ['etiqueta' => 'Cédula de identidad', 'vence' => true, 'obligatorio' => true],
        'habilitacion' => ['etiqueta' => 'Resolución de habilitación', 'vence' => true, 'obligatorio' => true],
        'matricula' => ['etiqueta' => 'Matrícula del vehículo', 'vence' => true, 'obligatorio' => true],
        'ruc' => ['etiqueta' => 'Certificado del SRI (RUC)', 'vence' => false, 'obligatorio' => false],
        'cesion' => ['etiqueta' => 'Carta de cesión de acciones', 'vence' => false, 'obligatorio' => false],
        'cambio_socio' => ['etiqueta' => 'Resolución de cambio de socio', 'vence' => false, 'obligatorio' => false],
        'acciones' => ['etiqueta' => 'Certificado de acciones', 'vence' => false, 'obligatorio' => false],
        'licencia' => ['etiqueta' => 'Licencia de conducir', 'vence' => true, 'obligatorio' => false],
        'seguro' => ['etiqueta' => 'Seguro / SOAT', 'vence' => true, 'obligatorio' => false],
        'otro' => ['etiqueta' => 'Otro documento', 'vence' => false, 'obligatorio' => false],
    ];

    /** Con cuantos dias de anticipacion un documento pasa a "Por vencer". */
    public const DIAS_AVISO_VENCIMIENTO = 30;

    public const VIGENTE = 'Vigente';
    public const POR_VENCER = 'Por vencer';
    public const VENCIDO = 'Vencido';
    public const SIN_VENCIMIENTO = 'Sin vencimiento';

    protected $fillable = [
        'socio_id',
        'nombre_documento',
        'tipo_documento',
        'tipo_expediente',
        'numero_documento',
        'fecha_emision',
        'fecha_vencimiento',
        'ruta_archivo',
    ];

    protected $appends = ['tipo_etiqueta', 'estado_vigencia', 'dias_para_vencer'];

    protected function casts(): array
    {
        return [
            'fecha_emision' => 'date:Y-m-d',
            'fecha_vencimiento' => 'date:Y-m-d',
        ];
    }

    public function socio()
    {
        return $this->belongsTo(Socio::class);
    }

    /** @return array<string, bool> Tipos que llevan control de vencimiento. */
    public static function tiposQueVencen(): array
    {
        return array_keys(array_filter(self::TIPOS, fn ($t) => $t['vence']));
    }

    /** @return array<string, bool> Tipos exigidos para considerar completo un expediente. */
    public static function tiposObligatorios(): array
    {
        return array_keys(array_filter(self::TIPOS, fn ($t) => $t['obligatorio']));
    }

    public function getTipoEtiquetaAttribute(): string
    {
        return self::TIPOS[$this->tipo_expediente]['etiqueta'] ?? 'Otro documento';
    }

    public function getEstadoVigenciaAttribute(): string
    {
        if (! $this->fecha_vencimiento) {
            return self::SIN_VENCIMIENTO;
        }

        $dias = $this->dias_para_vencer;

        if ($dias < 0) {
            return self::VENCIDO;
        }

        return $dias <= self::DIAS_AVISO_VENCIMIENTO ? self::POR_VENCER : self::VIGENTE;
    }

    /** Negativo si ya vencio. Null si el documento no caduca. */
    public function getDiasParaVencerAttribute(): ?int
    {
        if (! $this->fecha_vencimiento) {
            return null;
        }

        return (int) Carbon::now()->startOfDay()->diffInDays($this->fecha_vencimiento, false);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('expedientes');
    }
}
