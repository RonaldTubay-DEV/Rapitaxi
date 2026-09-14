<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class LibroContable extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['titulo', 'mes_anio', 'archivo_ruta', 'descripcion'];
}