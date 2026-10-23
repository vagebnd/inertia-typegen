<?php

declare(strict_types=1);

namespace Vagebond\InertiaTypegen\Tests\Fixtures\Support;

use Illuminate\Contracts\Support\Arrayable;

/**
 * @implements Arrayable<string, mixed>
 */
class Widget implements Arrayable
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return ['name' => 'widget'];
    }
}
