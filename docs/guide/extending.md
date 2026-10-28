---
description: Extend inertia-typegen with docblock shapes, your own Scramble extensions, the bundled bridges and plugins for the generator.
---

# Extending

## PHP

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

## Plugins

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
