import type {
  DocumentPayload,
  DocumentSnapshot,
  DocumentsPayload,
  DocumentSummary,
  ElectronAPI,
  ImageAssetInput,
  Language
} from '../shared/contracts'
import { markdownContentsEqual } from '../shared/markdown-content'
import { CommandPalette } from './editor/command-palette'
import { FindReplacePanel } from './editor/find-replace-panel'
import { ImageToolbar } from './editor/image-toolbar'
import { makeMarkdownImagePathsPortable, resolveMarkdownImagePaths } from './editor/markdown-paths'
import { MarkdownEditor } from './editor/markdown-editor'
import { encodeImageLayout } from './editor/markdown-presentation'
import type { QualityIssue } from './editor/markdown-quality'
import { OutlinePanel, type OutlineHeading } from './editor/outline-panel'
import { QualityPanel } from './editor/quality-panel'
import { TableToolbar } from './editor/table-toolbar'
import {
  captureRelativeViewAnchor,
  restoreRelativeViewAnchor,
  type RelativeViewAnchor
} from './editor/view-anchor'
import { applyTheme, loadSavedTheme } from './themes/theme-manager'
import { copyFor } from './workspace-copy'
import { isCompactSidebarWidth, normalizeSidebarWidth } from './workspace-model'
import { WorkspaceView, type EditorMode, type SidebarView } from './workspace-view'

const SIDEBAR_WIDTH_KEY = 'beiyemd-sidebar-width'
const SIDEBAR_HIDDEN_KEY = 'beiyemd-file-panel-hidden'

export class WorkspaceController {
  private readonly api: ElectronAPI
  private readonly view: WorkspaceView
  private language: Language = 'zh-CN'
  private mode: EditorMode = 'preview'
  private sidebarView: SidebarView = 'documents'
  private documents: DocumentSummary[] = []
  private activeId: string | null = null
  private dirty = false
  private readonly cleanMarkdown = new Map<string, string>()
  private applyingMarkdown = false
  private pendingDocument: DocumentPayload | null = null
  private sidebarHidden = localStorage.getItem(SIDEBAR_HIDDEN_KEY) === '1'
  private sidebarWidth = Number.parseFloat(localStorage.getItem(SIDEBAR_WIDTH_KEY) ?? '') || 258
  private resizePointer: number | null = null
  private resizingWithMouse = false
  private dragDepth = 0
  private lineNumberFrame = 0
  private editor: MarkdownEditor | null = null
  private search: FindReplacePanel | null = null
  private palette: CommandPalette | null = null
  private outline: OutlinePanel | null = null
  private quality: QualityPanel | null = null
  private tableTools: TableToolbar | null = null
  private imageTools: ImageToolbar | null = null

  constructor(root: HTMLElement, api: ElectronAPI) {
    this.api = api
    this.view = new WorkspaceView(root, api.platform)
  }

  async start(): Promise<void> {
    this.subscribeToHost()
    this.language = await this.api.getLanguage()
    this.view.setLanguage(this.language)
    this.applySidebarWidth(this.sidebarWidth)
    this.view.setSidebarVisible(!this.sidebarHidden)
    this.view.setSidebarView(this.sidebarView)
    applyTheme(loadSavedTheme())

    this.search = new FindReplacePanel(this.language, {
      editor: this.view.elements.source,
      highlights: this.view.elements.sourceSearchHighlights
    })
    this.outline = new OutlinePanel(this.view.elements.outlineList, this.language, (heading) => this.goToHeading(heading))
    this.quality = new QualityPanel(
      this.view.elements.qualityCheck,
      this.language,
      () => this.activeId,
      () => this.currentMarkdown(),
      (documentId, sources) => this.api.checkLocalAssets(documentId, sources),
      (issue) => this.goToIssue(issue)
    )
    this.palette = new CommandPalette(
      this.language,
      () => this.api.getCommandPaletteData(),
      () => this.snapshot(),
      (documentId, snapshot) => this.api.activateDocument(documentId, snapshot),
      (path, snapshot) => this.api.openRecentDocument(path, snapshot),
      (query) => this.search?.show(query)
    )
    this.editor = new MarkdownEditor({
      root: this.view.elements.editor,
      openExternal: (url) => this.api.openExternal(url),
      onChange: (markdown) => this.onPreviewChange(markdown)
    })
    await this.editor.create()
    this.tableTools = new TableToolbar(this.view.elements.editor, this.language)
    this.imageTools = new ImageToolbar(
      this.view.elements.editor,
      this.language,
      () => this.activeId ? this.api.chooseImageAsset(this.activeId, this.snapshot()) : Promise.resolve(null),
      (source) => this.activeId ? this.api.revealImageAsset(this.activeId, source) : Promise.resolve(false)
    )
    this.bindInterface()
    this.updatePlaceholder()

    if (this.pendingDocument) {
      const pending = this.pendingDocument
      this.pendingDocument = null
      this.openDocument(pending)
    }
    const [initial, active] = await Promise.all([this.api.getDocuments(), this.api.getActiveDocument()])
    if (initial) this.updateDocuments(initial)
    if (active) this.openDocument(active)
  }

