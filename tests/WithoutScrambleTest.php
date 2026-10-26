<?php

declare(strict_types=1);

use Dedoc\Scramble\Scramble;
use Vagebond\InertiaTypegen\Tests\Fixtures\Support\WidgetTypeInfer;

it('does nothing when Scramble is not installed', function () {
    expect(config('scramble.extensions'))->toBe([WidgetTypeInfer::class]);

    $this->get('/docs/exposed')->assertNotFound();
    $this->get('/docs/exposed.json')->assertNotFound();
})->skip(class_exists(Scramble::class), 'Scramble is installed.');
