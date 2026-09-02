<div align="center">
  <img src="resources/icon.png" width="104" alt="北页 LOGO">
  <h1>北页 · BeiyeMD</h1>
  <p><strong>一个更轻快的 Markdown 打开方式。</strong></p>
  <p>快速启动、专注轻巧的本地 Markdown 阅读与编辑器。</p>
  <p><strong>简体中文</strong> · <a href="README.md">English</a> · <a href="https://chenzhiyong1994.github.io/BeiyeMD/?lang=zh">项目主页</a></p>
  <p>
    <img src="https://img.shields.io/badge/许可证-MIT-111111" alt="MIT 许可证">
    <img src="https://img.shields.io/badge/Electron-34-47848F" alt="Electron 34">
    <img src="https://img.shields.io/badge/TypeScript-5-3178C6" alt="TypeScript 5">
    <img src="https://img.shields.io/badge/数据-本地优先-D85F42" alt="本地优先">
    <img src="https://img.shields.io/badge/版本-1.1.2-111111" alt="BeiyeMD 1.1.2">
    <img src="https://img.shields.io/github/v/release/chenzhiyong1994/BeiyeMD?display_name=tag&color=111111" alt="最新版本">
    <img src="https://img.shields.io/github/stars/chenzhiyong1994/BeiyeMD?style=flat&color=111111" alt="GitHub stars">
  </p>
</div>

![北页 1.1 多文档工作区](docs/screenshots/beiyemd-workspace.png)

<p align="center">
  <a href="https://github.com/chenzhiyong1994/BeiyeMD/releases/latest"><strong>下载 BeiyeMD 1.1.2（Windows / macOS）</strong></a>
  ·
  <a href="#从源码启动">从源码运行</a>
</p>

北页帮助你更轻快地查阅和编辑 Markdown 文件。快速打开本地文档，在一个专注轻巧的窗口里阅读排版、核对原文、管理多份文件；不要求导入，也不建立私有文档库。

## 1.1.2 · 源码保真与紧凑阅读

