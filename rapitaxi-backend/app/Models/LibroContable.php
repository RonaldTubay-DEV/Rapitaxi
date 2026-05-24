<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LibroContable extends Model
{
    use HasFactory;

    protected $fillable = ['titulo', 'mes_anio', 'archivo_ruta', 'descripcion'];
    protected $appends = ['url_archivo'];

    public function getUrlArchivoAttribute()
    {
        return asset('storage/' . $this->archivo_ruta);
    }
}