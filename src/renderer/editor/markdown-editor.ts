import { Editor, defaultValueCtx, editorViewCtx, remarkPluginsCtx, remarkStringifyOptionsCtx, rootCtx, serializerCtx } from '@milkdown/kit/core'
import type { Node as ProseMirrorNode } from '@milkdown/kit/prose/model'
import { Plugin, TextSelection } from '@milkdown/kit/prose/state'
import { TableMap } from '@milkdown/kit/prose/tables'
import { DecorationSet, type EditorView } from '@milkdown/kit/prose/view'
import { clipboard } from '@milkdown/kit/plugin/clipboard'
import { history } from '@milkdown/kit/plugin/history'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { columnResizingPlugin, gfm } from '@milkdown/kit/preset/gfm'
import { $prose, replaceAll } from '@milkdown/kit/utils'
import { katexOptionsCtx, mathBlockSchema, mathInlineSchema, remarkMathPlugin } from '@milkdown/plugin-math'
import remarkBreaks from 'remark-breaks'

import type { Language } from '../../shared/contracts'
import { getActiveEditorView, searchDecorationsKey, setActiveEditorView } from './editor-access'
import { highlightMark, parseHighlightSyntax, stringifyHighlight } from './highlight-mark'
import { decodeImageLayout, encodeImageLayout, injectTableColumnWidths, stripTableColumnWidths, type ImageLayout } from './markdown-presentation'
import { formulaDialog } from './formula-dialog'
import { rawHtmlView } from './raw-html-view'

import 'katex/dist/katex.min.css'
import '@milkdown/kit/prose/view/style/prosemirror.css'
import '@milkdown/kit/prose/tables/style/tables.css'

export interface MarkdownEditorOptions {
  root: HTMLElement
  onChange?: (markdown: string) => void
  openExternal: (url: string) => void
}

const searchDecorations = $prose(() => new Plugin({
  key: searchDecorationsKey,
  state: {
    init: () => DecorationSet.empty,
    apply(transaction, previous) {
      const replacement = transaction.getMeta(searchDecorationsKey)
      return replacement === undefined ? previous.map(transaction.mapping, transaction.doc) : replacement
    }
  },
  props: { decorations: (state) => searchDecorationsKey.getState(state) }
}))

const mathInteraction = $prose(() => new Plugin({
  props: {
    handleClickOn(_view, _position, node, nodePosition) {
      if (node.type.name !== 'math_inline' && node.type.name !== 'math_block') return false
      const block = node.type.name === 'math_block'
      formulaDialog.show(block ? String(node.attrs.value ?? '') : node.textContent, block, nodePosition)
      return true
    }
  }
}))

const imageView = $prose(() => new Plugin({
  props: {
    nodeViews: {
      image(initialNode) {
        let node = initialNode
        const element = document.createElement('img')
        element.draggable = false
        const render = (nextNode: ProseMirrorNode) => {
          const layout = decodeImageLayout(nextNode.attrs.title)
          element.src = String(nextNode.attrs.src ?? '')
          element.alt = String(nextNode.attrs.alt ?? '')
          element.style.width = layout.width ?? 'auto'
          element.dataset.beiyeWidth = layout.width ?? 'auto'
          element.dataset.beiyeAlign = layout.align
          const title = String(nextNode.attrs.title ?? '')
          if (title && !title.startsWith('beiye:') && !title.startsWith('beiye-')) element.title = title
          else element.removeAttribute('title')
        }
        element.addEventListener('load', () => element.classList.remove('image-load-error'))
        element.addEventListener('error', () => element.classList.add('image-load-error'))
        render(node)
        return {
          dom: element,
          update(nextNode) {
            if (nextNode.type !== node.type) return false
            node = nextNode
            render(node)
            return true
          }
        }
      }
    }
  }
}))

export class MarkdownEditor {
  private editor: Editor | null = null
  private readonly root: HTMLElement
  private readonly onChange?: (markdown: string) => void
  private readonly openExternal: (url: string) => void
  private readonly disposers: Array<() => void> = []

  constructor(options: MarkdownEditorOptions) {
    this.root = options.root
    this.onChange = options.onChange
    this.openExternal = options.openExternal
  }

