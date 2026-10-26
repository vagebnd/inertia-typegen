<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Blade;
use Symfony\Component\Yaml\Yaml;

it('renders the boost guideline', function () {
    $guideline = Blade::render((string) file_get_contents(__DIR__ . '/../resources/boost/guidelines/core.blade.php'));

    expect($guideline)->toContain('## Inertia Typegen')
        ->toContain('useForm<Inertia.Requests.Posts.Store>({ ... })')
        ->toContain('`inertia-typegen-development` skill');
});

it('gives the boost skill the front matter that boost reads', function () {
    $skill = (string) file_get_contents(__DIR__ . '/../resources/boost/skills/inertia-typegen-development/SKILL.md');

    preg_match('/^\s*---\s*\n(.*?)\n---\s*\n/s', $skill, $matches);
    $frontMatter = Yaml::parse($matches[1] ?? '');

    expect($frontMatter['name'] ?? null)->toBe('inertia-typegen-development')
        ->and($frontMatter['description'] ?? '')->toStartWith('Use when working with vagebond/inertia-typegen');
});
