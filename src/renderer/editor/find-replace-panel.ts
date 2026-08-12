import { TextSelection } from '@milkdown/kit/prose/state'
import { Decoration, DecorationSet } from '@milkdown/kit/prose/view'

import type { Language } from '../../shared/contracts'
import { getActiveEditorView, searchDecorationsKey } from './editor-access'
import { FindReplaceEngine, type TextMatch } from './find-replace-engine'
import { renderSourceSearchHighlights } from './source-search-highlights'

interface DocumentMatch extends TextMatch {
  from: number
  to: number
}

interface SourceSearchSurface {
  editor: HTMLTextAreaElement
  highlights: HTMLElement
}

const copy = {
  'zh-CN': {
    title: '文档查找', query: '查找内容', replacement: '替换为…', previous: '上一个匹配', next: '下一个匹配', close: '关闭',
    caseSensitive: '区分大小写', wholeWord: '全词匹配', regularExpression: '正则表达式', replaceOne: '替换', replaceAll: '全部替换',
    invalidExpression: '正则表达式有误'
  },
  en: {
    title: 'Find in document', query: 'Find', replacement: 'Replace with…', previous: 'Previous match', next: 'Next match', close: 'Close',
    caseSensitive: 'Match case', wholeWord: 'Whole word', regularExpression: 'Regular expression', replaceOne: 'Replace', replaceAll: 'Replace all',
    invalidExpression: 'Invalid regular expression'
  },
  'zh-TW': {
    title: '文件尋找', query: '尋找內容', replacement: '取代為…', previous: '上一個結果', next: '下一個結果', close: '關閉',
    caseSensitive: '區分大小寫', wholeWord: '全字匹配', regularExpression: '規則運算式', replaceOne: '取代', replaceAll: '全部取代',
    invalidExpression: '規則運算式有誤'
  }
} as const

export class FindReplacePanel {
  private readonly panel: HTMLElement
  private readonly title: HTMLElement
  private readonly query: HTMLInputElement
  private readonly replacement: HTMLInputElement
  private readonly counter: HTMLElement
  private readonly message: HTMLElement
  private readonly previousButton: HTMLButtonElement
  private readonly nextButton: HTMLButtonElement
  private readonly closeButton: HTMLButtonElement
  private readonly replaceButton: HTMLButtonElement
  private readonly replaceAllButton: HTMLButtonElement
  private readonly caseButton: HTMLButtonElement
  private readonly wordButton: HTMLButtonElement
  private readonly expressionButton: HTMLButtonElement
  private language: Language
  private open = false
  private activeMatch = -1
  private matches: DocumentMatch[] = []

  constructor(language: Language = 'zh-CN', private readonly sourceSurface?: SourceSearchSurface) {
    this.language = language
    this.panel = document.createElement('aside')
    this.panel.className = 'find-replace-panel'
    this.panel.hidden = true
    this.panel.setAttribute('role', 'dialog')
    this.panel.setAttribute('aria-modal', 'false')

    const heading = document.createElement('header')
    heading.className = 'find-replace-heading'
    this.title = document.createElement('strong')
    this.counter = document.createElement('span')
    this.counter.className = 'find-replace-counter'
    this.closeButton = this.makeIconButton('×', () => this.hide())
    heading.append(this.title, this.counter, this.closeButton)

    const queryRow = document.createElement('div')
    queryRow.className = 'find-replace-row'
    this.query = this.makeInput()
    const queryField = this.wrapField(this.query)
    this.previousButton = this.makeIconButton('↑', () => this.move(-1))
    this.nextButton = this.makeIconButton('↓', () => this.move(1))
    queryRow.append(queryField, this.previousButton, this.nextButton)

    const replacementRow = document.createElement('div')
    replacementRow.className = 'find-replace-row'
    this.replacement = this.makeInput()
    this.replaceButton = this.makeTextButton(() => this.replaceCurrent())
    this.replaceAllButton = this.makeTextButton(() => this.replaceEveryMatch())
    replacementRow.append(this.wrapField(this.replacement), this.replaceButton, this.replaceAllButton)

    const options = document.createElement('div')
    options.className = 'find-replace-options'
    this.caseButton = this.makeOption('Aa')
    this.wordButton = this.makeOption('Ab')
    this.expressionButton = this.makeOption('.*')
    this.message = document.createElement('span')
    this.message.className = 'find-replace-message'
    options.append(this.caseButton, this.wordButton, this.expressionButton, this.message)

    this.panel.append(heading, queryRow, replacementRow, options)
    document.body.append(this.panel)
    this.bindEvents()
    this.setLanguage(language)
  }

