<?php

declare(strict_types=1);

use Vagebond\InertiaTypegen\Extensions\EnumHelpersExtension;
use Vagebond\InertiaTypegen\Extensions\InertiaExtension;
use Vagebond\InertiaTypegen\Extensions\RouteMetadataExtension;
use Vagebond\InertiaTypegen\InertiaTypegenServiceProvider;
use Vagebond\InertiaTypegen\Tests\Fixtures\Support\WidgetTypeInfer;

it('puts the package extensions before the extensions of the application', function () {
    $extensions = config('scramble.extensions');

    expect($extensions)->toBe([...config('inertia-typegen.extensions'), WidgetTypeInfer::class]);
});

it('does not register a package extension twice', function () {
    config()->set('scramble.extensions', [InertiaExtension::class, WidgetTypeInfer::class]);

    app()->register(InertiaTypegenServiceProvider::class, force: true);

    expect(array_count_values(config('scramble.extensions'))[InertiaExtension::class])->toBe(1)
        ->and(config('scramble.extensions'))->toContain(WidgetTypeInfer::class);
});

it('leaves out the enum helpers extension when no trait is configured', function () {
    config()->set('inertia-typegen.enum_helpers', null);
    config()->set('scramble.extensions', []);

    app()->register(InertiaTypegenServiceProvider::class, force: true);

    expect(config('scramble.extensions'))->not->toContain(EnumHelpersExtension::class)
        ->and(config('scramble.extensions'))->toContain(RouteMetadataExtension::class);
});
