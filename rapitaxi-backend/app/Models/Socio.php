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

    protected $appends = ['estado_pago_actual', 'numero_vehiculo', 'placa', 'cuenta_activa'];

    // 2. Renombra la relación y usa la clase Aportacion
    public function aportaciones()
    {
        return $this->hasMany(Aportacion::class);
    }

    public function vehiculos()
    {
        return $this->hasMany(Vehiculo::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function getCuentaActivaAttribute()
    {
        return $this->user?->is_active;
    }

    public function getEstadoPagoActualAttribute()
    {
        $mesActual = Carbon::now()->month;
        $anioActual = Carbon::now()->year;

        // Si 'aportaciones' ya viene precargada (eager load) filtramos en PHP y no
        // disparamos una consulta nueva por cada socio (evita N+1 al listar socios).
        if ($this->relationLoaded('aportaciones')) {
            $pagoDelMes = $this->aportaciones->first(
                fn ($a) => $a->mes_pagado == $mesActual && $a->anio_pagado == $anioActual
            );
        } else {
            $pagoDelMes = $this->aportaciones()
                ->where('mes_pagado', $mesActual)
                ->where('anio_pagado', $anioActual)
                ->first();
        }

        return $pagoDelMes ? 'Al día' : 'En mora';
    }

    public function getNumeroVehiculoAttribute()
    {
        // Acceso como propiedad (sin parentesis): usa la relacion precargada si
        // existe, o la carga una sola vez y la cachea. Evita una query nueva
        // cada vez que se llama, que es lo que hacia $this->vehiculos()->first().
        return $this->vehiculos->first()?->numero_vehiculo ?? null;
    }

    public function getPlacaAttribute()
    {
        return $this->vehiculos->first()?->placa ?? null;
    }
}