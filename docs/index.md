---
layout: home
title: Inertia Typegen
titleTemplate: TypeScript types and route helpers for Laravel and Inertia
description: Generate TypeScript types and route helpers for Inertia pages from your Laravel routes, controllers and form requests, through Scramble.

landing:
  name: Inertia Typegen
  title: TypeScript types for Inertia pages, from your Laravel code.
  lead: Page props, form requests, shared data and route helpers, generated through Scramble. You write no types by hand.
  primary:
    text: Get started
    link: /guide/introduction
  secondary:
    text: View on GitHub
    link: https://github.com/vagebnd/inertia-typegen
  install: composer require vagebond/inertia-typegen
  chips: [Laravel 12 and 13, Inertia 2 and 3, Scramble, Vite]

highlights:
  eyebrow: What it generates
  title: Every type that a page needs.
  text: The generator reads your routes, controllers and form requests. Your pages get the same shapes that PHP sends.
  items:
    - icon: page
      title: Page props
      details: Each Inertia::render() call becomes a page type. Deferred props are optional.
    - icon: form
      title: Form requests
      details: The rules of a form request become the type of its form data.
    - icon: resource
      title: Resources and paginators
      details: JSON resources, collections and paginators keep their real shape, data included.
    - icon: route
      title: Route helpers
      details: Each named route gets a typed helper that builds its URL.
    - icon: live
      title: Live in development
      details: The Vite dev server generates the files again after a PHP change.
    - icon: check
      title: Checked in CI
      details: inertia-typegen --check fails when the committed files are stale.
---

## From PHP to TypeScript

A controller and a form request:

::: code-group

```php [AuthController.php]
public function login(): Response
{
    return Inertia::render('auth/login', [
        'canResetPassword' => true,
    ]);
}
```

```php [StorePostRequest.php]
public function rules(): array
{
    return [
        'title' => ['required', 'string'],
        'published' => ['boolean'],
    ];
}
```

:::

The generator writes this to `inertia.d.ts`:

```ts
export namespace Inertia {
  export namespace Pages {
    export namespace Auth {
      export type Login = Inertia.Shared.App & {
        canResetPassword: boolean
      }
    }
  }
  export namespace Requests {
    export namespace Posts {
      export type Store = {
        title: string
        published?: boolean
      }
    }
  }
}
```

A page then uses the types and the route helpers:

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

[Read the introduction](/guide/introduction) to see how it works.
