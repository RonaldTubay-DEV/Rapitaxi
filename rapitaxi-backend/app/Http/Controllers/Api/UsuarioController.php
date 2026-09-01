<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UsuarioController extends Controller
{
    private const ROLES_ASIGNABLES = ['admin', 'operador'];

    public function index()
    {
        // Esta pantalla es solo para cuentas de personal interno (admin/operador).
        // Las cuentas de socios (rol "socio") se gestionan desde la pantalla de Socios.
        $usuarios = User::role(self::ROLES_ASIGNABLES)
            ->select('id', 'name', 'email', 'created_at')
            ->with('roles:id,name')
            ->orderBy('name')
            ->get()
            ->map(fn (User $usuario) => $this->conRol($usuario));

        return response()->json($usuarios, 200);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:80',
            'email' => 'required|email|max:100|unique:users,email',
            'password' => 'required|string|min:8|max:100',
            'role' => ['required', Rule::in(self::ROLES_ASIGNABLES)],
        ]);

        $usuario = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
        ]);
        $usuario->assignRole($validated['role']);

        return response()->json([
            'message' => 'Usuario creado exitosamente.',
            'usuario' => $this->conRol($usuario),
        ], 201);
    }

    public function update(Request $request, User $usuario)
    {
        if ($usuario->hasRole('socio')) {
            return response()->json(['message' => 'Usuario no encontrado.'], 404);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:80',
            'email' => [
                'required',
                'email',
                'max:100',
                Rule::unique('users', 'email')->ignore($usuario->id),
            ],
            'password' => 'nullable|string|min:8|max:100',
            'role' => ['required', Rule::in(self::ROLES_ASIGNABLES)],
        ]);

        if ($usuario->hasRole('admin') && $validated['role'] !== 'admin' && User::role('admin')->count() <= 1) {
            return response()->json([
                'message' => 'Debe existir al menos un usuario administrador.',
            ], 422);
        }

        if (empty($validated['password'])) {
            unset($validated['password']);
        }

        $usuario->update(collect($validated)->except('role')->all());
        $usuario->syncRoles([$validated['role']]);

        return response()->json([
            'message' => 'Usuario actualizado exitosamente.',
            'usuario' => $this->conRol($usuario),
        ], 200);
    }

    public function destroy(Request $request, User $usuario)
    {
        if ($usuario->hasRole('socio')) {
            return response()->json(['message' => 'Usuario no encontrado.'], 404);
        }

        if ($request->user()->id === $usuario->id) {
            return response()->json([
                'message' => 'No puedes eliminar el usuario con el que tienes la sesion activa.',
            ], 422);
        }

        if ($usuario->hasRole('admin') && User::role('admin')->count() <= 1) {
            return response()->json([
                'message' => 'Debe existir al menos un usuario administrador.',
            ], 422);
        }

        $usuario->tokens()->delete();
        $usuario->delete();

        return response()->json(['message' => 'Usuario eliminado exitosamente.'], 200);
    }

    private function conRol(User $usuario): array
    {
        return [
            'id' => $usuario->id,
            'name' => $usuario->name,
            'email' => $usuario->email,
            'created_at' => $usuario->created_at,
            'role' => $usuario->roles->first()?->name,
        ];
    }
}
