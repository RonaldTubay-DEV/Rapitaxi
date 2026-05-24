<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Vehiculo extends Model
{
    use HasFactory;

    protected $fillable = [
        'socio_id',
        'numero_vehiculo', // <-- Nuevo
        'placa',           // <-- Nuevo
        'marca',
        'modelo',
        'anio_fabricacion',
        'color',
    ];

    // Relación inversa: Un vehículo pertenece a un socio
    public function socio()
    {
        return $this->belongsTo(Socio::class);
    }
}