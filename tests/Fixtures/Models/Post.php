<?php

declare(strict_types=1);

namespace Vagebond\InertiaTypegen\Tests\Fixtures\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property string $slug
 */
class Post extends Model
{
    public function getRouteKeyName(): string
    {
        return 'slug';
    }
}
