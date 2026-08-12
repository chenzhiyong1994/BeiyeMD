import type { Command } from '@milkdown/kit/prose/state'
import {
  TableMap,
  addColumnAfter,
  addRowAfter,
  deleteColumn,
  deleteRow,
  moveTableColumn,
  moveTableRow,
  setCellAttr
} from '@milkdown/kit/prose/tables'
import type { Language } from '../../preload/index'
import { getActiveEditorView } from './editor-access'

const tableText = {
  'zh-CN': {
    addRow: '在下方增加一行', deleteRow: '删除当前行', moveRowUp: '当前行上移', moveRowDown: '当前行下移',
    addColumn: '在右侧增加一列', deleteColumn: '删除当前列', moveColumnLeft: '当前列左移', moveColumnRight: '当前列右移',
    alignLeft: '左对齐', alignCenter: '居中对齐', alignRight: '右对齐', equalize: '平均分配列宽', autoFit: '按内容自动适配'
  },
  en: {
    addRow: 'Add row below', deleteRow: 'Delete current row', moveRowUp: 'Move row up', moveRowDown: 'Move row down',
    addColumn: 'Add column right', deleteColumn: 'Delete current column', moveColumnLeft: 'Move column left', moveColumnRight: 'Move column right',
    alignLeft: 'Align left', alignCenter: 'Align center', alignRight: 'Align right', equalize: 'Distribute columns evenly', autoFit: 'Fit columns to content'
  },
  'zh-TW': {
    addRow: '在下方增加一列', deleteRow: '刪除目前列', moveRowUp: '目前列上移', moveRowDown: '目前列下移',
    addColumn: '在右側增加一欄', deleteColumn: '刪除目前欄', moveColumnLeft: '目前欄左移', moveColumnRight: '目前欄右移',
    alignLeft: '靠左對齊', alignCenter: '置中對齊', alignRight: '靠右對齊', equalize: '平均分配欄寬', autoFit: '依內容自動調整'
  }
} as const

type TableAction = keyof typeof tableText['zh-CN']

interface ButtonSpec {
  action: TableAction
  icon: string
  group?: 'row' | 'column' | 'align' | 'width'
}

const tableIcon = (content: string) => `<svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${content}</svg>`

const buttonSpecs: ButtonSpec[] = [
  { action: 'addRow', icon: tableIcon('<path d="M3 3.5h12v8H3zM3 7.5h12M9 11.5v4M7 13.5h4"/>'), group: 'row' },
  { action: 'deleteRow', icon: tableIcon('<path d="M3 3.5h12v8H3zM3 7.5h12M7 14h4"/>'), group: 'row' },
  { action: 'moveRowUp', icon: tableIcon('<path d="M3 4h12v10H3zM3 8h12M9 6V2.5M7.4 4.1 9 2.5l1.6 1.6"/>'), group: 'row' },
  { action: 'moveRowDown', icon: tableIcon('<path d="M3 4h12v10H3zM3 10h12M9 12v3.5M7.4 13.9 9 15.5l1.6-1.6"/>'), group: 'row' },
  { action: 'addColumn', icon: tableIcon('<path d="M3.5 3h8v12h-8zM7.5 3v12M11.5 9h4M13.5 7v4"/>'), group: 'column' },
  { action: 'deleteColumn', icon: tableIcon('<path d="M3.5 3h8v12h-8zM7.5 3v12M13 9h3"/>'), group: 'column' },
  { action: 'moveColumnLeft', icon: tableIcon('<path d="M4 3h10v12H4zM9 3v12M6.5 9H2.8M4.4 7.4 2.8 9l1.6 1.6"/>'), group: 'column' },
  { action: 'moveColumnRight', icon: tableIcon('<path d="M4 3h10v12H4zM9 3v12M11.5 9h3.7M13.6 7.4 15.2 9l-1.6 1.6"/>'), group: 'column' },
  { action: 'alignLeft', icon: tableIcon('<path d="M3 4h12M3 7.3h8M3 10.7h11M3 14h7"/>'), group: 'align' },
  { action: 'alignCenter', icon: tableIcon('<path d="M3 4h12M5 7.3h8M3.5 10.7h11M5.5 14h7"/>'), group: 'align' },
  { action: 'alignRight', icon: tableIcon('<path d="M3 4h12M7 7.3h8M4 10.7h11M8 14h7"/>'), group: 'align' },
  { action: 'equalize', icon: tableIcon('<path d="M3 3v12M15 3v12M6.2 9h5.6M7.8 7.4 6.2 9l1.6 1.6M10.2 7.4 11.8 9l-1.6 1.6"/>'), group: 'width' },
  { action: 'autoFit', icon: tableIcon('<path d="M3 4v10M15 4v10M6 9h6M7.5 7.5 6 9l1.5 1.5M10.5 7.5 12 9l-1.5 1.5"/>'), group: 'width' }
]

