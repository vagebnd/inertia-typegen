import { type OpenAPI3 } from 'openapi-typescript';
import { type Formatter } from './format.ts';
export type TypeImport = {
    type: string;
    from: string;
};
export type RouteEntry = {
    name: string;
    method: string;
    uri: string;
    keys: Record<string, string>;
    action?: string;
    source?: string;
};
export type OutputFile = {
    kind: 'types' | 'routes';
    path: string;
    code: string;
};
export type TypegenPlugin = {
    name: string;
    transformDocument?: (document: OpenAPI3) => OpenAPI3 | void;
    filterRoute?: (route: RouteEntry) => boolean;
    routeExportName?: (route: RouteEntry, name: string) => string;
    transformOutput?: (file: OutputFile) => string | void;
};
export type GenerateOptions = {
    document: string;
    fileName: string;
    namespace?: string;
    typeImports?: Record<string, TypeImport>;
    routes?: false | {
        runtime?: string;
    };
    format?: Formatter;
    formatOptions?: Record<string, unknown>;
    plugins?: TypegenPlugin[];
};
export type GeneratedOutput = {
    types: {
        fileName: string;
        content: string;
        pages: number;
        requests: number;
    };
    routes: {
        files: Map<string, string>;
        count: number;
    } | null;
};
export declare function generate(source: OpenAPI3, options: GenerateOptions): Promise<GeneratedOutput>;
export declare function writeOutput(output: GeneratedOutput, typesPath: string, routesDir: string | undefined): Promise<{
    typesChanged: boolean;
    routesChanged: number;
}>;
