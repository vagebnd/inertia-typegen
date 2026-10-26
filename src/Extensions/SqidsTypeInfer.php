<?php

declare(strict_types=1);

namespace Vagebond\InertiaTypegen\Extensions;

use Dedoc\Scramble\Infer\Extensions\Event\PropertyFetchEvent;
use Dedoc\Scramble\Infer\Extensions\PropertyTypeExtension;
use Dedoc\Scramble\Support\Type\ObjectType;
use Dedoc\Scramble\Support\Type\StringType;
use Dedoc\Scramble\Support\Type\Type;
use RedExplosion\Sqids\Concerns\HasSqids;

/**
 * The red-explosion/laravel-sqids accessor returns ?string, because an unsaved model has no key.
 * Serialized models are saved, so their sqid is a string.
 */
class SqidsTypeInfer implements PropertyTypeExtension
{
    public function shouldHandle(ObjectType $type): bool
    {
        return class_exists($type->name) && in_array(HasSqids::class, class_uses_recursive($type->name), true);
    }

    public function getPropertyType(PropertyFetchEvent $event): ?Type
    {
        return $event->name === 'sqid' ? new StringType() : null;
    }
}
