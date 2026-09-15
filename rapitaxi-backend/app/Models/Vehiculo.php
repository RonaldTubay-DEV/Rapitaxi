<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\TapsActivityWithRequestMeta;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Vehiculo extends Model
{
    use HasFactory, SoftDeletes, LogsActivity, TapsActivityWithRequestMeta;

    protected $fillable = [
        'socio_id',
        'numero_vehiculo', // <-- Nuevo
        'placa',           // <-- Nuevo
        'marca',
        'modelo',
        'anio_fabricacion',
        'color',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('vehiculos');
    }

    // Relación inversa: Un vehículo pertenece a un socio
    public function socio()
    {
        return $this->belongsTo(Socio::class);
    }
}