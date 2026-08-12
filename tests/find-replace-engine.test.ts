import assert from 'node:assert/strict'
import test from 'node:test'

import { FindReplaceEngine } from '../src/renderer/editor/find-replace-engine'

test('普通查找默认忽略大小写，并可启用全词匹配', () => {
  const loose = new FindReplaceEngine({ query: 'beiye' })
  assert.deepEqual(loose.locate('BeiyeMD beiye page').map(({ start, end }) => [start, end]), [[0, 5], [8, 13]])

  const whole = new FindReplaceEngine({ query: 'page', wholeWord: true })
  assert.equal(whole.locate('page webpage page').length, 2)
})

test('正则查找支持捕获组替换，并报告无效表达式', () => {
  const engine = new FindReplaceEngine({ query: '(北)(页)', regularExpression: true, replacement: '$2$1' })
  assert.equal(engine.replaceEvery('北页 / 北页'), '页北 / 页北')
  assert.equal(new FindReplaceEngine({ query: '[', regularExpression: true }).error, 'invalid-expression')
})

test('替换指定匹配不会破坏其余文本', () => {
  const engine = new FindReplaceEngine({ query: 'MD', caseSensitive: true, replacement: 'Markdown' })
  const match = engine.locate('MD + md + MD')[1]
  assert.equal(engine.replaceOne('MD + md + MD', match), 'MD + md + Markdown')
})

test('零宽正则不会造成死循环', () => {
  const engine = new FindReplaceEngine({ query: '^|$', regularExpression: true })
  assert.equal(engine.locate('北页').length, 2)
})
