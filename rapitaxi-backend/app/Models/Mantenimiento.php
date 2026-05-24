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

    // Le decimos a Laravel que envíe la URL completa de la factura al frontend
    protected $appends = ['url_comprobante'];

    public function vehiculo()
    {
        return $this->belongsTo(Vehiculo::class);
    }

    // Generador del enlace para ver la factura en React
    public function getUrlComprobanteAttribute()
    {
        return $this->comprobante_ruta ? asset('storage/' . $this->comprobante_ruta) : null;
    }
}