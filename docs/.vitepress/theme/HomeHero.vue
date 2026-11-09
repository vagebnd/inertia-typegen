<template>
  <section v-if="landing" class="tg-hero">
    <div class="tg-hero-bg" aria-hidden="true">
      <div class="tg-hero-light" />
      <div class="tg-hero-light tg-hero-light-low" />
      <div class="tg-hero-grid" />
    </div>

    <div class="tg-hero-inner">
      <div class="tg-hero-copy">
        <h1 class="tg-hero-title">
          <span class="tg-hero-name">{{ landing.name }}</span>
          <span class="tg-hero-text">{{ landing.title }}</span>
        </h1>

        <p class="tg-hero-lead">{{ landing.lead }}</p>

        <div class="tg-hero-actions">
          <a class="tg-button tg-button-primary" :href="landing.primary.link">{{ landing.primary.text }}</a>
          <a class="tg-button tg-button-ghost" :href="landing.secondary.link" target="_blank" rel="noreferrer">
            {{ landing.secondary.text }}
            <ArrowUpRight class="tg-button-icon" aria-hidden="true" />
          </a>
        </div>

        <div class="tg-install">
          <span class="tg-install-prompt" aria-hidden="true">$</span>
          <code>{{ landing.install }}</code>
          <button type="button" class="tg-install-copy" :aria-label="copied ? 'Copied' : 'Copy the command'" @click="copy">
            <Check v-if="copied" aria-hidden="true" />
            <Copy v-else aria-hidden="true" />
          </button>
        </div>

        <ul class="tg-chips" aria-label="Works with">
          <li v-for="chip in landing.chips" :key="chip">{{ chip }}</li>
        </ul>
      </div>

      <div class="tg-hero-code" aria-label="Example: a controller and the page that uses its types">
        <figure class="tg-window tg-window-back">
          <figcaption class="tg-window-bar">
            <span class="tg-window-dots" aria-hidden="true"><i /><i /><i /></span>
            <span>app/Http/Controllers/PostController.php</span>
          </figcaption>
          <div class="tg-window-body" v-html="code.controller" />
        </figure>
        <figure class="tg-window tg-window-front">
          <figcaption class="tg-window-bar">
            <span class="tg-window-dots" aria-hidden="true"><i /><i /><i /></span>
            <span>resources/js/pages/posts/index.vue</span>
          </figcaption>
          <div class="tg-window-body" v-html="code.page" />
        </figure>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ArrowUpRight, Check, Copy } from 'lucide-vue-next'
import { useData } from 'vitepress'
import { computed, ref } from 'vue'

import { data as code } from './hero.data'

interface Link {
  text: string
  link: string
}

interface Landing {
  name: string
  title: string
  lead: string
  primary: Link
  secondary: Link
  install: string
  chips: string[]
}

const { frontmatter } = useData()
const landing = computed(() => frontmatter.value.landing as Landing | undefined)
const copied = ref(false)

async function copy() {
  if (!landing.value) return

  await navigator.clipboard.writeText(landing.value.install)
  copied.value = true
  setTimeout(() => (copied.value = false), 1600)
}
</script>

<style scoped>
.tg-hero {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  margin-top: calc(var(--vp-nav-height) * -1);
  padding: calc(var(--vp-nav-height) + 64px) 24px 64px;
}

.tg-hero-bg {
  position: absolute;
  z-index: -1;
  inset: 0;
  overflow: hidden;
  mask-image: linear-gradient(to bottom, #000 70%, transparent);
  pointer-events: none;
}

.tg-hero-light {
  position: absolute;
  top: -360px;
  right: -220px;
  width: 1100px;
  height: 900px;
  background: radial-gradient(closest-side, var(--tg-light), transparent);
  pointer-events: none;
}

.tg-hero-light-low {
  top: 35%;
  right: auto;
  left: -420px;
  width: 1000px;
  height: 760px;
  background: radial-gradient(closest-side, var(--tg-light-low), transparent);
}

.tg-hero-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--tg-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--tg-grid) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(ellipse 70% 60% at 70% 30%, #000 20%, transparent 75%);
  pointer-events: none;
}

.tg-hero-inner {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 56px;
  max-width: 1152px;
  margin: 0 auto;
}

.tg-hero-copy {
  min-width: 0;
}

.tg-hero-title {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 0;
}

