<?php

declare(strict_types=1);

namespace Vagebond\InertiaTypegen\Extensions;

use Dedoc\Scramble\Extensions\TypeToSchemaExtension;
use Dedoc\Scramble\Infer\Definition\ClassDefinition;
use Dedoc\Scramble\Infer\Definition\FunctionLikeAstDefinition;
use Dedoc\Scramble\Support\Type\ArrayItemType_;
use Dedoc\Scramble\Support\Type\ArrayType;
use Dedoc\Scramble\Support\Type\KeyedArrayType;
use Dedoc\Scramble\Support\Type\Literal\LiteralIntegerType;
use Dedoc\Scramble\Support\Type\MixedType;
use Dedoc\Scramble\Support\Type\ObjectType;
use Dedoc\Scramble\Support\Type\TemplateType;
use Dedoc\Scramble\Support\Type\Type;
use Dedoc\Scramble\Support\Type\UnknownType;
use Illuminate\Contracts\Support\Arrayable;
use Illuminate\Database\Eloquent\Model;

class ArrayableExtension extends TypeToSchemaExtension
{
    public function shouldHandle(Type|string $type): bool
    {
        if (is_string($type)) {
            return is_a($type, Arrayable::class, true);
        }

        return $type instanceof ObjectType
            && $type->isInstanceOf(Model::class) === false
            && $type->isInstanceOf(Arrayable::class);
    }

    public function toSchema(Type $type)
    {
        if (! $type instanceof ObjectType) {
            return;
        }

        $classDefinition = $this->infer->analyzeClass($type->name);

        $toArrayReturnType = $type->getMethodReturnType('toArray');

        // When the inferred return type has non-integer keys on an ArrayType
        // (e.g., from Collection::all() resolving template keys to string),
        // prefer the PHPDoc declaration type which typically declares list<>.
        // Without this, ArrayType(key: StringType) generates an object schema
        // instead of an array schema in OpenAPI.
        if ($this->hasNonIntegerArrayKeys($toArrayReturnType)) {
            $declarationType = $this->getDeclaredReturnType($classDefinition);

            if ($declarationType !== null) {
                return $this->openApiTransformer->transform($declarationType);
            }
        }

        // Inference types non-promoted properties from their native type only
        // (property @var docblocks are ignored), so keys serialized from such
        // properties degrade to array<mixed>. Fill those from the toArray()
        // @return declaration, key by key, keeping richer inferred keys as-is.
        if ($toArrayReturnType instanceof KeyedArrayType) {
            $declarationType = $this->getDeclaredReturnType($classDefinition);

            if ($declarationType instanceof KeyedArrayType) {
                $toArrayReturnType = $this->fillDegenerateItemsFromDeclaration($toArrayReturnType, $declarationType);
            }
        }

        return $this->openApiTransformer->transform($toArrayReturnType);
    }

    private function getDeclaredReturnType(ClassDefinition $classDefinition): ?Type
    {
        $methodDef = $classDefinition->getMethodDefinition('toArray');

        if (! $methodDef instanceof FunctionLikeAstDefinition) {
            return null;
        }

        return $methodDef->getDeclarationDefinition()?->getReturnType();
    }

    private function fillDegenerateItemsFromDeclaration(KeyedArrayType $inferred, KeyedArrayType $declared): KeyedArrayType
    {
        $items = array_map(function (ArrayItemType_ $item) use ($declared) {
            if ($item->key === null || ! $this->isDegenerate($item->value)) {
                return $item;
            }

            $declaredValue = $declared->getItemValueTypeByKey($item->key);

            if ($declaredValue instanceof UnknownType) {
                return $item;
            }

            return new ArrayItemType_($item->key, $declaredValue, $item->isOptional, $item->shouldUnpack, $item->keyType);
        }, $inferred->items);

        return new KeyedArrayType($items, $inferred->isList);
    }

    private function isDegenerate(Type $type): bool
    {
        if ($type instanceof TemplateType) {
            return $type->is === null || $this->isDegenerate($type->is);
        }

        if ($type instanceof ArrayType) {
            return $this->isDegenerate($type->value);
        }

        return $type instanceof UnknownType || $type instanceof MixedType;
    }

    /**
     * Check if a type contains ArrayType nodes with non-integer keys.
     * This catches both unresolved TemplateType keys and resolved StringType
     * keys from Collection chains that should actually be list<> (int keys).
     */
    private function hasNonIntegerArrayKeys(Type $type): bool
    {
        if ($type instanceof ArrayType) {
            return ! ($type->key instanceof LiteralIntegerType);
        }

        if ($type instanceof KeyedArrayType) {
            foreach ($type->items as $item) {
                if ($this->hasNonIntegerArrayKeys($item->value)) {
                    return true;
                }
            }
        }

        return false;
    }
}
