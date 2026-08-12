import { existsSync } from 'node:fs'
import { basename, dirname, extname, join } from 'node:path'
import { BrowserWindow, dialog, shell } from 'electron'

import type {
  CommandPalettePayload,
  DocumentPayload,
  DocumentSnapshot,
  DocumentsPayload,
  ImageAssetInput,
  ImageAssetResult,
  Language
} from '../../shared/contracts'
import { channels } from '../../shared/contracts'
import { normalizeMarkdownFileName } from '../application/document-names'
import { canonicalDocumentPath } from '../application/document-paths'
import { DocumentSession, type SessionDocument } from '../application/document-session'
import { AssetFiles, imageMimeType } from '../infrastructure/asset-files'
import { DocumentWatch } from '../infrastructure/document-watch'
import { MarkdownFileRepository } from '../infrastructure/markdown-file-repository'
import { SettingsStore } from '../infrastructure/settings-store'

export interface WorkspaceCopy {
  untitled: string
  markdownDocuments: string
  allFiles: string
  saveDocument: string
  unsavedDocumentTitle: string
  unsavedDocumentDetail: string
  unsavedWindowTitle: string
  unsavedWindowDetail: string
  saveAndClose: string
  discard: string
  cancel: string
}

export interface WindowWorkspaceOptions {
  window: BrowserWindow
  files: MarkdownFileRepository
  assets: AssetFiles
  settings: SettingsStore
  copy: () => WorkspaceCopy
  createDocumentId: () => string
}

export class WindowWorkspace {
  readonly window: BrowserWindow
  readonly session: DocumentSession
  private readonly files: MarkdownFileRepository
  private readonly assets: AssetFiles
  private readonly settings: SettingsStore
  private readonly copy: () => WorkspaceCopy
  private readonly watcher = new DocumentWatch()

  constructor(options: WindowWorkspaceOptions) {
    this.window = options.window
    this.files = options.files
    this.assets = options.assets
    this.settings = options.settings
    this.copy = options.copy
    this.session = new DocumentSession({
      createId: options.createDocumentId,
      untitledName: () => this.copy().untitled,
      canonicalizePath: canonicalDocumentPath
    })
  }

  get activeDocument(): SessionDocument | null {
    return this.session.activeDocument
  }

  get language(): Language {
    return this.settings.language
  }

  hasPath(path: string): boolean {
    const target = canonicalDocumentPath(path)
    return this.session.documents.some((document) => document.path && canonicalDocumentPath(document.path) === target)
  }

  loadInitialContent(content: string): void {
    this.session.loadInitialContent(content)
  }

  loadReferenceContent(name: string, content: string): void {
    this.session.loadReferenceContent(name, content)
  }

  documentsPayload(): DocumentsPayload {
    return {
      documents: this.session.documents.map(({ id, name, path, dirty, readOnly }) => ({ id, name, path, dirty, readOnly })),
      activeDocumentId: this.session.activeDocumentId
    }
  }

  activePayload(): DocumentPayload | null {
    const document = this.activeDocument
    return document
      ? { id: document.id, path: document.path, content: document.content, dirty: document.dirty, readOnly: document.readOnly }
      : null
  }

  publish(options: { active?: boolean } = { active: true }): void {
    if (this.window.isDestroyed()) return
    this.window.webContents.send(channels.documentsChanged, this.documentsPayload())
    if (options.active !== false) {
      const active = this.activePayload()
      if (active) this.window.webContents.send(channels.documentOpened, active)
    }
    this.updateWindowTitle()
  }

  createDocument(snapshot?: DocumentSnapshot): boolean {
    this.applySnapshot(snapshot)
    this.session.createUntitled()
    this.publish()
    return true
  }

  async chooseAndOpen(snapshot?: DocumentSnapshot): Promise<boolean> {
    this.applySnapshot(snapshot)
    const paths = await this.chooseMarkdownFiles()
    return paths.length > 0 && this.openPaths(paths)
  }

  async openPaths(paths: readonly string[], snapshot?: DocumentSnapshot): Promise<boolean> {
    this.applySnapshot(snapshot)
    const supported = paths.filter((path) => typeof path === 'string' && this.files.supports(path))
    if (supported.length === 0) return false
    const loaded = await this.files.loadMany(supported)
    if (loaded.length === 0) return false
    this.session.openFiles(loaded)
    for (const document of this.session.documents) {
      if (document.path) this.watch(document)
    }
    for (const file of loaded) await this.settings.rememberDocument(file.path)
    this.publish()
    return true
  }

  activate(documentId: string, snapshot?: DocumentSnapshot): boolean {
    this.applySnapshot(snapshot)
    if (!this.session.activate(documentId)) return false
    this.publish()
    return true
  }

  updateDraft(snapshot: DocumentSnapshot): boolean {
    if (!this.isSnapshot(snapshot)) return false
    const updated = this.session.updateDraft(snapshot.id, snapshot.content)
    if (updated) this.publish({ active: false })
    return updated
  }

