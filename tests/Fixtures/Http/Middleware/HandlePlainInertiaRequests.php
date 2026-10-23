<?php

declare(strict_types=1);

namespace Vagebond\InertiaTypegen\Tests\Fixtures\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandlePlainInertiaRequests extends Middleware
{
    /**
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            'plain' => true,
        ];
    }
}
