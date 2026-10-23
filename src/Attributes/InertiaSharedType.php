<?php

declare(strict_types=1);

namespace Vagebond\InertiaTypegen\Attributes;

use Attribute;

#[Attribute(Attribute::TARGET_CLASS)]
final class InertiaSharedType
{
    public function __construct(public readonly string $name) {}
}
