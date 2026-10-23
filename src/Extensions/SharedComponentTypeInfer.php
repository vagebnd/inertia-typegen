<?php

declare(strict_types=1);

namespace Vagebond\InertiaTypegen\Extensions;

use Dedoc\Scramble\Extensions\TypeToSchemaExtension;
use Dedoc\Scramble\Support\Generator\Reference;
use Dedoc\Scramble\Support\Generator\Schema;
use Dedoc\Scramble\Support\Generator\Types\ObjectType;
use Dedoc\Scramble\Support\Type\ObjectType as TypeObjectType;
use Dedoc\Scramble\Support\Type\Type;

abstract class SharedComponentTypeInfer extends TypeToSchemaExtension
{
    /** @return class-string */
    abstract protected function className(): string;

    abstract protected function schemaName(): string;

    public function shouldHandle(Type|string $type): bool
    {
        if (is_string($type)) {
            return is_a($type, $this->className(), true);
        }

        return $type instanceof TypeObjectType
            && $type->isInstanceOf($this->className());
    }

    public function toSchema(Type $type): Reference
    {
        $components = $this->openApiTransformer->getComponents();

        if (! $components->hasSchema($this->schemaName())) {
            $components->addSchema($this->schemaName(), Schema::fromType(new ObjectType()));
        }

        return $components->getSchemaReference($this->schemaName());
    }
}
