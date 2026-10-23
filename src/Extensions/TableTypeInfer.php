<?php

declare(strict_types=1);

namespace Vagebond\InertiaTypegen\Extensions;

use InertiaUI\Table\Table;

class TableTypeInfer extends SharedComponentTypeInfer
{
    protected function className(): string
    {
        return Table::class;
    }

    protected function schemaName(): string
    {
        return 'TableResource';
    }
}
