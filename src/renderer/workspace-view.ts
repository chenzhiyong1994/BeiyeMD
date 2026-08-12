import type { DocumentSummary, Language } from '../shared/contracts'
import { copyFor } from './workspace-copy'
import { countMarkdownWords, filterDocuments, isCompactSidebarWidth, presentDocumentState } from './workspace-model'

export type SidebarView = 'documents' | 'outline'
export type EditorMode = 'preview' | 'markdown'

const icons = {
  document: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 2.75h6.5L15 6.2v11.05H5z"/><path d="M11.5 2.75V6.2H15"/></svg>',
  documentSaved: '<svg class="document-state-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 2.75h7l4 4v10.5h-11z"/><path d="M11.5 2.75v4h4M7.5 10h5M7.5 13h5"/></svg>',
  documentDirty: '<svg class="document-state-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 2.75v14.5h4.5M4.5 2.75h7l4 4v4.25M11.5 2.75v4h4M7.5 10h3.5"/><path class="document-state-pencil" d="m15.2 11.4 2.85 2.85-5.45 5.45-3.8.8.8-3.8zM13.85 12.75l2.85 2.85"/></svg>',
  outline: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5h2M9 5h7M4 10h2M9 10h7M4 15h2M9 15h7"/></svg>',
  plus: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4v12M4 10h12"/></svg>',
  folder: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2.75 5.5h5l1.4 1.5h8.1v8.5H2.75z"/></svg>',
  search: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="4.5"/><path d="m12 12 4 4"/></svg>',
  check: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 4h10v12H5zM7.5 8l1.3 1.3L11 7M7.5 12h5"/></svg>',
  preview: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2.5 10s2.8-4.5 7.5-4.5 7.5 4.5 7.5 4.5-2.8 4.5-7.5 4.5S2.5 10 2.5 10Z"/><circle cx="10" cy="10" r="2"/></svg>',
  source: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7.5 5-4 5 4 5M12.5 5l4 5-4 5M11 3 9 17"/></svg>',
  pencil: '<svg class="document-rename-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M16.15 2.85a1.4 1.4 0 0 1 1.98 1.98L7.45 15.51l-4.1 1.14 1.14-4.1Z"/><path d="m13.75 5.25 1.98 1.98M4.49 12.55l2.96 2.96"/></svg>',
  shortcuts: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2.75" y="4" width="14.5" height="12" rx="2"/><path d="M5.5 8h1M9.5 8h1M13.5 8h1M5.5 12h9"/></svg>',
  rail: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m11.5 6-4 4 4 4"/></svg>'
}

export interface WorkspaceElements {
  appShell: HTMLElement
  sidebar: HTMLElement
  sidebarTabs: HTMLElement
  sidebarActions: HTMLElement
  documentsTab: HTMLButtonElement
  outlineTab: HTMLButtonElement
  documentsLabel: HTMLElement
  outlineLabel: HTMLElement
  documentCount: HTMLElement
  newDocument: HTMLButtonElement
  openDocument: HTMLButtonElement
  documentsView: HTMLElement
  outlineView: HTMLElement
  filter: HTMLInputElement
  clearFilter: HTMLButtonElement
  fileList: HTMLUListElement
  outlineList: HTMLElement
  shortcutsToggle: HTMLButtonElement
  shortcutsPanel: HTMLElement
  shortcutsClose: HTMLButtonElement
  resizeHandle: HTMLElement
  edgeToggle: HTMLButtonElement
  documentKind: HTMLElement
  documentState: HTMLElement
  wordCount: HTMLElement
  documentName: HTMLButtonElement
  documentNameText: HTMLElement
  documentNameInput: HTMLInputElement
  qualityCheck: HTMLButtonElement
  qualityCheckLabel: HTMLElement
  modeSwitch: HTMLElement
  previewMode: HTMLButtonElement
  markdownMode: HTMLButtonElement
  previewLabel: HTMLElement
  markdownLabel: HTMLElement
  editor: HTMLElement
  sourceShell: HTMLElement
  sourceLineNumbers: HTMLElement
  source: HTMLTextAreaElement
  sourceSearchLayer: HTMLElement
  sourceSearchHighlights: HTMLElement
  sourceMirror: HTMLElement
}

export class WorkspaceView {
  readonly elements: WorkspaceElements
  private language: Language = 'zh-CN'
  private compact = false

