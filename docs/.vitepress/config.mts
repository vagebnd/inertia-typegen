import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { defineConfig, type HeadConfig } from 'vitepress'

const hostname = 'https://inertia-typegen.vagebond.nl'
const repository = 'https://github.com/vagebnd/inertia-typegen'
const description =
  'Generate TypeScript types and route helpers for Inertia pages from your Laravel routes, controllers and form requests, through Scramble.'

const guide = [
  { text: 'Introduction', link: '/guide/introduction' },
  { text: 'Installation', link: '/guide/installation' },
  { text: 'Configuration', link: '/guide/configuration' },
  { text: 'Vite plugin', link: '/guide/vite-plugin' },
  { text: 'CLI', link: '/guide/cli' },
  { text: 'Usage', link: '/guide/usage' },
  { text: 'Extending', link: '/guide/extending' },
  { text: 'AI assistants', link: '/guide/ai-assistants' },
]

function frontmatterValue(source: string, key: string): string | undefined {
  const frontmatter = source.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? ''

  return frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1].trim()
}

function withoutFrontmatter(source: string): string {
  return source.replace(/^---\n[\s\S]*?\n---\n/, '').trim()
}

export default defineConfig({
  title: 'Inertia Typegen',
  description,
  lang: 'en',
  cleanUrls: true,
  sitemap: { hostname },

  head: [
    ['script', { defer: '', src: 'https://baken.vagebond.nl/baken.js', 'data-key': 'wAfbg773Y8LzIG6NGULM8yl2' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'Inertia Typegen' }],
    ['meta', { property: 'og:image', content: `${hostname}/card.png` }],
    ['meta', { property: 'og:image:width', content: '1280' }],
    ['meta', { property: 'og:image:height', content: '640' }],
    ['meta', { property: 'og:image:alt', content: 'Inertia Typegen: TypeScript types and route helpers for your Inertia pages' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
  ],

  transformPageData(pageData) {
    const path = pageData.relativePath.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')
    const url = `${hostname}/${path}`
    const title =
      pageData.relativePath === 'index.md'
        ? 'Inertia Typegen'
        : pageData.frontmatter.titleTemplate === false
          ? pageData.title
          : `${pageData.title} | Inertia Typegen`
    const head: HeadConfig[] = [
      ['link', { rel: 'canonical', href: url }],
      ['meta', { property: 'og:url', content: url }],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: pageData.description || description }],
    ]

    if (pageData.relativePath === 'index.md') {
      head.push(
        [
          'script',
          { type: 'application/ld+json' },
          JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'inertia-typegen', url: hostname }),
        ],
        [
          'script',
          { type: 'application/ld+json' },
          JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareSourceCode',
            name: 'inertia-typegen',
            url: hostname,
            description: "Inertia Typegen generates TypeScript types and route helpers for Inertia pages from Scramble's OpenAPI document.",
            codeRepository: repository,
          }),
        ],
      )
    }

    pageData.frontmatter.head = [...(pageData.frontmatter.head ?? []), ...head]
  },

  buildEnd({ outDir, srcDir }) {
    const pages = guide.map((item) => {
      const source = readFileSync(join(srcDir, `${item.link}.md`), 'utf-8')

      return { ...item, source, description: frontmatterValue(source, 'description') }
    })

    const index = [
      '# Inertia Typegen',
      '',
      `> ${description}`,
      '',
      'For Laravel 12 and 13 with Inertia 2 or 3, Scramble 0.13.49 or newer, Vite 6 or newer.',
      '',
      '## Guide',
      '',
      ...pages.map((page) => `- [${page.text}](${hostname}${page.link}): ${page.description ?? ''}`),
      '',
      '## Optional',
      '',
      `- [Full documentation in one file](${hostname}/llms-full.txt)`,
      `- [Source code](${repository})`,
      '',
    ]

    writeFileSync(join(outDir, 'llms.txt'), index.join('\n'))
    writeFileSync(
      join(outDir, 'llms-full.txt'),
      pages.map((page) => withoutFrontmatter(page.source)).join('\n\n---\n\n') + '\n',
    )
  },

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/introduction' },
      { text: 'Changelog', link: `${repository}/blob/main/CHANGELOG.md` },
    ],
    sidebar: [{ text: 'Guide', items: guide }],
    socialLinks: [{ icon: 'github', link: repository }],
    editLink: {
      pattern: `${repository}/edit/main/docs/:path`,
      text: 'Edit this page on GitHub',
    },
    search: { provider: 'local' },
    footer: {
      message: 'Released under the MIT License.',
    },
  },
})
