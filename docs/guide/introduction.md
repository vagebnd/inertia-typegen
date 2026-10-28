---
description: What inertia-typegen generates from a Laravel and Inertia app, and how the steps from your controllers to TypeScript work.
---

# Introduction

Inertia Typegen generates TypeScript types and route helpers for Inertia pages from Scramble's OpenAPI document.

::: warning Status
The package is 0.x. A minor release (0.2, 0.3) can contain breaking changes until 1.0. `composer require vagebond/inertia-typegen` writes `^0.1`, which allows only 0.1.x.
:::

```
Laravel routes and controllers
  └─> Scramble with the extensions of this package   → OpenAPI document at /docs/{document}.json
        └─> Vite plugin or CLI                      → inertia.d.ts  (Inertia.Pages, Requests, Shared, Schemas)
                                                    → routes/**/index.ts  (route helpers)
```

You write no types by hand. A controller that returns `Inertia::render('posts/index', [...])` gives `Inertia.Pages.Posts.Index`. A form request gives `Inertia.Requests.Posts.Store`. Each named route gives a typed helper that builds its URL.

## What you get

- **Page props.** Each `Inertia::render()` call becomes a page type. Deferred props are optional.
- **Requests.** The rules of a form request become the type of its form data.
- **Shared data.** The shared data of your Inertia middleware becomes one type, and each page type includes it.
- **Resources and paginators.** JSON resources, resource collections and paginators keep their real shape. A length-aware, simple or cursor paginator gives its full array shape, with typed `data`.
- **Enums.** A PHP enum becomes a union of its values.
- **Route helpers.** Each named route gets a helper that builds its URL from typed parameters.

## Next steps

- [Install the package](/guide/installation).
- [Configure your documents](/guide/configuration).
- [Use the types and the route helpers](/guide/usage).
