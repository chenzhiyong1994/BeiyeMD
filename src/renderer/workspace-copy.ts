import type { Language } from '../shared/contracts'

export const workspaceCopy = {
  'zh-CN': {
    documents: '文档', outline: '大纲', documentsShort: '文', outlineShort: '纲', sidebarViews: '侧栏视图',
    newDocument: '新建文档', openDocument: '打开文档', newHere: '在当前窗口新建文档', openHere: '在当前窗口打开文档',
    filter: '筛选已打开文档', clearFilter: '清除筛选', noMatches: '没有匹配的文档', openDocuments: '已打开文档',
    preview: '预览', markdown: '源码', markdownCheck: 'Markdown 检查', editorModes: '编辑模式', sourceLabel: 'Markdown 源码', reference: '参考资料',
    showSidebar: '显示文档列表', hideSidebar: '隐藏文档列表', resizeSidebar: '调整文档列表宽度',
    closeDocument: '关闭“{name}”', renameDocument: '重命名文档', renameFailed: '名称无效或存在同名文档',
    placeholder: '从这一页开始书写…', wordCount: '{count} 字', fileType: 'MARKDOWN',
    shortcuts: '快捷操作', quickOpen: '快速打开', findReplace: '查找替换', save: '保存文档', formula: '插入公式', close: '关闭',
    imageCancelled: '已取消插入图片', imagesAdded: '已添加 {count} 张图片'
  },
  en: {
    documents: 'Documents', outline: 'Outline', documentsShort: 'Doc', outlineShort: 'TOC', sidebarViews: 'Sidebar views',
    newDocument: 'New document', openDocument: 'Open document', newHere: 'Create a document in this window', openHere: 'Open documents in this window',
    filter: 'Filter open documents', clearFilter: 'Clear filter', noMatches: 'No matching documents', openDocuments: 'Open documents',
    preview: 'Preview', markdown: 'Source', markdownCheck: 'Markdown Check', editorModes: 'Editor mode', sourceLabel: 'Markdown source', reference: 'Reference',
    showSidebar: 'Show document list', hideSidebar: 'Hide document list', resizeSidebar: 'Resize document list',
    closeDocument: 'Close “{name}”', renameDocument: 'Rename document', renameFailed: 'That name is invalid or already exists',
    placeholder: 'Start writing this page…', wordCount: '{count} words', fileType: 'MARKDOWN',
    shortcuts: 'Shortcuts', quickOpen: 'Quick Open', findReplace: 'Find & Replace', save: 'Save Document', formula: 'Insert Formula', close: 'Close',
    imageCancelled: 'Image insertion was cancelled', imagesAdded: '{count} images added'
  },
  'zh-TW': {
    documents: '文件', outline: '大綱', documentsShort: '文', outlineShort: '綱', sidebarViews: '側欄檢視',
    newDocument: '新增文件', openDocument: '開啟文件', newHere: '在目前視窗新增文件', openHere: '在目前視窗開啟文件',
    filter: '篩選已開啟文件', clearFilter: '清除篩選', noMatches: '沒有符合的文件', openDocuments: '已開啟文件',
    preview: '預覽', markdown: '原始碼', markdownCheck: 'Markdown 檢查', editorModes: '編輯模式', sourceLabel: 'Markdown 原始碼', reference: '參考資料',
    showSidebar: '顯示文件列表', hideSidebar: '隱藏文件列表', resizeSidebar: '調整文件列表寬度',
    closeDocument: '關閉「{name}」', renameDocument: '重新命名文件', renameFailed: '名稱無效或已有同名文件',
    placeholder: '從這一頁開始書寫…', wordCount: '{count} 字', fileType: 'MARKDOWN',
    shortcuts: '快捷操作', quickOpen: '快速開啟', findReplace: '尋找與取代', save: '儲存文件', formula: '插入公式', close: '關閉',
    imageCancelled: '已取消插入圖片', imagesAdded: '已加入 {count} 張圖片'
  }
} as const satisfies Record<Language, Record<string, string>>

export type WorkspaceCopy = typeof workspaceCopy[Language]

export function copyFor(language: Language): WorkspaceCopy {
  return workspaceCopy[language]
}
