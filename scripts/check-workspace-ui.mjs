import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const source = {
  html: read('src/renderer/index.html'),
  entry: read('src/renderer/main.ts'),
  controller: read('src/renderer/workspace-controller.ts'),
  view: read('src/renderer/workspace-view.ts'),
  model: read('src/renderer/workspace-model.ts'),
  css: read('src/renderer/themes/base.css'),
  themes: read('src/renderer/themes/theme-manager.ts'),
  main: read('src/main/index.ts'),
  copy: read('src/main/application/localization.ts'),
  contracts: read('src/shared/contracts.ts'),
  editor: read('src/renderer/editor/markdown-editor.ts'),
  presentation: read('src/renderer/editor/markdown-presentation.ts'),
  findPanel: read('src/renderer/editor/find-replace-panel.ts'),
  findEngine: read('src/renderer/editor/find-replace-engine.ts'),
  sourceHighlights: read('src/renderer/editor/source-search-highlights.ts'),
  formulaDialog: read('src/renderer/editor/formula-dialog.ts'),
  formulaFormat: read('src/renderer/editor/formula-format.ts')
}

const failures = []
const expect = (condition, message) => {
  if (!condition) failures.push(message)
}
const containsAll = (text, values) => values.every((value) => text.includes(value))

expect(source.html.includes('<div id="app"></div>'), '渲染器 HTML 应只保留工作区挂载点')
expect(!source.html.includes('file-panel') && !source.html.includes('brand'), '静态 HTML 仍混入旧界面结构或品牌块')
expect(source.entry.includes('new WorkspaceController') && source.entry.split('\n').length < 20, '渲染器入口未收敛为独立控制器装配')
expect(source.entry.includes('platform-${window.electronAPI.platform}') && source.contracts.includes('platform: DesktopPlatform'), '渲染器缺少桌面平台标识')
expect(source.view.includes("platform === 'darwin' ? '⌘' : 'Ctrl'") && source.controller.includes('new WorkspaceView(root, api.platform)'), '快捷键提示没有适配 macOS Command 键')

for (const id of ['documents-tab', 'outline-tab', 'new-document-btn', 'open-document-btn', 'file-list', 'sidebar-resize-handle', 'sidebar-edge-toggle', 'current-document-name', 'quality-check-btn', 'preview-mode-btn', 'markdown-mode-btn', 'source-line-numbers']) {
  expect(source.view.includes(`id="${id}"`), `新工作区视图缺少 ${id}`)
}
expect(source.view.includes('if (documents.length > 1)'), '单文档状态仍可能显示关闭按钮')
expect(source.view.includes('text-overflow') || source.css.includes('.document-name { overflow: hidden;'), '长文件名没有省略保护')

expect(containsAll(source.controller, ['api.newDocument(this.snapshot())', 'api.openDocuments(this.snapshot())', 'api.activateDocument(id, this.snapshot())', 'api.closeDocument(id, this.snapshot())']), '多文档控制器未完整携带当前草稿快照')
expect(containsAll(source.controller, ['getActiveDocument()', 'setMode(\'markdown\')', 'updateLineNumbers()', 'saveImages(files']), '启动正文、源码行号或图片工作流缺失')
expect(!source.controller.includes('applyingUntil'), '编辑器仍用时间窗吞掉用户输入')
expect(source.contracts.includes("getActiveDocument: 'workspace:get-active-document'"), '启动时缺少当前正文 IPC')
expect(source.main.includes('channels.getActiveDocument'), '主进程没有提供当前正文 IPC')
expect(source.main.includes('focusedWorkspace() ?? [...workspaces.values()][0]') && source.main.includes('target.openPaths([path])'), 'Finder 连续打开文件时没有复用同一工作区')
expect(source.main.includes("accelerator: 'Cmd+Shift+W', role: 'close'") && source.main.includes("role: 'windowMenu'"), 'macOS 的文档关闭与窗口关闭快捷键冲突，或缺少标准窗口菜单')

expect(containsAll(source.model, ['countMarkdownWords', 'filterDocuments', 'normalizeSidebarWidth', 'presentDocumentState']), '工作区纯逻辑模型不完整')
expect(containsAll(source.controller, ['ResizeObserver', 'pointerdown', 'beiyemd-sidebar-width']), '侧栏拖拽、紧凑态或宽度持久化缺失')
expect(source.css.includes('top: 50%') && source.css.includes('.document-library:hover ~ .sidebar-edge-toggle'), '侧栏边缘吸附按钮没有在整条边缘悬停时出现')
expect(containsAll(source.css, ['body.platform-darwin .library-topline', '-webkit-app-region: drag', 'padding-left: 80px', 'body.platform-darwin:not(.show-file-panel) .document-bar']), 'macOS 窗口按钮避让或标题栏拖拽区域缺失')

