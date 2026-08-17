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

test('模式切换捕获并恢复统一的光标与滚动锚点', () => {
  const controller = read('src/renderer/workspace-controller.ts')

  assert.match(controller, /captureModeAnchor/u)
  assert.match(controller, /restoreModeAnchor/u)
  assert.match(controller, /captureRelativeViewAnchor/u)
  assert.match(controller, /restoreRelativeViewAnchor/u)
})
