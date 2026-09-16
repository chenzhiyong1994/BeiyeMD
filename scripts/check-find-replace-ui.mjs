import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkDocumentPositions } from './check-document-positions.mjs'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))

if (!process.versions.electron) {
  const { createServer } = await import('vite')
  const { default: electronPath } = await import('electron')
  const directory = await mkdtemp(join(tmpdir(), 'beiyemd-find-ui-'))
  const server = await createServer({
    configFile: false,
    root: join(root, 'src/renderer'),
    server: { host: '127.0.0.1', port: 0 }
  })
  try {
    await server.listen()
    const env = { ...process.env, ELECTRON_RENDERER_URL: server.resolvedUrls.local[0] }
    delete env.ELECTRON_RUN_AS_NODE
    // Let Electron finish bootstrapping before this module awaits app readiness.
    const launcher = join(directory, 'runner.cjs')
    await writeFile(launcher, `
      const { app } = require('electron')
      app.setPath('userData', ${JSON.stringify(directory)})
      app.on('browser-window-created', (_event, window) => {
        window.webContents.setBackgroundThrottling(false)
      })
      require(${JSON.stringify(join(root, 'dist/main/index.js'))})
      import(${JSON.stringify(import.meta.url)}).catch((error) => {
        console.error(error)
        app.exit(1)
      })
    `)
    const child = spawn(electronPath, [launcher, directory], {
      cwd: root, env, stdio: 'inherit', windowsHide: true
    })
    process.exitCode = await new Promise((resolve, reject) => {
      child.once('error', reject)
      child.once('exit', (code) => resolve(code ?? 1))
    })
  } finally {
    await server.close()
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()))
    await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  }
} else {
  const { app, BrowserWindow, dialog, Menu } = await import('electron')
  const directory = process.argv[2]
  const deadline = setTimeout(() => {
    console.error('Find/replace UI check timed out')
    app.exit(1)
  }, 60_000)

  try {
    await app.whenReady()
    while (!BrowserWindow.getAllWindows().length) await new Promise((resolve) => setTimeout(resolve, 10))
    const window = BrowserWindow.getAllWindows()[0]
    window.webContents.on('console-message', (_event, level, message) => {
      if (level >= 2) console.error(message)
    })
    const run = (action, ...args) => window.webContents.executeJavaScript(
      `(${action.toString()})(...${JSON.stringify(args)})`
    )
    await new Promise((resolve) => {
      if (window.webContents.isLoading()) window.webContents.once('did-finish-load', resolve)
      else resolve()
    })
    console.log('Workspace renderer loaded')
    await run(async () => {
      while (!document.querySelector('.ProseMirror') || !document.getElementById('source-editor')) {
        await new Promise((resolve) => setTimeout(resolve, 25))
      }
    })
    console.log('Workspace editor ready')

    const content = Array.from({ length: 360 }, (_, index) => {
      const prefix = `第 ${index + 1} 行：${'用于检验长文档中的定位与自动换行。'.repeat(5)}`
      return [60, 180, 300].includes(index) ? `${prefix}定位目标` : prefix
    }).join('\n\n')
    const path = join(directory, 'find-navigation.md')
    await writeFile(path, content)
    assert.equal(await run((path) => window.electronAPI.openFilePaths([path]), path), true)
    console.log('Navigation fixture opened')

    await run(async () => {
      document.getElementById('markdown-mode-btn').click()
      await new Promise(requestAnimationFrame)
      document.querySelector('[data-shortcut-action="search"]').click()
      const input = document.querySelector('.find-replace-panel input')
      input.value = '定位目标'
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })

    const inspectSource = async () => run(async () => {
      // Allow native selection scrolling and the highlight scroll listener to settle.
      await new Promise((resolve) => setTimeout(resolve, 350))
      const source = document.getElementById('source-editor')
      const mark = document.querySelector('.source-search-match-current')
      const bounds = source.getBoundingClientRect()
      const hit = mark.getClientRects()[0]
      const panel = document.querySelector('.find-replace-panel').getBoundingClientRect()
      return {
        visible: hit.top >= bounds.top && hit.bottom <= bounds.bottom,
        covered: hit.left < panel.right && hit.right > panel.left && hit.top < panel.bottom && hit.bottom > panel.top,
        scrollTop: source.scrollTop,
        hitTop: hit.top,
        selected: source.value.slice(source.selectionStart, source.selectionEnd),
        counter: document.querySelector('.find-replace-counter').textContent,
        focus: document.activeElement === document.querySelector('.find-replace-panel input')
      }
    })
    const expectSource = async (counter) => {
      const state = await inspectSource()
      assert.equal(state.counter, counter)
      assert.equal(state.selected, '定位目标')
      assert.equal(state.focus, true, '查找后应保留输入焦点')
      assert.equal(state.visible, true, `当前匹配必须滚动到可见位置：${JSON.stringify(state)}`)
      assert.equal(state.covered, false, '当前匹配不应被查找面板遮挡')
    }
    await expectSource('1 / 3')
    await run(() => document.querySelector('[aria-label="下一个匹配"]').click())
    await expectSource('2 / 3')
    if (process.env.BEIYEMD_UI_SCREENSHOT_DIR) {
      await writeFile(join(process.env.BEIYEMD_UI_SCREENSHOT_DIR, 'source.png'), (await window.webContents.capturePage()).toPNG())
    }
    await run(() => document.querySelector('[aria-label="上一个匹配"]').click())
    await expectSource('1 / 3')
    await run(() => document.querySelector('[aria-label="上一个匹配"]').click())
    await expectSource('3 / 3')
    await run(() => {
      const input = document.querySelector('.find-replace-panel input')
      for (let index = 0; index < 5; index += 1) {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      }
    })
    await expectSource('2 / 3')
    await run(() => document.querySelector('.find-replace-panel input').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true })
    ))
    await expectSource('1 / 3')
    window.setSize(720, 480)
    await run(async () => {
      await new Promise(requestAnimationFrame)
      await new Promise(requestAnimationFrame)
      document.querySelector('[aria-label="下一个匹配"]').click()
    })
    await expectSource('2 / 3')
    console.log('Find/replace source navigation passed')
    await run(async () => {
      const input = document.querySelector('.find-replace-panel input')
      input.value = '定位目标|$'
      document.querySelector('[aria-label="正则表达式"]').click()
      document.getElementById('source-editor').scrollTop = 0
      await new Promise(requestAnimationFrame)
      document.querySelector('[aria-label="上一个匹配"]').click()
    })
    const endMatch = await run(async () => {
      await new Promise(requestAnimationFrame)
      const source = document.getElementById('source-editor')
      return {
        atEnd: source.selectionStart === source.value.length,
        distanceFromEnd: source.scrollHeight - source.clientHeight - source.scrollTop,
        viewportHeight: source.clientHeight
      }
    })
    assert.equal(endMatch.atEnd, true)
    assert.ok(endMatch.distanceFromEnd < endMatch.viewportHeight, '文末零宽正则匹配也应滚动到对应位置')
    await run(() => {
      document.querySelector('.find-replace-panel input').value = '定位目标'
      document.querySelector('[aria-label="正则表达式"]').click()
    })

    await run(async () => {
      document.querySelector('[aria-label="关闭"]').click()
      document.getElementById('preview-mode-btn').click()
      await new Promise(requestAnimationFrame)
      document.querySelector('[data-shortcut-action="search"]').click()
    })
    const expectPreview = async (counter, inputIndex = 0) => {
      const state = await run(async (inputIndex) => {
        await new Promise((resolve) => setTimeout(resolve, 350))
        const bounds = document.getElementById('editor').getBoundingClientRect()
        const hit = document.querySelector('.search-match-current').getClientRects()[0]
        const panel = document.querySelector('.find-replace-panel').getBoundingClientRect()
        return {
          visible: hit.top >= bounds.top && hit.bottom <= bounds.bottom,
          covered: hit.left < panel.right && hit.right > panel.left && hit.top < panel.bottom && hit.bottom > panel.top,
          counter: document.querySelector('.find-replace-counter').textContent,
          focus: document.activeElement === document.querySelectorAll('.find-replace-panel input')[inputIndex]
        }
      }, inputIndex)
      assert.equal(state.counter, counter)
      assert.equal(state.focus, true)
      assert.equal(state.visible, true, `预览匹配必须进入视口：${JSON.stringify(state)}`)
      assert.equal(state.covered, false, '预览匹配不应被查找面板遮挡')
    }
    await expectPreview('1 / 3')
    await run(() => document.querySelector('[aria-label="下一个匹配"]').click())
    await expectPreview('2 / 3')
    await run(() => document.querySelector('[aria-label="上一个匹配"]').click())
    await expectPreview('1 / 3')
    await run(() => document.querySelector('[aria-label="上一个匹配"]').click())
    await expectPreview('3 / 3')
    await run(() => {
      const input = document.querySelectorAll('.find-replace-panel input')[1]
      input.focus()
      input.value = '替换完成'
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    assert.equal(await run(() => document.querySelector('.find-replace-counter').textContent), '3 / 3',
      '填写替换文本时应保留当前匹配，避免高亮跳回视口外')
    await run(() => document.querySelector('[aria-label="替换"]').click())
    await expectPreview('1 / 2', 1)
    assert.equal(await run(() => document.querySelector('.ProseMirror').textContent.includes('替换完成')), true)
    if (process.env.BEIYEMD_UI_SCREENSHOT_DIR) {
      await writeFile(join(process.env.BEIYEMD_UI_SCREENSHOT_DIR, 'preview.png'), (await window.webContents.capturePage()).toPNG())
    }
    console.log('Find/replace preview navigation passed')

    await run(async () => {
      document.querySelector('[aria-label="关闭"]').click()
      document.getElementById('markdown-mode-btn').click()
      await new Promise(requestAnimationFrame)
      document.querySelector('[data-shortcut-action="save"]').click()
      while ((await window.electronAPI.getActiveDocument()).dirty) {
        await new Promise((resolve) => setTimeout(resolve, 25))
      }
    })
    const saved = await readFile(path, 'utf8')
    assert.equal(saved.match(/定位目标/gu).length, 2)
    assert.equal(saved.includes('替换完成'), true)

    const secondPath = join(directory, 'second.md')
    await writeFile(secondPath, '# 第二份文档\n\n用于检查文档切换。\n')
    const chooseFiles = dialog.showOpenDialog
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path, secondPath] })
    assert.equal(await run(() => window.electronAPI.openDocuments()), true)
    dialog.showOpenDialog = chooseFiles
    assert.equal((await run(() => window.electronAPI.getDocuments())).documents.filter((item) => item.path).length, 2)
    await run(async () => {
      const buttons = [...document.querySelectorAll('.document-main')]
      buttons.find((button) => button.textContent.includes('second.md')).click()
      while (!document.getElementById('source-editor').value.includes('第二份文档')) {
        await new Promise((resolve) => setTimeout(resolve, 25))
      }
      buttons.find((button) => button.textContent.includes('find-navigation.md')).click()
      while (!document.getElementById('source-editor').value.includes('替换完成')) {
        await new Promise((resolve) => setTimeout(resolve, 25))
      }
    })

    const menuItem = (predicate) => Menu.getApplicationMenu().items
      .flatMap((item) => item.submenu?.items ?? []).find(predicate)
    for (const [language, label] of [['English', 'Find'], ['繁體中文', '尋找內容'], ['简体中文', '查找内容']]) {
      menuItem((item) => item.label === language).click()
      await run(async (label) => {
        while (document.querySelector('.find-replace-panel input').getAttribute('aria-label') !== label) {
          await new Promise((resolve) => setTimeout(resolve, 25))
        }
      }, label)
    }
    const created = new Promise((resolve) => app.once('browser-window-created', (_event, next) => resolve(next)))
    menuItem((item) => item.accelerator === 'CmdOrCtrl+N').click()
    const next = await created
    await new Promise((resolve) => next.webContents.once('did-finish-load', resolve))
    assert.equal(await next.webContents.executeJavaScript('window.electronAPI.getActiveDocument().then((document) => document.content)'), '')
    assert.equal(BrowserWindow.getAllWindows().length, 2)
    next.destroy()
    console.log('Workspace smoke checks passed: save, multiple files, document switching, languages, new window')
    await checkDocumentPositions(run, directory)
    clearTimeout(deadline)
    app.exit(0)
  } catch (error) {
    console.error(error)
    clearTimeout(deadline)
    app.exit(1)
  }
}
