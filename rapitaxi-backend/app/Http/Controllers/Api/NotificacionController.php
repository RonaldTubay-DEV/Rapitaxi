<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notificacion;
use Illuminate\Http\Request;

class NotificacionController extends Controller
{
    // Obtener todas las notificaciones ordenadas por las más recientes
    public function index()
    {
        $notificaciones = Notificacion::orderBy('created_at', 'desc')
                                      ->take(20) // Traemos solo las últimas 20 para no saturar
                                      ->get();
        return response()->json($notificaciones, 200);
    }

    // Marcar una sola notificación como leída
    public function marcarLeida($id)
    {
        $notificacion = Notificacion::find($id);
        if ($notificacion) {
            $notificacion->update(['leida' => true]);
            return response()->json(['message' => 'Marcada como leída']);
        }
        return response()->json(['message' => 'No encontrada'], 404);
    }

    // Marcar TODAS como leídas de un solo golpe
    public function marcarTodasLeidas()
    {
        Notificacion::where('leida', false)->update(['leida' => true]);
        return response()->json(['message' => 'Todas marcadas como leídas']);
    }
}