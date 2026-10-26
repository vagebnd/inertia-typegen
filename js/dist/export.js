import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
const run = promisify(execFile);
const herdBinaries = new Map();
// `herd php` resolves the PHP version of the site on every call, which costs about 0.2 s.
// `herd which-php` returns that binary once, so later exports call it directly.
export function resolvePhpCommand(php, cwd) {
    if (Array.isArray(php))
        return Promise.resolve(php);
    if (php)
        return Promise.resolve(php.split(/\s+/));
    if (!/\/herd\//i.test(process.env.PATH ?? ''))
        return Promise.resolve(['php']);
    if (!herdBinaries.has(cwd)) {
        herdBinaries.set(cwd, run('herd', ['which-php'], { cwd })
            .then(({ stdout }) => {
            const binary = stdout.trim().split('\n').pop()?.trim() ?? '';
            return binary && existsSync(binary) ? [binary] : ['herd', 'php'];
        })
            .catch(() => ['herd', 'php']));
    }
    return herdBinaries.get(cwd);
}
export async function exportDocument(name, cwd, php) {
    const directory = await mkdtemp(join(tmpdir(), 'inertia-typegen-'));
    const path = join(directory, `${name}.json`);
    try {
        await run(php[0], [...php.slice(1), 'artisan', 'scramble:export', `--api=${name}`, `--path=${path}`], { cwd });
        return await readFile(path, 'utf-8');
    }
    catch (error) {
        const { stderr, stdout, message } = error;
        const clean = (text) => text?.replace(/\x1b\[[0-9;]*m/g, '').trim();
        const output = clean(stderr) || clean(stdout) || message;
        throw new Error(`php artisan scramble:export --api=${name} failed: ${output}`);
    }
    finally {
        await rm(directory, { recursive: true, force: true });
    }
}
