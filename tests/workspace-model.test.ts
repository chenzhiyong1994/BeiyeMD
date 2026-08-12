import assert from 'node:assert/strict'
import test from 'node:test'

import {
  countMarkdownWords,
  filterDocuments,
  isCompactSidebarWidth,
  normalizeSidebarWidth,
  presentDocumentState
} from '../src/renderer/workspace-model'
import { copyFor } from '../src/renderer/workspace-copy'

test('Markdown 字数忽略语法符号，同时统计中日韩字符和拉丁词', () => {
  const markdown = '# 北页编辑器\n\n**Local first** and [Markdown](https://example.com).\n\n```ts\nconst hidden = true\n```'
  assert.equal(countMarkdownWords(markdown), 9)
})

test('文档筛选同时匹配名称和路径，并保持原有顺序', () => {
  const documents = [
    { id: 'a', name: '产品说明.md', path: 'D:\\docs\\产品说明.md', dirty: false, readOnly: false },
    { id: 'b', name: 'notes.md', path: 'D:\\北页\\notes.md', dirty: true, readOnly: false },
    { id: 'c', name: 'draft.md', path: null, dirty: false, readOnly: false }
  ]

  assert.deepEqual(filterDocuments(documents, '北页').map((item) => item.id), ['b'])
  assert.deepEqual(filterDocuments(documents, 'MD').map((item) => item.id), ['a', 'b', 'c'])
})

test('侧栏宽度受产品下限、上限和窗口可用空间共同约束', () => {
  assert.equal(normalizeSidebarWidth(120, 1440), 196)
  assert.equal(normalizeSidebarWidth(900, 1440), 420)
  assert.equal(normalizeSidebarWidth(360, 720), 302)
})

test('侧栏在不足以容纳完整顶部操作区时切换紧凑布局', () => {
  assert.equal(isCompactSidebarWidth(271), true)
  assert.equal(isCompactSidebarWidth(272), false)
})

test('文档状态按语言显示保存、未保存和新建状态', () => {
  assert.equal(presentDocumentState({ id: 'a', name: 'a.md', path: null, dirty: false, readOnly: false }, 'zh-CN'), '新文档')
  assert.equal(presentDocumentState({ id: 'a', name: 'a.md', path: 'a.md', dirty: true, readOnly: false }, 'en'), 'Unsaved')
  assert.equal(presentDocumentState({ id: 'a', name: 'a.md', path: 'a.md', dirty: false, readOnly: false }, 'zh-TW'), '已儲存')
  assert.equal(presentDocumentState({ id: 'r', name: 'guide.md', path: null, dirty: false, readOnly: true }, 'zh-CN'), '参考资料')
})

test('英文紧凑侧栏使用可辨认的 Doc 与 TOC 标签', () => {
  const text = copyFor('en')
  assert.equal(text.documentsShort, 'Doc')
  assert.equal(text.outlineShort, 'TOC')
})
