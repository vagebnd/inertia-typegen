<?php

declare(strict_types=1);

namespace Vagebond\InertiaTypegen;

use Spatie\LaravelPackageTools\Package;
use Spatie\LaravelPackageTools\PackageServiceProvider;

class InertiaTypegenServiceProvider extends PackageServiceProvider
{
    public function configurePackage(Package $package): void
    {
        $package
            ->name('inertia-typegen')
            ->hasConfigFile();
    }
}
