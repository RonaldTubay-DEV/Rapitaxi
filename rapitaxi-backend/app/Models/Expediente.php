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

    public function socio()
    {
        return $this->belongsTo(Socio::class);
    }
}