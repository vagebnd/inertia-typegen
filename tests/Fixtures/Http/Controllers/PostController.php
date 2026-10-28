<?php

declare(strict_types=1);

namespace Vagebond\InertiaTypegen\Tests\Fixtures\Http\Controllers;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Pagination\CursorPaginator;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Pagination\Paginator;
use Inertia\Inertia;
use Inertia\Response;
use Vagebond\InertiaTypegen\Tests\Fixtures\Enums\Status;
use Vagebond\InertiaTypegen\Tests\Fixtures\Http\Requests\StorePostRequest;
use Vagebond\InertiaTypegen\Tests\Fixtures\Http\Resources\PostResource;
use Vagebond\InertiaTypegen\Tests\Fixtures\Models\Post;
use Vagebond\InertiaTypegen\Tests\Fixtures\Support\Grid;
use Vagebond\InertiaTypegen\Tests\Fixtures\Support\Widget;

class PostController
{
    public function index(): Response
    {
        return Inertia::render('posts/index', [
            'title' => 'Posts',
            'status' => Status::toArray(),
            'draft' => Status::Draft->description(),
            'posts' => new Collection([new Post()]),
            'widget' => new Widget(),
            'stats' => Inertia::defer(fn() => ['total' => 1]),
        ]);
    }

    public function status(Status $status): Response
    {
        return Inertia::render('posts/status', [
            'label' => $status->description(),
        ]);
    }

    public function paginated(): Response
    {
        return Inertia::render('posts/paginated', [
            'pages' => PostResource::collection(new LengthAwarePaginator([], 0, 15)),
            'simple' => PostResource::collection(new Paginator([], 15)),
            'cursor' => PostResource::collection(new CursorPaginator([], 15)),
            'names' => (new LengthAwarePaginator([], 0, 15))->through(fn(string $name) => ['name' => $name]),
        ]);
    }

    public function grid(): Response
    {
        return Inertia::render('posts/grid', [
            'grid' => Grid::fromItems(new Collection([new Post()]), true),
            'kind' => Grid::kind(),
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
