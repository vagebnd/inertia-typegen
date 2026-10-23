<?php

declare(strict_types=1);

namespace Vagebond\InertiaTypegen\Tests;

use Dedoc\Scramble\Http\Middleware\RestrictedDocsAccess;
use Dedoc\Scramble\ScrambleServiceProvider;
use Illuminate\Routing\Router;
use Inertia\ServiceProvider as InertiaServiceProvider;
use Orchestra\Testbench\TestCase as Orchestra;
use Vagebond\InertiaTypegen\InertiaTypegenServiceProvider;
use Vagebond\InertiaTypegen\Tests\Fixtures\Enums\EnumHelpers;
use Vagebond\InertiaTypegen\Tests\Fixtures\Http\Controllers\AuthController;
use Vagebond\InertiaTypegen\Tests\Fixtures\Http\Controllers\OtherController;
use Vagebond\InertiaTypegen\Tests\Fixtures\Http\Controllers\PostController;
use Vagebond\InertiaTypegen\Tests\Fixtures\Http\Middleware\HandleInertiaRequests;
use Vagebond\InertiaTypegen\Tests\Fixtures\Http\Middleware\HandlePlainInertiaRequests;
use Vagebond\InertiaTypegen\Tests\Fixtures\Support\WidgetTypeInfer;

class TestCase extends Orchestra
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(RestrictedDocsAccess::class);
    }

    protected function getPackageProviders($app): array
    {
        return [
            ScrambleServiceProvider::class,
            InertiaServiceProvider::class,
            InertiaTypegenServiceProvider::class,
        ];
    }

    /**
     * The service provider reads the configuration while it registers, before defineEnvironment() runs.
     */
    protected function resolveApplicationConfiguration($app): void
    {
        parent::resolveApplicationConfiguration($app);

        $app['config']->set('app.key', 'base64:' . base64_encode(str_repeat('k', 32)));
        $app['config']->set('inertia-typegen.documents', [
            'app' => [
                'route_names' => ['app.'],
                'uri_prefixes' => ['auth/' => 'auth'],
            ],
        ]);
        $app['config']->set('inertia-typegen.enum_helpers', EnumHelpers::class);
        $app['config']->set('scramble.extensions', [WidgetTypeInfer::class]);
    }

    /**
     * @param  Router  $router
     */
    protected function defineRoutes($router): void
    {
        $router->middleware(HandleInertiaRequests::class)->group(function (Router $router) {
            $router->get('posts', [PostController::class, 'index'])->name('app.posts.index');
            $router->get('posts/{post}', [PostController::class, 'show'])->name('app.posts.show');
            $router->post('posts', [PostController::class, 'store'])->name('app.posts.store');
            $router->get('auth/login', [AuthController::class, 'login'])->name('login');
            $router->post('auth/register', [AuthController::class, 'register'])->name('auth.register');
            $router->redirect('old-posts', 'posts')->name('app.old-posts');
            $router->get('other', OtherController::class)->name('other');
        });

        $router->middleware(HandlePlainInertiaRequests::class)
            ->get('plain', [PostController::class, 'plain'])
            ->name('app.plain');
    }

    /**
     * @return array<string, mixed>
     */
    protected function document(string $name = 'app'): array
    {
        return $this->getJson("/docs/{$name}.json")->assertOk()->json();
    }
}
