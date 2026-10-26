<?php

declare(strict_types=1);

namespace Vagebond\InertiaTypegen\Extensions;

use Dedoc\Scramble\Infer\Extensions\Event\MethodCallEvent;
use Dedoc\Scramble\Infer\Extensions\Event\StaticMethodCallEvent;
use Dedoc\Scramble\Infer\Extensions\MethodReturnTypeExtension;
use Dedoc\Scramble\Infer\Extensions\StaticMethodReturnTypeExtension;
use Dedoc\Scramble\Support\Type\ArrayItemType_;
use Dedoc\Scramble\Support\Type\Generic;
use Dedoc\Scramble\Support\Type\KeyedArrayType;
use Dedoc\Scramble\Support\Type\ObjectType;
use Dedoc\Scramble\Support\Type\StringType;
use Dedoc\Scramble\Support\Type\Type;
use Illuminate\Container\Attributes\Config;
use Illuminate\Support\Collection;

/**
 * Helps Scramble infer return types for methods provided by the trait in the
 * `inertia-typegen.enum_helpers` config value.
 *
 * Without this extension, Scramble cannot resolve `description()`, `toArray()`,
 * `asSelectArray()`, or `collect()` on enums that use the trait.
 */
class EnumHelpersExtension implements MethodReturnTypeExtension, StaticMethodReturnTypeExtension
{
    /**
     * @param  class-string|null  $trait
     */
    public function __construct(
        #[Config('inertia-typegen.enum_helpers')]
        private readonly ?string $trait = null,
    ) {}

    public function shouldHandle(ObjectType|string $type): bool
    {
        return $this->usesEnumHelpers($type instanceof ObjectType ? $type->name : $type);
    }

    public function getMethodReturnType(MethodCallEvent $event): ?Type
    {
        return $this->returnType($event->name, $event->getInstance()->name);
    }

    public function getStaticMethodReturnType(StaticMethodCallEvent $event): ?Type
    {
        return $this->returnType($event->name, $event->callee);
    }

    private function returnType(string $method, string $className): ?Type
    {
        return match ($method) {
            'description' => new StringType(),
            'toArray' => new KeyedArrayType([
                new ArrayItemType_('value', new StringType()),
                new ArrayItemType_('label', new StringType()),
            ]),
            'asSelectArray' => new KeyedArrayType([]),
            'collect' => new Generic(Collection::class, [new ObjectType($className)]),
            default => null,
        };
    }

    private function usesEnumHelpers(string $className): bool
    {
        if ($this->trait === null || (! class_exists($className) && ! enum_exists($className))) {
            return false;
        }

        return in_array($this->trait, class_uses_recursive($className));
    }
}
