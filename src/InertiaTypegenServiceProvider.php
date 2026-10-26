<?php

declare(strict_types=1);

namespace Vagebond\InertiaTypegen;

use Dedoc\Scramble\Scramble;
use Spatie\LaravelPackageTools\Package;
use Spatie\LaravelPackageTools\PackageServiceProvider;
use Vagebond\InertiaTypegen\Extensions\EnumHelpersExtension;

class InertiaTypegenServiceProvider extends PackageServiceProvider
{
    public function configurePackage(Package $package): void
    {
        $package
            ->name('inertia-typegen')
            ->hasConfigFile();
    }

    public function packageRegistered(): void
    {
        if (! $this->scrambleIsInstalled()) {
            return;
        }

        $extensions = array_filter(
            config('inertia-typegen.extensions', []),
            fn(string $extension) => $extension !== EnumHelpersExtension::class || config('inertia-typegen.enum_helpers') !== null,
        );

        config()->set('scramble.extensions', array_values(array_unique([
            ...$extensions,
            ...config('scramble.extensions', []),
        ])));
    }

    public function packageBooted(): void
    {
        if (! $this->scrambleIsInstalled()) {
            return;
        }

        foreach (config('inertia-typegen.documents', []) as $name => $config) {
            $document = InertiaDocument::fromConfig($name, $config);

            $api = Scramble::registerApi($name)
                ->routes($document->includes(...))
                ->afterOpenApiGenerated($document->normalizeOperationIds(...));

            if ($document->expose) {
                $api->expose(ui: "/docs/{$name}", document: "/docs/{$name}.json");
            }
        }
    }

    private function scrambleIsInstalled(): bool
    {
        return class_exists(Scramble::class);
    }
}