本次补丁让源码模式在预览切换前后保留原始 Markdown，避免编辑器规范化恢复已经删除的列表空行；同时收紧源码行距与预览正文、列表、标题等纵向节奏，让笔记本一屏看到更多内容。安装包与统一的 SHA-256 校验文件发布在 [GitHub Releases](https://github.com/chenzhiyong1994/BeiyeMD/releases/tag/v1.1.2)。

- **打开就能看，随手就能改**：不注册账号，不迁移文档，选择本地 Markdown 文件即可开始。
- **排版和源码不割裂**：预览模式看结构，源码模式用固定行号与查找高亮定位语法。
- **为多文档而生**：批量打开、快速切换、跨文档搜索和实时外部刷新都在一个窗口完成。
- **更自然的 Mac 体验**：支持 Finder 打开文件、`Command` 快捷键、红黄绿窗口按钮避让和多个文件进入同一工作区。

## 为什么做北页

| 原则 | 实际体验 |
| --- | --- |
| **文件始终属于你** | 本地 Markdown 文件是唯一事实来源，没有账号、云端锁定或隐藏数据库。 |
| **预览和源码同样重要** | 平时在干净的排版视图写作，需要排错时切到带固定行号的完整源码。 |
| **一个窗口管理多份文档** | 打开、筛选、改名、搜索和切换文件，不必让每篇笔记都占一个窗口。 |
| **与外部工具自然配合** | 其他编辑器或 AI 工作流修改文件后，北页会实时刷新。 |
| **功能出现得恰到好处** | 表格和图片工具只在选中内容时出现，其余时间保持安静。 |

## 功能亮点

- 多选打开、拖入文件、最近文档、`Ctrl/Cmd + P` 快速打开，以及跨文档正文搜索。
- 可拖拽调整的文档侧栏，窄态自动变为“文 / 纲”，支持标题大纲、长文件名省略，只有多文档时才显示关闭按钮。
- 默认预览编辑，随时切换完整 Markdown 源码；切换时保留光标与阅读进度，源码区提供固定行号、可见滚动条和软换行。
- 重新设计的查找替换，支持命中高亮、当前结果定位、大小写、全词、正则、单次替换和全部替换。
- Markdown 质量检查：标题跳级、重复标题、未闭合代码块、表格列数、尾随空格、强调标记和缺失本地图片。
- 表格列宽可直接拖拽，并随文档保存和恢复；同时支持增删、移动行列、对齐、等宽和按内容适配。
- 粘贴和拖入图片时保留原始像素尺寸，自动保存到文档旁的 `assets/`，使用可迁移的相对路径，并支持拖拽缩放和左中右对齐。
- GFM、待办列表、`==高亮==`、三语公式组件、PDF 导出和外部文件实时刷新。
- 五款协同主题：浅色、深色、雾蓝、灰绿、深灰；浅色为纯白，深色为纯黑。
- 默认简体中文，同时完整支持 English 与繁體中文。
- 内置“最近更新”和“Markdown 语法速查”以只读参考资料打开，关闭时不会出现保存提示。
- 安装 Windows 版后，可在文件夹空白处右键选择“新建 > BeiyeMD Markdown Document”直接创建 `.md` 文件。

## 清晰的窗口语义

| 操作入口 | 新建 | 打开 |
| --- | --- | --- |
| 应用顶部的**文件**菜单 | 创建新窗口 | 多选文件并放入一个新窗口 |
| 左侧文档栏 | 在当前窗口新增未命名文档 | 多选文件并加入当前窗口 |

这套规则始终一致：文档项的关闭按钮只关闭文档，系统窗口按钮才关闭窗口。

## 常用快捷键

| 操作 | 快捷键 |
| --- | --- |
| 快速打开 | `Ctrl/Cmd + P` |
| 查找替换 | `Ctrl/Cmd + F` |
| 保存 | `Ctrl/Cmd + S` |
| 插入公式 | `Ctrl/Cmd + Shift + E` |
| 显示 / 隐藏文档侧栏 | `Ctrl/Cmd + Shift + B` |

小白用户也可以从文档侧栏底部的“快捷操作”入口查看并直接执行。

## 下载

| 系统 | 适用设备 | 下载文件 |
| --- | --- | --- |
| Windows x64 | 常见的 64 位 Windows 电脑 | `BeiyeMD-Setup-1.1.2-Windows-x64.exe` |
| macOS arm64 | M1、M2、M3、M4 等 Apple 芯片 Mac | `BeiyeMD-1.1.2-mac-arm64.dmg` |
| macOS x64 | Intel 芯片 Mac | `BeiyeMD-1.1.2-mac-x64.dmg` |

请从 [GitHub Releases](https://github.com/chenzhiyong1994/BeiyeMD/releases/latest) 下载，并使用同页的 `SHA256SUMS.txt` 核对文件。Windows 社区构建暂未进行商业代码签名，SmartScreen 可能要求二次确认；macOS 构建采用临时签名，**未经 Apple 公证**，首次打开时系统可能拦截。确认文件来自本项目官方 GitHub 且校验值一致后，可按 [macOS 安装与安全提示](docs/macos-installation.md) 操作。

## 从源码启动

需要 Node.js 22.12 或更高版本。

```bash
git clone https://github.com/chenzhiyong1994/BeiyeMD.git
cd BeiyeMD
npm ci
npm run dev
```

构建生产代码，或生成当前平台安装包：

```bash
npm run build
npm run dist
```

## 验证

```bash
npm run check:workspace-ui
npm test
npm run legal:notices
npx tsc -p tsconfig.main.json --noEmit
npx tsc -p tsconfig.preload.json --noEmit
npx tsc -p tsconfig.renderer.json --noEmit
npm run build
```

## 项目边界

北页刻意保持为本地桌面编辑器，不提供账号、云同步、协作编辑、知识库数据库、Slides 或隐藏版本历史。目标不是把文件收进另一套系统，而是把基于文件的 Markdown 工作流做到足够顺手。

## 参与贡献

欢迎提交 Issue 和边界清晰的 Pull Request。请说明要改善的用户工作流，保持不同平台上的行为一致，并在提交前运行上方验证命令。

## 许可与致谢

北页自身采用 [MIT License](LICENSE)。Milkdown、Electron、KaTeX 等独立开源组件的许可证原文由锁定依赖自动汇总在 [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt)；Electron 随附的 Chromium / Node 许可集合见 [ELECTRON_THIRD_PARTY_NOTICES.html](ELECTRON_THIRD_PARTY_NOTICES.html)。两份文件都会随安装包分发。
