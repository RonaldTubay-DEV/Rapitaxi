<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;
use App\Models\Aportacion; // <--- 1. Importa la clase nueva
use App\Models\Vehiculo;

class Socio extends Model
{
    use HasFactory;

    protected $fillable = [
        'nombre',
        'cedula',
        'telefono',
        'correo',
        'direccion',
        'estado',
        'observaciones',
    ];

    protected $appends = ['estado_pago_actual', 'numero_vehiculo', 'placa'];

    // 2. Renombra la relación y usa la clase Aportacion
    public function aportaciones()
    {
        return $this->hasMany(Aportacion::class);
    }

    public function vehiculos()
    {
        return $this->hasMany(Vehiculo::class);
    }

    public function getEstadoPagoActualAttribute()
    {
        $mesActual = Carbon::now()->month;
        $anioActual = Carbon::now()->year;

        // 3. Usa la nueva relación 'aportaciones()'
        $pagoDelMes = $this->aportaciones()
            ->where('mes_pagado', $mesActual)
            ->where('anio_pagado', $anioActual)
            ->first();

        return $pagoDelMes ? 'Al día' : 'En mora';
    }

    public function getNumeroVehiculoAttribute()
    {
        return $this->vehiculos()->first()?->numero_vehiculo ?? null;
    }

    public function getPlacaAttribute()
    {
        return $this->vehiculos()->first()?->placa ?? null;
    }
}