import { createMarkdownRenderer, defineLoader, type SiteConfig } from 'vitepress'

const controller = `public function index(): Response
{
    return Inertia::render('posts/index', [
        'posts' => PostResource::collection(Post::all()),
    ]);
}`

const page = `<script setup lang="ts">
import { show } from '@/routes/posts'
import type { Inertia } from '@/types/inertia'

const props = defineProps<Inertia.Pages.Posts.Index>()

// a typed URL from the named route
router.visit(show.url({ post: props.posts[0].id }))
</script>`

export interface HeroCode {
  controller: string
  page: string
}

declare const data: HeroCode
export { data }

export default defineLoader({
  async load(): Promise<HeroCode> {
    const config = (globalThis as { VITEPRESS_CONFIG?: SiteConfig }).VITEPRESS_CONFIG

    if (!config) {
      throw new Error('The VitePress configuration is not available.')
    }

    const md = await createMarkdownRenderer(config.srcDir, config.markdown, config.site.base, config.logger)
    const fence = (lang: string, code: string) => md.render(`\`\`\`${lang}\n${code}\n\`\`\``)

    return { controller: fence('php', controller), page: fence('vue', page) }
  },
})
