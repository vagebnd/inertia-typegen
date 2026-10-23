<?php

declare(strict_types=1);

namespace Vagebond\InertiaTypegen\Tests\Fixtures\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;
use Vagebond\InertiaTypegen\Attributes\InertiaSharedType;

#[InertiaSharedType('App')]
class HandleInertiaRequests extends Middleware
{
    /**
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            'appName' => 'Fixture',
            'locale' => fn() => 'en',
        ];
    }
}
