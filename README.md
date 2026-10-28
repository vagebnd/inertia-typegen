# Inertia Typegen

[![Latest Version on Packagist](https://img.shields.io/packagist/v/vagebond/inertia-typegen.svg?style=flat-square)](https://packagist.org/packages/vagebond/inertia-typegen)
[![GitHub Tests Action Status](https://img.shields.io/github/actions/workflow/status/vagebnd/inertia-typegen/run-tests.yml?branch=main&label=tests)](https://github.com/vagebnd/inertia-typegen/actions?query=workflow%3Arun-tests+branch%3Amain)
[![GitHub Code Style Action Status](https://img.shields.io/github/actions/workflow/status/vagebnd/inertia-typegen/fix-php-code-style-issues.yml?branch=main)](https://github.com/vagebnd/inertia-typegen/actions?query=workflow%3A"Fix+PHP+code+style+issues"+branch%3Amain)
[![Total Downloads](https://img.shields.io/packagist/dt/vagebond/inertia-typegen.svg?style=flat-square)](https://packagist.org/packages/vagebond/inertia-typegen)

Generate TypeScript types and route helpers for Inertia pages from Scramble's OpenAPI document.

> **Status:** 0.x. A minor release (0.2, 0.3) can contain breaking changes until 1.0. `composer require vagebond/inertia-typegen` writes `^0.1`, which allows only 0.1.x.

```
Laravel routes and controllers
  └─> Scramble with the extensions of this package   → OpenAPI document at /docs/{document}.json
        └─> Vite plugin or CLI                      → inertia.d.ts  (Inertia.Pages, Requests, Shared, Schemas)
                                                    → routes/**/index.ts  (route helpers)
```

You write no types by hand. A controller that returns `Inertia::render('posts/index', [...])` gives `Inertia.Pages.Posts.Index`. A form request gives `Inertia.Requests.Posts.Store`. Each named route gives a typed helper that builds its URL.

## Requirements

- PHP 8.3 or newer and Laravel 12 or 13
- `dedoc/scramble` 0.13.49 or newer, as a development dependency
- `inertiajs/inertia-laravel` 2 or 3
- Node 22.18 or newer and Vite 6 or newer

Older Scramble versions are not supported. Scramble 0.13.21 and older have a remote code execution vulnerability (GHSA-4rm2-28vj-fj39), and Scramble 0.13.24 to 0.13.48 recurse without end on a controller that returns `redirect()`.

## Installation

Install the package as a normal dependency, and Scramble as a development dependency:

```bash
composer require vagebond/inertia-typegen
composer require --dev dedoc/scramble
```

The JS part is in `vendor/`, and a production build installs it from there. `composer install --no-dev` would leave a development dependency out, and the build would fail. Without Scramble the package does nothing: production gets no Scramble, no routes and no Scramble extensions.

The JS part is in the Composer package. Add it to `package.json` and install it:

```json
{
  "devDependencies": {
    "@vagebond/inertia-typegen": "file:vendor/vagebond/inertia-typegen/js"
  }
}
```

Run `pnpm install` again after each `composer update` of this package.

Publish the configuration file:

```bash
php artisan vendor:publish --tag="inertia-typegen-config"
```

## Configuration

```php
use App\Enums\Concerns\EnumHelpers;

return [
    'documents' => [
        'admin' => [
            'route_names' => ['admin.'],
            'uri_prefixes' => ['auth/' => 'auth'],
        ],
    ],

    'enum_helpers' => EnumHelpers::class,
];
```

- `documents`: each key becomes a Scramble API. `php artisan scramble:export --api={key}` writes its OpenAPI document.
  - `route_names`: route-name prefixes to include. An empty string includes all routes.
  - `uri_prefixes`: URI prefixes to include, with the namespace segment for their operations. The example puts the Fortify routes under `auth/` into `Inertia.Pages.Auth`.
  - `expose`: `true` adds a UI at `/docs/{key}` and the document at `/docs/{key}.json`. The default is `false`.
- `enum_helpers`: a trait with `description()`, `toArray()`, `asSelectArray()` and `collect()` methods. `null` disables the extension.
- `extensions`: the Scramble extensions of this package. They run before the extensions in `config/scramble.php`, so your own extensions can replace their schemas.

Redirect routes are never in a document.

### No endpoint by default

A document lists every route, parameter and prop of your application. The package therefore adds no HTTP endpoint unless you set `expose` to `true`. An exposed document uses the middleware in `scramble.middleware`. Scramble's default, `RestrictedDocsAccess`, allows it only in the `local` environment or when the `viewApiDocs` gate allows it.

Scramble itself serves its default API at `/docs/api`. Call `Scramble::ignoreDefaultRoutes()` in a service provider if you do not use that API.

### Shared data

Give your Inertia middleware a name for its shared data:

```php
use Vagebond\InertiaTypegen\Attributes\InertiaSharedType;

#[InertiaSharedType('App')]
class HandleInertiaRequests extends Middleware
{
}
```

The shared data becomes `Inertia.Shared.App`, and each page type starts with `Inertia.Shared.App &`. A page prop with the same name as a shared prop replaces it, as in Inertia, so that page type starts with `Omit<Inertia.Shared.App, 'name'> &`.

## Vite plugin

```ts
import { typegen } from '@vagebond/inertia-typegen/vite'

export default defineConfig({
  plugins: [
    typegen({
      document: 'admin',
      types: 'resources/js/types/inertia.d.ts',
      routes: 'resources/js/routes',
      typeImports: {
        TableResource: { type: 'TableResource', from: '@/components/table' },
      },
    }),
  ],
})
```

| Option          | Default                               | Description                                                                                        |
| --------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `document`      | `'app'`                               | The document name from the PHP configuration.                                                      |
| `types`         | required                              | The output file for the types.                                                                     |
| `routes`        | none                                  | The folder for the route helpers, or `{ path, runtime }`.                                          |
| `typeImports`   | `{}`                                  | Component schemas to replace with an import of your own type.                                      |
| `namespace`     | `'Inertia'`                           | The name of the root namespace.                                                                    |
| `format`        | `'auto'`                              | `'vite-plus'`, `'prettier'`, `false` or a function. `'auto'` uses the first one that is installed. |
| `formatOptions` | `{}`                                  | Options for the formatter.                                                                         |
| `documentUrl`   | none                                  | Read the document over HTTP instead of with `php artisan scramble:export`. Needs `expose`.         |
| `php`           | Herd's PHP binary or `php`            | The PHP command for `scramble:export`. With Laravel Herd, the plugin asks `herd which-php` once.   |
| `watch`         | `['app']`                             | Folders with PHP files that cause a new generation when they change.                               |
| `debounce`      | `300`                                 | Milliseconds to wait after a PHP change before the next generation.                                |
| `plugins`       | `[]`                                  | See [Plugins](#plugins).                                                                           |

The dev server reads the document when it starts and again when a PHP file changes. By default it runs `php artisan scramble:export`, so no endpoint is necessary. An exposed document over HTTP is a little faster, because PHP-FPM keeps OPcache warm. The dev server writes files only when their content changes.

The generator copies the route runtime to `_runtime.ts` in the routes folder. Set `routes: { path, runtime: '@/lib/route' }` to import your own runtime instead.

## CLI

```bash
inertia-typegen --config vite.config.ts
```

The CLI exports each document with `php artisan scramble:export` and writes the same files as the dev server. It needs no running server.

- `--config <file>`: the Vite config with the plugin. Repeat the option for more configs.
- `--check`: compare the files with a fresh generation and exit with code 1 when they differ. Use it in CI or in a test.
- `--out-dir <dir>`: write to this folder instead.
- `--php <command>`: the PHP command. The default is the `php` option of the plugin, else Herd's PHP binary when Laravel Herd is in `PATH`, else `php`.

Commit the generated files. A production build then needs no PHP.

## Usage

```vue
<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import { store } from '@/routes/admin/posts'
import type { Inertia } from '@/types/inertia'

defineProps<Inertia.Pages.Posts.Create>()

const form = useForm<Inertia.Requests.Posts.Store>({ title: '' })

form.post(store.url())
</script>
```

A route helper returns `{ url, method }` and has a `url()` method. It accepts a value, a record, a tuple or a model object with the route key, and a query string:

```ts
show.url(post.slug)
show.url({ post: post.slug })
show.url({ slug: post.slug })
index.url({ query: { page: 2 } })
```

## Extending

### PHP

The array shape of a `@return` docblock wins when the inferred body of the method misses one of its keys. The inferred type stays when it has every key, because it is usually richer.

Add your own Scramble extensions to `config/scramble.php`. To give a PHP class a type of its own, extend `SharedComponentTypeInfer`:

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

Then map `ChartResource` to your component's type with `typeImports`.

The package already includes two bridges. They do nothing when their package is not installed:

- `TableTypeInfer` maps `InertiaUI\Table\Table` (inertiaui/table) to `TableResource`.
- `SqidsTypeInfer` types the `sqid` attribute of red-explosion/laravel-sqids as `string`. The accessor returns `?string`, because an unsaved model has no key.

### Plugins

A plugin is an object with a name and one or more hooks:

```ts
import type { TypegenPlugin } from '@vagebond/inertia-typegen/vite'

const internalRoutes: TypegenPlugin = {
  name: 'internal-routes',
  filterRoute: (route) => !route.name.startsWith('admin.internal.'),
}
```

| Hook                                    | Description                                    |
| --------------------------------------- | ---------------------------------------------- |
| `transformDocument(document)`           | Change the OpenAPI document before the render. |
| `filterRoute(route)`                    | Return `false` to skip the helper of a route.  |
| `routeExportName(route, name)`          | Change the export name of a route helper.      |
| `transformOutput({ kind, path, code })` | Change a generated file before it is written.  |

## AI assistants

The package ships a guideline and a skill for [Laravel Boost](https://github.com/laravel/boost):

- The guideline tells the assistant to use the generated types and route helpers, and to fix a wrong type in the PHP source.
- The `inertia-typegen-development` skill covers the configuration, the type names, the route helpers, extensions and debugging.

Run `php artisan boost:install` and select `vagebond/inertia-typegen`, or add it to `packages` in `boost.json` and run `php artisan boost:update`.

## Testing

```bash
composer test
cd js && pnpm test
```

## License

The MIT License (MIT). See [License File](LICENSE.md).
