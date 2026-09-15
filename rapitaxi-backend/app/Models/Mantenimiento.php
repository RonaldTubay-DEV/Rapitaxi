<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\TapsActivityWithRequestMeta;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Mantenimiento extends Model
{
    use HasFactory, SoftDeletes, LogsActivity, TapsActivityWithRequestMeta;

    protected $fillable = [
        'vehiculo_id',
        'fecha_mantenimiento',
        'tipo_mantenimiento',
        'kilometraje_actual',
        'proximo_mantenimiento_km',
        'costo',
        'comprobante_ruta',
        'mecanico',       // <-- Nuevo campo añadido
        'estado',         // <-- Sus valores cambiaron
        'observaciones',
    ];

    public function vehiculo()
    {
        return $this->belongsTo(Vehiculo::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('mantenimientos');
    }
}