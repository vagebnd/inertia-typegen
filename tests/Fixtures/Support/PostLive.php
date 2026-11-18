<?php

declare(strict_types=1);

namespace Vagebond\InertiaTypegen\Tests\Fixtures\Support;

use Illuminate\Broadcasting\PrivateChannel;
use Inertia\Inertia;
use Inertia\LiveProp;

class PostLive
{
    public const EVENT = 'posts.changed';

    public static function channel(): PrivateChannel
    {
        return new PrivateChannel('posts');
    }

    public static function prop(mixed $value): LiveProp
    {
        return Inertia::live($value, on: self::EVENT, channel: self::channel());
    }
}
