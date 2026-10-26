import type { OpenAPI3 } from 'openapi-typescript';
import type { Logger, Plugin } from 'vite';
import type { Formatter } from './format.ts';
import { type TypegenPlugin, type TypeImport } from './generate.ts';
export type { Formatter } from './format.ts';
export type { OutputFile, RouteEntry, TypegenPlugin, TypeImport } from './generate.ts';
export type TypegenOptions = {
    document?: string;
    types: string;
    routes?: string | {
        path: string;
        runtime?: string;
    };
    typeImports?: Record<string, TypeImport>;
    namespace?: string;
    format?: Formatter;
    formatOptions?: Record<string, unknown>;
    documentUrl?: string;
    php?: string | string[];
    watch?: string[];
    plugins?: TypegenPlugin[];
};
export type TypegenApi = {
    document: string;
    typesPath: string;
    routesPath: string | undefined;
    php: string[];
    generate(document: OpenAPI3, logger: Logger, outputDir?: string): Promise<void>;
};
export declare function typegen(options: TypegenOptions): Plugin<TypegenApi>;
