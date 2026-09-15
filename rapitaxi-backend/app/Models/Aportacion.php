<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Schema;
use App\Traits\TapsActivityWithRequestMeta;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Aportacion extends Model
{
    use HasFactory, SoftDeletes, LogsActivity, TapsActivityWithRequestMeta;

    protected $table;

    public function __construct(array $attributes = [])
    {
        parent::__construct($attributes);
        $this->table = Schema::hasTable('aportaciones') ? 'aportaciones' : (Schema::hasTable('pagos') ? 'pagos' : 'aportaciones');
    }

    protected $fillable = [
        'socio_id',
        'mes_pagado',
        'anio_pagado',
        'monto',
        'fecha_pago',
        'metodo_pago',
        'estado',
        'comprobante_ruta',
        'motivo_rechazo',
        'revisado_por',
        'revisado_en',
    ];

    protected function casts(): array
    {
        return [
            'revisado_en' => 'datetime',
        ];
    }

    // Relación inversa: Un pago pertenece a un socio
    public function socio()
    {
        return $this->belongsTo(Socio::class);
    }

    // Quien (admin/operador) aprobo o rechazo el comprobante subido por el socio
    public function revisadoPor()
    {
        return $this->belongsTo(User::class, 'revisado_por');
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('aportaciones');
    }
}