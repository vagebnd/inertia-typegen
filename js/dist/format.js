var __rewriteRelativeImportExtension = (this && this.__rewriteRelativeImportExtension) || function (path, preserveJsx) {
    if (typeof path === "string" && /^\.\.?\//.test(path)) {
        return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function (m, tsx, d, ext, cm) {
            return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : (d + ext + "." + cm.toLowerCase() + "js");
        });
    }
    return path;
};
export async function formatCode(code, fileName, formatter, options) {
    if (formatter === false)
        return code;
    if (typeof formatter === 'function')
        return formatter(code, fileName);
    if (formatter === 'auto' || formatter === 'vite-plus') {
        const vitePlus = await importOptional('vite-plus', 'vite-plus/fmt');
        if (vitePlus) {
            const result = await vitePlus.format(fileName, code, options);
            if (result.errors.length > 0) {
                throw new Error(`Formatting ${fileName} failed: ${result.errors.map((error) => error.message).join('; ')}`);
            }
            return result.code;
        }
        if (formatter === 'vite-plus')
            throw new Error('The vite-plus formatter is not installed.');
    }
    if (formatter === 'auto' || formatter === 'prettier') {
        const prettier = await importOptional('prettier', 'prettier');
        if (prettier)
            return prettier.format(code, { ...options, filepath: fileName });
        if (formatter === 'prettier')
            throw new Error('The prettier formatter is not installed.');
    }
    return code;
}
async function importOptional(packageName, specifier) {
    try {
        return (await import(__rewriteRelativeImportExtension(specifier)));
    }
    catch (error) {
        const { code, message } = error;
        if (code === 'ERR_MODULE_NOT_FOUND' && message?.includes(`'${packageName}'`))
            return null;
        throw error;
    }
}
