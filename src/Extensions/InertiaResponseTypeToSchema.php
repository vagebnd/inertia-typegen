<?php

declare(strict_types=1);

namespace Vagebond\InertiaTypegen\Extensions;

use Dedoc\Scramble\Extensions\TypeToSchemaExtension;
use Dedoc\Scramble\Support\Generator\Reference;
use Dedoc\Scramble\Support\Generator\Response;
use Dedoc\Scramble\Support\Type\Generic;
use Dedoc\Scramble\Support\Type\Type;
use Illuminate\Http\Response as IlluminateResponse;

class InertiaResponseTypeToSchema extends TypeToSchemaExtension
{
    public function shouldHandle(Type $type): bool
    {
        return $type instanceof Generic && in_array($type->name, InertiaExtension::RESPONSE_CLASSES, true);
    }

    /**
     * @param  Generic  $type
     */
    public function toResponse(Type $type): Response|Reference|null
    {
        return $this->openApiTransformer->toResponse(new Generic(IlluminateResponse::class, $type->templateTypes));
    }
}
