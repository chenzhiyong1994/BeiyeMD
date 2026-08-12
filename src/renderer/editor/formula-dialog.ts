import type { Node as ProseMirrorNode, NodeType } from '@milkdown/kit/prose/model'

import type { Language } from '../../shared/contracts'
import { getActiveEditorView } from './editor-access'
import { formulaMarkdown } from './formula-format'

const copy = {
  'zh-CN': { create: '插入公式', edit: '编辑公式', hint: '输入 LaTeX，例如：E = mc^2', block: '独立居中显示', cancel: '取消', insert: '插入', update: '更新', field: '公式内容' },
  en: { create: 'Insert formula', edit: 'Edit formula', hint: 'Enter LaTeX, for example: E = mc^2', block: 'Display as a centered block', cancel: 'Cancel', insert: 'Insert', update: 'Update', field: 'Formula' },
  'zh-TW': { create: '插入公式', edit: '編輯公式', hint: '輸入 LaTeX，例如：E = mc^2', block: '獨立置中顯示', cancel: '取消', insert: '插入', update: '更新', field: '公式內容' }
} as const

interface FormulaTarget {
  position: number
  block: boolean
}

export class FormulaDialog {
  private readonly overlay: HTMLElement
  private readonly form: HTMLFormElement
  private readonly heading: HTMLElement
  private readonly input: HTMLTextAreaElement
  private readonly blockToggle: HTMLInputElement
  private readonly blockText: HTMLElement
  private readonly cancelButton: HTMLButtonElement
  private readonly submitButton: HTMLButtonElement
  private language: Language = 'zh-CN'
  private target: FormulaTarget | null = null

  constructor() {
    this.overlay = document.createElement('div')
    this.overlay.className = 'formula-dialog-overlay'
    this.overlay.hidden = true

    this.form = document.createElement('form')
    this.form.className = 'formula-dialog'
    const header = document.createElement('header')
    this.heading = document.createElement('h2')
    header.append(this.heading)

    const field = document.createElement('label')
    field.className = 'formula-dialog-field'
    this.input = document.createElement('textarea')
    this.input.rows = 5
    this.input.spellcheck = false
    field.append(this.input)

    const displayMode = document.createElement('label')
    displayMode.className = 'formula-dialog-mode'
    this.blockToggle = document.createElement('input')
    this.blockToggle.type = 'checkbox'
    this.blockText = document.createElement('span')
    displayMode.append(this.blockToggle, this.blockText)

    const actions = document.createElement('footer')
    this.cancelButton = document.createElement('button')
    this.cancelButton.type = 'button'
    this.cancelButton.className = 'formula-dialog-cancel'
    this.submitButton = document.createElement('button')
    this.submitButton.type = 'submit'
    this.submitButton.className = 'formula-dialog-submit'
    actions.append(this.cancelButton, this.submitButton)

    this.form.append(header, field, displayMode, actions)
    this.overlay.append(this.form)
    document.body.append(this.overlay)
    this.bindEvents()
    this.setLanguage(this.language)
  }

  setLanguage(language: Language): void {
    this.language = language
    const text = copy[language]
    this.heading.textContent = this.target ? text.edit : text.create
    this.input.placeholder = text.hint
    this.input.setAttribute('aria-label', text.field)
    this.blockText.textContent = text.block
    this.cancelButton.textContent = text.cancel
    this.submitButton.textContent = this.target ? text.update : text.insert
  }

  show(value = '', block = false, position: number | null = null): void {
    this.target = position === null ? null : { position, block }
    this.input.value = value
    this.blockToggle.checked = block
    this.setLanguage(this.language)
    this.overlay.hidden = false
    requestAnimationFrame(() => {
      this.input.focus()
      if (value) this.input.select()
    })
  }

  close(): void {
    this.overlay.hidden = true
    this.target = null
    const source = this.sourceEditor()
    if (source) source.focus()
    else getActiveEditorView()?.focus()
  }

  private bindEvents(): void {
    this.overlay.addEventListener('mousedown', (event) => {
      if (event.target === this.overlay) this.close()
    })
    this.cancelButton.addEventListener('click', () => this.close())
    this.form.addEventListener('submit', (event) => {
      event.preventDefault()
      this.commit()
    })
    this.form.addEventListener('keydown', (event) => {
      event.stopPropagation()
      if (event.key === 'Escape') {
        event.preventDefault()
        this.close()
      } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        this.commit()
      }
    })
  }

  private commit(): void {
    const value = this.input.value.trim()
    const block = this.blockToggle.checked
    const source = this.sourceEditor()
    if (source && !this.target) {
      const markdown = formulaMarkdown(value, block)
      if (markdown) source.setRangeText(markdown, source.selectionStart, source.selectionEnd, 'end')
      source.dispatchEvent(new Event('input', { bubbles: true }))
      this.close()
      return
    }

    const view = getActiveEditorView()
    if (!view) {
      this.close()
      return
    }
    const type = block ? view.state.schema.nodes.math_block : view.state.schema.nodes.math_inline
    if (!type) {
      this.close()
      return
    }

    let transaction = view.state.tr
    if (this.target) {
      const node = view.state.doc.nodeAt(this.target.position)
      if (this.isFormula(node)) {
        if (!value) transaction = transaction.delete(this.target.position, this.target.position + node.nodeSize)
        else transaction = transaction.replaceWith(this.target.position, this.target.position + node.nodeSize, this.makeNode(type, value, block))
      }
    } else if (value) {
      transaction = transaction.replaceSelectionWith(this.makeNode(type, value, block))
    }
    view.dispatch(transaction.scrollIntoView())
    this.close()
  }

  private makeNode(type: NodeType, value: string, block: boolean): ProseMirrorNode {
    return block ? type.create({ value }) : type.create(null, type.schema.text(value))
  }

  private isFormula(node: ProseMirrorNode | null): node is ProseMirrorNode {
    return node?.type.name === 'math_inline' || node?.type.name === 'math_block'
  }

  private sourceEditor(): HTMLTextAreaElement | null {
    const shell = document.getElementById('source-editor-shell')
    if (!shell?.classList.contains('visible')) return null
    return document.getElementById('source-editor') as HTMLTextAreaElement | null
  }
}

export const formulaDialog = new FormulaDialog()