  constructor(root: HTMLElement) {
    root.innerHTML = `
      <div id="app-shell" class="beiye-workspace">
        <aside id="file-panel" class="document-library" aria-label="">
          <div class="library-topline">
            <div class="library-tabs" role="tablist">
              <button id="documents-tab" class="library-tab active" type="button" role="tab" aria-selected="true">${icons.document}<span id="documents-label"></span><span id="document-count" class="library-count">00</span></button>
              <button id="outline-tab" class="library-tab" type="button" role="tab" aria-selected="false">${icons.outline}<span id="outline-label"></span></button>
            </div>
            <div class="library-actions">
              <button id="new-document-btn" class="icon-action" type="button">${icons.plus}</button>
              <button id="open-document-btn" class="icon-action" type="button">${icons.folder}</button>
            </div>
          </div>
          <section id="documents-view" class="library-view active" role="tabpanel">
            <label class="document-filter" for="document-filter-input">${icons.search}<input id="document-filter-input" type="text" autocomplete="off"><button id="document-filter-clear" type="button" hidden>×</button></label>
            <ul id="file-list" class="document-stack"></ul>
          </section>
          <section id="outline-view" class="library-view" role="tabpanel" hidden><div id="outline-list"></div></section>
          <footer class="library-footer">
            <button id="shortcuts-toggle" class="shortcuts-trigger" type="button" aria-expanded="false">${icons.shortcuts}<span id="shortcuts-toggle-label"></span><span class="shortcuts-chevron">›</span></button>
            <div id="shortcuts-panel" class="shortcuts-popover" role="dialog" hidden>
              <div class="shortcuts-heading"><strong id="shortcuts-heading-label"></strong><button id="shortcuts-close" type="button">×</button></div>
              <button class="shortcut-action" type="button" data-shortcut-action="quick-open"><span id="shortcut-quick-open-label"></span><kbd>Ctrl P</kbd></button>
              <button class="shortcut-action" type="button" data-shortcut-action="search"><span id="shortcut-search-label"></span><kbd>Ctrl F</kbd></button>
              <button class="shortcut-action" type="button" data-shortcut-action="save"><span id="shortcut-save-label"></span><kbd>Ctrl S</kbd></button>
              <button class="shortcut-action" type="button" data-shortcut-action="formula"><span id="shortcut-formula-label"></span><kbd>Ctrl ⇧ E</kbd></button>
            </div>
          </footer>
        </aside>
        <div id="sidebar-resize-handle" class="sidebar-resize-zone" role="separator" aria-orientation="vertical" tabindex="0"></div>
        <button id="sidebar-edge-toggle" class="sidebar-edge-toggle" type="button" aria-expanded="true">${icons.rail}</button>
        <section id="workspace" class="writing-workspace">
          <header id="titlebar" class="document-bar">
            <div class="document-identity">
              <div class="document-statusline"><span id="document-kind"></span><span class="meta-divider"></span><span id="document-state"></span><span class="meta-divider"></span><span id="document-word-count"></span></div>
              <div class="document-name-editor"><button id="current-document-name" type="button"><span id="current-document-name-text"></span>${icons.pencil}</button><input id="document-name-input" type="text" maxlength="180" autocomplete="off" spellcheck="false" hidden></div>
            </div>
            <div class="document-tools">
              <button id="quality-check-btn" class="quality-trigger" type="button" aria-expanded="false">${icons.check}<span id="quality-check-label"></span><span class="quality-count"></span></button>
              <div id="mode-switch" class="mode-switch" role="group">
                <button id="preview-mode-btn" class="active" type="button" aria-pressed="true">${icons.preview}<span id="preview-mode-label"></span></button>
                <button id="markdown-mode-btn" type="button" aria-pressed="false">${icons.source}<span id="markdown-mode-label"></span></button>
              </div>
            </div>
          </header>
          <div id="content-shell" class="document-canvas">
            <main id="editor"></main>
            <div id="source-editor-shell" class="source-workbench"><div id="source-line-numbers" aria-hidden="true"></div><div id="source-search-layer" aria-hidden="true"><div id="source-search-highlights"></div></div><textarea id="source-editor" wrap="soft" spellcheck="false"></textarea><div id="source-line-mirror" aria-hidden="true"></div></div>
          </div>
        </section>
      </div>`

    const byId = <T extends HTMLElement>(id: string): T => {
      const element = root.querySelector<T>(`#${id}`)
      if (!element) throw new Error(`Missing workspace element: ${id}`)
      return element
    }
    this.elements = {
      appShell: byId('app-shell'), sidebar: byId('file-panel'), sidebarTabs: root.querySelector('.library-tabs')!, sidebarActions: root.querySelector('.library-actions')!,
      documentsTab: byId('documents-tab'), outlineTab: byId('outline-tab'), documentsLabel: byId('documents-label'), outlineLabel: byId('outline-label'), documentCount: byId('document-count'),
      newDocument: byId('new-document-btn'), openDocument: byId('open-document-btn'), documentsView: byId('documents-view'), outlineView: byId('outline-view'), filter: byId('document-filter-input'), clearFilter: byId('document-filter-clear'), fileList: byId('file-list'), outlineList: byId('outline-list'),
      shortcutsToggle: byId('shortcuts-toggle'), shortcutsPanel: byId('shortcuts-panel'), shortcutsClose: byId('shortcuts-close'), resizeHandle: byId('sidebar-resize-handle'), edgeToggle: byId('sidebar-edge-toggle'),
      documentKind: byId('document-kind'), documentState: byId('document-state'), wordCount: byId('document-word-count'), documentName: byId('current-document-name'), documentNameText: byId('current-document-name-text'), documentNameInput: byId('document-name-input'), qualityCheck: byId('quality-check-btn'), qualityCheckLabel: byId('quality-check-label'),
      modeSwitch: byId('mode-switch'), previewMode: byId('preview-mode-btn'), markdownMode: byId('markdown-mode-btn'), previewLabel: byId('preview-mode-label'), markdownLabel: byId('markdown-mode-label'), editor: byId('editor'), sourceShell: byId('source-editor-shell'), sourceLineNumbers: byId('source-line-numbers'), source: byId('source-editor'), sourceSearchLayer: byId('source-search-layer'), sourceSearchHighlights: byId('source-search-highlights'), sourceMirror: byId('source-line-mirror')
    }
    this.setLanguage('zh-CN')
  }

