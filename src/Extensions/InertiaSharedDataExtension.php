<?php

declare(strict_types=1);

namespace Vagebond\InertiaTypegen\Extensions;

use Vagebond\InertiaTypegen\Contracts\ProvidesInertiaSharedType;
use Dedoc\Scramble\Extensions\OperationExtension;
use Dedoc\Scramble\Support\Generator\Combined\AllOf;
use Dedoc\Scramble\Support\Generator\Components;
use Dedoc\Scramble\Support\Generator\Operation;
use Dedoc\Scramble\Support\Generator\Response;
use Dedoc\Scramble\Support\Generator\Schema;
use Dedoc\Scramble\Support\Generator\Types\ObjectType;
use Dedoc\Scramble\Support\RouteInfo;
use Dedoc\Scramble\Support\Type\ArrayItemType_;
use Dedoc\Scramble\Support\Type\FunctionType;
use Dedoc\Scramble\Support\Type\Generic;
use Dedoc\Scramble\Support\Type\KeyedArrayType;
use Dedoc\Scramble\Support\Type\Type;
use Illuminate\Http\Response as IlluminateResponse;
use Illuminate\Support\Facades\Route as RouteFacade;
use Inertia\Middleware as InertiaMiddleware;

class InertiaSharedDataExtension extends OperationExtension
{
    private static ?Components $sharedComponents = null;

    /** @var array<string, array{0: ObjectType, 1: string|null}|null> */
    private static array $shared = [];

    public function handle(Operation $operation, RouteInfo $routeInfo): void
    {
        $middlewareClass = $this->findInertiaMiddleware($routeInfo);
        if (! $middlewareClass) {
            return;
        }

        // Skip non-Inertia responses on Inertia-middleware routes (e.g. plain
        // JSON endpoints under the `web` group). We merge when either:
        //  (a) the controller's inferred return type is the Generic Response
        //      shape produced by InertiaExtension on `Inertia::render()`, or
        //  (b) the response shape is empty — Scramble couldn't trace it, which
        //      is typical for Fortify routes that delegate to a closure-based
        //      response contract registered via Fortify::loginView() etc.
        // Concrete return types (Arrayable, JsonResponse, etc.) get neither.
        if (! $this->returnsInertiaRender($routeInfo) && ! $this->hasEmpty200JsonShape($operation)) {
            return;
        }

        $shared = $this->sharedFor($middlewareClass);
        if ($shared === null) {
            return;
        }

        [$openApiType, $sharedSchemaName] = $shared;

        foreach ($operation->responses ?? [] as $response) {
            if (! $response instanceof Response || $response->code !== 200) {
                continue;
            }

            if (! isset($response->content['application/json'])) {
                continue;
            }

            $schema = $response->content['application/json'];
            if (! $schema->type instanceof ObjectType) {
                continue;
            }

            if ($sharedSchemaName !== null) {
                $reference = $this->openApiTransformer->getComponents()->getSchemaReference($sharedSchemaName);
                $schema->type = (new AllOf())->setItems([$reference, $schema->type]);

                continue;
            }

            foreach ($openApiType->properties as $name => $type) {
                if (! $schema->type->hasProperty($name)) {
                    $schema->type->addProperty($name, $type);
                }
            }

            $schema->type->addRequired($openApiType->required);
        }
    }

    /**
     * @return array{0: ObjectType, 1: string|null}|null
     */
    private function sharedFor(string $middlewareClass): ?array
    {
        $components = $this->openApiTransformer->getComponents();

        if (self::$sharedComponents !== $components) {
            self::$sharedComponents = $components;
            self::$shared = [];
        }

        if (! array_key_exists($middlewareClass, self::$shared)) {
            self::$shared[$middlewareClass] = $this->resolveShared($middlewareClass);
        }

        return self::$shared[$middlewareClass];
    }

