<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Expediente extends Model
{
    use HasFactory;

    protected $fillable = [
        'socio_id',
        'nombre_documento',
        'tipo_documento',
        'ruta_archivo',
    ];

    // Esto le dice a Laravel que siempre devuelva el enlace completo al archivo
    protected $appends = ['url_archivo'];

    public function socio()
    {
        return $this->belongsTo(Socio::class);
    }

    // Generador de la URL para que React pueda mostrar el archivo
    public function getUrlArchivoAttribute()
    {
        return asset('storage/' . $this->ruta_archivo);
    }
}