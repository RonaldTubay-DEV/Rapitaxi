<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

class Aportacion extends Model
{
    use HasFactory;

    protected $table;

    public function __construct(array $attributes = [])
    {
        parent::__construct($attributes);
        $this->table = Schema::hasTable('aportaciones') ? 'aportaciones' : (Schema::hasTable('pagos') ? 'pagos' : 'aportaciones');
    }

    protected $fillable = [
        'socio_id',
        'mes_pagado',
        'anio_pagado',
        'monto',
        'fecha_pago',
        'metodo_pago',
    ];

    // Relación inversa: Un pago pertenece a un socio
    public function socio()
    {
        return $this->belongsTo(Socio::class);
    }
}