    /**
     * @return array{0: ObjectType, 1: string|null}|null
     */
    private function resolveShared(string $middlewareClass): ?array
    {
        $sharedType = $this->inferSharedDataType($middlewareClass);
        if (! $sharedType instanceof KeyedArrayType || $sharedType->isList) {
            return null;
        }

        $openApiType = $this->openApiTransformer->transform($this->unwrapClosures($sharedType));
        if (! $openApiType instanceof ObjectType) {
            return null;
        }

        return [$openApiType, $this->registerSharedSchema($middlewareClass, $openApiType)];
    }

    /**
     * Export the resolved share() shape as a named component schema
     * (e.g. `InertiaSharedAdmin`) so the type-generator can surface it under the
     * `Inertia.Shared` namespace, decoupled from any individual page.
     */
    private function registerSharedSchema(string $middlewareClass, ObjectType $type): ?string
    {
        if (! is_subclass_of($middlewareClass, ProvidesInertiaSharedType::class)) {
            return null;
        }

        $schemaName = 'InertiaShared' . $middlewareClass::inertiaSharedTypeName();
        $components = $this->openApiTransformer->getComponents();

        if (! $components->hasSchema($schemaName)) {
            $components->addSchema($schemaName, Schema::fromType($type));
        }

        return $schemaName;
    }

    private function findInertiaMiddleware(RouteInfo $routeInfo): ?string
    {
        // Resolve middleware groups (e.g. `web`) to their concrete class list so
        // Inertia middleware appended via `appendToGroup` is visible here.
        $resolved = RouteFacade::getFacadeRoot()->gatherRouteMiddleware($routeInfo->route);

        foreach ($resolved as $middleware) {
            if (! is_string($middleware)) {
                continue;
            }

            $class = explode(':', $middleware, 2)[0];

            if (is_subclass_of($class, InertiaMiddleware::class)) {
                return $class;
            }
        }

        return null;
    }

    private function inferSharedDataType(string $middlewareClass): ?Type
    {
        $classDef = $this->infer->analyzeClass($middlewareClass);
        $methodDef = $classDef->getMethodDefinition('share');

        return $methodDef?->type->returnType;
    }

    /**
     * Whether the controller method's inferred return type is the Generic
     * Response shape produced by InertiaExtension when it sees Inertia::render().
     */
    private function returnsInertiaRender(RouteInfo $routeInfo): bool
    {
        $reflection = $routeInfo->reflectionMethod();
        if (! $reflection) {
            return false;
        }

        $classDef = $this->infer->analyzeClass($reflection->getDeclaringClass()->getName());
        $methodDef = $classDef->getMethodDefinition($reflection->getName());
        $returnType = $methodDef?->type->returnType;

        if (! $returnType instanceof Generic) {
            return false;
        }

        return $returnType->name === IlluminateResponse::class;
    }

    /**
     * Whether the operation's 200 application/json response is an empty
     * object schema (no properties inferred). Fortify routes delegating to a
     * loginView-style closure land here because Scramble can't trace through
     * the Responsable contract.
     */
    private function hasEmpty200JsonShape(Operation $operation): bool
    {
        foreach ($operation->responses ?? [] as $response) {
            if (! $response instanceof Response || $response->code !== 200) {
                continue;
            }

            $schema = $response->content['application/json'] ?? null;
            if (! $schema || ! $schema->type instanceof ObjectType) {
                continue;
            }

            if (empty($schema->type->properties)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Unwrap closures in a KeyedArrayType to their return types,
     * since Inertia resolves closures at runtime before sending data.
     */
    private function unwrapClosures(KeyedArrayType $type): KeyedArrayType
    {
        $items = array_map(function (ArrayItemType_ $item) {
            $value = $item->value;

            if ($value instanceof FunctionType) {
                $value = $value->getReturnType();
            }

            if ($value instanceof KeyedArrayType && ! $value->isList) {
                $value = $this->unwrapClosures($value);
            }

            return new ArrayItemType_(
                key: $item->key,
                value: $value,
                isOptional: $item->isOptional,
            );
        }, $type->items);

        // Filter out non-string keys (e.g., spread of parent::share())
        $items = array_values(array_filter($items, fn(ArrayItemType_ $item) => is_string($item->key) && $item->key !== ''));

        return new KeyedArrayType($items);
    }
}
