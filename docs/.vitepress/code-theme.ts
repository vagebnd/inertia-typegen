import type { ThemeOptions } from 'vitepress'

interface Palette {
  background: string
  foreground: string
  punctuation: string
  comment: string
  keyword: string
  string: string
  type: string
  function: string
  constant: string
}

function theme(name: string, type: 'light' | 'dark', palette: Palette): ThemeOptions {
  return {
    name,
    type,
    colors: { 'editor.background': palette.background, 'editor.foreground': palette.foreground },
    tokenColors: [
      { settings: { foreground: palette.foreground } },
      { scope: ['punctuation', 'meta.brace', 'keyword.operator'], settings: { foreground: palette.punctuation } },
      {
        scope: ['comment', 'punctuation.definition.comment'],
        settings: { foreground: palette.comment, fontStyle: 'italic' },
      },
      {
        scope: [
          'keyword',
          'storage',
          'storage.type',
          'storage.modifier',
          'keyword.operator.new',
          'keyword.operator.expression',
          'keyword.operator.type',
          'entity.name.tag',
          'punctuation.definition.tag',
        ],
        settings: { foreground: palette.keyword },
      },
      { scope: ['string', 'punctuation.definition.string'], settings: { foreground: palette.string } },
      {
        scope: [
          'entity.name.type',
          'entity.name.class',
          'entity.name.namespace',
          'entity.other.inherited-class',
          'entity.other.attribute-name',
          'support.class',
          'support.type',
          'support.other.namespace',
        ],
        settings: { foreground: palette.type },
      },
      { scope: ['entity.name.function', 'support.function'], settings: { foreground: palette.function } },
      {
        scope: ['constant', 'constant.numeric', 'constant.language', 'support.constant', 'variable.other.enummember'],
        settings: { foreground: palette.constant },
      },
      {
        scope: [
          'variable',
          'variable.other',
          'variable.parameter',
          'meta.object-literal.key',
          'support.type.property-name',
          'punctuation.definition.variable',
        ],
        settings: { foreground: palette.foreground },
      },
    ],
  }
}

export const codeDark = theme('typegen-dark', 'dark', {
  background: '#0f1013',
  foreground: '#d5d7dd',
  punctuation: '#a2a4ab',
  comment: '#848c9f',
  keyword: '#96b0ff',
  string: '#ffc75a',
  type: '#3ce5c7',
  function: '#d4a3ff',
  constant: '#ff9c68',
})

export const codeLight = theme('typegen-light', 'light', {
  background: '#f6f7f9',
  foreground: '#24262b',
  punctuation: '#52555c',
  comment: '#636978',
  keyword: '#3f4add',
  string: '#a45900',
  type: '#007b66',
  function: '#8031c0',
  constant: '#be4400',
})
