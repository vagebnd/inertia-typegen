---
name: inertia-typegen-development
description: Use when working with vagebond/inertia-typegen, the generator of TypeScript types and route helpers for Inertia pages. Activate when you use or debug the `Inertia.Pages.*`, `Inertia.Requests.*`, `Inertia.Shared.*` or `Inertia.Schemas.*` types or the generated route helpers, when a new Inertia page or form request needs types, when a generated type is wrong or missing, or when you edit `config/inertia-typegen.php`, the `typegen()` Vite plugin, the `inertia-typegen` CLI, `#[InertiaSharedType]` or a Scramble extension for Inertia.
---

# Inertia Typegen Development

`vagebond/inertia-typegen` reads the Laravel routes and controllers with Scramble and generates:

- one types file (usually `inertia.d.ts`) with the `Inertia.Pages`, `Inertia.Requests`, `Inertia.Shared` and `Inertia.Schemas` namespaces
- one route helper module for each route-name prefix, plus `_runtime.ts`

```
Laravel routes, controllers, form requests, Inertia middleware
  └─> Scramble with the package extensions   → OpenAPI document (php artisan scramble:export --api={document})
        └─> Vite plugin or CLI              → types file + route helpers (both committed)
```

## Rules

- Do not write page, request or shared-data types by hand. Use the generated types.
- Do not edit the generated files. The generator overwrites them.
- When a type is wrong, fix the PHP source, then regenerate. An intersection type (`& { extra: string }`) is acceptable only for data that Scramble cannot see, such as props from a closure.
- Commit the generated files. A production build does not run PHP.
- Do not set `'expose' => true` unless the project asks for it. A document lists every route, parameter and prop of the application.

## Generating

- The Vite dev server generates the files when it starts and again 300 ms after a PHP change in the watched folders (default `app/`).
- Without a dev server, run the CLI: `inertia-typegen --config <vite config with the plugin>`.
- `inertia-typegen --config <file> --check` exits with code 1 and lists the changed, missing and extra files when the committed files are stale. Use it in CI or in a test.
- `--out-dir <dir>` writes to another folder. `--php "<command>"` sets the PHP command (default: the binary from `herd which-php` when Laravel Herd is in `PATH`, else `php`).

## Using the types

```ts
import type { Inertia } from '@/types/inertia'

defineProps<Inertia.Pages.Posts.Index>()

const form = useForm<Inertia.Requests.Posts.Store>({ title: '', published: false })
```

The type name comes from the operation id, which is `{document}.{route name}`:

| Route name | Document `admin` operation id | Type |
|---|---|---|
| `admin.posts.index` | `admin.posts.index` | `Inertia.Pages.Posts.Index` |
| `admin.two-factor.enable` | `admin.two-factor.enable` | `Inertia.Pages.TwoFactor.Enable` |
| `login`, under the URI prefix `auth/` with segment `auth` | `admin.auth.login` | `Inertia.Pages.Auth.Login` |

- A page type is the object part of the 200 JSON response. With shared data it is `Inertia.Shared.{Name} & { ... }`. A page prop with the same name as a shared prop replaces it: `Omit<Inertia.Shared.{Name}, 'name'> & { ... }`.
- A request type is the JSON or multipart request body, mostly from FormRequest `rules()`. A field with a default value is optional.
- `Inertia.Schemas.{Name}` holds the named component schemas, such as API resources and enums.
- A page without props is `{}`.
- Props from `Inertia::defer()`, `Inertia::optional()` and `Inertia::lazy()` are optional.
- A paginated resource collection, and a paginator mapped with `->through()`, becomes the paginator array (`data`, `current_page`, `links` and the other paginator keys).

## Using the route helpers

Each route-name prefix becomes a module. `admin.posts.show` is the `show` export of `<routes folder>/admin/posts/index.ts`. A reserved word gets a `Method` suffix: `admin.posts.delete` exports `deleteMethod`.

```ts
import { show, index } from '@/routes/admin/posts'

show.url(post.slug)                       // one parameter: the value
show.url({ post: post.slug })             // a record
show.url({ slug: post.slug })             // a model object with the route key
show.url([post.slug])                     // a tuple
index.url({ query: { page: 2 } })         // a query string
show(post.slug)                           // { url, method }
```

- The route key comes from the model binding (`getRouteKeyName()` or `{post:slug}`).
- Optional parameters must be at the end. A missing required parameter throws.
- `mergeQuery` merges with the current `window.location.search`.

## Adding a page or a form request

1. Give the route a name that the document includes (see `route_names` and `uri_prefixes` in `config/inertia-typegen.php`). An unnamed route has no stable operation id.
2. Return `Inertia::render('posts/index', [...])` or `Inertia::modal(...)` directly from the controller action, with return type `Inertia\Response` (`InertiaUI\Modal\Modal` for a modal) or no return type. Scramble uses the declared return type when the inferred type does not match it, and the props are then lost.
3. Type a form with a FormRequest that has a static `rules()` array.
4. Let the dev server regenerate, or run the CLI.

