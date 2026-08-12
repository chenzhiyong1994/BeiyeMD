import assert from 'node:assert/strict'
import test from 'node:test'

import { sourceSearchSegments } from '../src/renderer/editor/source-search-highlights'

test('源码查找为所有命中生成持久高亮，并单独标记当前命中', () => {
  const source = '# BeiyeMD\n\nBeiyeMD keeps Markdown readable.'
  const segments = sourceSearchSegments(source, [
    { from: 2, to: 9 },
    { from: 11, to: 18 }
  ], 1)

  assert.deepEqual(
    segments.filter((segment) => segment.kind !== 'text'),
    [
      { kind: 'match', text: 'BeiyeMD' },
      { kind: 'current', text: 'BeiyeMD' }
    ]
  )
  assert.equal(segments.map((segment) => segment.text).join(''), source)
})
