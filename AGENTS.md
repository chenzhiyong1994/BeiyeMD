# BeiyeMD 项目规则

## 项目目的

北页（BeiyeMD）是一款基于 Electron、TypeScript 与 Milkdown 的本地多文档 Markdown 编辑器。它在同一窗口中提供所见即所得预览、完整 Markdown 源码、文档切换和外部文件实时同步。

## 核心约束

- 本地文件系统是文档的唯一事实来源；不引入账号、云同步或协作编辑。
- 顶部“新建 / 打开”创建新窗口；侧栏“新建 / 打开”只影响当前窗口。
- 每个窗口可同时管理多份文档；切换文档不得丢失未保存草稿。
- 预览模式为默认编辑模式，源码模式必须展示并编辑完整 Markdown 文本。
- 菜单和界面默认简体中文，并支持 English 与繁體中文。
- 外部程序修改已打开文件时，应继续保持实时刷新能力。
- 不恢复 Slides 的新建、预览、导入或导出功能。

## 任务路由

- 窗口、文档集合、文件 I/O、菜单和监听：`src/main/index.ts`
- 安全 IPC 契约：`src/preload/index.ts`
- 多文档界面、语言与模式切换：`src/renderer/main.ts`
- Milkdown 编辑器能力：`src/renderer/editor/`
- 布局和内置主题：`src/renderer/themes/`
- 打包身份与平台配置：`electron-builder.yml`
- 用户能力和开发入口：`README_CN.md`、`README.md`

## 最小验证

```bash
npx tsc -p tsconfig.main.json --noEmit
npx tsc -p tsconfig.preload.json --noEmit
npx tsc -p tsconfig.renderer.json --noEmit
npm run build
```

涉及窗口交互时，还需运行开发版检查新窗口、多选打开、侧栏切换、预览 / 源码、保存与语言切换。