  async create(): Promise<void> {
    if (this.editor) return
    this.editor = await Editor.make()
      .config((context) => {
        context.set(rootCtx, this.root)
        context.set(defaultValueCtx, '')
        context.set(remarkPluginsCtx, [
          { plugin: remarkBreaks, options: {} },
          { plugin: parseHighlightSyntax, options: {} }
        ])
        context.set(katexOptionsCtx.key, { throwOnError: false })
        const stringify = context.get(remarkStringifyOptionsCtx)
        context.set(remarkStringifyOptionsCtx, {
          ...stringify,
          handlers: { ...stringify.handlers, mark: stringifyHighlight } as typeof stringify.handlers
        })
        context.get(listenerCtx).mounted((nextContext) => setActiveEditorView(nextContext.get(editorViewCtx)))
        if (this.onChange) {
          context.get(listenerCtx).markdownUpdated((nextContext, markdown) => {
            const widths = readColumnWidths(nextContext.get(editorViewCtx).state.doc)
            this.onChange?.(injectTableColumnWidths(markdown, widths))
          })
        }
      })
      .use(commonmark)
      .use(gfm)
      .use(columnResizingPlugin)
      .use(highlightMark)
      .use(history)
      .use(listener)
      .use(clipboard)
      .use(rawHtmlView)
      .use([remarkMathPlugin, katexOptionsCtx, mathInlineSchema, mathBlockSchema].flat())
      .use(mathInteraction)
      .use(imageView)
      .use(searchDecorations)
      .create()

    this.bindDomInteractions()
  }

  async destroy(): Promise<void> {
    this.disposers.splice(0).forEach((dispose) => dispose())
    setActiveEditorView(null)
    await this.editor?.destroy()
    this.editor = null
  }

  markdown(): string {
    const view = this.view()
    if (!view || !this.editor) return ''
    let value = ''
    this.editor.action((context) => {
      value = context.get(serializerCtx)(context.get(editorViewCtx).state.doc)
    })
    return injectTableColumnWidths(value, readColumnWidths(view.state.doc))
  }

  replaceMarkdown(markdown: string): void {
    if (!this.editor) return
    const parsed = stripTableColumnWidths(markdown)
    this.editor.action(replaceAll(parsed.markdown))
    const view = this.view()
    if (view) writeColumnWidths(view, parsed.widths)
  }

  view(): EditorView | null {
    return getActiveEditorView()
  }

  setLanguage(language: Language): void {
    formulaDialog.setLanguage(language)
  }

  setReadOnly(readOnly: boolean): void {
    const view = this.view()
    if (!view) return
    view.setProps({ editable: () => !readOnly })
    this.root.classList.toggle('is-read-only', readOnly)
  }

  showMath(): void {
    formulaDialog.show()
  }

  focusHeading(index: number): void {
    const view = this.view()
    const heading = view?.dom.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6')[index]
    if (!view || !heading) return
    const position = view.posAtDOM(heading, 0)
    view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(position + 1))))
    view.focus()
    heading.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  insertImage(source: string, alt: string, layout: Partial<ImageLayout> = {}): void {
    const view = this.view()
    const imageType = view?.state.schema.nodes.image
    if (!view || !imageType) return
    const title = encodeImageLayout({ width: layout.width ?? null, align: layout.align ?? 'center' })
    view.dispatch(view.state.tr.replaceSelectionWith(imageType.create({ src: source, alt, title })).scrollIntoView())
    view.focus()
  }

  updateImage(position: number, attributes: { src?: string; alt?: string; title?: string | null }): boolean {
    const view = this.view()
    const node = view?.state.doc.nodeAt(position)
    if (!view || node?.type.name !== 'image') return false
    view.dispatch(view.state.tr.setNodeMarkup(position, undefined, { ...node.attrs, ...attributes }))
    view.focus()
    return true
  }

  private bindDomInteractions(): void {
    this.listen('copy', (event) => applyPortableClipboardStyles(event as ClipboardEvent))
    this.listen('cut', (event) => applyPortableClipboardStyles(event as ClipboardEvent))
    this.listen('click', (event) => this.handleClick(event as MouseEvent))
    this.listen('keydown', (event) => this.handleKeydown(event as KeyboardEvent))
  }

  private listen(type: string, listener: EventListener): void {
    this.root.addEventListener(type, listener)
    this.disposers.push(() => this.root.removeEventListener(type, listener))
  }

  private handleClick(event: MouseEvent): void {
    const target = event.target instanceof HTMLElement ? event.target : null
    const link = target?.closest<HTMLAnchorElement>('a[href]')
    if (link && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      this.openExternal(link.href)
      return
    }

    const item = target?.closest<HTMLElement>('li[data-item-type="task"]')
    if (!item || event.clientX - item.getBoundingClientRect().left > 26) return
    event.preventDefault()
    const view = this.view()
    const coordinates = view?.posAtCoords({ left: event.clientX, top: event.clientY })
    if (view && coordinates) toggleTaskAt(view, coordinates.pos)
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (!(event.metaKey || event.ctrlKey) || event.key !== 'Enter') return
    const view = this.view()
    if (!view) return
    event.preventDefault()
    toggleTaskAt(view, view.state.selection.from)
  }
}