  async closeDocument(documentId: string, snapshot?: DocumentSnapshot): Promise<boolean> {
    this.applySnapshot(snapshot)
    const document = this.session.get(documentId)
    if (!document || this.session.documents.length <= 1) return false
    if (document.dirty && !(await this.confirmDiscardOrSave(document))) return false
    this.watcher.stop(document.id)
    if (!this.session.close(document.id)) return false
    this.publish()
    return true
  }

  async renameDocument(documentId: string, input: string, snapshot?: DocumentSnapshot): Promise<boolean> {
    this.applySnapshot(snapshot)
    const document = this.session.get(documentId)
    const name = normalizeMarkdownFileName(input)
    if (!document || !name) return false

    if (!document.path) {
      const renamed = this.session.renameDisplayName(document.id, name)
      if (renamed) this.publish({ active: false })
      return renamed
    }

    const previousPath = document.path
    const nextPath = join(dirname(previousPath), name)
    if (previousPath === nextPath) return true
    if (canonicalDocumentPath(previousPath) !== canonicalDocumentPath(nextPath) && await this.files.exists(nextPath)) return false

    this.watcher.stop(document.id)
    try {
      await this.files.rename(previousPath, nextPath)
      this.session.relocate(document.id, nextPath)
      await this.settings.replaceRecentPath(previousPath, nextPath)
      this.watch(document)
      this.publish()
      this.window.webContents.send(channels.documentSaved, { id: document.id, path: nextPath })
      return true
    } catch {
      this.watch(document)
      return false
    }
  }

  async save(documentId: string, content: string): Promise<boolean> {
    return this.saveToChosenOrExistingPath(documentId, content, false)
  }

  async saveAs(documentId: string, content: string): Promise<boolean> {
    return this.saveToChosenOrExistingPath(documentId, content, true)
  }

  async paletteData(): Promise<CommandPalettePayload> {
    const openDocuments = this.session.documents.map(({ id, name, path, dirty, readOnly, content }) => ({ id, name, path, dirty, readOnly, content }))
    const openPaths = new Set(openDocuments.flatMap((document) => document.path ? [canonicalDocumentPath(document.path)] : []))
    const recentDocuments: CommandPalettePayload['recentDocuments'] = []
    for (const path of this.settings.recentDocumentPaths) {
      if (!openPaths.has(canonicalDocumentPath(path)) && await this.files.exists(path)) {
        recentDocuments.push({ name: basename(path), path })
      }
    }
    return { openDocuments, recentDocuments }
  }

  async openRecent(path: string, snapshot?: DocumentSnapshot): Promise<boolean> {
    if (typeof path !== 'string' || !await this.files.exists(path)) return false
    return this.openPaths([path], snapshot)
  }

  async saveImages(documentId: string, images: ImageAssetInput[], snapshot?: DocumentSnapshot): Promise<ImageAssetResult[]> {
    this.applySnapshot(snapshot)
    const document = this.session.get(documentId)
    if (!document || !Array.isArray(images)) return []
    if (!document.path && !await this.save(document.id, document.content)) return []
    return document.path ? this.assets.store(document.path, images) : []
  }

  async chooseImage(documentId: string, snapshot?: DocumentSnapshot): Promise<ImageAssetResult | null> {
    this.applySnapshot(snapshot)
    const document = this.session.get(documentId)
    if (!document) return null
    const result = await dialog.showOpenDialog(this.window, {
      title: 'Image',
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'] }],
      properties: ['openFile']
    })
    const path = result.filePaths[0]
    if (result.canceled || !path) return null
    const type = imageMimeType(path)
    if (!type) return null
    const data = await this.assets.read(path)
    return (await this.saveImages(document.id, [{ name: basename(path), type, data }]))[0] ?? null
  }

  revealImage(documentId: string, source: string): boolean {
    const document = this.session.get(documentId)
    const path = document?.path ? this.assets.resolve(document.path, source) : null
    if (!path || !existsSync(path)) return false
    shell.showItemInFolder(path)
    return true
  }

  checkImages(documentId: string, sources: readonly string[]): Record<string, boolean> {
    const document = this.session.get(documentId)
    const result: Record<string, boolean> = {}
    if (!document?.path || !Array.isArray(sources)) return result
    for (const source of sources) {
      const path = this.assets.resolve(document.path, source)
      result[source] = Boolean(path && existsSync(path))
    }
    return result
  }