for (const theme of ['theme-light', 'theme-dark', 'theme-mist', 'theme-sage', 'theme-graphite']) {
  expect(source.css.includes(`body.${theme}`), `缺少 ${theme} 主题令牌`)
  expect(source.themes.includes(theme), `主题管理器缺少 ${theme}`)
}
expect(source.css.includes('--canvas: #ffffff') && source.css.includes('--paper: #ffffff'), '浅色主题不是纯白画布')
expect(source.css.includes('--canvas: #000000') && source.css.includes('--paper: #000000'), '深色主题不是纯黑画布')
expect(containsAll(source.copy, ['雾蓝', 'Mist', '霧藍']), '雾蓝主题缺少三语名称')

expect(source.css.includes('width: min(1280px') && source.css.includes('caret-color: var(--text)'), '正文宽度或浅色光标策略未落地')
expect(containsAll(source.css, ['#source-editor {', 'width: 100%', 'white-space: pre-wrap', 'overflow-wrap: anywhere', 'overflow-x: hidden']), '源码区仍限制宽度或产生横向滚动')
expect(source.css.includes('#editor .ProseMirror table { width: max-content; max-width: 100%'), '表格列宽拖拽没有可见的宽度策略')
expect(containsAll(source.editor, ['insertImage(', 'writeColumnWidths(', 'readColumnWidths(']), 'Milkdown 适配器缺少图片或表格列宽能力')
expect(containsAll(source.presentation, ['beiye:image', 'beiye:columns']), '北页图片或表格元数据格式缺失')
expect(containsAll(source.findPanel, ['FindReplaceEngine', 'source-editor-shell', 'find-replace-panel']), '独立查找替换界面或源码模式适配缺失')
expect(containsAll(source.css, ['.search-match', '.search-match-current']), '查找结果缺少普通命中与当前命中的可见高亮')
expect(containsAll(source.view, ['source-search-layer', 'source-search-highlights']) && containsAll(source.findPanel, ['paintSourceHighlights', 'renderSourceSearchHighlights']) && containsAll(source.sourceHighlights, ['sourceSearchSegments', 'source-search-match-current']), '源码模式查找结果缺少持久高亮层')
expect(containsAll(source.css, ['body.sidebar-compact .library-tabs { flex: 0 1 auto', 'width: fit-content']) && containsAll(read('src/renderer/workspace-copy.ts'), ["documentsShort: 'Doc'", "outlineShort: 'TOC'"]), '紧凑侧栏标签仍不可辨认或保留多余空槽')
expect(containsAll(source.findEngine, ['replaceEvery', 'expandReplacement', 'invalid-expression']), '查找替换纯行为引擎不完整')
expect(containsAll(source.formulaDialog, ['formulaMarkdown', 'source-editor-shell', 'formula-dialog']), '独立公式对话框或源码模式适配缺失')
expect(source.formulaFormat.includes("block ? `\\n$$\\n${formula}\\n$$\\n`"), '公式 Markdown 序列化规则缺失')
expect(source.css.includes('.command-palette-result') && source.css.includes('width: 100%'), '快速打开结果没有统一整行宽度')
expect(source.view.includes('quality-check-label'), 'Markdown 检查仍缺少显性文字入口')
expect(containsAll(source.view, ['documentSaved', 'documentDirty', 'document-state-pencil']), '文档列表缺少已保存与有修改的 D 方案图标')
expect(source.view.includes('M4.5 2.75v14.5h4.5'), '有修改文档图标的左侧与底部轮廓不完整')
expect(source.css.includes('.document-state-pencil') && !source.css.includes('.document-marker {\n  display: grid;\n  place-items: center;\n  width: 21px;\n  height: 25px;\n  color: var(--faint);\n  border:'), '文档状态图标仍保留旧方框或缺少修改态铅笔样式')
expect(source.model.includes('isCompactSidebarWidth') && source.css.includes('.document-library {') && source.css.includes('overflow: hidden;'), '侧栏中间宽度缺少紧凑布局判定或防溢出边界')
expect(source.css.includes('#current-document-name:not(:disabled):hover') || source.css.includes('.document-name-editor:hover'), '文档标题缺少可修改的悬停提示')
expect(source.view.includes('document-rename-icon') && source.view.includes('M16.15 2.85') && source.css.includes(':hover .document-rename-icon'), '文档标题缺少左下笔尖的标准编辑图标')
expect(source.main.includes('openReferenceDocument') && source.contracts.includes('readOnly: boolean'), '内置参考资料尚未进入只读文档工作流')
expect(containsAll(source.main, ['referenceDocumentFileName', "settings.language"]), '内置参考资料没有按当前语言选择文件')
for (const path of ['resources/release-notes/latest.en.md', 'resources/release-notes/latest.zh-TW.md', 'resources/guides/markdown-handbook.en.md', 'resources/guides/markdown-handbook.zh-TW.md']) {
  expect(existsSync(resolve(root, path)), `缺少多语言内置资料：${path}`)
}
expect(!source.css.includes('#editor .ProseMirror table { width: max-content; min-width: 100%'), '表格仍被强制撑满并产生多余留白')

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'))
  process.exit(1)
}

console.log('BeiyeMD workspace contract passed')