## Configuration

`config/inertia-typegen.php`:

```php
use App\Enums\Concerns\EnumHelpers;

return [
    'documents' => [
        'admin' => [
            'route_names' => ['admin.'],            // an empty string includes all routes
            'uri_prefixes' => ['auth/' => 'auth'],  // URI prefix => operation id segment
            'expose' => false,                      // true adds /docs/admin and /docs/admin.json
        ],
    ],
    'enum_helpers' => EnumHelpers::class,           // null disables the enum helper extension
    // 'extensions' => [...],                       // the package extensions, in order
];
```

- Each document is a Scramble API. Redirect routes are never in a document.
- Without Scramble (production), the package registers nothing.
- An exposed document uses `scramble.middleware`, by default `RestrictedDocsAccess`: the `local` environment or the `viewApiDocs` gate.

The Vite plugin:

```ts
import { typegen } from '@vagebond/inertia-typegen/vite'

typegen({
  document: 'admin',
  types: 'resources/js/types/inertia.d.ts',
  routes: 'resources/js/routes',            // or { path, runtime: '@/lib/route' }
  typeImports: { TableResource: { type: 'TableResource', from: '@/components/table' } },
  // namespace, format, formatOptions, documentUrl, php, watch, debounce (ms, default 300), plugins
})
```

## Shared data

Give the Inertia middleware a type name:

```php
use Vagebond\InertiaTypegen\Attributes\InertiaSharedType;

#[InertiaSharedType('App')]
class HandleInertiaRequests extends Middleware {}
```

The `share()` return shape becomes `Inertia.Shared.App`. Closures in `share()` are unwrapped to their return type. A middleware without the attribute merges its shared props into each page type.

## Types of your own components

When a component owns its prop type (a data table, a file browser):

1. Map the PHP class to an empty named schema with an extension of `SharedComponentTypeInfer`, and add it to `config/scramble.php`.
2. Map that schema name to the component type with `typeImports` in the Vite plugin.
3. Keep the component type and the PHP `toArray()` in agreement. Nothing checks this.

```php
use Vagebond\InertiaTypegen\Extensions\SharedComponentTypeInfer;

class ChartTypeInfer extends SharedComponentTypeInfer
{
    protected function className(): string
    {
        return Chart::class;
    }

    protected function schemaName(): string
    {
        return 'ChartResource';
    }
}
```

`InertiaUI\Table\Table` already maps to `TableResource`, and `SqidsTypeInfer` types the laravel-sqids `sqid` attribute as `string`.

## Writing Scramble extensions

- The package extensions run before the extensions in `config/scramble.php`.
- For schema extensions (`TypeToSchemaExtension`), the last match wins, so an application extension replaces a package schema.
- For inference extensions (method, property and expression types), the first type wins, so a package extension wins. Remove it from `inertia-typegen.extensions` to replace it.
- Read class definitions with `$this->infer->index->getClass($name)`. `Infer::analyzeClass()` forces a full analysis of vendor classes and fails for `Eloquent\Collection` on current Scramble versions.
- Scramble resolves many types later as reference types. To type a method on a class, use a `MethodReturnTypeExtension` or a `PropertyTypeExtension`, not an expression extension that inspects the caller.

## Plugins (JS)

```ts
import type { TypegenPlugin } from '@vagebond/inertia-typegen/vite'

const hideInternal: TypegenPlugin = {
  name: 'hide-internal',
  filterRoute: (route) => !route.name.startsWith('admin.internal.'),
}
```

Hooks: `transformDocument(document)`, `filterRoute(route)`, `routeExportName(route, name)`, `transformOutput({ kind, path, code })`.

## Debugging

- **A route is missing.** Export the document with `php artisan scramble:export --api=<document> --path=/tmp/doc.json` and search for the path. Check the route name against `route_names` and `uri_prefixes`. A route whose name is only a group prefix, such as `admin.posts.`, gets no helper.
- **A page is `{}` or has too few props.** Check that the action returns `Inertia::render()` directly and that its declared return type is `Inertia\Response`. A closure or a helper that wraps the render hides the props from Scramble.
- **Shared data is missing.** Check that the route runs the Inertia middleware and that the middleware has `#[InertiaSharedType]`.
- **A value is `unknown` or too wide.** `array_filter()`, `$request->only()` and anonymous spreads lose their keys. Build the array explicitly, add a `@return` array shape to the method (it wins when the inferred body misses one of its keys), or return a typed object.
- **A value is `| null`.** Scramble reads nullable database columns and accessors such as `?string`. Fix the source, or add a `PropertyTypeExtension` when the value is never null in practice.
- **The dev server types are stale.** Restart the dev server. After a package update, run `pnpm install`, because pnpm copies a `file:` dependency.