  async exportPdf(): Promise<boolean> {
    const document = this.activeDocument
    if (!document) return false
    const selected = await dialog.showSaveDialog(this.window, {
      defaultPath: `${basename(document.name, extname(document.name)) || 'document'}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    if (selected.canceled || !selected.filePath) return false

    let cssKey: string | null = null
    try {
      cssKey = await this.window.webContents.insertCSS([
        'html, body { height: auto !important; overflow: visible !important; }',
        '#titlebar, #file-panel, #source-editor-shell { display: none !important; }',
        '#editor { height: auto !important; overflow: visible !important; margin: 0 !important; }',
        '#editor .ProseMirror { min-height: 0 !important; }'
      ].join(' '))
      const bytes = await this.window.webContents.printToPDF({
        margins: { marginType: 'default' },
        printBackground: true,
        pageSize: 'A4'
      })
      await this.files.saveBytes(selected.filePath, bytes)
      return true
    } catch {
      return false
    } finally {
      if (cssKey) await this.window.webContents.removeInsertedCSS(cssKey)
    }
  }

  confirmWindowClose(): boolean {
    if (!this.session.documents.some((document) => document.dirty)) return true
    const text = this.copy()
    return dialog.showMessageBoxSync(this.window, {
      type: 'warning',
      title: text.unsavedWindowTitle,
      message: text.unsavedWindowTitle,
      detail: text.unsavedWindowDetail,
      buttons: [text.cancel, text.discard],
      defaultId: 0,
      cancelId: 0
    }) === 1
  }

  dispose(): void {
    this.watcher.dispose()
  }

  private async chooseMarkdownFiles(): Promise<string[]> {
    const text = this.copy()
    const result = await dialog.showOpenDialog(this.window, {
      filters: [
        { name: text.markdownDocuments, extensions: ['md', 'markdown', 'mdown', 'mkd'] },
        { name: text.allFiles, extensions: ['*'] }
      ],
      properties: ['openFile', 'multiSelections']
    })
    return result.canceled ? [] : result.filePaths
  }

  private applySnapshot(snapshot?: DocumentSnapshot): void {
    if (this.isSnapshot(snapshot)) this.session.updateDraft(snapshot.id, snapshot.content)
  }

  private isSnapshot(snapshot: DocumentSnapshot | undefined): snapshot is DocumentSnapshot {
    return Boolean(snapshot && typeof snapshot.id === 'string' && typeof snapshot.content === 'string')
  }

  private async saveToChosenOrExistingPath(documentId: string, content: string, forceDialog: boolean): Promise<boolean> {
    const document = this.session.get(documentId)
    if (!document || document.readOnly) return false
    let path = forceDialog ? null : document.path
    if (!path) path = await this.chooseSavePath(document, content)
    if (!path) return false

    this.watcher.stop(document.id)
    try {
      await this.files.save(path, content)
      this.session.markSaved(document.id, path, content)
      await this.settings.rememberDocument(path)
      this.watch(document)
      this.publish()
      this.window.webContents.send(channels.documentSaved, { id: document.id, path })
      return true
    } catch {
      if (document.path) this.watch(document)
      return false
    }
  }

  private async chooseSavePath(document: SessionDocument, content: string): Promise<string | null> {
    const selected = await dialog.showSaveDialog(this.window, {
      title: this.copy().saveDocument,
      defaultPath: this.suggestFileName(document, content),
      filters: [{ name: this.copy().markdownDocuments, extensions: ['md', 'markdown'] }]
    })
    if (selected.canceled || !selected.filePath) return null
    return extname(selected.filePath) ? selected.filePath : `${selected.filePath}.md`
  }

  private suggestFileName(document: SessionDocument, content: string): string {
    if (document.path) return document.path
    if (document.name && document.name !== this.copy().untitled) return document.name
    const heading = content.match(/^#\s+(.+)$/mu)?.[1]?.trim()
    const safeHeading = heading?.replace(/[<>:"/\\|?*\u0000-\u001f]/gu, '').slice(0, 80)
    return `${safeHeading || this.copy().untitled}.md`
  }

  private async confirmDiscardOrSave(document: SessionDocument): Promise<boolean> {
    const text = this.copy()
    const result = await dialog.showMessageBox(this.window, {
      type: 'warning',
      title: text.unsavedDocumentTitle,
      message: document.name,
      detail: text.unsavedDocumentDetail,
      buttons: [text.saveAndClose, text.discard, text.cancel],
      defaultId: 0,
      cancelId: 2
    })
    if (result.response === 2) return false
    return result.response === 1 || this.save(document.id, document.content)
  }

  private watch(document: SessionDocument): void {
    if (!document.path) return
    this.watcher.start(document.id, document.path, () => void this.onExternalChange(document.id))
  }

  private async onExternalChange(documentId: string): Promise<void> {
    const document = this.session.get(documentId)
    if (!document?.path || !await this.files.exists(document.path)) return
    try {
      const [loaded] = await this.files.loadMany([document.path])
      if (!loaded) return
      const result = this.session.applyExternalChange(document.id, loaded.content)
      if (result === 'applied') {
        this.window.webContents.send(channels.documentChanged, { id: document.id, content: loaded.content })
        this.publish({ active: false })
      }
    } catch {
      // A transient replacement save can make the file unavailable for one watch event.
    }
  }

  private updateWindowTitle(): void {
    this.window.setTitle(this.activeDocument?.name ?? 'BeiyeMD')
  }
}
