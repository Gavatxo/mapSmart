<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Anti-bruteforce : tentatives limitées par email + IP, et par IP seule.
        RateLimiter::for('auth', fn (Request $request) => [
            Limit::perMinute(5)->by(strtolower((string) $request->input('email')) . '|' . $request->ip()),
            Limit::perMinute(20)->by($request->ip()),
        ]);

        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(240)->by($request->user()?->id ?: $request->ip()));

        // Le lien de réinitialisation pointe vers le front React, pas vers Laravel.
        ResetPassword::createUrlUsing(fn ($user, string $token) => config('mapsmart.frontend_url')
            . '/reset-password?token=' . $token . '&email=' . urlencode($user->getEmailForPasswordReset()));
    }
}
