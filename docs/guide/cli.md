---
title: 'Inertia Typegen CLI: generate types and check them in CI'
titleTemplate: false
description: Generate the Inertia types and route helpers with the inertia-typegen CLI, and check in CI that the committed files are current.
---

# CLI

```bash
inertia-typegen --config vite.config.ts
```

The CLI exports each document with `php artisan scramble:export` and writes the same files as the dev server. It needs no running server.

- `--config <file>`: the Vite config with the plugin. Repeat the option for more configs.
- `--check`: compare the files with a fresh generation and exit with code 1 when they differ. Use it in CI or in a test.
- `--out-dir <dir>`: write to this folder instead.
- `--php <command>`: the PHP command. The default is the `php` option of the plugin, else Herd's PHP binary when Laravel Herd is in `PATH`, else `php`.

Commit the generated files. A production build then needs no PHP.

Next: [use the types and the route helpers](/guide/usage).
