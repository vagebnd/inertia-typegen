import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { queryParams, route, type RouteArg } from '../runtime/route.ts'

describe('route', () => {
  it('returns the url and the method of a route without parameters', () => {
    const dashboard = route('get', '/dashboard')

    assert.deepEqual(dashboard(), { url: '/dashboard', method: 'get' })
    assert.equal(dashboard.url({ query: { page: 2 } }), '/dashboard?page=2')
  })

  it('accepts a value, a record, a tuple and a model object', () => {
    const show = route<'get', RouteArg<'slug'> | { post: RouteArg<'slug'> } | [post: RouteArg<'slug'>]>(
      'get',
      '/posts/{post}',
      ['post:slug'],
    )

    assert.equal(show.url('first'), '/posts/first')
    assert.equal(show.url({ post: 'first' }), '/posts/first')
    assert.equal(show.url(['first']), '/posts/first')
    assert.equal(show.url({ slug: 'first' }), '/posts/first')
    assert.equal(show.url({ post: { slug: 'first' } } as never), '/posts/first')
  })

  it('leaves out a missing optional parameter at the end', () => {
    const search = route<'get', RouteArg | { query?: RouteArg } | void>('get', '/search/{query?}', ['query?'])

    assert.equal(search.url(), '/search')
    assert.equal(search.url('cats'), '/search/cats')
  })

  it('refuses a missing required parameter', () => {
    const show = route<'get', RouteArg>('get', '/posts/{post}', ['post'])

    assert.throws(() => show.url({} as never), /Missing required parameter "post"/)
  })

  it('refuses a missing optional parameter before a given one', () => {
    const browse = route<'get', { project?: RouteArg; path?: RouteArg }>('get', '/browse/{project?}/{path?}', [
      'project?',
      'path?',
    ])

    assert.throws(() => browse.url({ path: 'a' }), /Unexpected optional parameters missing/)
  })
})

describe('queryParams', () => {
  it('encodes arrays, nested objects and booleans like Laravel', () => {
    assert.equal(
      decodeURIComponent(queryParams({ query: { tags: ['a', 'b'], filter: { status: 'open' }, active: true, empty: null } })),
      '?tags[]=a&tags[]=b&filter[status]=open&active=1',
    )
  })

  it('returns an empty string without a query', () => {
    assert.equal(queryParams(), '')
  })
})
