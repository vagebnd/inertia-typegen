<?php

declare(strict_types=1);

namespace Vagebond\InertiaTypegen\Tests\Fixtures\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Vagebond\InertiaTypegen\Tests\Fixtures\Models\Comment;

/**
 * @mixin Comment
 */
class CommentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->sqid,
        ];
    }
}
