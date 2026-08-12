import assert from 'node:assert/strict'
import test from 'node:test'

import { formulaMarkdown } from '../src/renderer/editor/formula-format'

test('行内公式和块公式使用稳定的 Markdown 包装', () => {
  assert.equal(formulaMarkdown('E=mc^2', false), '$E=mc^2$')
  assert.equal(formulaMarkdown('x^2 + y^2', true), '\n$$\nx^2 + y^2\n$$\n')
})

test('空公式不会向文档插入占位符', () => {
  assert.equal(formulaMarkdown('   ', false), '')
})