  setLanguage(language: Language): void {
    this.language = language
    const text = copyFor(language)
    document.documentElement.lang = language
    this.elements.sidebarTabs.setAttribute('aria-label', text.sidebarViews)
    this.elements.documentsLabel.textContent = this.compact ? text.documentsShort : text.documents
    this.elements.outlineLabel.textContent = this.compact ? text.outlineShort : text.outline
    this.labelButton(this.elements.newDocument, text.newHere)
    this.labelButton(this.elements.openDocument, text.openHere)
    this.elements.filter.placeholder = text.filter
    this.elements.filter.setAttribute('aria-label', text.filter)
    this.labelButton(this.elements.clearFilter, text.clearFilter)
    this.elements.fileList.setAttribute('aria-label', text.openDocuments)
    this.labelButton(this.elements.edgeToggle, this.elements.sidebar.hidden ? text.showSidebar : text.hideSidebar)
    this.elements.resizeHandle.setAttribute('aria-label', text.resizeSidebar)
    this.elements.source.setAttribute('aria-label', text.sourceLabel)
    this.elements.modeSwitch.setAttribute('aria-label', text.editorModes)
    this.elements.previewLabel.textContent = text.preview
    this.elements.markdownLabel.textContent = text.markdown
    this.elements.qualityCheckLabel.textContent = text.markdownCheck
    this.labelButton(this.elements.documentName, text.renameDocument)
    this.elements.documentNameInput.setAttribute('aria-label', text.renameDocument)
    this.elements.shortcutsToggle.querySelector('span')!.textContent = text.shortcuts
    byText(this.elements.shortcutsPanel, 'shortcuts-heading-label', text.shortcuts)
    byText(this.elements.shortcutsPanel, 'shortcut-quick-open-label', text.quickOpen)
    byText(this.elements.shortcutsPanel, 'shortcut-search-label', text.findReplace)
    byText(this.elements.shortcutsPanel, 'shortcut-save-label', text.save)
    byText(this.elements.shortcutsPanel, 'shortcut-formula-label', text.formula)
    this.labelButton(this.elements.shortcutsClose, text.close)
    this.elements.shortcutsPanel.setAttribute('aria-label', text.shortcuts)
  }

  setCompact(compact: boolean): void {
    this.compact = compact
    document.body.classList.toggle('sidebar-compact', compact)
    this.setLanguage(this.language)
  }

  setSidebarView(view: SidebarView): void {
    const documents = view === 'documents'
    this.elements.documentsTab.classList.toggle('active', documents)
    this.elements.outlineTab.classList.toggle('active', !documents)
    this.elements.documentsTab.setAttribute('aria-selected', String(documents))
    this.elements.outlineTab.setAttribute('aria-selected', String(!documents))
    this.elements.documentsView.hidden = !documents
    this.elements.outlineView.hidden = documents
    this.elements.sidebarActions.hidden = !documents
  }

  setSidebarVisible(visible: boolean): void {
    this.elements.sidebar.hidden = !visible
    document.body.classList.toggle('show-file-panel', visible)
    this.elements.edgeToggle.classList.toggle('is-collapsed', !visible)
    this.elements.edgeToggle.setAttribute('aria-expanded', String(visible))
    this.setLanguage(this.language)
  }

