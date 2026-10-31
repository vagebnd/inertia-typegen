---
title: 'Inertia Typegen Vite plugin: types after each PHP change'
titleTemplate: false
description: Add the inertia-typegen Vite plugin. It writes the Inertia types and the route helpers, and generates them again after a PHP change.
---

# Vite plugin

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

| Option          | Default                    | Description                                                                                        |
| --------------- | -------------------------- | -------------------------------------------------------------------------------------------------- |
| `document`      | `'app'`                    | The document name from the PHP configuration.                                                      |
| `types`         | required                   | The output file for the types.                                                                     |
| `routes`        | none                       | The folder for the route helpers, or `{ path, runtime }`.                                          |
| `typeImports`   | `{}`                       | Component schemas to replace with an import of your own type.                                      |
| `namespace`     | `'Inertia'`                | The name of the root namespace.                                                                    |
| `format`        | `'auto'`                   | `'vite-plus'`, `'prettier'`, `false` or a function. `'auto'` uses the first one that is installed. |
| `formatOptions` | `{}`                       | Options for the formatter.                                                                         |
| `documentUrl`   | none                       | Read the document over HTTP instead of with `php artisan scramble:export`. Needs `expose`.         |
| `php`           | Herd's PHP binary or `php` | The PHP command for `scramble:export`. With Laravel Herd, the plugin asks `herd which-php` once.   |
| `watch`         | `['app']`                  | Folders with PHP files that cause a new generation when they change.                               |
| `debounce`      | `300`                      | Milliseconds to wait after a PHP change before the next generation.                                |
| `plugins`       | `[]`                       | See [Plugins](/guide/extending#plugins).                                                           |

The dev server reads the document when it starts and again when a PHP file changes. By default it runs `php artisan scramble:export`, so no endpoint is necessary. An exposed document over HTTP is a little faster, because PHP-FPM keeps OPcache warm. The dev server writes files only when their content changes.

The generator copies the route runtime to `_runtime.ts` in the routes folder. Set `routes: { path, runtime: '@/lib/route' }` to import your own runtime instead.

::: tip One folder for each document
The generator removes every file in its routes folder that its own document did not write. Give each document its own routes folder.
:::

Next: [generate without a dev server](/guide/cli).
