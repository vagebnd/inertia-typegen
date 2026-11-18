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
use Vagebond\InertiaTypegen\Tests\Fixtures\Support\PostLive;
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

    public function live(): Response
    {
        return Inertia::render('posts/live', [
            'total' => Inertia::live(fn() => 1, on: 'PostPublished', channel: 'posts'),
            'latest' => Inertia::live(on: 'PostPublished', channel: 'posts', value: fn() => ['title' => 'Post']),
            'heading' => Inertia::live('Posts', 'PostPublished', 'posts'),
            'counts' => Inertia::live(['published' => 1], on: PostLive::EVENT, channel: PostLive::channel()),
            /** @var list<array{id: int, name: string}> */
            'rooms' => Inertia::live(Post::all(), on: PostLive::EVENT, channel: PostLive::channel()),
            'helper' => PostLive::prop(['count' => 1]),
            'activity' => Inertia::defer(fn() => ['count' => 1])->live(on: 'PostPublished', channel: 'posts'),
            'drafts' => Inertia::optional(fn() => ['count' => 1])->live(on: 'PostPublished', channel: 'posts'),
            'pinned' => Inertia::always(fn() => ['count' => 1])->live(on: 'PostPublished', channel: 'posts'),
            'summary' => Inertia::once(fn() => ['count' => 1])->live(on: 'PostPublished', channel: 'posts'),
        ]);
    }

    public function merged(): Response
    {
        return Inertia::render('posts/merged', [
            'tags' => Inertia::merge(fn() => ['name' => 'php']),
            'filters' => Inertia::deepMerge(['status' => 'draft']),
            'notice' => Inertia::always(fn() => 'Saved'),
            'plan' => Inertia::once(fn() => ['name' => 'free']),
            /** @var list<array{id: int, text: string}> */
            'events' => Inertia::merge(fn() => []),
        ]);
    }

    public function followed(): Response
    {
        return Inertia::render('posts/followed', [
            'count' => 1,
        ])->followPosts('count');
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
