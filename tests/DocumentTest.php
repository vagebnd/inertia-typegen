<?php

declare(strict_types=1);

use Dedoc\Scramble\Http\Middleware\RestrictedDocsAccess;

it('documents the routes named after the document and the routes under a uri prefix', function () {
    expect(array_keys($this->document()['paths']))->toEqualCanonicalizing([
        '/posts',
        '/posts/{post}',
        '/posts/paginated',
        '/posts/status/{status}',
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
        'app.posts.status',
        'app.posts.store',
    ]);
});

it('exposes no document by default', function () {
    $this->get('/docs/app')->assertNotFound();
    $this->get('/docs/app.json')->assertNotFound();
});

it('exposes a ui and a json document when the document asks for it', function () {
    $this->withoutMiddleware(RestrictedDocsAccess::class);

    $this->get('/docs/exposed')->assertOk();
    $this->get('/docs/exposed.json')->assertOk()->assertJsonStructure(['openapi', 'paths', 'components']);
});

it('protects an exposed document with the scramble middleware', function () {
    $this->get('/docs/exposed.json')->assertForbidden();
});
