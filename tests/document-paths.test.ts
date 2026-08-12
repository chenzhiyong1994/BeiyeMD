import assert from 'node:assert/strict'
import test from 'node:test'

import { canonicalDocumentPath, documentFileNameMatches } from '../src/main/application/document-paths'

test('Windows 文档路径按不区分大小写的文件系统去重', () => {
  assert.equal(
    canonicalDocumentPath('C:\\Notes\\Draft.md', 'win32'),
    canonicalDocumentPath('c:\\notes\\draft.md', 'win32')
  )
})

test('macOS 文档路径保留大小写，兼容区分大小写的磁盘', () => {
  assert.notEqual(
    canonicalDocumentPath('/Volumes/TestDisk/Notes/Draft.md', 'darwin'),
    canonicalDocumentPath('/Volumes/TestDisk/Notes/draft.md', 'darwin')
  )
})

test('外部文件监听只在 Windows 上忽略文件名大小写', () => {
  assert.equal(documentFileNameMatches('Draft.md', 'draft.md', 'win32'), true)
  assert.equal(documentFileNameMatches('Draft.md', 'draft.md', 'darwin'), false)
  assert.equal(documentFileNameMatches('Draft.md', 'Draft.md', 'darwin'), true)
})
