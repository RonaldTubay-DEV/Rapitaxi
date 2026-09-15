<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\TapsActivityWithRequestMeta;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Expediente extends Model
{
    use HasFactory, LogsActivity, TapsActivityWithRequestMeta;

    protected $fillable = [
        'socio_id',
        'nombre_documento',
        'tipo_documento',
        'ruta_archivo',
    ];

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
            ->useLogName('expedientes');
    }
}