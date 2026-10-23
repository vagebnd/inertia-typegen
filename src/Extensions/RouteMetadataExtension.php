<?php

declare(strict_types=1);

namespace Vagebond\InertiaTypegen\Extensions;

use Dedoc\Scramble\Extensions\OperationExtension;
use Dedoc\Scramble\Support\Generator\Operation;
use Dedoc\Scramble\Support\RouteInfo;
use Illuminate\Contracts\Routing\UrlRoutable;
use Illuminate\Routing\Route;
use Illuminate\Support\Str;
use ReflectionNamedType;

class RouteMetadataExtension extends OperationExtension
{
    public function handle(Operation $operation, RouteInfo $routeInfo): void
    {
        $route = $routeInfo->route;

        $operation->setExtensionProperty('route-name', $route->getName());
        $operation->setExtensionProperty('route-uri', '/' . ltrim($route->uri(), '/'));

        if ($routeKeys = $this->routeKeys($route)) {
            $operation->setExtensionProperty('route-keys', $routeKeys);
        }

        if ($routeInfo->isClassBased()) {
            $operation->setExtensionProperty('action', '\\' . ltrim((string) $routeInfo->className(), '\\') . '::' . $routeInfo->methodName());
        }

        if ($reflection = $routeInfo->reflectionAction()) {
            $operation->setExtensionProperty('source', Str::after((string) $reflection->getFileName(), base_path() . '/') . ':' . $reflection->getStartLine());
        }
    }

    /**
     * @return array<string, string>
     */
    private function routeKeys(Route $route): array
    {
        $parameterNames = array_flip($route->parameterNames());
        $routeKeys = [];

        foreach ($route->signatureParameters(['subClass' => UrlRoutable::class]) as $parameter) {
            $type = $parameter->getType();
            $name = isset($parameterNames[$parameter->getName()]) ? $parameter->getName() : Str::snake($parameter->getName());

            if (! $type instanceof ReflectionNamedType || ! isset($parameterNames[$name])) {
                continue;
            }

            /** @var UrlRoutable $model */
            $model = app($type->getName());
            $routeKeys[$name] = $route->bindingFieldFor($name) ?? $model->getRouteKeyName();
        }

        return $routeKeys;
    }
}
