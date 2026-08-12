import assert from 'node:assert/strict'
import test from 'node:test'

import { referenceDocumentFileName } from '../src/main/application/reference-documents'

test('内置参考资料按当前语言选择对应 Markdown 文件', () => {
  assert.equal(referenceDocumentFileName('latest', 'zh-CN'), 'latest.md')
  assert.equal(referenceDocumentFileName('latest', 'en'), 'latest.en.md')
  assert.equal(referenceDocumentFileName('markdown-handbook', 'zh-TW'), 'markdown-handbook.zh-TW.md')
})
