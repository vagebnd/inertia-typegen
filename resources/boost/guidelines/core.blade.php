## Inertia Typegen

`vagebond/inertia-typegen` generates TypeScript types and route helpers for Inertia pages from the backend, through Scramble.

@verbatim
- Never write types for Inertia page props, form requests or shared data by hand. Use the generated namespace: `defineProps<Inertia.Pages.Posts.Index>()`, `useForm<Inertia.Requests.Posts.Store>({ ... })`.
- Never edit the generated files (the types file, usually `inertia.d.ts`, and the route helpers folder). The generator overwrites them.
- Use the generated route helpers to build URLs, not hard-coded paths.
- When a generated type is wrong or missing, fix the PHP source: the `Inertia::render()` props, the FormRequest `rules()`, the resource `toArray()` or a Scramble extension. Do not override the type in TypeScript.
- The Vite dev server regenerates the files after a PHP change. Without a dev server, run the `inertia-typegen` CLI. `inertia-typegen --check` fails when the committed files are stale.
- Activate the `inertia-typegen-development` skill to configure the package, add extensions or debug a type.
@endverbatim
