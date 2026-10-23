<?php

declare(strict_types=1);

namespace Vagebond\InertiaTypegen\Tests\Fixtures\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Vagebond\InertiaTypegen\Tests\Fixtures\Enums\Status;
use Vagebond\InertiaTypegen\Tests\Fixtures\Http\Requests\StorePostRequest;
use Vagebond\InertiaTypegen\Tests\Fixtures\Models\Post;
use Vagebond\InertiaTypegen\Tests\Fixtures\Support\Widget;

class PostController
{
    public function index(): Response
    {
        return Inertia::render('posts/index', [
            'title' => 'Posts',
            'status' => Status::toArray(),
            'widget' => new Widget(),
            'stats' => Inertia::defer(fn() => ['total' => 1]),
        ]);
    }

    public function show(Post $post): Response
    {
        return Inertia::render('posts/show', [
            'slug' => (string) $post->slug,
        ]);
    }

    public function store(StorePostRequest $request): RedirectResponse
    {
        return redirect('/posts');
    }

    public function plain(): Response
    {
        return Inertia::render('posts/plain', [
            'count' => 1,
        ]);
    }
}