export class TableToolbar {
  private container: HTMLDivElement
  private currentTable: HTMLTableElement | null = null
  private currentCell: HTMLTableCellElement | null = null
  private language: Language

  constructor(private readonly editorRoot: HTMLElement, language: Language) {
    this.language = language
    this.container = document.createElement('div')
    this.container.className = 'table-toolbar'
    this.container.hidden = true
    this.container.setAttribute('role', 'toolbar')

    let previousGroup: ButtonSpec['group']
    for (const spec of buttonSpecs) {
      if (previousGroup && previousGroup !== spec.group) {
        const separator = document.createElement('span')
        separator.className = 'table-toolbar-separator'
        this.container.append(separator)
      }
      const button = document.createElement('button')
      button.type = 'button'
      button.dataset.tableAction = spec.action
      button.className = `table-tool table-tool-${spec.action}`
      button.innerHTML = spec.icon
      button.addEventListener('mousedown', (event) => event.preventDefault())
      button.addEventListener('click', () => this.run(spec.action))
      this.container.append(button)
      previousGroup = spec.group
    }
    document.body.append(this.container)
    this.setLanguage(language)

    for (const eventName of ['click', 'keyup', 'mouseup']) {
      this.editorRoot.addEventListener(eventName, () => window.setTimeout(() => this.update(), 0))
    }
    this.editorRoot.addEventListener('scroll', () => this.position(), { passive: true })
    window.addEventListener('resize', () => this.position())
    document.addEventListener('mousedown', (event) => {
      const target = event.target as HTMLElement
      if (!this.container.contains(target) && !this.editorRoot.contains(target)) this.hide()
    })
    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement
      if (!this.container.contains(target) && !this.editorRoot.contains(target)) this.hide()
    })
  }

  setLanguage(language: Language): void {
    this.language = language
    for (const button of this.container.querySelectorAll<HTMLButtonElement>('[data-table-action]')) {
      const action = button.dataset.tableAction as TableAction
      button.title = tableText[language][action]
      button.setAttribute('aria-label', button.title)
    }
  }

  hide(): void {
    this.container.hidden = true
    this.currentTable = null
    this.currentCell = null
  }

  update(): void {
    const view = getActiveEditorView()
    if (!view || !view.hasFocus()) {
      this.hide()
      return
    }
    const domAtSelection = view.domAtPos(view.state.selection.from).node
    const element = domAtSelection instanceof HTMLElement ? domAtSelection : domAtSelection.parentElement
    const cell = element?.closest<HTMLTableCellElement>('td, th') ?? null
    const table = cell?.closest<HTMLTableElement>('table') ?? null
    if (!cell || !table) {
      this.hide()
      return
    }
    this.currentCell = cell
    this.currentTable = table
    this.container.hidden = false
    this.updateMoveStates()
    this.position()
  }

  private position(): void {
    if (this.container.hidden || !this.currentTable) return
    const tableRect = this.currentTable.getBoundingClientRect()
    const toolbarRect = this.container.getBoundingClientRect()
    const left = Math.max(12, Math.min(window.innerWidth - toolbarRect.width - 12, tableRect.left))
    const above = tableRect.top - toolbarRect.height - 8
    const top = above >= 82 ? above : Math.min(window.innerHeight - toolbarRect.height - 12, tableRect.top + 8)
    this.container.style.left = `${Math.round(left)}px`
    this.container.style.top = `${Math.round(top)}px`
  }

  private updateMoveStates(): void {
    if (!this.currentCell || !this.currentTable) return
    const row = this.currentCell.parentElement as HTMLTableRowElement
    const rowIndex = row.rowIndex
    const columnIndex = this.currentCell.cellIndex
    const rowCount = this.currentTable.rows.length
    const columnCount = this.currentTable.rows[0]?.cells.length ?? 0
    this.setDisabled('moveRowUp', rowIndex <= 0)
    this.setDisabled('moveRowDown', rowIndex >= rowCount - 1)
    this.setDisabled('moveColumnLeft', columnIndex <= 0)
    this.setDisabled('moveColumnRight', columnIndex >= columnCount - 1)
    this.setDisabled('deleteRow', rowCount <= 2)
    this.setDisabled('deleteColumn', columnCount <= 1)
  }

  private setDisabled(action: TableAction, disabled: boolean): void {
    const button = this.container.querySelector<HTMLButtonElement>(`[data-table-action="${action}"]`)
    if (button) button.disabled = disabled
  }

  private run(action: TableAction): void {
    const view = getActiveEditorView()
    if (!view || !this.currentCell || !this.currentTable) return
    const rowIndex = (this.currentCell.parentElement as HTMLTableRowElement).rowIndex
    const columnIndex = this.currentCell.cellIndex
    let command: Command | null = null
    switch (action) {
      case 'addRow': command = addRowAfter; break
      case 'deleteRow': command = deleteRow; break
      case 'addColumn': command = addColumnAfter; break
      case 'deleteColumn': command = deleteColumn; break
      case 'moveRowUp': command = moveTableRow({ from: rowIndex, to: rowIndex - 1, select: false }); break
      case 'moveRowDown': command = moveTableRow({ from: rowIndex, to: rowIndex + 1, select: false }); break
      case 'moveColumnLeft': command = moveTableColumn({ from: columnIndex, to: columnIndex - 1, select: false }); break
      case 'moveColumnRight': command = moveTableColumn({ from: columnIndex, to: columnIndex + 1, select: false }); break
      case 'alignLeft': command = setCellAttr('alignment', 'left'); break
      case 'alignCenter': command = setCellAttr('alignment', 'center'); break
      case 'alignRight': command = setCellAttr('alignment', 'right'); break
      case 'equalize': this.setColumnWidths(true); return
      case 'autoFit': this.setColumnWidths(false); return
    }
    if (command) command(view.state, view.dispatch, view)
    view.focus()
    window.setTimeout(() => this.update(), 0)
  }

  private setColumnWidths(equalize: boolean): void {
    const view = getActiveEditorView()
    if (!view || !this.currentTable) return
    const $from = view.state.selection.$from
    let tableDepth = -1
    for (let depth = $from.depth; depth >= 0; depth -= 1) {
      if ($from.node(depth).type.spec.tableRole === 'table') {
        tableDepth = depth
        break
      }
    }
    if (tableDepth < 0) return
    const tableNode = $from.node(tableDepth)
    const tableStart = $from.before(tableDepth)
    const columnCount = TableMap.get(tableNode).width
    const available = Math.max(this.currentTable.parentElement?.clientWidth ?? 0, this.currentTable.clientWidth)
    const width = Math.max(88, Math.floor(available / Math.max(1, columnCount)))
    let transaction = view.state.tr
    tableNode.descendants((node, position) => {
      if (node.type.spec.tableRole !== 'cell' && node.type.spec.tableRole !== 'header_cell') return
      const colspan = Number(node.attrs.colspan) || 1
      transaction = transaction.setNodeMarkup(tableStart + 1 + position, undefined, {
        ...node.attrs,
        colwidth: equalize ? Array.from({ length: colspan }, () => width) : null
      })
    })
    view.dispatch(transaction)
    view.focus()
    window.setTimeout(() => this.update(), 0)
  }
}
