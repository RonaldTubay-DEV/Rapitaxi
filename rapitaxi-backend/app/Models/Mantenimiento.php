<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Mantenimiento extends Model
{
    use HasFactory;

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
}