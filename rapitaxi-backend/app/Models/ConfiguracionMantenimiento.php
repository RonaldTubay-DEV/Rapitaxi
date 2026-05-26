<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConfiguracionMantenimiento extends Model
{
    // AÑADE ESTA LÍNEA EXACTAMENTE ASÍ:
    protected $table = 'configuraciones_mantenimiento';

    protected $fillable = ['tipo_mantenimiento', 'km_anticipacion', 'dias_anticipacion'];
}