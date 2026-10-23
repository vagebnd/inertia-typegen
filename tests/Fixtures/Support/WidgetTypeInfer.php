<?php

declare(strict_types=1);

namespace Vagebond\InertiaTypegen\Tests\Fixtures\Support;

use Vagebond\InertiaTypegen\Extensions\SharedComponentTypeInfer;

class WidgetTypeInfer extends SharedComponentTypeInfer
{
    protected function className(): string
    {
        return Widget::class;
    }

    protected function schemaName(): string
    {
        return 'WidgetResource';
    }
}
