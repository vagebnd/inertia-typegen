export type RouteValue = string | number

export type RouteArg<Key extends string = never> =
  | RouteValue
  | ([Key] extends [never] ? never : Record<Key, RouteValue>)

export type QueryParams = {
  [key: string]: string | number | boolean | (string | number)[] | null | undefined | QueryParams
}

export type RouteQueryOptions = {
  query?: QueryParams
  mergeQuery?: QueryParams
}

export type RouteMethod = 'get' | 'post' | 'put' | 'patch' | 'delete'

export type RouteDefinition<Method extends RouteMethod> = { url: string; method: Method }

export interface Route<Method extends RouteMethod> {
  (options?: RouteQueryOptions): RouteDefinition<Method>
  url(options?: RouteQueryOptions): string
}

export interface RouteWithArgs<Method extends RouteMethod, Args> {
  (args: Args, options?: RouteQueryOptions): RouteDefinition<Method>
  url(args: Args, options?: RouteQueryOptions): string
}

type Parameter = { name: string; optional: boolean; key?: string }

type Value = RouteValue | Record<string, RouteValue> | null | undefined

const getValue = (value: string | number | boolean) => (value === true ? '1' : value === false ? '0' : value.toString())

const addNestedParams = (query: QueryParams, prefix: string, params: URLSearchParams) => {
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue

    const name = `${prefix}[${key}]`

    if (Array.isArray(value)) {
      value.forEach((item) => params.append(`${name}[]`, getValue(item)))
    } else if (value !== null && typeof value === 'object') {
      addNestedParams(value, name, params)
    } else if (value !== null) {
      params.set(name, getValue(value))
    }
  }
}

export const queryParams = (options?: RouteQueryOptions): string => {
  const query = options?.query ?? options?.mergeQuery
  if (!query) return ''

  const merge = options?.mergeQuery !== undefined
  const params = new URLSearchParams(merge && typeof window !== 'undefined' ? window.location.search : '')

  for (const [key, value] of Object.entries(query)) {
    if (merge) {
      ;[...params.keys()]
        .filter((name) => name === key || name.startsWith(`${key}[`))
        .forEach((name) => params.delete(name))
    }

    if (value === undefined || value === null) continue

    if (Array.isArray(value)) {
      value.forEach((item) => params.append(`${key}[]`, item.toString()))
    } else if (typeof value === 'object') {
      addNestedParams(value, key, params)
    } else {
      params.set(key, getValue(value))
    }
  }

  const search = params.toString()

  return search ? `?${search}` : ''
}

const parse = (spec: string): Parameter => {
  const [name, key] = spec.split(':')

  return name.endsWith('?') ? { name: name.slice(0, -1), optional: true, key } : { name, optional: false, key }
}

const resolveArgs = (parameters: Parameter[], args: unknown): Record<string, Value> => {
  const [first] = parameters

  if (Array.isArray(args)) {
    return Object.fromEntries(parameters.map((parameter, index) => [parameter.name, args[index]]))
  }

  if (parameters.length === 1 && (typeof args === 'string' || typeof args === 'number')) {
    return { [first.name]: args }
  }

  if (parameters.length === 1 && first.key && typeof args === 'object' && args !== null && first.key in args) {
    return { [first.name]: (args as Record<string, RouteValue>)[first.key] }
  }

  return (args ?? {}) as Record<string, Value>
}

const isMissing = (value: Value) => value === undefined || value === null || value === ''

export function route<Method extends RouteMethod>(method: Method, path: string): Route<Method>
export function route<Method extends RouteMethod, Args>(
  method: Method,
  path: string,
  parameters: string[],
): RouteWithArgs<Method, Args>
export function route(method: RouteMethod, path: string, specs: string[] = []): unknown {
  const parameters = specs.map(parse)

  const url = (...args: unknown[]): string => {
    if (parameters.length === 0) {
      return path + queryParams(args[0] as RouteQueryOptions | undefined)
    }

    const values = resolveArgs(parameters, args[0])
    const optional = parameters.filter((parameter) => parameter.optional)
    const missing = optional.filter((parameter) => isMissing(values[parameter.name]))

    if (missing.some((parameter, index) => parameter !== optional[optional.length - missing.length + index])) {
      throw new Error('Unexpected optional parameters missing. Unable to generate a URL.')
    }

    return (
      parameters
        .reduce((result, { name, optional, key }) => {
          const value = values[name]
          const resolved = typeof value === 'object' && value !== null ? value[key ?? 'id'] : value

          if (!optional && isMissing(resolved)) {
            throw new Error(`Missing required parameter "${name}". Unable to generate a URL.`)
          }

          return result.replace(optional ? `{${name}?}` : `{${name}}`, isMissing(resolved) ? '' : String(resolved))
        }, path)
        .replace(/\/+$/, '') + queryParams(args[1] as RouteQueryOptions | undefined)
    )
  }

  return Object.assign((...args: unknown[]) => ({ url: url(...args), method }), { url })
}
