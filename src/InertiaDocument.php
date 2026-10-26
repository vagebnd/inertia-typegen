<?php

declare(strict_types=1);

namespace Vagebond\InertiaTypegen;

use Dedoc\Scramble\Support\Generator\OpenApi;
use Illuminate\Routing\RedirectController;
use Illuminate\Routing\Route;
use Illuminate\Support\Str;

final class InertiaDocument
{
    /**
     * @param  list<string>  $routeNames
     * @param  array<string, string>  $uriPrefixes
     */
    public function __construct(
        public readonly string $name,
        public readonly array $routeNames = [],
        public readonly array $uriPrefixes = [],
        public readonly bool $expose = false,
    ) {}

    /**
     * @param  array{route_names?: list<string>, uri_prefixes?: array<string, string>, expose?: bool}  $config
     */
    public static function fromConfig(string $name, array $config): self
    {
        return new self($name, $config['route_names'] ?? [], $config['uri_prefixes'] ?? [], $config['expose'] ?? false);
    }

    public function includes(Route $route): bool
    {
        if (ltrim($route->getActionName(), '\\') === RedirectController::class) {
            return false;
        }

        foreach ($this->routeNames as $prefix) {
            if (str_starts_with((string) $route->getName(), $prefix)) {
                return true;
            }
        }

        return $this->uriPrefixFor($route->uri()) !== null;
    }

    public function normalizeOperationIds(OpenApi $openApi): void
    {
        foreach ($openApi->paths as $path) {
            $segment = $this->uriPrefixFor($path->path);

            foreach ($path->operations as $operation) {
                if (! $operation->operationId || str_starts_with($operation->operationId, $this->name . '.')) {
                    continue;
                }

                $operation->operationId = $segment === null
                    ? $this->name . '.' . $operation->operationId
                    : $this->name . '.' . $segment . '.' . Str::chopStart($operation->operationId, $segment . '.');
            }
        }
    }

    private function uriPrefixFor(string $uri): ?string
    {
        foreach ($this->uriPrefixes as $prefix => $segment) {
            if (str_starts_with(ltrim($uri, '/'), $prefix)) {
                return $segment;
            }
        }

        return null;
    }
}
