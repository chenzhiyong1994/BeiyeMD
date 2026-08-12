import { app, BrowserWindow, dialog, ipcMain, Menu, protocol, shell } from 'electron'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { channels, type DocumentSnapshot, type ImageAssetInput, type Language } from '../shared/contracts'
import { copy, type ApplicationCopy } from './application/localization'
import { referenceDocumentFileName } from './application/reference-documents'
import { AssetFiles, imageMimeType, pathFromAssetUrl } from './infrastructure/asset-files'
import { MarkdownFileRepository } from './infrastructure/markdown-file-repository'
import { SettingsStore } from './infrastructure/settings-store'
import { WindowWorkspace } from './electron/window-workspace'

app.setName('BeiyeMD')
if (process.platform === 'win32') app.setAppUserModelId('com.beiyemd.app')

protocol.registerSchemesAsPrivileged([{
  scheme: 'beiye-asset',
  privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
}])

const markdownFiles = new MarkdownFileRepository()
const assetFiles = new AssetFiles()
const settings = new SettingsStore(join(app.getPath('userData'), 'settings.json'))
const workspaces = new Map<number, WindowWorkspace>()
type ReferenceDocumentLabel = 'recentUpdates' | 'cheatsheet'
interface ReferenceDocumentDescriptor {
  directory: string
  baseName: string
  label: ReferenceDocumentLabel
}
const referenceDocuments = new Map<number, ReferenceDocumentDescriptor>()
let documentSequence = 0
let pendingSystemPaths: string[] = []

const resources = {
  guides: app.isPackaged ? join(process.resourcesPath, 'guides') : join(__dirname, '../../resources/guides'),
  releaseNotes: app.isPackaged ? join(process.resourcesPath, 'release-notes') : join(__dirname, '../../resources/release-notes'),
  icon: join(__dirname, '../../resources/icon.png')
}

function text(): ApplicationCopy {
  return copy[settings.language]
}

function workspaceForContents(contents: Electron.WebContents): WindowWorkspace | null {
  const window = BrowserWindow.fromWebContents(contents)
  return window ? workspaces.get(window.id) ?? null : null
}

function focusedWorkspace(): WindowWorkspace | null {
  const window = BrowserWindow.getFocusedWindow()
  return window ? workspaces.get(window.id) ?? null : null
}

function createWorkspace(window: BrowserWindow): WindowWorkspace {
  const workspace = new WindowWorkspace({
    window,
    files: markdownFiles,
    assets: assetFiles,
    settings,
    copy: () => text(),
    createDocumentId: () => `document-${++documentSequence}`
  })
  workspaces.set(window.id, workspace)
  return workspace
}

