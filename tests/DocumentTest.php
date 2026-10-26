<?php

declare(strict_types=1);

it('documents the routes named after the document and the routes under a uri prefix', function () {
    expect(array_keys($this->document()['paths']))->toEqualCanonicalizing([
        '/posts',
        '/posts/{post}',
        '/posts/paginated',
        '/auth/login',
        '/auth/register',
        '/plain',
    ]);
});

it('prefixes the operation ids of routes under a uri prefix with the document and the segment', function () {
    $operationIds = collect($this->document()['paths'])
        ->flatMap(fn(array $methods) => collect($methods)->pluck('operationId'))
        ->sort()
        ->values()
        ->all();

    expect($operationIds)->toBe([
        'app.auth.login',
        'app.auth.register',
        'app.plain',
        'app.posts.index',
        'app.posts.paginated',
        'app.posts.show',
        'app.posts.store',
    ]);
});

it('exposes a ui and a json document for each document', function () {
    $this->get('/docs/app')->assertOk();
    $this->get('/docs/app.json')->assertOk()->assertJsonStructure(['openapi', 'paths', 'components']);
});
