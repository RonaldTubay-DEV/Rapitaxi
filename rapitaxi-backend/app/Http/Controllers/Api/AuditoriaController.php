<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Spatie\Activitylog\Models\Activity;

class AuditoriaController extends Controller
{
    // Historial de quien creo/edito/elimino/reactivo cada registro del
    // sistema. Solo el admin puede verlo (se configura asi en las rutas).
    public function index(Request $request)
    {
        $query = Activity::with('causer')->latest('id');

        if ($request->filled('modulo')) {
            $query->where('log_name', $request->modulo);
        }

        if ($request->filled('evento')) {
            $query->where('event', $request->evento);
        }

        $porPagina = min((int) $request->input('per_page', 25), 100);

        $actividad = $query->paginate($porPagina)->through(fn (Activity $log) => [
            'id' => $log->id,
            'modulo' => $log->log_name,
            'evento' => $log->event,
            'descripcion' => $log->description,
            'sujeto_tipo' => $log->subject_type ? class_basename($log->subject_type) : null,
            'sujeto_id' => $log->subject_id,
            'usuario' => $log->causer?->name,
            'usuario_email' => $log->causer?->email,
            'cambios' => $log->properties,
            'fecha' => $log->created_at,
        ]);

        return response()->json($actividad, 200);
    }
}
