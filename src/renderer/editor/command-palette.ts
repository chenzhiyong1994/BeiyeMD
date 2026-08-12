import type { CommandPalettePayload, DocumentSnapshot, Language, PaletteDocument, RecentDocument } from '../../preload/index'
import { stripTableColumnWidths } from './markdown-presentation'

type PaletteItem =
  | { kind: 'open'; document: PaletteDocument; excerpt: string; score: number; contentMatch: boolean }
  | { kind: 'recent'; document: RecentDocument; excerpt: string; score: number; contentMatch: false }

const paletteText = {
  'zh-CN': {
    title: '快速打开', placeholder: '搜索文档名称、路径或正文…', open: '已打开', recent: '最近使用', empty: '没有找到匹配内容',
    loading: '正在整理文档…', hint: '↑↓ 选择  ·  Enter 打开  ·  Esc 关闭', unsaved: '未保存文档'
  },
  en: {
    title: 'Quick Open', placeholder: 'Search document names, paths, or content…', open: 'Open', recent: 'Recent', empty: 'No matching content',
    loading: 'Collecting documents…', hint: '↑↓ Select  ·  Enter Open  ·  Esc Close', unsaved: 'Unsaved document'
  },
  'zh-TW': {
    title: '快速開啟', placeholder: '搜尋文件名稱、路徑或正文…', open: '已開啟', recent: '最近使用', empty: '找不到符合內容',
    loading: '正在整理文件…', hint: '↑↓ 選擇  ·  Enter 開啟  ·  Esc 關閉', unsaved: '未儲存文件'
  }
} as const

function normalize(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase()
}

function visibleDocumentContent(content: string): string {
  return stripTableColumnWidths(content).markdown
}

function fuzzyScore(value: string, query: string): number {
  const haystack = normalize(value)
  const needle = normalize(query)
  if (!needle) return 1
  const directIndex = haystack.indexOf(needle)
  if (directIndex >= 0) return 1000 - directIndex * 2 - Math.max(0, haystack.length - needle.length)

  let cursor = 0
  let gap = 0
  for (const char of needle) {
    const found = haystack.indexOf(char, cursor)
    if (found < 0) return -1
    gap += found - cursor
    cursor = found + 1
  }
  return 400 - gap
}

function excerptAround(content: string, query: string): string {
  const compact = content.replace(/\s+/g, ' ').trim()
  if (!compact) return ''
  const index = normalize(compact).indexOf(normalize(query))
  if (index < 0) return compact.slice(0, 116)
  const start = Math.max(0, index - 42)
  const end = Math.min(compact.length, index + query.length + 68)
  return `${start > 0 ? '…' : ''}${compact.slice(start, end)}${end < compact.length ? '…' : ''}`
}

export class CommandPalette {
  private overlay: HTMLDivElement
  private panel: HTMLDivElement
  private input: HTMLInputElement
  private list: HTMLDivElement
  private title: HTMLDivElement
  private hint: HTMLDivElement
  private payload: CommandPalettePayload = { openDocuments: [], recentDocuments: [] }
  private items: PaletteItem[] = []
  private selectedIndex = 0
  private language: Language

  constructor(
    language: Language,
    private readonly getData: () => Promise<CommandPalettePayload | null>,
    private readonly getSnapshot: () => DocumentSnapshot | undefined,
    private readonly activateDocument: (documentId: string, snapshot?: DocumentSnapshot) => Promise<boolean>,
    private readonly openRecentDocument: (path: string, snapshot?: DocumentSnapshot) => Promise<boolean>,
    private readonly findAfterOpen: (query: string) => void
  ) {
    this.language = language
    this.overlay = document.createElement('div')
    this.overlay.className = 'command-palette-overlay'
    this.overlay.hidden = true

    this.panel = document.createElement('div')
    this.panel.className = 'command-palette'
    this.panel.setAttribute('role', 'dialog')
    this.panel.setAttribute('aria-modal', 'true')

    const heading = document.createElement('div')
    heading.className = 'command-palette-heading'
    this.title = document.createElement('div')
    this.title.className = 'command-palette-title'
    const key = document.createElement('kbd')
    key.textContent = 'Ctrl P'
    heading.append(this.title, key)

    const inputShell = document.createElement('label')
    inputShell.className = 'command-palette-input-shell'
    inputShell.innerHTML = '<svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5"/><path d="m12.2 12.2 4 4"/></svg>'
    this.input = document.createElement('input')
    this.input.type = 'text'
    this.input.autocomplete = 'off'
    this.input.spellcheck = false
    inputShell.append(this.input)

    this.list = document.createElement('div')
    this.list.className = 'command-palette-results'
    this.list.setAttribute('role', 'listbox')

    this.hint = document.createElement('div')
    this.hint.className = 'command-palette-hint'
    this.panel.append(heading, inputShell, this.list, this.hint)
    this.overlay.append(this.panel)
    document.body.append(this.overlay)

    this.input.addEventListener('input', () => {
      this.selectedIndex = 0
      this.render()
    })
    this.input.addEventListener('keydown', (event) => this.onKeydown(event))
    this.list.addEventListener('mousemove', (event) => {
      const row = (event.target as HTMLElement).closest<HTMLElement>('[data-palette-index]')
      if (!row) return
      this.selectedIndex = Number(row.dataset.paletteIndex)
      this.syncSelection()
    })
    this.list.addEventListener('click', (event) => {
      const row = (event.target as HTMLElement).closest<HTMLElement>('[data-palette-index]')
      if (!row) return
      this.selectedIndex = Number(row.dataset.paletteIndex)
      void this.openSelected()
    })
    this.overlay.addEventListener('mousedown', (event) => {
      if (event.target === this.overlay) this.hide()
    })
    this.setLanguage(language)
  }

