<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\TapsActivityWithRequestMeta;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Revision extends Model
{
    use HasFactory, LogsActivity, TapsActivityWithRequestMeta;

    protected $table = 'revisiones'; // Por si Laravel se confunde con el plural

    protected $fillable = [
        'vehiculo_id',
        'fecha_revision',
        'tipo',
        'estado',
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
            ->useLogName('revisiones');
    }
}