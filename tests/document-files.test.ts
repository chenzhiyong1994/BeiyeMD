import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { MarkdownFileRepository } from '../src/main/infrastructure/markdown-file-repository'
import { normalizeMarkdownFileName } from '../src/main/application/document-names'

test('文件仓库只接受约定的 Markdown 扩展名', () => {
  const repository = new MarkdownFileRepository()

  assert.equal(repository.supports('note.md'), true)
  assert.equal(repository.supports('NOTE.MARKDOWN'), true)
  assert.equal(repository.supports('draft.mdown'), true)
  assert.equal(repository.supports('script.ts'), false)
})

test('批量读取保持用户选择顺序并返回 UTF-8 内容', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'beiye-files-'))
  try {
    const alpha = join(directory, '甲.md')
    const beta = join(directory, '乙.md')
    await writeFile(alpha, '# 甲', 'utf8')
    await writeFile(beta, '# 乙', 'utf8')
    const repository = new MarkdownFileRepository()

    const loaded = await repository.loadMany([beta, alpha])

    assert.deepEqual(loaded, [
      { path: beta, content: '# 乙' },
      { path: alpha, content: '# 甲' }
    ])
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('保存和改名在磁盘上产生对应结果', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'beiye-files-'))
  try {
    const original = join(directory, '草稿.md')
    const renamed = join(directory, '正式文档.md')
    const repository = new MarkdownFileRepository()

    await repository.save(original, '# 草稿')
    await repository.rename(original, renamed)

    assert.equal(await readFile(renamed, 'utf8'), '# 草稿')
    assert.equal(await repository.exists(original), false)
    assert.equal(await repository.exists(renamed), true)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('文档名称补全扩展名并拒绝路径字符、非 Markdown 扩展名和系统保留名', () => {
  assert.equal(normalizeMarkdownFileName('会议记录'), '会议记录.md')
  assert.equal(normalizeMarkdownFileName('会议记录.markdown'), '会议记录.markdown')
  assert.equal(normalizeMarkdownFileName('会议/记录'), null)
  assert.equal(normalizeMarkdownFileName('会议.txt'), null)
  assert.equal(normalizeMarkdownFileName('CON.md'), null)
})
