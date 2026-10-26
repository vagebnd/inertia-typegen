<?php

declare(strict_types=1);

it('exports the shared data of a middleware with the attribute as one component schema', function () {
    $document = $this->document();

    expect(data_get($document, 'components.schemas.InertiaSharedApp.properties'))->toHaveKeys(['appName', 'locale'])
        ->and(data_get($document, 'paths./posts.get.responses.200.content.application/json.schema.allOf.0'))
        ->toBe(['$ref' => '#/components/schemas/InertiaSharedApp']);
});

it('merges the shared data into the page when the middleware has no attribute', function () {
    $schema = data_get($this->document(), 'paths./plain.get.responses.200.content.application/json.schema');

    expect($schema)->not->toHaveKey('allOf')
        ->and($schema['properties'])->toHaveKeys(['count', 'plain']);
});

it('documents the page props and marks deferred props optional', function () {
    $page = data_get($this->document(), 'paths./posts.get.responses.200.content.application/json.schema.allOf.1');

    expect($page['properties'])->toHaveKeys(['title', 'status', 'widget', 'stats'])
        ->and($page['required'])->toContain('title')
        ->and($page['required'])->not->toContain('stats');
});

it('infers enum helper methods from the configured trait', function () {
    $document = $this->document();
    $index = data_get($document, 'paths./posts.get.responses.200.content.application/json.schema.allOf.1.properties');

    expect($index['status'])->toBe([
        'type' => 'object',
        'properties' => ['value' => ['type' => 'string'], 'label' => ['type' => 'string']],
        'required' => ['value', 'label'],
    ])
        ->and($index['draft'])->toBe(['type' => 'string'])
        ->and(data_get($document, 'paths./posts/status/{status}.get.responses.200.content.application/json.schema.allOf.1.properties.label'))
        ->toBe(['type' => 'string']);
});

it('documents a shared component prop as a reference to its own schema', function () {
    $document = $this->document();

    expect(data_get($document, 'paths./posts.get.responses.200.content.application/json.schema.allOf.1.properties.widget'))
        ->toBe(['$ref' => '#/components/schemas/WidgetResource'])
        ->and(data_get($document, 'components.schemas.WidgetResource'))->toBe(['type' => 'object', 'title' => 'WidgetResource']);
});

it('documents the form request of a route as its request body', function () {
    $document = $this->document();

    expect(data_get($document, 'paths./posts.post.requestBody.content.application/json.schema'))
        ->toBe(['$ref' => '#/components/schemas/StorePostRequest']);

    $schema = data_get($document, 'components.schemas.StorePostRequest');

    expect($schema['properties'])->toHaveKeys(['title', 'published'])
        ->and($schema['required'])->toBe(['title']);
});

it('documents paginated resource collections and paginators mapped with through as their array shape', function () {
    $props = data_get($this->document(), 'paths./posts/paginated.get.responses.200.content.application/json.schema.allOf.1.properties');

    expect(array_keys($props['pages']['properties']))->toContain('current_page', 'data', 'last_page', 'total', 'links')
        ->and(array_keys($props['simple']['properties']))->toContain('current_page', 'data', 'next_page_url')
        ->and(array_keys($props['simple']['properties']))->not->toContain('total')
        ->and(array_keys($props['cursor']['properties']))->toContain('data', 'next_cursor', 'prev_cursor')
        ->and($props['pages']['properties']['data']['items'])->toBe(['$ref' => '#/components/schemas/PostResource'])
        ->and($props['names']['properties']['data']['items']['properties'])->toBe(['name' => ['type' => 'string']]);
});
