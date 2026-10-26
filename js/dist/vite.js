import { get as httpGet } from 'node:http';
import { get as httpsGet } from 'node:https';
import { basename, join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { exportDocument, resolvePhpCommand } from "./export.js";
import { generate, writeOutput } from "./generate.js";
export function typegen(options) {
    const root = process.cwd();
    const document = options.document ?? 'app';
    const typesPath = resolve(root, options.types);
    const routes = typeof options.routes === 'string' ? { path: options.routes } : options.routes;
    const routesPath = routes ? resolve(root, routes.path) : undefined;
    const fileName = basename(typesPath);
    const writeTypes = async (source, outputPath, routesDir, logger) => {
        const output = await generate(source, {
            document,
            fileName,
            namespace: options.namespace,
            typeImports: options.typeImports,
            routes: routesDir ? { runtime: routes?.runtime } : false,
            format: options.format,
            formatOptions: options.formatOptions,
            plugins: options.plugins,
        });
        const { typesChanged, routesChanged } = await writeOutput(output, outputPath, routesDir);
        logger.info(`[inertia-typegen] Inertia: ${output.types.pages} pages, ${output.types.requests} requests (${typesChanged ? 'updated' : 'unchanged'})`, { timestamp: true });
        if (output.routes) {
            logger.info(`[inertia-typegen] Routes: ${output.routes.count} routes in ${output.routes.files.size} files (${routesChanged} files changed)`, { timestamp: true });
        }
    };
    return {
        name: 'inertia-typegen',
        api: {
            document,
            typesPath,
            routesPath,
            php: options.php,
            generate(source, logger, outputDir) {
                return writeTypes(source, outputDir ? join(outputDir, fileName) : typesPath, outputDir && routesPath ? join(outputDir, 'routes') : routesPath, logger);
            },
        },
        async configureServer(server) {
            const { documentUrl } = options;
            const readDocument = async () => documentUrl
                ? fetchDocument(documentUrl)
                : exportDocument(document, root, await resolvePhpCommand(options.php, root));
            const logger = server.config.logger;
            let lastDocument = null;
            const regenerate = async () => {
                const started = performance.now();
                try {
                    const source = await readDocument();
                    const changed = source !== lastDocument;
                    if (changed) {
                        await writeTypes(JSON.parse(source), typesPath, routesPath, logger);
                        lastDocument = source;
                    }
                    logger.info(`[inertia-typegen] Document ${changed ? 'changed' : 'unchanged'} in ${Math.round(performance.now() - started)} ms`, { timestamp: true });
                }
                catch (error) {
                    logger.error(`[inertia-typegen] Type generation failed: ${error.message}`, { timestamp: true });
                }
            };
            let running = null;
            let queued = false;
            const refresh = () => {
                if (running) {
                    queued = true;
                    return running;
                }
                running = (async () => {
                    do {
                        queued = false;
                        await regenerate();
                    } while (queued);
                })().finally(() => {
                    running = null;
                });
                return running;
            };
            await refresh();
            // Re-fetch the document when PHP files change
            let debounceTimer;
            for (const directory of options.watch ?? ['app'])
                server.watcher.add(resolve(root, directory));
            server.watcher.on('change', (changedPath) => {
                if (!changedPath.endsWith('.php'))
                    return;
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => void refresh(), options.debounce ?? 300);
            });
        },
    };
}
function fetchDocument(url) {
    return new Promise((resolveDocument, reject) => {
        const onResponse = (response) => {
            if (response.statusCode !== 200) {
                response.resume();
                reject(new Error(`${url} responded with status ${response.statusCode}`));
                return;
            }
            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('error', reject);
            response.on('end', () => resolveDocument(Buffer.concat(chunks).toString('utf-8')));
        };
        const request = url.startsWith('https:')
            ? httpsGet(url, { rejectUnauthorized: false }, onResponse)
            : httpGet(url, onResponse);
        request.on('error', reject);
    });
}
