<?php

declare(strict_types=1);

use Vagebond\InertiaTypegen\Extensions\ArrayableExtension;
use Vagebond\InertiaTypegen\Extensions\CacheTypeInfer;
use Vagebond\InertiaTypegen\Extensions\CallbackExtension;
use Vagebond\InertiaTypegen\Extensions\CastablePropertyExtension;
use Vagebond\InertiaTypegen\Extensions\CollectionMethodExtension;
use Vagebond\InertiaTypegen\Extensions\CommonStaticMethodExtension;
use Vagebond\InertiaTypegen\Extensions\DeclaredArrayShapeExtension;
use Vagebond\InertiaTypegen\Extensions\EnumHelpersExtension;
use Vagebond\InertiaTypegen\Extensions\InertiaExtension;
use Vagebond\InertiaTypegen\Extensions\InertiaResponseTypeToSchema;
use Vagebond\InertiaTypegen\Extensions\InertiaSharedDataExtension;
use Vagebond\InertiaTypegen\Extensions\ReflectionMethodReturnTypeExtension;
use Vagebond\InertiaTypegen\Extensions\RouteMetadataExtension;
use Vagebond\InertiaTypegen\Extensions\SqidsTypeInfer;
use Vagebond\InertiaTypegen\Extensions\TableTypeInfer;
use Vagebond\InertiaTypegen\Extensions\ValueOfEnumExtension;

return [
    'documents' => [
        'app' => [
            'route_names' => [''],
            'uri_prefixes' => [],
            'expose' => false,
        ],
    ],

    'enum_helpers' => null,

    'extensions' => [
        CastablePropertyExtension::class,
        DeclaredArrayShapeExtension::class,
        InertiaExtension::class,
        InertiaResponseTypeToSchema::class,
        CallbackExtension::class,
        ArrayableExtension::class,
        EnumHelpersExtension::class,
        ValueOfEnumExtension::class,
        CacheTypeInfer::class,
        CollectionMethodExtension::class,
        CommonStaticMethodExtension::class,
        ReflectionMethodReturnTypeExtension::class,
        InertiaSharedDataExtension::class,
        TableTypeInfer::class,
        SqidsTypeInfer::class,
        RouteMetadataExtension::class,
    ],
];
