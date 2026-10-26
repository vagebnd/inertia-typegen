<?php

declare(strict_types=1);

namespace Vagebond\InertiaTypegen\Tests\Fixtures\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;
use Vagebond\InertiaTypegen\Tests\Fixtures\Http\Resources\CommentResource;
use Vagebond\InertiaTypegen\Tests\Fixtures\Models\Comment;

class CommentController
{
    public function __invoke(): Response
    {
        return Inertia::render('comments/show', [
            'comment' => new CommentResource(new Comment()),
        ]);
    }
}
