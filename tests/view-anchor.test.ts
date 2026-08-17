import assert from 'node:assert/strict'
import test from 'node:test'

import { captureRelativeViewAnchor, restoreRelativeViewAnchor } from '../src/renderer/editor/view-anchor'

test('预览与源码使用同一光标进度和滚动进度恢复查看锚点', () => {
  const anchor = captureRelativeViewAnchor({
    cursorOffset: 480,
    contentLength: 1_000,
    scrollTop: 600,
    scrollHeight: 1_500,
    viewportHeight: 300
  })

  assert.deepEqual(anchor, { cursorRatio: 0.48, scrollRatio: 0.5 })
  assert.deepEqual(restoreRelativeViewAnchor(anchor, {
    contentLength: 2_000,
    scrollHeight: 2_400,
    viewportHeight: 400
  }), { cursorOffset: 960, scrollTop: 1_000 })
})

test('空文档与越界浏览位置会被安全限制', () => {
  const anchor = captureRelativeViewAnchor({
    cursorOffset: 20,
    contentLength: 0,
    scrollTop: -10,
    scrollHeight: 100,
    viewportHeight: 200
  })

  assert.deepEqual(anchor, { cursorRatio: 0, scrollRatio: 0 })
  assert.deepEqual(restoreRelativeViewAnchor({ cursorRatio: 2, scrollRatio: -1 }, {
    contentLength: 10,
    scrollHeight: 500,
    viewportHeight: 100
  }), { cursorOffset: 10, scrollTop: 0 })
})
