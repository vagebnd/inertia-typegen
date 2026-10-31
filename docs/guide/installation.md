---
title: 'Install Inertia Typegen with Composer and Scramble'
titleTemplate: false
description: Install inertia-typegen with Composer and Scramble, add the JS part to package.json, and publish the configuration file.
---

# Installation

## Requirements

- PHP 8.3 or newer and Laravel 12 or 13
- `dedoc/scramble` 0.13.49 or newer, as a development dependency
- `inertiajs/inertia-laravel` 2 or 3
- Node 22.18 or newer and Vite 6 or newer

Older Scramble versions are not supported. Scramble 0.13.21 and older have a remote code execution vulnerability (GHSA-4rm2-28vj-fj39), and Scramble 0.13.24 to 0.13.48 recurse without end on a controller that returns `redirect()`.

## Install the package

Install the package as a normal dependency, and Scramble as a development dependency:

```bash
composer require vagebond/inertia-typegen
composer require --dev dedoc/scramble
```

The JS part is in `vendor/`, and a production build installs it from there. `composer install --no-dev` would leave a development dependency out, and the build would fail. Without Scramble the package does nothing: production gets no Scramble, no routes and no Scramble extensions.

## Add the JS part

The JS part is in the Composer package. Add it to `package.json` and install it:

```json
{
  "devDependencies": {
    "@vagebond/inertia-typegen": "file:vendor/vagebond/inertia-typegen/js"
  }
}
```

Run `pnpm install` again after each `composer update` of this package.

## Publish the configuration

```bash
php artisan vendor:publish --tag="inertia-typegen-config"
```

Next: [configure your documents](/guide/configuration).
