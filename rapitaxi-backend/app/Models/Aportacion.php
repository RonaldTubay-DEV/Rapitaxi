<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Schema;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Aportacion extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

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
    ];

    // Relación inversa: Un pago pertenece a un socio
    public function socio()
    {
        return $this->belongsTo(Socio::class);
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