  setLanguage(language: Language): void {
    this.language = language
    const text = copy[language]
    this.title.textContent = text.title
    this.query.placeholder = text.query
    this.replacement.placeholder = text.replacement
    this.setLabel(this.query, text.query)
    this.setLabel(this.replacement, text.replacement)
    this.setLabel(this.previousButton, text.previous)
    this.setLabel(this.nextButton, text.next)
    this.setLabel(this.closeButton, text.close)
    this.setLabel(this.caseButton, text.caseSensitive)
    this.setLabel(this.wordButton, text.wholeWord)
    this.setLabel(this.expressionButton, text.regularExpression)
    this.replaceButton.textContent = text.replaceOne
    this.replaceAllButton.textContent = text.replaceAll
    this.setLabel(this.replaceButton, text.replaceOne)
    this.setLabel(this.replaceAllButton, text.replaceAll)
  }

  show(query?: string): void {
    this.open = true
    this.panel.hidden = false
    if (query !== undefined) this.query.value = query
    this.query.focus()
    this.query.select()
    this.recalculate()
  }

  hide(): void {
    const active = this.matches[this.activeMatch]
    this.open = false
    this.panel.hidden = true
    this.matches = []
    this.activeMatch = -1
    this.message.textContent = ''
    this.clearPreviewHighlights()
    const source = this.sourceEditor()
    if (source) source.focus()
    else {
      const view = getActiveEditorView()
      if (view && active) view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, active.to)))
      view?.focus()
    }
  }

  refresh(): void {
    if (this.open) this.recalculate(false)
  }

  private bindEvents(): void {
    this.query.addEventListener('input', () => this.recalculate())
    this.replacement.addEventListener('input', () => this.recalculate(false))
    this.query.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return
      event.preventDefault()
      this.move(event.shiftKey ? -1 : 1)
    })
    this.replacement.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return
      event.preventDefault()
      if (event.metaKey || event.ctrlKey) this.replaceEveryMatch()
      else this.replaceCurrent()
    })
    for (const button of [this.caseButton, this.wordButton, this.expressionButton]) {
      button.addEventListener('click', () => {
        const active = !button.classList.contains('active')
        button.classList.toggle('active', active)
        button.setAttribute('aria-pressed', String(active))
        this.recalculate()
      })
    }
    this.panel.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        this.hide()
      }
      event.stopPropagation()
    })
  }

  private recalculate(scroll = true): void {
    const engine = this.engine()
    this.message.textContent = engine.error ? copy[this.language].invalidExpression : ''
    this.matches = []
    this.activeMatch = -1
    if (engine.error || !this.query.value) {
      this.clearPreviewHighlights()
      this.updateAvailability()
      return
    }

    const source = this.sourceEditor()
    if (source) {
      this.matches = engine.locate(source.value).map((match) => ({ ...match, from: match.start, to: match.end }))
      this.activeMatch = this.matches.length ? 0 : -1
      this.clearPreviewHighlights()
      this.paintSourceHighlights(source)
      if (scroll) this.selectSourceMatch(source)
    } else {
      const view = getActiveEditorView()
      view?.state.doc.descendants((node, position) => {
        if (!node.isText || !node.text) return
        const matches = engine.locate(node.text)
        this.matches.push(...matches.map((match) => ({ ...match, from: position + match.start, to: position + match.end })))
      })
      this.activeMatch = this.matches.length ? 0 : -1
      this.paintPreviewHighlights()
      if (scroll) this.scrollPreviewToActive()
    }
    this.updateAvailability()
  }

  private move(delta: number): void {
    if (!this.matches.length) return
    this.activeMatch = (this.activeMatch + delta + this.matches.length) % this.matches.length
    const source = this.sourceEditor()
    if (source) {
      this.paintSourceHighlights(source)
      this.selectSourceMatch(source)
    }
    else {
      this.paintPreviewHighlights()
      this.scrollPreviewToActive()
    }
    this.updateAvailability()
  }

  private replaceCurrent(): void {
    const match = this.matches[this.activeMatch]
    if (!match) return
    const source = this.sourceEditor()
    if (source) {
      source.setRangeText(match.replacement, match.from, match.to, 'end')
      source.dispatchEvent(new Event('input', { bubbles: true }))
    } else {
      const view = getActiveEditorView()
      if (!view) return
      view.dispatch(view.state.tr.insertText(match.replacement, match.from, match.to))
    }
    this.recalculate()
  }

  private replaceEveryMatch(): void {
    if (!this.matches.length) return
    const source = this.sourceEditor()
    if (source) {
      source.value = this.engine().replaceEvery(source.value)
      source.dispatchEvent(new Event('input', { bubbles: true }))
    } else {
      const view = getActiveEditorView()
      if (!view) return
      let transaction = view.state.tr
      for (const match of [...this.matches].reverse()) transaction = transaction.insertText(match.replacement, match.from, match.to)
      view.dispatch(transaction)
    }
    this.recalculate()
  }

  private engine(): FindReplaceEngine {
    return new FindReplaceEngine({
      query: this.query.value,
      replacement: this.replacement.value,
      caseSensitive: this.caseButton.classList.contains('active'),
      wholeWord: this.wordButton.classList.contains('active'),
      regularExpression: this.expressionButton.classList.contains('active')
    })
  }

  private sourceEditor(): HTMLTextAreaElement | null {
    const editor = this.sourceSurface?.editor ?? document.getElementById('source-editor') as HTMLTextAreaElement | null
    if (!editor?.closest('#source-editor-shell')?.classList.contains('visible')) return null
    return editor
  }

  private paintSourceHighlights(source: HTMLTextAreaElement): void {
    const root = this.sourceSurface?.highlights ?? document.getElementById('source-search-highlights')
    if (root) renderSourceSearchHighlights(root, source.value, this.matches, this.activeMatch)
  }

  private clearSourceHighlights(): void {
    const root = this.sourceSurface?.highlights ?? document.getElementById('source-search-highlights')
    root?.replaceChildren()
  }

  private paintPreviewHighlights(): void {
    const view = getActiveEditorView()
    if (!view) return
    const decorations = this.matches.map((match, index) => Decoration.inline(match.from, match.to, {
      class: index === this.activeMatch ? 'search-match-current' : 'search-match'
    }))
    view.dispatch(view.state.tr.setMeta(searchDecorationsKey, DecorationSet.create(view.state.doc, decorations)))
  }

  private clearPreviewHighlights(): void {
    const view = getActiveEditorView()
    if (view) view.dispatch(view.state.tr.setMeta(searchDecorationsKey, DecorationSet.empty))
    this.clearSourceHighlights()
  }

  private scrollPreviewToActive(): void {
    const view = getActiveEditorView()
    const match = this.matches[this.activeMatch]
    const viewport = document.getElementById('editor')
    if (!view || !match || !viewport) return
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, match.from, match.to)))
    const point = view.coordsAtPos(match.from)
    const bounds = viewport.getBoundingClientRect()
    viewport.scrollTo({ top: viewport.scrollTop + point.top - bounds.top - bounds.height * .32, behavior: 'smooth' })
  }

  private selectSourceMatch(source: HTMLTextAreaElement): void {
    const match = this.matches[this.activeMatch]
    if (!match) return
    source.focus()
    source.setSelectionRange(match.from, match.to)
    this.query.focus()
  }

  private updateAvailability(): void {
    const disabled = this.matches.length === 0
    for (const button of [this.previousButton, this.nextButton, this.replaceButton, this.replaceAllButton]) button.disabled = disabled
    this.counter.textContent = this.matches.length ? `${this.activeMatch + 1} / ${this.matches.length}` : this.query.value ? '0 / 0' : ''
  }

  private makeInput(): HTMLInputElement {
    const input = document.createElement('input')
    input.type = 'text'
    input.autocomplete = 'off'
    input.spellcheck = false
    return input
  }

  private wrapField(input: HTMLInputElement): HTMLElement {
    const field = document.createElement('label')
    field.className = 'find-replace-field'
    field.append(input)
    return field
  }

  private makeIconButton(label: string, action: () => void): HTMLButtonElement {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'find-replace-icon'
    button.textContent = label
    button.addEventListener('mousedown', (event) => event.preventDefault())
    button.addEventListener('click', action)
    return button
  }

  private makeTextButton(action: () => void): HTMLButtonElement {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'find-replace-action'
    button.addEventListener('mousedown', (event) => event.preventDefault())
    button.addEventListener('click', action)
    return button
  }

  private makeOption(label: string): HTMLButtonElement {
    const button = this.makeIconButton(label, () => undefined)
    button.className = 'find-replace-option'
    button.setAttribute('aria-pressed', 'false')
    return button
  }

  private setLabel(element: HTMLElement, label: string): void {
    element.setAttribute('aria-label', label)
    if (element instanceof HTMLButtonElement) element.title = label
  }
}
