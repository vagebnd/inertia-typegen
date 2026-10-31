---
title: 'Laravel Boost guideline and skill | Inertia Typegen'
titleTemplate: false
description: The Laravel Boost guideline and skill of inertia-typegen tell AI assistants to use the generated types and route helpers.
---

# AI assistants

The package ships a guideline and a skill for [Laravel Boost](https://github.com/laravel/boost):

- The guideline tells the assistant to use the generated types and route helpers, and to fix a wrong type in the PHP source.
- The `inertia-typegen-development` skill covers the configuration, the type names, the route helpers, extensions and debugging.

Run `php artisan boost:install` and select `vagebond/inertia-typegen`, or add it to `packages` in `boost.json` and run `php artisan boost:update`.
