export type Formatter =
  | 'auto'
  | 'vite-plus'
  | 'prettier'
  | false
  | ((code: string, fileName: string) => string | Promise<string>)

type VitePlusFormat = {
  format: (
    fileName: string,
    code: string,
    options: Record<string, unknown>,
  ) => Promise<{ code: string; errors: { message: string }[] }>
}

type Prettier = {
  format: (code: string, options: Record<string, unknown>) => Promise<string>
}

export async function formatCode(
  code: string,
  fileName: string,
  formatter: Formatter,
  options: Record<string, unknown>,
): Promise<string> {
  if (formatter === false) return code
  if (typeof formatter === 'function') return formatter(code, fileName)

  if (formatter === 'auto' || formatter === 'vite-plus') {
    const vitePlus = await importOptional<VitePlusFormat>('vite-plus', 'vite-plus/fmt')

    if (vitePlus) {
      const result = await vitePlus.format(fileName, code, options)

      if (result.errors.length > 0) {
        throw new Error(`Formatting ${fileName} failed: ${result.errors.map((error) => error.message).join('; ')}`)
      }

      return result.code
    }

    if (formatter === 'vite-plus') throw new Error('The vite-plus formatter is not installed.')
  }

  if (formatter === 'auto' || formatter === 'prettier') {
    const prettier = await importOptional<Prettier>('prettier', 'prettier')

    if (prettier) return prettier.format(code, { ...options, filepath: fileName })

    if (formatter === 'prettier') throw new Error('The prettier formatter is not installed.')
  }

  return code
}

async function importOptional<T>(packageName: string, specifier: string): Promise<T | null> {
  try {
    return (await import(specifier)) as T
  } catch (error) {
    const { code, message } = error as { code?: string; message?: string }

    if (code === 'ERR_MODULE_NOT_FOUND' && message?.includes(`'${packageName}'`)) return null

    throw error
  }
}