  setLanguage(language: Language): void {
    this.language = language
    const text = paletteText[language]
    this.title.textContent = text.title
    this.input.placeholder = text.placeholder
    this.input.setAttribute('aria-label', text.placeholder)
    this.hint.textContent = text.hint
    if (!this.overlay.hidden) this.render()
  }

  async show(initialQuery = ''): Promise<void> {
    this.overlay.hidden = false
    document.body.classList.add('has-modal-overlay')
    this.input.value = initialQuery
    this.list.innerHTML = `<div class="command-palette-empty">${paletteText[this.language].loading}</div>`
    requestAnimationFrame(() => this.input.focus())
    this.payload = await this.getData() ?? { openDocuments: [], recentDocuments: [] }
    if (this.overlay.hidden) return
    this.selectedIndex = 0
    this.render()
    this.input.focus()
  }

  hide(): void {
    this.overlay.hidden = true
    document.body.classList.remove('has-modal-overlay')
  }

  private onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault()
      this.hide()
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (this.items.length === 0) return
      const delta = event.key === 'ArrowDown' ? 1 : -1
      this.selectedIndex = (this.selectedIndex + delta + this.items.length) % this.items.length
      this.syncSelection(true)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      void this.openSelected()
    }
  }

  private buildItems(): PaletteItem[] {
    const query = this.input.value.trim()
    const openItems = this.payload.openDocuments.flatMap<PaletteItem>((document) => {
      if (!query) return [{ kind: 'open', document, excerpt: document.path ?? paletteText[this.language].unsaved, score: 20, contentMatch: false }]
      const visibleContent = visibleDocumentContent(document.content)
      const labelScore = Math.max(fuzzyScore(document.name, query), fuzzyScore(document.path ?? '', query))
      const contentIndex = normalize(visibleContent).indexOf(normalize(query))
      if (labelScore < 0 && contentIndex < 0) return []
      return [{
        kind: 'open', document,
        excerpt: contentIndex >= 0 ? excerptAround(visibleContent, query) : document.path ?? paletteText[this.language].unsaved,
        score: Math.max(labelScore, contentIndex >= 0 ? 620 - Math.min(contentIndex, 500) : -1),
        contentMatch: contentIndex >= 0
      }]
    })
    const recentItems = this.payload.recentDocuments.flatMap<PaletteItem>((document) => {
      const score = query ? Math.max(fuzzyScore(document.name, query), fuzzyScore(document.path, query)) : 10
      return score < 0 ? [] : [{ kind: 'recent', document, excerpt: document.path, score, contentMatch: false }]
    })
    return [...openItems, ...recentItems].sort((left, right) => right.score - left.score).slice(0, 30)
  }

  private render(): void {
    this.items = this.buildItems()
    this.selectedIndex = Math.min(this.selectedIndex, Math.max(0, this.items.length - 1))
    this.list.innerHTML = ''
    if (this.items.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'command-palette-empty'
      empty.textContent = paletteText[this.language].empty
      this.list.append(empty)
      return
    }

    this.items.forEach((item, index) => {
      const row = document.createElement('button')
      row.type = 'button'
      row.className = 'command-palette-result'
      row.dataset.paletteIndex = String(index)
      row.setAttribute('role', 'option')

      const marker = document.createElement('span')
      marker.className = 'command-palette-marker'
      marker.textContent = item.kind === 'open' ? '#' : '↗'
      const copy = document.createElement('span')
      copy.className = 'command-palette-copy'
      const name = document.createElement('span')
      name.className = 'command-palette-name'
      name.textContent = item.document.name
      const excerpt = document.createElement('span')
      excerpt.className = 'command-palette-excerpt'
      excerpt.textContent = item.excerpt
      const badge = document.createElement('span')
      badge.className = 'command-palette-badge'
      badge.textContent = item.kind === 'open' ? paletteText[this.language].open : paletteText[this.language].recent
      copy.append(name, excerpt)
      row.append(marker, copy, badge)
      this.list.append(row)
    })
    this.syncSelection()
  }

  private syncSelection(scroll = false): void {
    this.list.querySelectorAll<HTMLElement>('[data-palette-index]').forEach((row) => {
      const active = Number(row.dataset.paletteIndex) === this.selectedIndex
      row.classList.toggle('selected', active)
      row.setAttribute('aria-selected', String(active))
      if (active && scroll) row.scrollIntoView({ block: 'nearest' })
    })
  }

  private async openSelected(): Promise<void> {
    const item = this.items[this.selectedIndex]
    if (!item) return
    const query = this.input.value.trim()
    this.hide()
    const opened = item.kind === 'open'
      ? await this.activateDocument(item.document.id, this.getSnapshot())
      : await this.openRecentDocument(item.document.path, this.getSnapshot())
    if (opened && item.kind === 'open' && item.contentMatch && query) {
      window.setTimeout(() => this.findAfterOpen(query), 40)
    }
  }
}
