#!/usr/bin/env node
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { createLogger, loadConfigFromFile } from 'vite';
import { exportDocument, resolvePhpCommand } from "./export.js";
const root = process.cwd();
const { values } = parseArgs({
    options: {
        config: { type: 'string', multiple: true },
        'out-dir': { type: 'string' },
        check: { type: 'boolean', default: false },
        php: { type: 'string' },
    },
});
const apis = [];
for (const configFile of values.config ?? [undefined]) {
    const loaded = await loadConfigFromFile({ command: 'serve', mode: 'development' }, configFile ? resolve(root, configFile) : undefined, root, 'silent');
    const plugins = (loaded?.config.plugins ?? []).flat(Infinity);
    for (const plugin of plugins) {
        if (plugin && plugin.name === 'inertia-typegen' && plugin.api)
            apis.push(plugin.api);
    }
}
if (apis.length === 0) {
    throw new Error('No Vite config has the inertia-typegen plugin. Pass the config file with --config.');
}
const documents = new Map();
async function documentFor(api) {
    if (!documents.has(api.document)) {
        documents.set(api.document, resolvePhpCommand(values.php ?? api.php, root)
            .then((php) => exportDocument(api.document, root, php))
            .then((source) => JSON.parse(source)));
    }
    return structuredClone(await documents.get(api.document));
}
function files(directory) {
    if (!directory || !existsSync(directory))
        return new Map();
    return new Map(readdirSync(directory, { recursive: true, encoding: 'utf-8' })
        .filter((file) => file.endsWith('.ts'))
        .map((file) => [file, readFileSync(join(directory, file), 'utf-8')]));
}
function compare(api, outputDir) {
    const problems = [];
    const fresh = readFileSync(join(outputDir, basename(api.typesPath)), 'utf-8');
    if (!existsSync(api.typesPath) || readFileSync(api.typesPath, 'utf-8') !== fresh) {
        problems.push(`changed: ${relative(root, api.typesPath)}`);
    }
    if (api.routesPath) {
        const current = files(api.routesPath);
        const expected = files(join(outputDir, 'routes'));
        for (const [file, content] of expected) {
            if (!current.has(file))
                problems.push(`missing: ${relative(root, join(api.routesPath, file))}`);
            else if (current.get(file) !== content)
                problems.push(`changed: ${relative(root, join(api.routesPath, file))}`);
        }
        for (const file of current.keys()) {
            if (!expected.has(file))
                problems.push(`extra: ${relative(root, join(api.routesPath, file))}`);
        }
    }
    return problems;
}
if (values.check) {
    const problems = [];
    for (const api of apis) {
        const outputDir = mkdtempSync(join(tmpdir(), 'inertia-typegen-'));
        try {
            await api.generate(await documentFor(api), createLogger('silent'), outputDir);
            problems.push(...compare(api, outputDir));
        }
        finally {
            rmSync(outputDir, { recursive: true, force: true });
        }
    }
    if (problems.length > 0) {
        process.stderr.write(`The generated types or route helpers are stale. Run inertia-typegen to update them.\n${problems.map((problem) => `  ${problem}`).join('\n')}\n`);
        process.exit(1);
    }
}
else {
    const outDir = values['out-dir'] ? resolve(root, values['out-dir']) : undefined;
    for (const api of apis) {
        await api.generate(await documentFor(api), createLogger('info', { prefix: '' }), outDir && apis.length > 1 ? join(outDir, api.document) : outDir);
    }
}
