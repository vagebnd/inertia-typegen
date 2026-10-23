<?php

declare(strict_types=1);

namespace Vagebond\InertiaTypegen\Tests\Fixtures\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class AuthController
{
    public function login(): Response
    {
        return Inertia::render('auth/login', [
            'canResetPassword' => true,
        ]);
    }

    public function register(): RedirectResponse
    {
        return redirect('/');
    }
}
