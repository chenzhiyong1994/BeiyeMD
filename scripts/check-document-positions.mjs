import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

// Run against the real workspace, including its ordered document IPC events.
export async function checkDocumentPositions(run, directory) {
  const settle = () => run(async () => {
    await new Promise(requestAnimationFrame)
    await new Promise(requestAnimationFrame)
  })
  const activate = async (id) => {
    await run(async (id) => {
      document.querySelector(`[data-document-id="${id}"]`).click()
      while (document.querySelector('.document-row.active .document-main')?.dataset.documentId !== id) {
        await new Promise((resolve) => setTimeout(resolve, 10))
      }
    }, id)
    await settle()
  }
  const setMode = async (mode) => {
    await run((mode) => document.getElementById(`${mode}-mode-btn`).click(), mode)
    await settle()
  }
  const readPosition = () => run(() => {
    const viewport = document.getElementById('editor').hidden
      ? document.getElementById('source-editor') : document.getElementById('editor')
    return {
      top: viewport.scrollTop,
      ratio: viewport.scrollTop / (viewport.scrollHeight - viewport.clientHeight),
      cursor: viewport.selectionStart,
      gutter: document.getElementById('source-line-numbers').scrollTop
    }
  })
  const scroll = async (top, cursor = 0) => {
    await run((top, cursor) => {
      const viewport = document.getElementById('editor').hidden
        ? document.getElementById('source-editor') : document.getElementById('editor')
      if (viewport instanceof HTMLTextAreaElement) viewport.setSelectionRange(cursor, cursor)
      viewport.scrollTop = top
    }, top, cursor)
    await settle()
  }
  const expectTop = async (expected, message) => {
    const actual = await readPosition()
    assert.ok(Math.abs(actual.top - expected) <= 2, `${message}: expected ${expected}, got ${actual.top}`)
  }
  const expectRatio = async (expected, message) => {
    const actual = await readPosition()
    assert.ok(Math.abs(actual.ratio - expected) < 0.002, `${message}: expected ${expected}, got ${actual.ratio}`)
  }

  for (const mode of ['preview', 'markdown']) {
    await setMode(mode)
    const paths = ['a', 'b'].map((name) => join(directory, `position-${mode}-${name}.md`))
    for (const [index, path] of paths.entries()) {
      await writeFile(path, Array.from({ length: 180 + index * 60 }, (_, line) =>
        `第 ${line + 1} 段：${'文档切换应保留各自的阅读位置。'.repeat(6)}`
      ).join('\n\n'))
    }
    assert.equal(await run((paths) => window.electronAPI.openFilePaths(paths), paths), true)
    await settle()
    const documents = await run(() => window.electronAPI.getDocuments())
    const [a, b] = paths.map((path) => documents.documents.find((item) => item.path === path).id)
    await expectTop(0, `${mode}: newly opened document starts at the top`)
    await scroll(720, 120)
    await activate(a)
    await expectTop(0, `${mode}: first visit must not inherit another document's scroll`)
    await scroll(1840, 350)
    await activate(b)
    await expectTop(720, `${mode}: restore B after scrolling A`)
    const bPosition = await readPosition()
    if (mode === 'markdown') {
      const position = await readPosition()
      assert.equal(position.cursor, 120, 'Source cursor is restored with its document')
      assert.equal(position.gutter, position.top, 'Source line numbers follow restored scroll')
    }
    await activate(a)
    await expectTop(1840, `${mode}: restore A after returning from B`)

    const aPosition = await readPosition()
    const otherMode = mode === 'preview' ? 'markdown' : 'preview'
    await setMode(otherMode)
    await expectRatio(aPosition.ratio, `${mode}: preserve A when changing modes`)
    // Both clicks happen before a paint: a deferred restore must not overwrite
    // the final mode with the hidden viewport's zero-height position.
    await run((mode, otherMode) => {
      document.getElementById(`${mode}-mode-btn`).click()
      document.getElementById(`${otherMode}-mode-btn`).click()
    }, mode, otherMode)
    await settle()
    await expectRatio(aPosition.ratio, `${mode}: rapid mode changes preserve reading progress`)
    await activate(b)
    await expectRatio(bPosition.ratio, `${mode}: restore B in a different mode`)
    await setMode(mode)
    await expectTop(720, `${mode}: B returns to its original position`)

    assert.equal(await run((id) => window.electronAPI.closeDocument(id), a), true)
    await settle()
    await expectTop(720, `${mode}: closing a background document preserves B`)
    assert.equal(await run((paths) => window.electronAPI.openFilePaths(paths), [paths[0]]), true)
    await settle()
    await expectTop(0, `${mode}: reopening a closed document starts at the top`)
    await scroll(940)

    const previous = await run(() => window.electronAPI.getActiveDocument())
    const created = await run(async (previousId) => {
      document.getElementById('new-document-btn').click()
      let active
      do {
        await new Promise((resolve) => setTimeout(resolve, 10))
        active = await window.electronAPI.getActiveDocument()
      } while (active.id === previousId)
      return active
    }, previous.id)
    await settle()
    assert.equal(created.content, '')
    await expectTop(0, `${mode}: a new empty document starts at the top`)
    assert.equal(await run((id) => window.electronAPI.closeDocument(id), created.id), true)
    await settle()
    await expectTop(940, `${mode}: closing the active document restores its neighbor`)

    if (mode === 'markdown') {
      await run(() => {
        const source = document.getElementById('source-editor')
        source.value += '\n\n未保存草稿'
        source.dispatchEvent(new Event('input', { bubbles: true }))
      })
      await scroll(1120, 250)
      await activate(b)
      await activate(previous.id)
      await expectTop(1120, 'Source draft updates do not overwrite the saved position')
      assert.equal(await run(() => document.getElementById('source-editor').value.endsWith('未保存草稿')), true)
    }
    console.log(`Document positions passed: ${mode}`)
  }
}