  private subscribeToHost(): void {
    this.api.onDocumentOpened((payload) => this.openDocument(payload))
    this.api.onDocumentsChanged((payload) => this.updateDocuments(payload))
    this.api.onDocumentChanged(({ id, content }) => {
      if (id !== this.activeId) return
      this.setDirty(false)
      this.applyMarkdown(content)
    })
    this.api.onDocumentSaved(({ id }) => {
      if (id === this.activeId) {
        this.cleanMarkdown.set(id, this.currentMarkdown())
        this.setDirty(false)
      }
    })
    this.api.onSetLanguage((language) => this.setLanguage(language))
    this.api.onSetTheme((theme) => applyTheme(theme))
    this.api.onSearch(() => this.search?.show())
    this.api.onQuickOpen(() => void this.palette?.show())
    this.api.onMathModal(() => this.editor?.showMath())
    this.api.onToggleFilePanel(() => this.toggleSidebar())
    this.api.onMenuCloseDocument(() => {
      if (this.activeId) void this.closeDocument(this.activeId)
    })
    this.api.onMenuSave(() => void this.save())
    this.api.onMenuSaveAs(() => void this.saveAs())
    this.api.onMenuExportPDF(() => {
      this.setMode('preview')
      void this.api.exportPDF()
    })
  }

