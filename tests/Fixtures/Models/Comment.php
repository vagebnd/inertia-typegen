<?php

declare(strict_types=1);

namespace Vagebond\InertiaTypegen\Tests\Fixtures\Models;

use Illuminate\Database\Eloquent\Model;
use RedExplosion\Sqids\Concerns\HasSqids;

class Comment extends Model
{
    use HasSqids;
}
