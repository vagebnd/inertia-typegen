import { mkdir, readdir, readFile, rm, rmdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import openapiTS, { astToString, } from 'openapi-typescript';
import ts from 'typescript';
import { formatCode } from "./format.js";
const SHARED_PREFIX = 'InertiaShared';
const SCHEMA_REF_PREFIX = '#/components/schemas/';
const ENTRY_PREFIX = '__inertia_';
const RUNTIME_FILE = '_runtime.ts';
const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
const RESERVED_WORDS = new Set('break case catch class const continue debugger default delete do else enum export extends false finally for function if import in instanceof new null return super switch this throw true try typeof var void while with yield'.split(' '));
export async function generate(source, options) {
    const context = {
        namespace: options.namespace ?? 'Inertia',
        typeImports: options.typeImports ?? {},
        plugins: options.plugins ?? [],
    };
    const document = context.plugins.reduce((current, plugin) => plugin.transformDocument?.(current) ?? current, source);
    const types = await renderInertiaTypes(document, options, context);
    const content = transformOutput(context, { kind: 'types', path: options.fileName, code: types.content });
    return {
        types: { ...types, content },
        routes: options.routes ? await renderRoutes(document, options.routes, context) : null,
    };
}
export async function writeOutput(output, typesPath, routesDir) {
    await mkdir(dirname(typesPath), { recursive: true });
    return {
        typesChanged: await writeIfChanged(typesPath, output.types.content),
        routesChanged: output.routes && routesDir ? await writeRoutes(output.routes.files, routesDir) : 0,
    };
}
function transformOutput(context, file) {
    return context.plugins.reduce((code, plugin) => plugin.transformOutput?.({ ...file, code }) ?? code, file.code);
}
async function writeIfChanged(path, content) {
    const current = await readFile(path, 'utf-8').catch(() => null);
    if (current === content)
        return false;
    await writeFile(path, content);
    return true;
}
async function renderInertiaTypes(document, options, context) {
    const { typeImports } = context;
    const schemas = document.components?.schemas ?? {};
    const entries = collectEntries(document, options.document, typeImports);
    const keys = entries.map((_, index) => `${ENTRY_PREFIX}${index}`);
    const inlined = entries.map((entry) => inlineRefs(entry.schema, schemas, typeImports, new Set()));
    // Requests render as request bodies, so openapi-typescript keeps properties with a default optional
    const nodes = await openapiTS({
        openapi: document.openapi,
        info: document.info,
        paths: {},
        components: {
            schemas: {
                ...schemas,
                ...Object.fromEntries(entries.flatMap((entry, index) => (entry.group === 'Requests' ? [] : [[keys[index], inlined[index]]]))),
            },
            requestBodies: Object.fromEntries(entries.flatMap((entry, index) => entry.group === 'Requests'
                ? [[keys[index], { content: { 'application/json': { schema: inlined[index] } } }]]
                : [])),
        },
    }, { silent: true });
    const rendered = renderComponents(nodes);
    const usedImports = new Set();
    const groups = {
        Pages: new Map(),
        Requests: new Map(),
        Shared: new Map(),
        Schemas: new Map(),
    };
    entries.forEach((entry, index) => {
        const type = resolveRefs(stripComments(rendered.get(keys[index]) ?? 'unknown').trim(), context, usedImports);
        groups[entry.group].set(entry.path, normalizeEmptyObjects(type));
    });
    const content = await formatCode(buildOutput(groups, context, usedImports), options.fileName, options.format ?? 'auto', options.formatOptions ?? {});
    return {
        fileName: options.fileName,
        content,
        pages: groups.Pages.size,
        requests: groups.Requests.size,
    };
}
// --- Routes ---
function collectRoutes(document, context) {
    const routes = new Map();
    for (const pathItem of Object.values(document.paths ?? {})) {
        if ('$ref' in pathItem)
            continue;
        for (const method of METHODS) {
            const operation = pathItem[method];
            const name = operation?.['x-route-name'];
            const uri = operation?.['x-route-uri'];
            if (typeof name !== 'string' || typeof uri !== 'string' || routes.has(name))
                continue;
            const route = {
                name,
                method,
                uri,
                keys: operation?.['x-route-keys'] ?? {},
                action: operation?.['x-action'],
                source: operation?.['x-source'],
            };
            if (context.plugins.some((plugin) => plugin.filterRoute?.(route) === false))
                continue;
            routes.set(name, route);
        }
    }
    return [...routes.values()];
}
async function renderRoutes(document, options, context) {
    const modules = new Map();
    const routes = collectRoutes(document, context);
    for (const route of routes) {
        const module = route.name.split('.').slice(0, -1).join('/');
        if (!modules.has(module))
            modules.set(module, []);
        modules.get(module).push(route);
    }
    const files = new Map();
    for (const [module, entries] of modules) {
        const names = entries.map((entry) => routeExportName(entry, context));
        const declarations = entries.map((entry, index) => renderRoute(entry, names[index]));
        const usesArgs = declarations.some((declaration) => declaration.includes('RouteArg'));
        const path = module ? `${module}/index.ts` : 'index.ts';
        files.set(path, transformOutput(context, {
            kind: 'routes',
            path,
            code: [
                `import { route${usesArgs ? ', type RouteArg' : ''} } from '${options.runtime ?? runtimeImport(module)}'`,
                '',
                declarations.join('\n\n'),
                '',
                `export default { ${names.join(', ')} }`,
                '',
            ].join('\n'),
        }));
    }
    if (!options.runtime) {
        const code = await readFile(new URL('../runtime/route.ts', import.meta.url), 'utf-8');
        files.set(RUNTIME_FILE, transformOutput(context, { kind: 'routes', path: RUNTIME_FILE, code }));
    }
    return { files, count: routes.length };
}
function runtimeImport(module) {
    const depth = module ? module.split('/').length : 0;
    return (depth ? '../'.repeat(depth) : './') + RUNTIME_FILE.replace(/\.ts$/, '');
}
function renderRoute(route, name) {
    const parameters = [...route.uri.matchAll(/\{(\w+)(\?)?\}/g)].map(([, parameter, optional]) => ({
        name: parameter,
        optional: optional === '?',
        key: route.keys[parameter],
    }));
    const docblock = [
        '/**',
        ...(route.action ? [` * @see ${route.action}`] : []),
        ...(route.source ? [` * @see ${route.source}`] : []),
        ` * @route '${route.uri}'`,
        ' */',
    ].join('\n');
    if (parameters.length === 0) {
        return `${docblock}\nexport const ${name} = /* @__PURE__ */ route('${route.method}', '${route.uri}')`;
    }
    const arg = (key) => (key ? `RouteArg<'${key}'>` : 'RouteArg');
    const record = `{ ${parameters.map((p) => `${p.name}${p.optional ? '?' : ''}: ${arg(p.key)}`).join('; ')} }`;
    const tuple = `[${parameters.map((p) => `${p.name}${p.optional ? '?' : ''}: ${arg(p.key)}`).join(', ')}]`;
    const args = [
        ...(parameters.length === 1 ? [arg(parameters[0].key)] : []),
        record,
        tuple,
        ...(parameters.every((p) => p.optional) ? ['void'] : []),
    ].join(' | ');
    const specs = parameters.map((p) => `'${p.name}${p.optional ? '?' : ''}${p.key ? `:${p.key}` : ''}'`).join(', ');
    return `${docblock}\nexport const ${name} = /* @__PURE__ */ route<'${route.method}', ${args}>('${route.method}', '${route.uri}', [${specs}])`;
}
function routeExportName(route, context) {
    const camelCased = toCamelCase(route.name.split('.').pop());
    const name = RESERVED_WORDS.has(camelCased) ? `${camelCased}Method` : camelCased;
    return context.plugins.reduce((current, plugin) => plugin.routeExportName?.(route, current) ?? current, name);
}
async function writeRoutes(files, outputDir) {
    const existing = (await readdir(outputDir, { recursive: true }).catch(() => [])).filter((file) => file.endsWith('.ts'));
    let changed = 0;
    for (const [file, content] of files) {
        await mkdir(dirname(join(outputDir, file)), { recursive: true });
        if (await writeIfChanged(join(outputDir, file), content))
            changed++;
    }
    for (const file of existing) {
        if (files.has(file))
            continue;
        await rm(join(outputDir, file));
        changed++;
    }
    await removeEmptyDirectories(outputDir);
    return changed;
}
async function removeEmptyDirectories(directory) {
    const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
        if (entry.isDirectory())
            await removeEmptyDirectories(join(directory, entry.name));
    }
    if ((await readdir(directory).catch(() => ['keep'])).length === 0)
        await rmdir(directory);
}
// --- Document ---
function collectEntries(document, name, typeImports) {
    const prefix = name + '.';
    const entries = [];
    for (const pathItem of Object.values(document.paths ?? {})) {
        if ('$ref' in pathItem)
            continue;
        for (const method of METHODS) {
            const operation = pathItem[method];
            if (!operation || '$ref' in operation || !operation.operationId?.startsWith(prefix))
                continue;
            const path = toNamespacePath(operation.operationId.slice(prefix.length));
            if (!path)
                continue;
            const response = resolveComponent(document, operation.responses?.['200'], 'responses');
            const page = objectBranch(contentSchema(response?.content, 'application/json'));
            if (page)
                entries.push({ group: 'Pages', path, schema: page });
            const body = resolveComponent(document, operation.requestBody, 'requestBodies');
            const request = contentSchema(body?.content, 'application/json') ?? contentSchema(body?.content, 'multipart/form-data');
            if (request)
                entries.push({ group: 'Requests', path, schema: objectBranch(request) ?? request });
        }
    }
    // Shared-data shapes exported by Inertia middleware as `InertiaShared{Name}`
    // component schemas land under the `Inertia.Shared.{Name}` namespace.
    for (const [name, schema] of Object.entries(document.components?.schemas ?? {})) {
        if (name.startsWith(SHARED_PREFIX) && name.length > SHARED_PREFIX.length) {
            entries.push({ group: 'Shared', path: name.slice(SHARED_PREFIX.length), schema });
        }
    }
    for (const [name, schema] of Object.entries(document.components?.schemas ?? {})) {
        if (!name.startsWith(SHARED_PREFIX) && !typeImports[name]) {
            entries.push({ group: 'Schemas', path: name, schema });
        }
    }
    return entries;
}
function resolveComponent(document, value, kind) {
    if (value && typeof value === 'object' && '$ref' in value) {
        return document.components?.[kind]?.[value.$ref.split('/').pop() ?? ''];
    }
    return value;
}
function contentSchema(content, mediaType) {
    const media = content?.[mediaType];
    return media && !('$ref' in media) ? media.schema : undefined;
}
// A page is the object part of a response: the shared-data intersection, an object,
// or the first member of a union when that member is an object.
function objectBranch(schema) {
    if (!schema || '$ref' in schema)
        return null;
    if ('allOf' in schema && schema.allOf)
        return schema;
    const type = 'type' in schema ? schema.type : undefined;
    if (type === 'object')
        return schema;
    if (Array.isArray(type) && type.includes('object'))
        return { ...schema, type: 'object' };
    const first = ('anyOf' in schema ? schema.anyOf : undefined)?.[0] ?? ('oneOf' in schema ? schema.oneOf : undefined)?.[0];
    return first && !('$ref' in first) && 'type' in first && first.type === 'object' ? first : null;
}
// Inline component references so each type stands on its own. Shared data and
// imported component types stay references, and so does a reference back into
// a schema that is being inlined.
function inlineRefs(node, schemas, typeImports, ancestors) {
    if (Array.isArray(node))
        return node.map((item) => inlineRefs(item, schemas, typeImports, ancestors));
    if (!node || typeof node !== 'object')
        return node;
    const ref = node.$ref;
    if (typeof ref === 'string' && ref.startsWith(SCHEMA_REF_PREFIX)) {
        const name = ref.slice(SCHEMA_REF_PREFIX.length);
        if (typeImports[name] || name.startsWith(SHARED_PREFIX) || ancestors.has(name) || !schemas[name])
            return node;
        return inlineRefs(schemas[name], schemas, typeImports, new Set([...ancestors, name]));
    }
    return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, inlineRefs(value, schemas, typeImports, ancestors)]));
}
function renderComponents(nodes) {
    const rendered = new Map();
    const components = nodes.find((node) => ts.isInterfaceDeclaration(node) && node.name.text === 'components');
    if (!components)
        return rendered;
    for (const member of typeLiteralMembers(memberType(components.members, 'schemas'))) {
        const name = propertyName(member);
        if (name?.startsWith(ENTRY_PREFIX) && member.type)
            rendered.set(name, astToString(member.type));
    }
    for (const member of typeLiteralMembers(memberType(components.members, 'requestBodies'))) {
        const name = propertyName(member);
        const content = memberType(typeLiteralMembers(member.type), 'content');
        const type = memberType(typeLiteralMembers(content), 'application/json');
        if (name && type)
            rendered.set(name, astToString(type));
    }
    return rendered;
}
function typeLiteralMembers(node) {
    return node && ts.isTypeLiteralNode(node) ? node.members.filter(ts.isPropertySignature) : [];
}
function memberType(members, name) {
    return members.find((member) => {
        return ts.isPropertySignature(member) && propertyName(member) === name;
    })?.type;
}
function propertyName(member) {
    return ts.isIdentifier(member.name) || ts.isStringLiteral(member.name) ? member.name.text : undefined;
}
function resolveRefs(type, context, usedImports) {
    return type.replace(/components\["schemas"\]\["(\w+)"\]/g, (_, name) => {
        if (name.startsWith(SHARED_PREFIX) && name.length > SHARED_PREFIX.length) {
            return `${context.namespace}.Shared.${name.slice(SHARED_PREFIX.length)}`;
        }
        if (context.typeImports[name]) {
            usedImports.add(name);
            return context.typeImports[name].type;
        }
        return 'Record<string, unknown>';
    });
}
// --- Helpers ---
function stripComments(type) {
    return type.replace(/\/\*\*[^]*?\*\/\s*/g, '');
}
// openapi-typescript renders an empty object schema as `Record<string, never>`.
// Vue's `defineProps<T>()` macro can't resolve the `Record` utility type, so a
// closure-opaque page (e.g. Fortify's login view) would break the SFC compiler.
// `{}` is the equivalent empty shape the macro can resolve.
function normalizeEmptyObjects(type) {
    return type.replace(/Record<string, never>/g, '{}');
}
function toNamespacePath(path) {
    const cleaned = path.replace(/_\d+$/, '');
    const segments = cleaned.split('.');
    if (segments.some((s) => !s))
        return null;
    return segments.map((s) => toPascalCase(s)).join('.');
}
function toCamelCase(str) {
    return str.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());
}
function toPascalCase(str) {
    return str
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
}
function buildTree(entries) {
    const root = { types: new Map(), children: new Map() };
    for (const [path, typeBody] of entries) {
        const segments = path.split('.');
        const typeName = segments.pop();
        let current = root;
        for (const seg of segments) {
            if (!current.children.has(seg)) {
                current.children.set(seg, { types: new Map(), children: new Map() });
            }
            current = current.children.get(seg);
        }
        current.types.set(typeName, typeBody);
    }
    return root;
}
function renderTree(node, indent) {
    let out = '';
    for (const [name, body] of node.types) {
        out += `${indent}export type ${name} = ${body}\n`;
    }
    for (const [name, child] of node.children) {
        out += `${indent}export namespace ${name} {\n`;
        out += renderTree(child, indent + '  ');
        out += `${indent}}\n`;
    }
    return out;
}
function buildOutput(groups, context, usedImports) {
    let out = `/**
 * Inertia page and request types.
 * Auto-generated by inertia-typegen from Scramble's OpenAPI document.
 */\n`;
    const grouped = new Map();
    for (const name of usedImports) {
        const imp = context.typeImports[name];
        if (!grouped.has(imp.from))
            grouped.set(imp.from, []);
        grouped.get(imp.from).push(imp.type);
    }
    for (const [from, types] of grouped) {
        out += `import type { ${types.join(', ')} } from '${from}'\n`;
    }
    out += `
export namespace ${context.namespace} {
export namespace Pages {
${renderTree(buildTree(groups.Pages), '')}
}
`;
    for (const group of ['Requests', 'Shared', 'Schemas']) {
        if (groups[group].size > 0) {
            out += `export namespace ${group} {
${renderTree(buildTree(groups[group]), '')}
}
`;
        }
    }
    out += `}\n`;
    return out;
}