function createWindow(options: { paths?: readonly string[]; reference?: { name: string; content: string; descriptor: ReferenceDocumentDescriptor } } = {}): BrowserWindow {
  const window = new BrowserWindow({
    width: 1180,
    height: 800,
    minWidth: 720,
    minHeight: 480,
    title: 'BeiyeMD',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    ...(process.env.ELECTRON_RENDERER_URL ? { icon: resources.icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  })
  const workspace = createWorkspace(window)
  if (options.reference) referenceDocuments.set(window.id, options.reference.descriptor)

  if (process.env.ELECTRON_RENDERER_URL) void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void window.loadFile(join(__dirname, '../renderer/index.html'))

  window.webContents.once('did-finish-load', () => {
    window.webContents.send(channels.setLanguage, settings.language)
    if (options.paths?.length) {
      void workspace.openPaths(options.paths).catch(() => workspace.publish())
    } else {
      if (options.reference) workspace.loadReferenceContent(options.reference.name, options.reference.content)
      workspace.publish()
    }
  })

  window.on('close', (event) => {
    if (!workspace.confirmWindowClose()) event.preventDefault()
  })
  window.on('closed', () => {
    workspace.dispose()
    workspaces.delete(window.id)
    referenceDocuments.delete(window.id)
  })

  return window
}

async function chooseMarkdownPaths(owner?: BrowserWindow): Promise<string[]> {
  const options: Electron.OpenDialogOptions = {
    filters: [
      { name: text().markdownDocuments, extensions: ['md', 'markdown', 'mdown', 'mkd'] },
      { name: text().allFiles, extensions: ['*'] }
    ],
    properties: ['openFile', 'multiSelections']
  }
  const result = owner ? await dialog.showOpenDialog(owner, options) : await dialog.showOpenDialog(options)
  return result.canceled ? [] : result.filePaths
}

async function openDocumentsInNewWindow(): Promise<void> {
  const paths = await chooseMarkdownPaths(BrowserWindow.getFocusedWindow() ?? undefined)
  if (paths.length) createWindow({ paths }).focus()
}

async function readReferenceDocument(descriptor: ReferenceDocumentDescriptor, language: Language): Promise<string> {
  return readFile(join(descriptor.directory, referenceDocumentFileName(descriptor.baseName, language)), 'utf8')
}

async function openReferenceDocument(directory: string, baseName: string, label: ReferenceDocumentLabel): Promise<void> {
  const descriptor = { directory, baseName, label }
  try {
    const content = await readReferenceDocument(descriptor, settings.language)
    createWindow({ reference: { name: `${text()[label]}.md`, content, descriptor } }).focus()
  } catch {
    createWindow().focus()
  }
}

function openSystemPath(path: string): void {
  if (!markdownFiles.supports(path)) return
  const existing = [...workspaces.values()].find((workspace) => workspace.hasPath(path))
  if (existing) {
    existing.window.show()
    existing.window.focus()
    return
  }
  createWindow({ paths: [path] }).focus()
}

function sendFocused(channel: string): void {
  focusedWorkspace()?.window.webContents.send(channel)
}

async function setLanguage(language: Language): Promise<void> {
  await settings.setLanguage(language)
  buildMenu()
  for (const workspace of workspaces.values()) {
    workspace.window.webContents.send(channels.setLanguage, language)
    const reference = referenceDocuments.get(workspace.window.id)
    let referenceUpdated = false
    if (reference) {
      try {
        workspace.loadReferenceContent(`${copy[language][reference.label]}.md`, await readReferenceDocument(reference, language))
        referenceUpdated = true
      } catch {
        // Keep the currently displayed reference if a localized asset is unavailable.
      }
    }
    workspace.publish({ active: referenceUpdated })
  }
}

const themeItems = [
  { id: 'light', label: 'light' },
  { id: 'dark', label: 'dark' },
  { id: 'mist', label: 'mist' },
  { id: 'sage', label: 'sage' },
  { id: 'graphite', label: 'graphite' }
] as const

function buildMenu(): void {
  const t = text()
  const isMac = process.platform === 'darwin'
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{
      label: t.app,
      submenu: [
        { label: t.about, click: () => void dialog.showMessageBox({ type: 'info', title: t.about, message: t.aboutText }) },
        { type: 'separator' as const },
        { label: t.hide, role: 'hide' as const },
        { label: t.hideOthers, role: 'hideOthers' as const },
        { label: t.unhide, role: 'unhide' as const },
        { type: 'separator' as const },
        { label: t.quit, role: 'quit' as const }
      ]
    }] : []),
    {
      label: t.file,
      submenu: [
        { label: t.newWindow, accelerator: 'CmdOrCtrl+N', click: () => createWindow().focus() },
        { label: t.openWindow, accelerator: 'CmdOrCtrl+O', click: () => void openDocumentsInNewWindow() },
        { label: t.quickOpen, accelerator: 'CmdOrCtrl+P', click: () => sendFocused(channels.quickOpen) },
        { label: t.closeDocument, accelerator: 'CmdOrCtrl+W', click: () => sendFocused(channels.menuCloseDocument) },
        { type: 'separator' },
        { label: t.save, accelerator: 'CmdOrCtrl+S', click: () => sendFocused(channels.menuSave) },
        { label: t.saveAs, accelerator: 'CmdOrCtrl+Shift+S', click: () => sendFocused(channels.menuSaveAs) },
        { type: 'separator' },
        { label: t.exportPdf, click: () => sendFocused(channels.menuExportPDF) },
        { type: 'separator' },
        isMac ? { label: t.close, role: 'close' } : { label: t.quit, role: 'quit' }
      ]
    },
    {
      label: t.edit,
      submenu: [
        { label: t.undo, role: 'undo' }, { label: t.redo, role: 'redo' }, { type: 'separator' },
        { label: t.cut, role: 'cut' }, { label: t.copy, role: 'copy' }, { label: t.paste, role: 'paste' },
        { label: t.selectAll, role: 'selectAll' }, { type: 'separator' },
        { label: t.find, accelerator: 'CmdOrCtrl+F', click: () => sendFocused(channels.search) },
        { label: t.insertFormula, accelerator: 'CmdOrCtrl+Shift+E', click: () => sendFocused(channels.mathModal) }
      ]
    },
    {
      label: t.view,
      submenu: [
        { label: t.resetZoom, role: 'resetZoom' }, { label: t.zoomIn, role: 'zoomIn' }, { label: t.zoomOut, role: 'zoomOut' },
        { type: 'separator' },
        { label: t.toggleFiles, accelerator: 'CmdOrCtrl+Shift+B', click: () => sendFocused(channels.toggleFilePanel) },
        { type: 'separator' }, { label: t.fullscreen, role: 'togglefullscreen' }
      ]
    },
    {
      label: t.theme,
      submenu: themeItems.map((item) => ({ label: t[item.label], click: () => focusedWorkspace()?.window.webContents.send(channels.setTheme, item.id) }))
    },
    {
      label: t.language,
      submenu: [
        { label: '简体中文', type: 'radio', checked: settings.language === 'zh-CN', click: () => void setLanguage('zh-CN') },
        { label: 'English', type: 'radio', checked: settings.language === 'en', click: () => void setLanguage('en') },
        { label: '繁體中文', type: 'radio', checked: settings.language === 'zh-TW', click: () => void setLanguage('zh-TW') }
      ]
    },
    {
      label: t.help,
      submenu: [
        { label: t.recentUpdates, accelerator: 'CmdOrCtrl+Shift+D', click: () => void openReferenceDocument(resources.releaseNotes, 'latest', 'recentUpdates') },
        { label: t.cheatsheet, accelerator: 'CmdOrCtrl+Shift+/', click: () => void openReferenceDocument(resources.guides, 'markdown-handbook', 'cheatsheet') },
        { label: t.about, click: () => void dialog.showMessageBox({ type: 'info', title: t.about, message: t.aboutText }) }
      ]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function registerIpc(): void {
  ipcMain.on(channels.openExternal, (_event, url: string) => {
    if (typeof url === 'string' && /^https?:\/\//iu.test(url)) void shell.openExternal(url)
  })
  ipcMain.handle(channels.getLanguage, () => settings.language)
  ipcMain.handle(channels.getDocuments, (event) => workspaceForContents(event.sender)?.documentsPayload() ?? null)
  ipcMain.handle(channels.getActiveDocument, (event) => workspaceForContents(event.sender)?.activePayload() ?? null)
  ipcMain.handle(channels.newDocument, (event, snapshot?: DocumentSnapshot) => workspaceForContents(event.sender)?.createDocument(snapshot) ?? false)
  ipcMain.handle(channels.openDocuments, (event, snapshot?: DocumentSnapshot) => workspaceForContents(event.sender)?.chooseAndOpen(snapshot) ?? false)
  ipcMain.handle(channels.openFilePaths, (event, paths: string[], snapshot?: DocumentSnapshot) => workspaceForContents(event.sender)?.openPaths(paths, snapshot) ?? false)
  ipcMain.handle(channels.activateDocument, (event, id: string, snapshot?: DocumentSnapshot) => workspaceForContents(event.sender)?.activate(id, snapshot) ?? false)
  ipcMain.handle(channels.closeDocument, (event, id: string, snapshot?: DocumentSnapshot) => workspaceForContents(event.sender)?.closeDocument(id, snapshot) ?? false)
  ipcMain.handle(channels.renameDocument, (event, id: string, name: string, snapshot?: DocumentSnapshot) => workspaceForContents(event.sender)?.renameDocument(id, name, snapshot) ?? false)
  ipcMain.handle(channels.updateDocumentDraft, (event, snapshot: DocumentSnapshot) => workspaceForContents(event.sender)?.updateDraft(snapshot) ?? false)
  ipcMain.handle(channels.getCommandPaletteData, (event) => workspaceForContents(event.sender)?.paletteData() ?? null)
  ipcMain.handle(channels.openRecentDocument, (event, path: string, snapshot?: DocumentSnapshot) => workspaceForContents(event.sender)?.openRecent(path, snapshot) ?? false)
  ipcMain.handle(channels.saveImageAssets, (event, id: string, images: ImageAssetInput[], snapshot?: DocumentSnapshot) => workspaceForContents(event.sender)?.saveImages(id, images, snapshot) ?? [])
  ipcMain.handle(channels.chooseImageAsset, (event, id: string, snapshot?: DocumentSnapshot) => workspaceForContents(event.sender)?.chooseImage(id, snapshot) ?? null)
  ipcMain.handle(channels.revealImageAsset, (event, id: string, source: string) => workspaceForContents(event.sender)?.revealImage(id, source) ?? false)
  ipcMain.handle(channels.checkLocalAssets, (event, id: string, sources: string[]) => workspaceForContents(event.sender)?.checkImages(id, sources) ?? {})
  ipcMain.handle(channels.saveFile, (event, id: string, content: string) => workspaceForContents(event.sender)?.save(id, content) ?? false)
  ipcMain.handle(channels.saveFileAs, (event, id: string, content: string) => workspaceForContents(event.sender)?.saveAs(id, content) ?? false)
  ipcMain.handle(channels.exportPDF, (event) => workspaceForContents(event.sender)?.exportPdf() ?? false)
}

async function registerAssetProtocol(): Promise<void> {
  protocol.handle('beiye-asset', async (request) => {
    const path = pathFromAssetUrl(request.url)
    const contentType = path ? imageMimeType(path) : null
    if (!path || !contentType || !existsSync(path)) return new Response(null, { status: 404 })
    try {
      const bytes = await readFile(path)
      return new Response(new Uint8Array(bytes), { headers: { 'content-type': contentType, 'cache-control': 'no-store' } })
    } catch {
      return new Response(null, { status: 500 })
    }
  })
}

function pathsFromArguments(arguments_: readonly string[]): string[] {
  return arguments_.filter((argument) => !argument.startsWith('-') && markdownFiles.supports(argument))
}

app.on('open-file', (event, path) => {
  event.preventDefault()
  if (app.isReady()) openSystemPath(path)
  else pendingSystemPaths.push(path)
})

app.on('second-instance', (_event, arguments_) => {
  const paths = pathsFromArguments(arguments_)
  if (paths.length) paths.forEach(openSystemPath)
  else focusedWorkspace()?.window.focus()
})

const hasInstanceLock = app.requestSingleInstanceLock()
if (!hasInstanceLock) {
  app.quit()
} else {
  void app.whenReady().then(async () => {
    await settings.load()
    await registerAssetProtocol()
    registerIpc()
    buildMenu()

    const commandLinePaths = pathsFromArguments(process.argv.slice(app.isPackaged ? 1 : 2))
    const initialPaths = [...pendingSystemPaths, ...commandLinePaths]
    pendingSystemPaths = []
    createWindow(initialPaths.length ? { paths: initialPaths } : {}).focus()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow().focus()
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
