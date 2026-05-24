<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Revision extends Model
{
    use HasFactory;

    protected $table = 'revisiones'; // Por si Laravel se confunde con el plural

    protected $fillable = [
        'vehiculo_id',
        'fecha_revision',
        'tipo',
        'estado',
        'observaciones',
    ];

    public function vehiculo()
    {
        return $this->belongsTo(Vehiculo::class);
    }
}