<?php

declare(strict_types=1);

use Vagebond\InertiaTypegen\Tests\Fixtures\Http\Controllers\PostController;

it('adds the route name, uri, route keys, action and source to an operation', function () {
    $operation = $this->document()['paths']['/posts/{post}']['get'];

    expect($operation)->toMatchArray([
        'x-route-name' => 'app.posts.show',
        'x-route-uri' => '/posts/{post}',
        'x-route-keys' => ['post' => 'slug'],
        'x-action' => '\\' . PostController::class . '::show',
    ])->and($operation['x-source'])->toMatch('#Fixtures[/\\\\]Http[/\\\\]Controllers[/\\\\]PostController\.php:\d+$#');
});

it('keeps the route name of a route under a uri prefix', function () {
    expect($this->document()['paths']['/auth/login']['get'])->toMatchArray([
        'operationId' => 'app.auth.login',
        'x-route-name' => 'login',
    ]);
});

it('leaves out route keys for a route without model bindings', function () {
    expect($this->document()['paths']['/posts']['get'])->not->toHaveKey('x-route-keys');
});