  setSidebarWidth(width: number): void {
    document.body.style.setProperty('--sidebar-width', `${width}px`)
    this.setCompact(isCompactSidebarWidth(width))
  }

  setMode(mode: EditorMode): void {
    const preview = mode === 'preview'
    this.elements.previewMode.classList.toggle('active', preview)
    this.elements.markdownMode.classList.toggle('active', !preview)
    this.elements.previewMode.setAttribute('aria-pressed', String(preview))
    this.elements.markdownMode.setAttribute('aria-pressed', String(!preview))
    this.elements.editor.hidden = !preview
    this.elements.sourceShell.classList.toggle('visible', !preview)
  }

  setHeader(document: DocumentSummary | undefined, dirty: boolean, markdown: string): void {
    const text = copyFor(this.language)
    this.elements.documentKind.textContent = document?.name.split('.').pop()?.toUpperCase() || text.fileType
    const stateDocument = document ? { ...document, dirty } : undefined
    this.elements.documentState.textContent = stateDocument ? presentDocumentState(stateDocument, this.language) : ''
    this.elements.documentState.classList.toggle('is-dirty', dirty)
    this.elements.wordCount.textContent = text.wordCount.replace('{count}', String(countMarkdownWords(markdown)))
    this.elements.documentNameText.textContent = document?.name ?? text.newDocument
    this.elements.documentName.disabled = Boolean(document?.readOnly)
    this.elements.documentName.title = document?.readOnly ? text.reference : `${text.renameDocument}${document?.path ? ` · ${document.path}` : ''}`
  }

  renderDocuments(documents: readonly DocumentSummary[], activeId: string | null): void {
    const text = copyFor(this.language)
    const visible = filterDocuments(documents, this.elements.filter.value)
    this.elements.documentCount.textContent = String(documents.length).padStart(2, '0')
    this.elements.clearFilter.hidden = this.elements.filter.value.length === 0
    this.elements.fileList.replaceChildren()
    if (visible.length === 0) {
      const empty = document.createElement('li')
      empty.className = 'document-list-empty'
      empty.textContent = text.noMatches
      this.elements.fileList.append(empty)
      return
    }
    for (const item of visible) {
      const row = document.createElement('li')
      row.className = 'document-row'
      row.classList.toggle('active', item.id === activeId)
      row.classList.toggle('dirty', item.dirty)
      const open = document.createElement('button')
      open.type = 'button'
      open.className = 'document-main'
      open.dataset.documentId = item.id
      open.title = item.path ?? item.name
      const marker = document.createElement('span')
      marker.className = 'document-marker'
      marker.innerHTML = item.dirty ? icons.documentDirty : icons.documentSaved
      const copy = document.createElement('span')
      copy.className = 'document-copy'
      const name = document.createElement('span')
      name.className = 'document-name'
      name.textContent = item.name
      const meta = document.createElement('span')
      meta.className = 'document-meta'
      meta.textContent = `${folderName(item.path)}${item.path ? ' · ' : ''}${presentDocumentState(item, this.language)}`
      copy.append(name, meta)
      open.append(marker, copy)
      row.append(open)
      if (documents.length > 1) {
        const close = document.createElement('button')
        close.type = 'button'
        close.className = 'document-close'
        close.dataset.closeDocumentId = item.id
        close.textContent = '×'
        this.labelButton(close, text.closeDocument.replace('{name}', item.name))
        row.append(close)
      }
      this.elements.fileList.append(row)
    }
  }

  setShortcutsOpen(open: boolean): void {
    this.elements.shortcutsPanel.hidden = !open
    this.elements.shortcutsToggle.classList.toggle('active', open)
    this.elements.shortcutsToggle.setAttribute('aria-expanded', String(open))
  }

  showToast(message: string): void {
    const toast = document.createElement('div')
    toast.className = 'asset-toast'
    toast.textContent = message
    document.body.append(toast)
    window.setTimeout(() => toast.classList.add('leaving'), 1800)
    window.setTimeout(() => toast.remove(), 2200)
  }

  private labelButton(button: HTMLButtonElement, label: string): void {
    button.title = label
    button.setAttribute('aria-label', label)
  }
}

function byText(root: ParentNode, id: string, text: string): void {
  const element = root.querySelector<HTMLElement>(`#${id}`)
  if (element) element.textContent = text
}

function folderName(path: string | null): string {
  if (!path) return ''
  const parts = path.split(/[\\/]+/u).filter(Boolean)
  return parts.at(-2) ?? ''
}
