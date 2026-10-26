<?php

declare(strict_types=1);

namespace Vagebond\InertiaTypegen\Tests\Fixtures\Enums;

trait EnumHelpers
{
    public function description(): mixed
    {
        return json_decode('"' . $this->value . '"');
    }

    public static function toArray(): mixed
    {
        return json_decode('{}');
    }
}
