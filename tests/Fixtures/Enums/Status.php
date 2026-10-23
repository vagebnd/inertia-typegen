<?php

declare(strict_types=1);

namespace Vagebond\InertiaTypegen\Tests\Fixtures\Enums;

enum Status: string
{
    use EnumHelpers;

    case Draft = 'draft';
    case Published = 'published';
}
