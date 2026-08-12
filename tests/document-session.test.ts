import assert from 'node:assert/strict'
import test from 'node:test'

import { DocumentSession } from '../src/main/application/document-session'

function deterministicIds(): () => string {
  let nextId = 0
  return () => `document-${++nextId}`
}

function createSession(): DocumentSession {
  return new DocumentSession({
    createId: deterministicIds(),
    untitledName: () => '未命名文档',
    canonicalizePath: (value) => value.replaceAll('\\', '/').toLocaleLowerCase('en-US')
  })
}

test('新窗口始终提供一个可编辑的空白文档', () => {
  const session = createSession()

  assert.equal(session.documents.length, 1)
  assert.equal(session.activeDocument?.name, '未命名文档')
  assert.equal(session.activeDocument?.path, null)
})

test('内置参考资料保持只读且不会因编辑器规范化产生未保存状态', () => {
  const session = createSession()

  session.loadReferenceContent('Markdown 语法速查.md', '# 语法速查\n\n| 写法 | 说明 |\n| --- | --- |')
  const document = session.activeDocument!

  assert.equal(document.name, 'Markdown 语法速查.md')
  assert.equal(document.readOnly, true)
  assert.equal(document.dirty, false)
  assert.equal(session.updateDraft(document.id, '# 被规范化的内容'), false)
  assert.equal(document.content, '# 语法速查\n\n| 写法 | 说明 |\n| --- | --- |')
  assert.equal(document.dirty, false)
})

test('一次打开多个文件并按路径去重，重复打开只激活已有文档', () => {
  const session = createSession()

  session.openFiles([
    { path: 'C:\\Docs\\Alpha.md', content: '# Alpha' },
    { path: 'C:\\Docs\\Beta.md', content: '# Beta' }
  ])
  const alphaId = session.documents.find((document) => document.name === 'Alpha.md')?.id

  session.openFiles([{ path: 'c:/docs/alpha.md', content: '不应覆盖已有内容' }])

  assert.equal(session.documents.length, 2)
  assert.equal(session.activeDocumentId, alphaId)
  assert.equal(session.activeDocument?.content, '# Alpha')
})

test('切换文档前写入草稿，切回后内容仍然存在', () => {
  const session = createSession()
  session.openFiles([
    { path: 'C:\\Docs\\Alpha.md', content: '# Alpha' },
    { path: 'C:\\Docs\\Beta.md', content: '# Beta' }
  ])
  const [alpha, beta] = session.documents

  session.activate(alpha.id)
  session.updateDraft(alpha.id, '# Alpha\n\n未保存内容')
  session.activate(beta.id)
  session.activate(alpha.id)

  assert.equal(session.activeDocument?.content, '# Alpha\n\n未保存内容')
  assert.equal(session.activeDocument?.dirty, true)
})

test('关闭当前文档后选择相邻文档，且不会关闭窗口中的最后一份文档', () => {
  const session = createSession()
  session.openFiles([
    { path: 'C:\\Docs\\Alpha.md', content: '# Alpha' },
    { path: 'C:\\Docs\\Beta.md', content: '# Beta' },
    { path: 'C:\\Docs\\Gamma.md', content: '# Gamma' }
  ])
  const beta = session.documents[1]
  const gamma = session.documents[2]

  session.activate(beta.id)
  assert.equal(session.close(beta.id), true)
  assert.equal(session.activeDocumentId, gamma.id)
  assert.equal(session.close(gamma.id), true)
  assert.equal(session.close(session.activeDocumentId!), false)
  assert.equal(session.documents.length, 1)
})

test('保存后更新路径和基准内容，文档恢复为干净状态', () => {
  const session = createSession()
  const document = session.activeDocument!
  session.updateDraft(document.id, '# 新文档')

  session.markSaved(document.id, 'C:\\Docs\\New.md', '# 新文档')

  assert.equal(session.activeDocument?.path, 'C:\\Docs\\New.md')
  assert.equal(session.activeDocument?.name, 'New.md')
  assert.equal(session.activeDocument?.dirty, false)
})

test('未保存文档可以先修改显示名称，稍后保存时采用真实文件名', () => {
  const session = createSession()
  const document = session.activeDocument!

  assert.equal(session.renameDisplayName(document.id, '会议记录.md'), true)
  assert.equal(session.activeDocument?.name, '会议记录.md')
  assert.equal(session.activeDocument?.path, null)

  session.markSaved(document.id, 'C:\\Docs\\正式记录.md', '')
  assert.equal(session.activeDocument?.name, '正式记录.md')
})

test('磁盘文件改名只更新位置，不会把未保存草稿误标为已保存', () => {
  const session = createSession()
  session.openFiles([{ path: 'C:\\Docs\\旧名称.md', content: '磁盘内容' }])
  const document = session.activeDocument!
  session.updateDraft(document.id, '本地草稿')

  session.relocate(document.id, 'C:\\Docs\\新名称.md')

  assert.equal(session.activeDocument?.name, '新名称.md')
  assert.equal(session.activeDocument?.path, 'C:\\Docs\\新名称.md')
  assert.equal(session.activeDocument?.content, '本地草稿')
  assert.equal(session.activeDocument?.dirty, true)
})

test('外部更新实时刷新干净文档，但不覆盖本地未保存草稿', () => {
  const session = createSession()
  session.openFiles([{ path: 'C:\\Docs\\Alpha.md', content: '磁盘版本一' }])
  const document = session.activeDocument!

  assert.equal(session.applyExternalChange(document.id, '磁盘版本二'), 'applied')
  assert.equal(session.activeDocument?.content, '磁盘版本二')

  session.updateDraft(document.id, '本地未保存内容')
  assert.equal(session.applyExternalChange(document.id, '磁盘版本三'), 'deferred')
  assert.equal(session.activeDocument?.content, '本地未保存内容')
  assert.equal(session.activeDocument?.externalChangePending, true)
})
