<?php

declare(strict_types=1);

namespace Vagebond\InertiaTypegen\Tests\Fixtures\Support;

use Illuminate\Support\Collection;
use Vagebond\InertiaTypegen\Tests\Fixtures\Models\Post;

final class Grid
{
    /**
     * @param  Collection<int, Post>  $items
     * @return list<array{uid: string, title: string, color: string}>
     */
    public static function fromItems(Collection $items, bool $colored): array
    {
        return $items
            ->map(function (Post $item) use ($colored): array {
                return [
                    'uid' => 'item',
                    'title' => $item->title,
                    ...($colored ? ['color' => 'red'] : []),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return array{kind: string}
     */
    public static function kind(): array
    {
        return ['kind' => 'grid'];
    }
}
