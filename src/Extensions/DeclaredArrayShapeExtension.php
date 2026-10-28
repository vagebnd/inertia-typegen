<?php

declare(strict_types=1);

namespace Vagebond\InertiaTypegen\Extensions;

use Dedoc\Scramble\Infer\Definition\ClassDefinition;
use Dedoc\Scramble\Infer\Definition\FunctionLikeAstDefinition;
use Dedoc\Scramble\Infer\Extensions\Event\MethodCallEvent;
use Dedoc\Scramble\Infer\Extensions\Event\StaticMethodCallEvent;
use Dedoc\Scramble\Infer\Extensions\MethodReturnTypeExtension;
use Dedoc\Scramble\Infer\Extensions\StaticMethodReturnTypeExtension;
use Dedoc\Scramble\Infer\Scope\Scope;
use Dedoc\Scramble\Support\Type\ArrayType;
use Dedoc\Scramble\Support\Type\KeyedArrayType;
use Dedoc\Scramble\Support\Type\ObjectType;
use Dedoc\Scramble\Support\Type\TemplateType;
use Dedoc\Scramble\Support\Type\Type;
use Dedoc\Scramble\Support\Type\Union;

/**
 * Uses the array shape of a method's `@return` docblock when the inferred
 * return type misses one of its keys. The inferred type is kept when it
 * covers the declared shape, because it is usually richer (literals, enums).
 */
class DeclaredArrayShapeExtension implements MethodReturnTypeExtension, StaticMethodReturnTypeExtension
{
    public function shouldHandle(ObjectType|string $type): bool
    {
        return true;
    }

    public function getMethodReturnType(MethodCallEvent $event): ?Type
    {
        return $this->declaredShape($event->getDefinition(), $event->getName(), $event->scope);
    }

    public function getStaticMethodReturnType(StaticMethodCallEvent $event): ?Type
    {
        return $this->declaredShape($event->getDefinition(), $event->getName(), $event->scope);
    }

    private function declaredShape(?ClassDefinition $class, string $method, Scope $scope): ?Type
    {
        $definition = $class?->getMethodDefinition($method, $scope);

        if (! $definition instanceof FunctionLikeAstDefinition) {
            return null;
        }

        $declared = $definition->getDeclarationDefinition()?->getReturnType();

        if ($declared === null || ! $this->hasShape($declared) || $this->hasTemplate($declared)) {
            return null;
        }

        return $this->covers($definition->getInferredReturnType(), $declared) ? null : $declared;
    }

    private function hasShape(Type $type): bool
    {
        if ($type instanceof KeyedArrayType) {
            if ($type->isList) {
                return false;
            }

            foreach ($type->items as $item) {
                if (is_string($item->key)) {
                    return true;
                }
            }

            return false;
        }

        if ($type instanceof ArrayType) {
            return $this->hasShape($type->value);
        }

        return false;
    }

    private function hasTemplate(Type $type): bool
    {
        if ($type instanceof TemplateType) {
            return true;
        }

        $members = match (true) {
            $type instanceof KeyedArrayType => array_map(fn($item) => $item->value, $type->items),
            $type instanceof ArrayType => [$type->key, $type->value],
            $type instanceof Union => $type->types,
            default => [],
        };

        foreach ($members as $member) {
            if ($this->hasTemplate($member)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Whether the inferred type has every required key of the declared shape, at every depth.
     */
    private function covers(Type $inferred, Type $declared): bool
    {
        if ($declared instanceof KeyedArrayType && ! $declared->isList) {
            if (! $inferred instanceof KeyedArrayType) {
                return false;
            }

            foreach ($declared->items as $item) {
                if (! is_string($item->key)) {
                    continue;
                }

                $value = $this->item($inferred, $item->key);

                if ($value === null) {
                    return $item->isOptional;
                }

                if (! $this->covers($value, $item->value)) {
                    return false;
                }
            }

            return true;
        }

        if ($declared instanceof ArrayType) {
            if ($inferred instanceof ArrayType) {
                return $this->covers($inferred->value, $declared->value);
            }

            if (! $inferred instanceof KeyedArrayType) {
                return false;
            }

            foreach ($inferred->items as $item) {
                if (! $this->covers($item->value, $declared->value)) {
                    return false;
                }
            }

            return true;
        }

        return true;
    }

    private function item(KeyedArrayType $type, string $key): ?Type
    {
        foreach ($type->items as $item) {
            if ($item->key === $key) {
                return $item->value;
            }
        }

        return null;
    }
}
