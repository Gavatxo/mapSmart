<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'tenant_id' => Tenant::create(['name' => 'Agence'])->id,
            'email' => 'agent@agence.fr',
        ]);
    }

    public function test_login_is_rate_limited(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/login', ['email' => 'agent@agence.fr', 'password' => 'mauvais'])->assertUnprocessable();
        }

        $this->postJson('/api/auth/login', ['email' => 'agent@agence.fr', 'password' => 'mauvais'])->assertTooManyRequests();
    }

    public function test_password_can_be_reset_with_emailed_token(): void
    {
        Notification::fake();
        $this->user->createToken('ancien');

        $this->postJson('/api/auth/forgot-password', ['email' => 'agent@agence.fr'])->assertOk();

        $token = null;
        Notification::assertSentTo($this->user, ResetPassword::class, function (ResetPassword $n) use (&$token) {
            $token = $n->token;

            return str_starts_with($n->toMail($this->user)->actionUrl, 'http://localhost:5173/reset-password?token=');
        });

        $this->postJson('/api/auth/reset-password', [
            'token' => $token, 'email' => 'agent@agence.fr', 'password' => 'nouveau-mdp',
        ])->assertOk();

        $this->assertTrue(Hash::check('nouveau-mdp', $this->user->fresh()->password));
        $this->assertSame(0, $this->user->tokens()->count());
    }

    public function test_forgot_password_does_not_reveal_unknown_emails(): void
    {
        $this->postJson('/api/auth/forgot-password', ['email' => 'inconnu@agence.fr'])
            ->assertOk()
            ->assertJsonPath('message', 'Si un compte existe pour cet email, un lien de réinitialisation a été envoyé.');
    }
}
