<?php

declare(strict_types=1);

namespace Vagebond\InertiaTypegen\Contracts;

/**
 * Implemented by Inertia middleware that wants its shared data shape exported
 * as a named TypeScript type (e.g. `Inertia.Shared.Admin`). The
 * InertiaSharedDataExtension registers the middleware's resolved `share()`
 * shape as a `InertiaShared{Name}` component schema, which the type-generator
 * surfaces under the `Inertia.Shared` namespace.
 */
interface ProvidesInertiaSharedType
{
    public static function inertiaSharedTypeName(): string;
}