function toggleTaskAt(view: EditorView, position: number): void {
  const resolved = view.state.doc.resolve(position)
  for (let depth = resolved.depth; depth > 0; depth -= 1) {
    const node = resolved.node(depth)
    if (node.type.name !== 'list_item' || node.attrs.checked == null) continue
    view.dispatch(view.state.tr.setNodeMarkup(resolved.before(depth), undefined, { ...node.attrs, checked: !node.attrs.checked }))
    return
  }
}

function readColumnWidths(document: ProseMirrorNode): number[][] {
  const tables: number[][] = []
  document.descendants((table) => {
    if (table.type.spec.tableRole !== 'table') return true
    const widths = Array.from({ length: TableMap.get(table).width }, () => 0)
    let column = 0
    table.firstChild?.forEach((cell) => {
      const span = Number(cell.attrs.colspan) || 1
      const cellWidths = Array.isArray(cell.attrs.colwidth) ? cell.attrs.colwidth as number[] : []
      for (let offset = 0; offset < span; offset += 1) widths[column + offset] = Number(cellWidths[offset]) || 0
      column += span
    })
    tables.push(widths)
    return false
  })
  return tables
}

function writeColumnWidths(view: EditorView, tables: readonly number[][]): void {
  if (tables.length === 0) return
  let tableIndex = 0
  let transaction = view.state.tr
  view.state.doc.descendants((table, tablePosition) => {
    if (table.type.spec.tableRole !== 'table') return true
    const widths = tables[tableIndex++] ?? []
    table.forEach((row, rowOffset) => {
      let column = 0
      row.forEach((cell, cellOffset) => {
        const span = Number(cell.attrs.colspan) || 1
        const values = widths.slice(column, column + span)
        const colwidth = values.length === span && values.every((width) => width > 0) ? values : null
        transaction = transaction.setNodeMarkup(tablePosition + rowOffset + cellOffset + 2, undefined, { ...cell.attrs, colwidth })
        column += span
      })
    })
    return false
  })
  if (transaction.docChanged) view.dispatch(transaction)
}

const clipboardStyles: Record<string, string> = {
  h1: 'font-size:1.8em;font-weight:700;margin:1em 0 .5em;',
  h2: 'font-size:1.4em;font-weight:650;margin:1em 0 .5em;',
  p: 'margin:.5em 0;line-height:1.75;',
  strong: 'font-weight:650;',
  a: 'color:#0969da;text-decoration:none;',
  code: 'background:#f1f3f5;padding:2px 6px;border-radius:4px;font-family:monospace;',
  pre: 'background:#f6f8fa;padding:16px;border-radius:8px;overflow:auto;',
  blockquote: 'border-left:4px solid #d0d7de;padding-left:16px;color:#57606a;',
  table: 'border-collapse:collapse;width:100%;',
  th: 'border:1px solid #d0d7de;padding:8px 12px;text-align:left;background:#f6f8fa;',
  td: 'border:1px solid #d0d7de;padding:8px 12px;text-align:left;',
  img: 'max-width:100%;height:auto;'
}

function applyPortableClipboardStyles(event: ClipboardEvent): void {
  const html = event.clipboardData?.getData('text/html')
  if (!html) return
  const document = new DOMParser().parseFromString(html, 'text/html')
  for (const [selector, style] of Object.entries(clipboardStyles)) {
    document.querySelectorAll<HTMLElement>(selector).forEach((element) => element.setAttribute('style', style))
  }
  document.querySelectorAll<HTMLElement>('pre code').forEach((element) => element.setAttribute('style', 'background:none;padding:0;font-family:monospace;'))
  event.clipboardData?.setData('text/html', document.body.innerHTML)
}
