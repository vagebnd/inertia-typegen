<?php

declare(strict_types=1);

namespace Vagebond\InertiaTypegen\Tests\Fixtures\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PostResource extends JsonResource
{
    /**
     * @return array{title: string}
     */
    public function toArray(Request $request): array
    {
        return [
            'title' => 'Title',
        ];
    }
}
