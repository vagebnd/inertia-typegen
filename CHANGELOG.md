# Changelog

All notable changes to `inertia-typegen` will be documented in this file.

## v0.1.1 - 2026-10-26

### What's changed

- The dev server waits 300 ms after a PHP change instead of 1 s. The new `debounce` option changes the wait.
- With Laravel Herd, the plugin and the CLI ask `herd which-php` once and call that binary. Each export is about 0.27 s faster in a large application.
- The repository has a security policy, and the issue templates fit it.
- CI uses `actions/setup-node` 7 and `pnpm/action-setup` 6.

**Full Changelog**: https://github.com/vagebnd/inertia-typegen/compare/v0.1.0...v0.1.1

## Initial release - 2026-10-26

**Full Changelog**: https://github.com/vagebnd/inertia-typegen/commits/v0.1.0
