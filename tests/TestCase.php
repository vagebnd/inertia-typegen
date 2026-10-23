<?php

declare(strict_types=1);

namespace Vagebond\InertiaTypegen\Tests;

use Orchestra\Testbench\TestCase as Orchestra;
use Vagebond\InertiaTypegen\InertiaTypegenServiceProvider;

class TestCase extends Orchestra
{
    protected function getPackageProviders($app): array
    {
        return [
            InertiaTypegenServiceProvider::class,
        ];
    }
}