.tg-hero-name {
  color: var(--vp-c-brand-1);
  font-size: 15px;
  font-weight: 500;
  letter-spacing: -0.005em;
}

.tg-hero-text {
  max-width: 620px;
  color: var(--tg-strong);
  font-size: clamp(38px, 6vw, 60px);
  font-weight: 600;
  line-height: 1.04;
  letter-spacing: -0.04em;
  text-wrap: balance;
}

.tg-hero-lead {
  max-width: 540px;
  margin: 24px 0 0;
  color: var(--vp-c-text-2);
  font-size: 18px;
  line-height: 1.6;
  letter-spacing: -0.01em;
}

.tg-hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 36px;
}

.tg-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 42px;
  padding: 0 18px;
  border-radius: 10px;
  font-size: 14.5px;
  font-weight: 500;
  letter-spacing: -0.005em;
  white-space: nowrap;
  transition:
    background-color 0.15s,
    color 0.15s,
    box-shadow 0.25s;
}

.tg-button-primary {
  background: var(--tg-primary-bg);
  color: var(--tg-primary-text);
  box-shadow: var(--tg-primary-shadow);
}

.tg-button-primary:hover {
  background: var(--tg-primary-hover);
  box-shadow: var(--tg-primary-shadow-hover);
}

.tg-button-ghost {
  padding: 0 8px;
  color: var(--vp-c-text-2);
}

.tg-button-ghost:hover {
  color: var(--vp-c-text-1);
}

.tg-button-icon {
  width: 15px;
  height: 15px;
  stroke-width: 1.6;
}

.tg-install {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 440px;
  height: 44px;
  margin-top: 28px;
  padding: 0 6px 0 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--tg-surface);
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
}

.tg-install-prompt {
  color: var(--vp-c-text-3);
}

.tg-install code {
  flex: 1;
  overflow: hidden;
  color: var(--vp-c-text-1);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tg-install-copy {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 7px;
  color: var(--vp-c-text-3);
  transition:
    background-color 0.15s,
    color 0.15s;
}

.tg-install-copy:hover {
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-1);
}

.tg-install-copy svg {
  width: 15px;
  height: 15px;
  stroke-width: 1.6;
}

.tg-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 28px 0 0;
  padding: 0;
  list-style: none;
}

.tg-chips li {
  height: 28px;
  padding: 0 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  background: var(--tg-surface);
  color: var(--vp-c-text-2);
  font-size: 12.5px;
  line-height: 26px;
}

.tg-hero-code {
  display: grid;
  gap: 16px;
  min-width: 0;
}

.tg-window {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  border: 1px solid var(--tg-window-border);
  border-radius: 12px;
  background: var(--vp-code-block-bg);
  box-shadow: var(--tg-window-shadow);
}

.tg-window-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  height: 40px;
  padding: 0 14px;
  border-bottom: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  white-space: nowrap;
}

.tg-window-dots {
  display: inline-flex;
  gap: 6px;
}

.tg-window-dots i {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--vp-c-border);
}

.tg-window-body :deep(div[class*='language-']) {
  margin: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.tg-window-body :deep(pre) {
  margin: 0;
  padding: 18px 0;
  overflow-x: auto;
  background: transparent;
}

.tg-window-body :deep(code) {
  display: block;
  width: fit-content;
  min-width: 100%;
  padding: 0 20px;
  font-size: 13px;
  line-height: 1.75;
}

.tg-window-body :deep(.lang),
.tg-window-body :deep(.copy) {
  display: none;
}

@media (min-width: 640px) {
  .tg-hero {
    padding: calc(var(--vp-nav-height) + 88px) 48px 80px;
  }
}

@media (min-width: 1080px) {
  .tg-hero {
    padding: calc(var(--vp-nav-height) + 104px) 64px 96px;
  }

  .tg-hero-inner {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.04fr);
    align-items: center;
    gap: 48px;
  }

  .tg-hero-code {
    position: relative;
    display: block;
    height: 476px;
  }

  .tg-window-back {
    position: absolute;
    top: 0;
    left: 0;
    width: 88%;
    opacity: 0.92;
  }

  .tg-window-front {
    position: absolute;
    top: 190px;
    right: 0;
    width: 92%;
    box-shadow: var(--tg-window-shadow-front);
  }
}
</style>