  private bindInterface(): void {
    const element = this.view.elements
    element.previewMode.addEventListener('click', () => this.setMode('preview'))
    element.markdownMode.addEventListener('click', () => this.setMode('markdown'))
    element.source.addEventListener('input', () => this.onSourceChange())
    element.source.addEventListener('scroll', () => {
      element.sourceLineNumbers.scrollTop = element.source.scrollTop
      element.sourceSearchHighlights.style.transform = `translateY(${-element.source.scrollTop}px)`
    }, { passive: true })
    new ResizeObserver(() => this.updateLineNumbers()).observe(element.source)

    element.documentsTab.addEventListener('click', () => this.setSidebarView('documents'))
    element.outlineTab.addEventListener('click', () => this.setSidebarView('outline'))
    new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width) this.view.setCompact(isCompactSidebarWidth(width))
    }).observe(element.sidebar)

    element.newDocument.addEventListener('click', () => void this.api.newDocument(this.snapshot()))
    element.openDocument.addEventListener('click', () => void this.api.openDocuments(this.snapshot()))
    element.edgeToggle.addEventListener('click', () => this.toggleSidebar())
    element.filter.addEventListener('input', () => this.renderDocuments())
    element.filter.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return
      element.filter.value = ''
      this.renderDocuments()
      element.filter.blur()
    })
    element.clearFilter.addEventListener('click', () => {
      element.filter.value = ''
      this.renderDocuments()
      element.filter.focus()
    })
    element.fileList.addEventListener('click', (event) => void this.handleDocumentListClick(event))
    element.fileList.addEventListener('auxclick', (event) => {
      if (event.button !== 1) return
      const id = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-document-id]')?.dataset.documentId
      if (id) {
        event.preventDefault()
        void this.closeDocument(id)
      }
    })

    element.documentName.addEventListener('click', () => this.beginRename())
    element.documentNameInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        void this.commitRename()
      } else if (event.key === 'Escape') {
        event.preventDefault()
        this.cancelRename()
      }
    })
    element.documentNameInput.addEventListener('blur', () => this.cancelRename())

    element.shortcutsToggle.addEventListener('click', () => this.view.setShortcutsOpen(element.shortcutsPanel.hidden))
    element.shortcutsClose.addEventListener('click', () => this.view.setShortcutsOpen(false))
    element.shortcutsPanel.addEventListener('click', (event) => this.runShortcut(event))
    document.addEventListener('pointerdown', (event) => {
      const target = event.target as HTMLElement
      if (!element.shortcutsPanel.hidden && !target.closest('#shortcuts-panel, #shortcuts-toggle')) this.view.setShortcutsOpen(false)
    })
    document.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLocaleLowerCase() === 'p') {
        event.preventDefault()
        void this.palette?.show()
      }
    })

    element.resizeHandle.addEventListener('pointerdown', (event) => this.beginPointerResize(event))
    element.resizeHandle.addEventListener('mousedown', (event) => this.beginMouseResize(event))
    element.resizeHandle.addEventListener('keydown', (event) => this.resizeWithKeyboard(event))
    window.addEventListener('pointermove', (event) => this.resizeWithPointer(event))
    window.addEventListener('pointerup', (event) => this.endPointerResize(event))
    window.addEventListener('pointercancel', (event) => this.endPointerResize(event))
    window.addEventListener('mousemove', (event) => this.resizeWithMouse(event))
    window.addEventListener('mouseup', () => this.endMouseResize())
    window.addEventListener('resize', () => this.applySidebarWidth(this.sidebarWidth))

    document.addEventListener('paste', (event) => this.handlePaste(event), true)
    document.addEventListener('dragenter', (event) => this.handleDragEnter(event))
    document.addEventListener('dragover', (event) => event.preventDefault())
    document.addEventListener('dragleave', () => this.handleDragLeave())
    document.addEventListener('drop', (event) => this.handleDrop(event), true)
  }

  private activeDocument(): DocumentSummary | undefined {
    return this.documents.find((document) => document.id === this.activeId)
  }

  private currentMarkdown(): string {
    if (this.mode === 'markdown') return this.view.elements.source.value
    return makeMarkdownImagePathsPortable(this.editor?.markdown() ?? '', this.activeDocument()?.path)
  }

  private isReadOnly(): boolean {
    return Boolean(this.activeDocument()?.readOnly)
  }

  private snapshot(): DocumentSnapshot | undefined {
    return this.activeId ? { id: this.activeId, content: this.currentMarkdown(), dirty: this.dirty } : undefined
  }

  private replaceEditorMarkdown(markdown: string): void {
    this.applyingMarkdown = true
    try {
      this.editor?.replaceMarkdown(markdown)
    } finally {
      this.applyingMarkdown = false
    }
  }

  private updateDocuments(payload: DocumentsPayload): void {
    this.documents = payload.documents
    const documentIds = new Set(payload.documents.map((document) => document.id))
    for (const id of this.cleanMarkdown.keys()) {
      if (!documentIds.has(id)) this.cleanMarkdown.delete(id)
    }
    if (payload.activeDocumentId) this.activeId = payload.activeDocumentId
    this.dirty = this.activeDocument()?.dirty ?? this.dirty
    this.renderDocuments()
    this.updateHeader()
  }

  private openDocument(payload: DocumentPayload): void {
    if (!this.editor) {
      this.pendingDocument = payload
      return
    }
    this.activeId = payload.id
    this.dirty = payload.dirty
    if (!payload.dirty) this.cleanMarkdown.set(payload.id, payload.content)
    this.tableTools?.hide()
    this.imageTools?.hide()
    this.applyMarkdown(payload.content, payload.path)
    this.renderDocuments()
    this.updateHeader(payload.content)
    this.search?.refresh()
  }

  private applyMarkdown(markdown: string, path = this.activeDocument()?.path): void {
    this.view.elements.editor.classList.toggle('is-empty-document', markdown.trim().length === 0)
    if (this.mode === 'markdown') {
      this.view.elements.source.value = markdown
      this.updateLineNumbers()
    } else {
      this.replaceEditorMarkdown(resolveMarkdownImagePaths(markdown, path))
      if (!this.dirty && this.activeId) {
        const normalized = makeMarkdownImagePathsPortable(this.editor?.markdown() ?? '', path)
        this.cleanMarkdown.set(this.activeId, normalized)
      }
    }
    this.outline?.setContent(markdown)
    this.quality?.schedule()
    this.updateHeader(markdown)
    requestAnimationFrame(() => this.updatePlaceholder())
  }

  private onPreviewChange(markdown: string): void {
    if (this.applyingMarkdown || !this.activeId || this.isReadOnly()) return
    const portable = makeMarkdownImagePathsPortable(markdown, this.activeDocument()?.path)
    const baseline = this.cleanMarkdown.get(this.activeId)
    const dirty = baseline === undefined || !markdownContentsEqual(portable, baseline)
    this.view.elements.editor.classList.toggle('is-empty-document', portable.trim().length === 0)
    this.setDirty(dirty)
    this.updateHeader(portable)
    this.outline?.setContent(portable)
    this.quality?.schedule()
    this.search?.refresh()
    void this.api.updateDocumentDraft({ id: this.activeId, content: portable, dirty })
  }

  private onSourceChange(): void {
    if (!this.activeId || this.isReadOnly()) return
    const markdown = this.view.elements.source.value
    const baseline = this.cleanMarkdown.get(this.activeId)
    const dirty = baseline === undefined || !markdownContentsEqual(markdown, baseline)
    this.updateLineNumbers()
    this.setDirty(dirty)
    this.updateHeader(markdown)
    this.outline?.setContent(markdown)
    this.quality?.schedule()
    this.search?.refresh()
    void this.api.updateDocumentDraft({ id: this.activeId, content: markdown, dirty })
  }

  private setDirty(dirty: boolean): void {
    this.dirty = dirty
    const active = this.activeDocument()
    if (active) active.dirty = dirty
    this.renderDocuments()
    this.updateHeader()
  }

  private updateHeader(markdown = this.currentMarkdown()): void {
    this.view.setHeader(this.activeDocument(), this.dirty, markdown)
    this.view.elements.source.readOnly = this.isReadOnly()
    this.editor?.setReadOnly(this.isReadOnly())
  }

  private renderDocuments(): void {
    this.view.renderDocuments(this.documents, this.activeId)
  }

  private setLanguage(language: Language): void {
    this.language = language
    this.view.setLanguage(language)
    this.renderDocuments()
    this.updateHeader()
    this.updatePlaceholder()
    this.search?.setLanguage(language)
    this.palette?.setLanguage(language)
    this.outline?.setLanguage(language)
    this.quality?.setLanguage(language)
    this.tableTools?.setLanguage(language)
    this.imageTools?.setLanguage(language)
    this.editor?.setLanguage(language)
  }

  private setMode(mode: EditorMode): void {
    if (mode === this.mode) return
    const element = this.view.elements
    const anchor = this.captureModeAnchor()
    if (mode === 'markdown') {
      this.tableTools?.hide()
      this.imageTools?.hide()
      element.source.value = makeMarkdownImagePathsPortable(this.editor?.markdown() ?? '', this.activeDocument()?.path)
      this.view.setMode('markdown')
      this.updateLineNumbers()
    } else {
      this.replaceEditorMarkdown(resolveMarkdownImagePaths(element.source.value, this.activeDocument()?.path))
      this.view.setMode('preview')
    }
    this.mode = mode
    this.updateHeader()
    this.search?.refresh()
    requestAnimationFrame(() => {
      this.restoreModeAnchor(mode, anchor)
      this.updatePlaceholder()
      this.tableTools?.update()
    })
  }

  private captureModeAnchor(): RelativeViewAnchor {
    const { editor, source } = this.view.elements
    if (this.mode === 'markdown') {
      return captureRelativeViewAnchor({
        cursorOffset: source.selectionStart,
        contentLength: source.value.length,
        scrollTop: source.scrollTop,
        scrollHeight: source.scrollHeight,
        viewportHeight: source.clientHeight
      })
    }
    return captureRelativeViewAnchor({
      cursorOffset: this.editor?.cursorPosition() ?? 0,
      contentLength: this.editor?.documentSize() ?? 0,
      scrollTop: editor.scrollTop,
      scrollHeight: editor.scrollHeight,
      viewportHeight: editor.clientHeight
    })
  }

  private restoreModeAnchor(mode: EditorMode, anchor: RelativeViewAnchor): void {
    const { editor, source, sourceLineNumbers, sourceSearchHighlights } = this.view.elements
    if (mode === 'markdown') {
      const position = restoreRelativeViewAnchor(anchor, {
        contentLength: source.value.length,
        scrollHeight: source.scrollHeight,
        viewportHeight: source.clientHeight
      })
      source.setSelectionRange(position.cursorOffset, position.cursorOffset)
      source.focus({ preventScroll: true })
      source.scrollTop = position.scrollTop
      sourceLineNumbers.scrollTop = position.scrollTop
      sourceSearchHighlights.style.transform = `translateY(${-position.scrollTop}px)`
      return
    }
    const position = restoreRelativeViewAnchor(anchor, {
      contentLength: this.editor?.documentSize() ?? 0,
      scrollHeight: editor.scrollHeight,
      viewportHeight: editor.clientHeight
    })
    this.editor?.restoreCursor(position.cursorOffset)
    editor.scrollTop = position.scrollTop
  }

  private setSidebarView(view: SidebarView): void {
    this.sidebarView = view
    this.view.setSidebarView(view)
    if (view === 'outline') this.outline?.setContent(this.currentMarkdown())
  }

  private toggleSidebar(): void {
    this.sidebarHidden = !this.sidebarHidden
    localStorage.setItem(SIDEBAR_HIDDEN_KEY, this.sidebarHidden ? '1' : '0')
    this.view.setSidebarVisible(!this.sidebarHidden)
  }

  private applySidebarWidth(width: number, persist = false): void {
    this.sidebarWidth = normalizeSidebarWidth(width, window.innerWidth)
    this.view.setSidebarWidth(this.sidebarWidth)
    if (persist) localStorage.setItem(SIDEBAR_WIDTH_KEY, String(this.sidebarWidth))
  }

  private beginPointerResize(event: PointerEvent): void {
    if (!event.isPrimary || event.button !== 0) return
    this.resizePointer = event.pointerId
    document.body.classList.add('is-resizing-sidebar')
    event.preventDefault()
  }

  private resizeWithPointer(event: PointerEvent): void {
    if (this.resizePointer !== event.pointerId) return
    this.applySidebarWidth(event.clientX)
  }

  private endPointerResize(event: PointerEvent): void {
    if (this.resizePointer !== event.pointerId) return
    this.resizePointer = null
    document.body.classList.remove('is-resizing-sidebar')
    this.applySidebarWidth(this.sidebarWidth, true)
  }

  private beginMouseResize(event: MouseEvent): void {
    if (this.resizePointer !== null || event.button !== 0) return
    this.resizingWithMouse = true
    document.body.classList.add('is-resizing-sidebar')
    event.preventDefault()
  }

  private resizeWithMouse(event: MouseEvent): void {
    if (this.resizingWithMouse) this.applySidebarWidth(event.clientX)
  }

  private endMouseResize(): void {
    if (!this.resizingWithMouse) return
    this.resizingWithMouse = false
    document.body.classList.remove('is-resizing-sidebar')
    this.applySidebarWidth(this.sidebarWidth, true)
  }

  private resizeWithKeyboard(event: KeyboardEvent): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    this.applySidebarWidth(this.sidebarWidth + (event.key === 'ArrowRight' ? 16 : -16), true)
  }

  private async handleDocumentListClick(event: Event): Promise<void> {
    const target = event.target as HTMLElement
    const closeId = target.closest<HTMLButtonElement>('[data-close-document-id]')?.dataset.closeDocumentId
    if (closeId) {
      event.stopPropagation()
      await this.closeDocument(closeId)
      return
    }
    const id = target.closest<HTMLButtonElement>('[data-document-id]')?.dataset.documentId
    if (id && id !== this.activeId) await this.api.activateDocument(id, this.snapshot())
  }

  private async closeDocument(id: string): Promise<void> {
    await this.api.closeDocument(id, this.snapshot())
  }

  private beginRename(): void {
    const document = this.activeDocument()
    if (!document || document.readOnly) return
    const input = this.view.elements.documentNameInput
    this.view.elements.documentName.hidden = true
    input.hidden = false
    input.value = document.name
    input.focus()
    const extension = input.value.lastIndexOf('.')
    input.setSelectionRange(0, extension > 0 ? extension : input.value.length)
  }

  private cancelRename(): void {
    this.view.elements.documentNameInput.hidden = true
    this.view.elements.documentName.hidden = false
  }

  private async commitRename(): Promise<void> {
    const name = this.view.elements.documentNameInput.value.trim()
    if (!this.activeId || !name) {
      this.cancelRename()
      return
    }
    const renamed = await this.api.renameDocument(this.activeId, name, this.snapshot())
    this.cancelRename()
    if (!renamed) this.view.showToast(copyFor(this.language).renameFailed)
  }

  private async save(): Promise<void> {
    if (!this.isReadOnly() && this.activeId && await this.api.saveFile(this.activeId, this.currentMarkdown())) {
      this.cleanMarkdown.set(this.activeId, this.currentMarkdown())
      this.setDirty(false)
    }
  }

  private async saveAs(): Promise<void> {
    if (!this.isReadOnly() && this.activeId && await this.api.saveFileAs(this.activeId, this.currentMarkdown())) {
      this.cleanMarkdown.set(this.activeId, this.currentMarkdown())
      this.setDirty(false)
    }
  }

  private runShortcut(event: Event): void {
    const action = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-shortcut-action]')?.dataset.shortcutAction
    if (!action) return
    this.view.setShortcutsOpen(false)
    if (action === 'quick-open') void this.palette?.show()
    else if (action === 'search') this.search?.show()
    else if (action === 'save') void this.save()
    else if (action === 'formula') this.editor?.showMath()
  }

  private goToHeading(heading: OutlineHeading): void {
    if (this.mode === 'preview') {
      this.editor?.focusHeading(heading.index)
      return
    }
    const source = this.view.elements.source
    const end = source.value.indexOf('\n', heading.offset)
    source.focus()
    source.setSelectionRange(heading.offset, end < 0 ? source.value.length : end)
  }

  private goToIssue(issue: QualityIssue): void {
    this.setMode('markdown')
    requestAnimationFrame(() => {
      const source = this.view.elements.source
      const lines = source.value.split('\n')
      const offset = lines.slice(0, Math.max(0, issue.line - 1)).reduce((total, line) => total + line.length + 1, 0)
      const start = Math.min(source.value.length, offset + Math.max(0, issue.column - 1))
      const end = Math.min(source.value.length, offset + (lines[issue.line - 1]?.length ?? 0))
      source.focus()
      source.setSelectionRange(start, Math.max(start, end))
    })
  }

  private updatePlaceholder(): void {
    this.view.elements.editor.querySelector<HTMLElement>('.ProseMirror')?.setAttribute('data-placeholder', copyFor(this.language).placeholder)
  }

  private updateLineNumbers(): void {
    window.cancelAnimationFrame(this.lineNumberFrame)
    this.lineNumberFrame = window.requestAnimationFrame(() => {
      const { source, sourceLineNumbers: numbers, sourceMirror: mirror } = this.view.elements
      const style = getComputedStyle(source)
      const horizontalPadding = Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight)
      mirror.style.width = `${Math.max(40, source.clientWidth - horizontalPadding)}px`
      const rows = source.value.split('\n').map((line) => {
        const row = document.createElement('div')
        row.className = 'source-line-measure'
        row.textContent = line || '\u200b'
        return row
      })
      mirror.replaceChildren(...rows)
      const lineHeight = Number.parseFloat(style.lineHeight)
      numbers.replaceChildren(...rows.map((row, index) => {
        const number = document.createElement('span')
        number.textContent = String(index + 1)
        number.style.height = `${Math.max(lineHeight, row.getBoundingClientRect().height)}px`
        return number
      }))
      numbers.scrollTop = source.scrollTop
    })
  }

  private handlePaste(event: ClipboardEvent): void {
    const target = event.target instanceof Element ? event.target : null
    if (!target?.closest('#content-shell')) return
    const images = [...(event.clipboardData?.items ?? [])]
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file))
    if (images.length === 0) return
    event.preventDefault()
    void this.saveImages(images)
  }

  private handleDragEnter(event: DragEvent): void {
    event.preventDefault()
    this.dragDepth += 1
    document.body.classList.add('drag-active')
    const image = [...(event.dataTransfer?.items ?? [])].some((item) => item.kind === 'file' && item.type.startsWith('image/'))
    document.body.classList.toggle('dragging-image', image)
  }

  private handleDragLeave(): void {
    this.dragDepth = Math.max(0, this.dragDepth - 1)
    if (this.dragDepth === 0) document.body.classList.remove('drag-active', 'dragging-image')
  }

  private handleDrop(event: DragEvent): void {
    event.preventDefault()
    this.dragDepth = 0
    document.body.classList.remove('drag-active', 'dragging-image')
    const files = [...(event.dataTransfer?.files ?? [])]
    const images = files.filter((file) => file.type.startsWith('image/'))
    if (images.length > 0 && (event.target as Element | null)?.closest('#content-shell')) {
      void this.saveImages(images)
      return
    }
    const paths = files.map((file) => this.api.getPathForFile(file)).filter(Boolean)
    if (paths.length > 0) void this.api.openFilePaths(paths, this.snapshot())
  }

  private async saveImages(files: File[]): Promise<void> {
    if (!this.activeId || files.length === 0) return
    const inputs: ImageAssetInput[] = await Promise.all(files.map(async (file, index) => {
      let width: number | undefined
      let height: number | undefined
      try {
        const bitmap = await createImageBitmap(file)
        width = bitmap.width
        height = bitmap.height
        bitmap.close()
      } catch { /* dimensions remain optional */ }
      return { name: file.name || `clipboard-image-${index + 1}.png`, type: file.type || 'image/png', data: await file.arrayBuffer(), width, height }
    }))
    const results = await this.api.saveImageAssets(this.activeId, inputs, this.snapshot())
    const copy = copyFor(this.language)
    if (results.length === 0) {
      this.view.showToast(copy.imageCancelled)
      return
    }
    const active = this.activeDocument()
    if (active && !active.path) {
      active.path = results[0].documentPath
      active.name = results[0].documentPath.split(/[\\/]/u).pop() ?? active.name
    }
    if (this.mode === 'markdown') {
      const markdown = results.map((result) => {
        const title = encodeImageLayout({ width: result.width ? `${result.width}px` : null, align: 'center' })
        return `![${result.name}](${result.relativePath}${title ? ` "${title}"` : ''})`
      }).join('\n\n')
      this.insertIntoSource(markdown)
    } else {
      for (const result of results) {
        this.editor?.insertImage(result.fileUrl, result.name, { width: result.width ? `${result.width}px` : null, align: 'center' })
      }
    }
    this.view.showToast(copy.imagesAdded.replace('{count}', String(results.length)))
  }

  private insertIntoSource(markdown: string): void {
    const source = this.view.elements.source
    const prefix = source.selectionStart > 0 && source.value[source.selectionStart - 1] !== '\n' ? '\n' : ''
    source.setRangeText(`${prefix}${markdown}`, source.selectionStart, source.selectionEnd, 'end')
    source.dispatchEvent(new Event('input', { bubbles: true }))
    source.focus()
  }
}
