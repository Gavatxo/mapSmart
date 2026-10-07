<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /** Crée un tenant (agence) + son utilisateur propriétaire, et renvoie un token. */
    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'agency' => ['nullable', 'string', 'max:255'],
        ]);

        $tenant = Tenant::create(['name' => $data['agency'] ?? $data['name']]);

        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => 'owner',
        ]);

        return response()->json([
            'user' => $user,
            'token' => $user->createToken('api')->plainTextToken,
        ], 201);
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => 'Identifiants invalides.']);
        }

        return response()->json([
            'user' => $user,
            'token' => $user->createToken('api')->plainTextToken,
        ]);
    }

    public function me(Request $request)
    {
        return $request->user()->load('tenant');
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }

    /**
     * Envoie le lien de réinitialisation. Réponse identique que l'email existe ou non
     * (pas d'énumération des comptes).
     */
    public function forgotPassword(Request $request)
    {
        $data = $request->validate(['email' => ['required', 'email']]);

        Password::sendResetLink($data);

        return response()->json(['message' => 'Si un compte existe pour cet email, un lien de réinitialisation a été envoyé.']);
    }

    public function resetPassword(Request $request)
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $status = Password::reset($data, function (User $user, string $password) {
            $user->forceFill(['password' => Hash::make($password)])->save();
            $user->tokens()->delete(); // déconnecte toutes les sessions existantes
            event(new PasswordReset($user));
        });

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['email' => 'Lien invalide ou expiré.']);
        }

        return response()->json(['message' => 'Mot de passe modifié. Vous pouvez vous connecter.']);
    }
}
