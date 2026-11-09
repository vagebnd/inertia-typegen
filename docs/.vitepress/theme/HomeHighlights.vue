<template>
  <section v-if="section" class="tg-highlights">
    <div class="tg-highlights-inner">
      <p class="tg-eyebrow"><i aria-hidden="true" />{{ section.eyebrow }}</p>
      <div class="tg-highlights-head">
        <h2>{{ section.title }}</h2>
        <p>{{ section.text }}</p>
      </div>

      <ul class="tg-highlights-grid">
        <li v-for="item in section.items" :key="item.title">
          <component :is="icons[item.icon] ?? Sparkles" class="tg-highlight-icon" aria-hidden="true" />
          <h3>{{ item.title }}</h3>
          <p>{{ item.details }}</p>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { FileCode2, Layers, ListChecks, RefreshCw, Route, ShieldCheck, Sparkles } from 'lucide-vue-next'
import { useData } from 'vitepress'
import { type Component, computed } from 'vue'

interface Highlight {
  icon: string
  title: string
  details: string
}

interface Highlights {
  eyebrow: string
  title: string
  text: string
  items: Highlight[]
}

const icons: Record<string, Component> = {
  page: FileCode2,
  form: ListChecks,
  resource: Layers,
  route: Route,
  live: RefreshCw,
  check: ShieldCheck,
}

const { frontmatter } = useData()
const section = computed(() => frontmatter.value.highlights as Highlights | undefined)
</script>

<style scoped>
.tg-highlights {
  padding: 24px 24px 40px;
}

.tg-highlights-inner {
  max-width: 1152px;
  margin: 0 auto;
}

.tg-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  margin: 0 0 18px;
  color: var(--vp-c-text-2);
  font-size: 13px;
  font-weight: 500;
}

.tg-eyebrow i {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: var(--vp-c-brand-2);
  box-shadow: 0 0 12px var(--tg-light-strong);
}

.tg-highlights-head {
  display: grid;
  gap: 16px;
  margin-bottom: 48px;
}

.tg-highlights-head h2 {
  margin: 0;
  color: var(--tg-strong);
  font-size: clamp(30px, 4.2vw, 44px);
  font-weight: 600;
  line-height: 1.08;
  letter-spacing: -0.035em;
  text-wrap: balance;
}

.tg-highlights-head p {
  max-width: 520px;
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 16px;
  line-height: 1.65;
}

.tg-highlights-grid {
  display: grid;
  grid-template-columns: 1fr;
  margin: 0;
  padding: 0;
  border-top: 1px solid var(--vp-c-divider);
  list-style: none;
}

.tg-highlights-grid li {
  position: relative;
  padding: 28px 4px 32px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.tg-highlight-icon {
  width: 20px;
  height: 20px;
  margin-bottom: 18px;
  color: var(--vp-c-text-2);
  stroke-width: 1.5;
  transition: color 0.25s;
}

.tg-highlights-grid li:hover .tg-highlight-icon {
  color: var(--vp-c-brand-1);
}

.tg-highlights-grid h3 {
  margin: 0 0 8px;
  color: var(--vp-c-text-1);
  font-size: 15.5px;
  font-weight: 500;
  letter-spacing: -0.01em;
}

.tg-highlights-grid p {
  max-width: 320px;
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 14px;
  line-height: 1.6;
}

@media (min-width: 640px) {
  .tg-highlights {
    padding: 32px 48px 48px;
  }

  .tg-highlights-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .tg-highlights-grid li {
    padding: 32px 28px 36px;
  }

  .tg-highlights-grid li:nth-child(odd) {
    border-right: 1px solid var(--vp-c-divider);
  }
}

@media (min-width: 960px) {
  .tg-highlights {
    padding: 40px 64px 64px;
  }

  .tg-highlights-head {
    grid-template-columns: 1fr 1fr;
    align-items: end;
    gap: 48px;
  }

  .tg-highlights-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .tg-highlights-grid li:nth-child(odd) {
    border-right: 0;
  }

  .tg-highlights-grid li:not(:nth-child(3n)) {
    border-right: 1px solid var(--vp-c-divider);
  }
}
</style>
