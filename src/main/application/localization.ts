import type { Language } from '../../shared/contracts'
import type { WorkspaceCopy } from '../electron/window-workspace'

export interface ApplicationCopy extends WorkspaceCopy {
  app: string
  file: string
  edit: string
  view: string
  theme: string
  language: string
  window: string
  help: string
  newWindow: string
  openWindow: string
  quickOpen: string
  closeDocument: string
  save: string
  saveAs: string
  exportPdf: string
  close: string
  quit: string
  hide: string
  hideOthers: string
  unhide: string
  undo: string
  redo: string
  cut: string
  copy: string
  paste: string
  selectAll: string
  find: string
  insertFormula: string
  resetZoom: string
  zoomIn: string
  zoomOut: string
  toggleFiles: string
  fullscreen: string
  light: string
  dark: string
  mist: string
  sage: string
  graphite: string
  recentUpdates: string
  cheatsheet: string
  about: string
  aboutText: string
}

export const copy: Record<Language, ApplicationCopy> = {
  'zh-CN': {
    app: '北页', file: '文件', edit: '编辑', view: '视图', theme: '主题', language: '语言', window: '窗口', help: '帮助',
    newWindow: '新建窗口', openWindow: '在新窗口打开…', quickOpen: '快速打开…', closeDocument: '关闭当前文档',
    save: '保存', saveAs: '另存为…', exportPdf: '导出 PDF…', close: '关闭窗口', quit: '退出', hide: '隐藏北页', hideOthers: '隐藏其他应用', unhide: '全部显示',
    undo: '撤销', redo: '重做', cut: '剪切', copy: '复制', paste: '粘贴', selectAll: '全选', find: '查找', insertFormula: '插入公式',
    resetZoom: '实际大小', zoomIn: '放大', zoomOut: '缩小', toggleFiles: '显示 / 隐藏文档列表', fullscreen: '切换全屏',
    light: '浅色', dark: '深色', mist: '雾蓝', sage: '灰绿', graphite: '深灰', recentUpdates: '最近更新', cheatsheet: 'Markdown 语法速查', about: '关于北页',
    aboutText: '北页（BeiyeMD）\n专注、轻量的本地多文档 Markdown 编辑器。', untitled: '未命名.md', markdownDocuments: 'Markdown 文档', allFiles: '所有文件', saveDocument: '保存文档',
    unsavedDocumentTitle: '保存后关闭？', unsavedDocumentDetail: '当前文档包含尚未保存的修改。', unsavedWindowTitle: '有未保存的文档', unsavedWindowDetail: '关闭窗口将丢失其中未保存的修改。',
    saveAndClose: '保存并关闭', discard: '放弃修改', cancel: '取消'
  },
  en: {
    app: 'BeiyeMD', file: 'File', edit: 'Edit', view: 'View', theme: 'Theme', language: 'Language', window: 'Window', help: 'Help',
    newWindow: 'New Window', openWindow: 'Open in New Window…', quickOpen: 'Quick Open…', closeDocument: 'Close Current Document',
    save: 'Save', saveAs: 'Save As…', exportPdf: 'Export PDF…', close: 'Close Window', quit: 'Quit', hide: 'Hide BeiyeMD', hideOthers: 'Hide Others', unhide: 'Show All',
    undo: 'Undo', redo: 'Redo', cut: 'Cut', copy: 'Copy', paste: 'Paste', selectAll: 'Select All', find: 'Find', insertFormula: 'Insert Formula',
    resetZoom: 'Actual Size', zoomIn: 'Zoom In', zoomOut: 'Zoom Out', toggleFiles: 'Show / Hide Document List', fullscreen: 'Toggle Full Screen',
    light: 'Light', dark: 'Dark', mist: 'Mist', sage: 'Sage', graphite: 'Graphite', recentUpdates: 'Recent Updates', cheatsheet: 'Markdown Cheatsheet', about: 'About BeiyeMD',
    aboutText: 'BeiyeMD（北页）\nA focused, lightweight local multi-document Markdown editor.', untitled: 'Untitled.md', markdownDocuments: 'Markdown Documents', allFiles: 'All Files', saveDocument: 'Save Document',
    unsavedDocumentTitle: 'Save before closing?', unsavedDocumentDetail: 'This document contains unsaved changes.', unsavedWindowTitle: 'Unsaved documents', unsavedWindowDetail: 'Closing this window will discard its unsaved changes.',
    saveAndClose: 'Save & Close', discard: 'Discard Changes', cancel: 'Cancel'
  },
  'zh-TW': {
    app: '北頁', file: '檔案', edit: '編輯', view: '檢視', theme: '主題', language: '語言', window: '視窗', help: '說明',
    newWindow: '新增視窗', openWindow: '在新視窗開啟…', quickOpen: '快速開啟…', closeDocument: '關閉目前文件',
    save: '儲存', saveAs: '另存新檔…', exportPdf: '匯出 PDF…', close: '關閉視窗', quit: '結束', hide: '隱藏北頁', hideOthers: '隱藏其他應用程式', unhide: '全部顯示',
    undo: '復原', redo: '重做', cut: '剪下', copy: '複製', paste: '貼上', selectAll: '全選', find: '尋找', insertFormula: '插入公式',
    resetZoom: '實際大小', zoomIn: '放大', zoomOut: '縮小', toggleFiles: '顯示 / 隱藏文件列表', fullscreen: '切換全螢幕',
    light: '淺色', dark: '深色', mist: '霧藍', sage: '灰綠', graphite: '深灰', recentUpdates: '最近更新', cheatsheet: 'Markdown 語法速查', about: '關於北頁',
    aboutText: '北頁（BeiyeMD）\n專注、輕量的本機多文件 Markdown 編輯器。', untitled: '未命名.md', markdownDocuments: 'Markdown 文件', allFiles: '所有檔案', saveDocument: '儲存文件',
    unsavedDocumentTitle: '儲存後關閉？', unsavedDocumentDetail: '目前文件包含尚未儲存的變更。', unsavedWindowTitle: '有未儲存的文件', unsavedWindowDetail: '關閉視窗將捨棄其中未儲存的變更。',
    saveAndClose: '儲存並關閉', discard: '捨棄變更', cancel: '取消'
  }
}
