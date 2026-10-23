<?php

declare(strict_types=1);

use Dedoc\Scramble\Support\Generator\OpenApi;
use Dedoc\Scramble\Support\Generator\Operation;
use Dedoc\Scramble\Support\Generator\Path;
use Illuminate\Routing\Route;
use Vagebond\InertiaTypegen\InertiaDocument;

function documentRoute(string $uri, ?string $name = null): Route
{
    $route = new Route(['GET'], $uri, ['uses' => 'Controller@index']);

    return $name ? $route->name($name) : $route;
}

it('includes routes by name prefix and by uri prefix', function () {
    $document = new InertiaDocument('app', ['app.'], ['auth/' => 'auth']);

    expect($document->includes(documentRoute('posts', 'app.posts.index')))->toBeTrue()
        ->and($document->includes(documentRoute('auth/login', 'login')))->toBeTrue()
        ->and($document->includes(documentRoute('other', 'other')))->toBeFalse()
        ->and($document->includes(documentRoute('unnamed')))->toBeFalse();
});

it('includes every route with an empty name prefix', function () {
    $document = new InertiaDocument('app', ['']);

    expect($document->includes(documentRoute('dashboard', 'dashboard')))->toBeTrue()
        ->and($document->includes(documentRoute('unnamed')))->toBeTrue();
});

it('leaves out redirect routes', function () {
    $document = new InertiaDocument('app', ['']);

    expect($document->includes(app('router')->redirect('old', 'new')->name('app.old')))->toBeFalse();
});

it('prefixes operation ids with the document name and the uri prefix segment', function () {
    $openApi = OpenApi::make('3.1.0');

    foreach (['/posts' => 'app.posts.index', '/dashboard' => 'dashboard', '/auth/login' => 'login', '/auth/register' => 'auth.register', '/auth/logout' => 'app.auth.logout'] as $uri => $operationId) {
        $openApi->addPath(Path::make($uri)->addOperation(Operation::make('get')->setOperationId($operationId)));
    }

    (new InertiaDocument('app', [''], ['auth/' => 'auth']))->normalizeOperationIds($openApi);

    expect(collect($openApi->paths)->mapWithKeys(fn(Path $path) => [$path->path => $path->operations['get']->operationId])->all())
        ->toBe([
            '/posts' => 'app.posts.index',
            '/dashboard' => 'app.dashboard',
            '/auth/login' => 'app.auth.login',
            '/auth/register' => 'app.auth.register',
            '/auth/logout' => 'app.auth.logout',
        ]);
});
