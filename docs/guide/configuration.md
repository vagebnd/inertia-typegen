---
description: Configure the documents of inertia-typegen, the enum helpers, the access to the OpenAPI document and the shared data of your Inertia middleware.
---

# Configuration

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

## No endpoint by default

A document lists every route, parameter and prop of your application. The package therefore adds no HTTP endpoint unless you set `expose` to `true`. An exposed document uses the middleware in `scramble.middleware`. Scramble's default, `RestrictedDocsAccess`, allows it only in the `local` environment or when the `viewApiDocs` gate allows it.

Scramble itself serves its default API at `/docs/api`. Call `Scramble::ignoreDefaultRoutes()` in a service provider if you do not use that API.

## Shared data

Give your Inertia middleware a name for its shared data:

```php
use Vagebond\InertiaTypegen\Attributes\InertiaSharedType;

#[InertiaSharedType('App')]
class HandleInertiaRequests extends Middleware
{
}
```

The shared data becomes `Inertia.Shared.App`, and each page type starts with `Inertia.Shared.App &`. A page prop with the same name as a shared prop replaces it, as in Inertia, so that page type starts with `Omit<Inertia.Shared.App, 'name'> &`.

Next: [add the Vite plugin](/guide/vite-plugin).
