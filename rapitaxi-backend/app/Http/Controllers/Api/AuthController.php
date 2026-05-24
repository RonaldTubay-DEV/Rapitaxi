<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        // 1. Validar que vengan los datos obligatorios
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        // 2. Buscar al usuario por correo electrónico
        $user = User::where('email', $request->email)->first();

        // 3. Validar credenciales
        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Las credenciales ingresadas son incorrectas.'],
            ]);
        }

        // 4. Lógica de Roles (Fase 2)
        // Está comentado para permitir el ingreso del usuario actual. 
        // Descoméntalo en el futuro cuando agregues la columna 'role' a tu BD.
        /*
        if ($user->role !== 'admin') {
            throw ValidationException::withMessages([
                'email' => ['Acceso denegado. Este portal es de uso exclusivo para administradores.'],
            ]);
        }
        */

        // 5. Emitir Token de acceso seguro (Laravel Sanctum)
        $token = $user->createToken('auth_token')->plainTextToken;

        // 6. Retorno exacto que espera React
        return response()->json([
            'message' => 'Ingreso exitoso',
            'token' => $token, // <-- La palabra mágica que React necesita
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role ?? 'admin' // Fallback seguro por ahora
            ]
        ], 200);
    }

    public function logout(Request $request)
    {
        // Destruye el token actual para cerrar la sesión de forma segura
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Sesión cerrada correctamente'], 200);
    }
}