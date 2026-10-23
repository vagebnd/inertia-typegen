export type Formatter = 'auto' | 'vite-plus' | 'prettier' | false | ((code: string, fileName: string) => string | Promise<string>);
export declare function formatCode(code: string, fileName: string, formatter: Formatter, options: Record<string, unknown>): Promise<string>;
