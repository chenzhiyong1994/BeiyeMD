import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '..')
const read = (path: string): string => readFileSync(resolve(root, path), 'utf8')

test('源码视图提供持续可见的纵向滚动条', () => {
  const css = read('src/renderer/themes/base.css')
  const sourceEditor = css.match(/#source-editor\s*\{(?<rule>[^}]*)\}/u)?.groups?.rule ?? ''
  const webkitScrollbar = css.match(/#source-editor::-webkit-scrollbar\s*\{(?<rule>[^}]*)\}/u)?.groups?.rule ?? ''

  assert.match(sourceEditor, /overflow-y:\s*(?:auto|scroll)/u)
  assert.match(sourceEditor, /scrollbar-gutter:\s*stable/u)
  assert.doesNotMatch(webkitScrollbar, /width:\s*0/u)
})

test('源码视图的相邻文本行不会呈现为隔行空行', () => {
  const css = read('src/renderer/themes/base.css')
  const sourceEditor = css.match(/#source-editor\s*\{(?<rule>[^}]*)\}/u)?.groups?.rule ?? ''
  const lineHeight = Number(
    sourceEditor.match(/line-height:\s*(?<value>[\d.]+)/u)?.groups?.value
      ?? sourceEditor.match(/font:\s*[^/;]+\/(?<value>[\d.]+)/u)?.groups?.value
  )

  assert.ok(Number.isFinite(lineHeight), '源码编辑器应显式声明行高')
  assert.ok(lineHeight <= 1.6, `源码编辑器行高 ${lineHeight} 过于疏松`)
})

test('预览视图使用适合笔记本的紧凑纵向节奏', () => {
  const css = read('src/renderer/themes/base.css')
  const proseMirror = css.match(/#editor \.ProseMirror\s*\{(?<rule>[^}]*)\}/u)?.groups?.rule ?? ''
  const paragraphs = css.match(/#editor \.ProseMirror p\s*\{(?<rule>[^}]*)\}/u)?.groups?.rule ?? ''
  const lineHeight = Number(proseMirror.match(/line-height:\s*(?<value>[\d.]+)/u)?.groups?.value)
  const paragraphMargin = Number(paragraphs.match(/margin:\s*(?<value>[\d.]+)em/u)?.groups?.value)

  assert.ok(lineHeight <= 1.7, `预览正文行高 ${lineHeight} 过于疏松`)
  assert.ok(paragraphMargin <= 0.65, `预览段落间距 ${paragraphMargin}em 过于疏松`)
  assert.match(css, /#editor \.ProseMirror li > p\s*\{[^}]*margin:/u)
})

test('模式切换捕获并恢复统一的光标与滚动锚点', () => {
  const controller = read('src/renderer/workspace-controller.ts')

  assert.match(controller, /captureModeAnchor/u)
  assert.match(controller, /restoreModeAnchor/u)
  assert.match(controller, /captureRelativeViewAnchor/u)
  assert.match(controller, /restoreRelativeViewAnchor/u)
})
