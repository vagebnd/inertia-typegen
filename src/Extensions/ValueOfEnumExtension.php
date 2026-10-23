<?php

declare(strict_types=1);

namespace Vagebond\InertiaTypegen\Extensions;

use Dedoc\Scramble\Extensions\TypeToSchemaExtension;
use Dedoc\Scramble\Support\Generator\Types\IntegerType;
use Dedoc\Scramble\Support\Generator\Types\StringType;
use Dedoc\Scramble\Support\Generator\Types\UnknownType;
use Dedoc\Scramble\Support\Type\Generic;
use Dedoc\Scramble\Support\Type\ObjectType;
use Dedoc\Scramble\Support\Type\Type;

/**
 * Resolves `value-of<BackedEnum>` PHPDoc types to their backed values.
 */
class ValueOfEnumExtension extends TypeToSchemaExtension
{
    public function shouldHandle(Type $type): bool
    {
        return $type instanceof Generic
            && $type->name === 'value-of'
            && isset($type->templateTypes[0])
            && $type->templateTypes[0] instanceof ObjectType
            && enum_exists($type->templateTypes[0]->name);
    }

    /**
     * @param  Generic  $type
     */
    public function toSchema(Type $type): StringType|IntegerType|UnknownType
    {
        /** @var ObjectType $innerType */
        $innerType = $type->templateTypes[0];
        $enumClass = $innerType->name;

        if (! isset($enumClass::cases()[0]->value)) {
            return new UnknownType();
        }

        $values = array_map(fn($case) => $case->value, $enumClass::cases());

        $schemaType = is_string($values[0]) ? new StringType() : new IntegerType();
        $schemaType->enum($values);

        return $schemaType;
    }
}
