---
title: 'Use page types and route helpers | Inertia Typegen'
titleTemplate: false
description: Use the generated Inertia page types, request types and route helpers in your Vue pages and forms.
---

# Usage

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

## Route helpers

A route helper returns `{ url, method }` and has a `url()` method. It accepts a value, a record, a tuple or a model object with the route key, and a query string:

```ts
show.url(post.slug)
show.url({ post: post.slug })
show.url({ slug: post.slug })
index.url({ query: { page: 2 } })
```

Next: [extend the generator](/guide/extending).
