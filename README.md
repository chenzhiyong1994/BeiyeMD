<div align="center">
  <img src="resources/icon.png" width="104" alt="BeiyeMD logo">
  <h1>BeiyeMD · 北页</h1>
  <p><strong>A lighter, faster way to open Markdown.</strong></p>
  <p>A quick-launching local Markdown reader and editor that stays focused on the file.</p>
  <p><strong>English</strong> · <a href="README_CN.md">简体中文</a> · <a href="https://chenzhiyong1994.github.io/BeiyeMD/?lang=en">Project website</a></p>
  <p>
    <img src="https://img.shields.io/badge/license-MIT-111111" alt="MIT license">
    <img src="https://img.shields.io/badge/Electron-34-47848F" alt="Electron 34">
    <img src="https://img.shields.io/badge/TypeScript-5-3178C6" alt="TypeScript 5">
    <img src="https://img.shields.io/badge/data-local--first-D85F42" alt="Local-first">
    <img src="https://img.shields.io/badge/version-1.1.3-111111" alt="BeiyeMD 1.1.3">
    <img src="https://img.shields.io/github/v/release/chenzhiyong1994/BeiyeMD?display_name=tag&color=111111" alt="Latest release">
    <img src="https://img.shields.io/github/stars/chenzhiyong1994/BeiyeMD?style=flat&color=111111" alt="GitHub stars">
  </p>
</div>

![BeiyeMD 1.1 multi-document workspace](docs/screenshots/beiyemd-workspace.png)

<p align="center">
  <a href="https://chenzhiyong1994.github.io/BeiyeMD/?lang=en"><strong>Visit the project website</strong></a>
  ·
  <a href="https://github.com/chenzhiyong1994/BeiyeMD/releases/latest"><strong>Download BeiyeMD 1.1.3 for Windows or macOS</strong></a>
  ·
  <a href="#run-from-source">Run from source</a>
</p>

BeiyeMD helps you read and edit Markdown with less waiting and less clutter. Open local documents quickly, review the formatted page, check the original text, and manage multiple files in one focused window—no import step or proprietary document library required.

## Project website

[Visit the BeiyeMD website](https://chenzhiyong1994.github.io/BeiyeMD/?lang=en) for workspace screenshots, features, and downloads for Windows, Apple silicon Macs, and Intel Macs. The site supports English and Chinese, with full screenshots and installation guidance available on mobile.

The site is hosted on **GitHub Pages**, with its source in `docs/index.html`, `docs/home.css`, and `docs/home.js`. Changes to `docs/` on `main` are published by the [website deployment workflow](.github/workflows/pages.yml); **Deploy project website** can also be run manually from Actions. Set Settings → Pages → Source to **GitHub Actions**. To preview locally, run `python -m http.server 4173 --bind 127.0.0.1 --directory docs` and open `http://127.0.0.1:4173`. When publishing a new app version, update the site's version labels, installer links, and checksum link together.

## Version 1.1.3 · Find result navigation

Find and Replace now scrolls to the active result in both Preview and Source, making matches easy to locate in long documents. Search focus stays in the panel for repeated Enter / Shift+Enter navigation, and typing replacement text keeps the current result selected. Installers and one SHA-256 checksum file are published on [GitHub Releases](https://github.com/chenzhiyong1994/BeiyeMD/releases/tag/v1.1.3).

- **Open, read, and make a quick edit** — no account, migration, or proprietary library.
- **Review layout and syntax** — Preview reveals the reading experience; Source adds fixed line numbers and search highlighting.
- **Stay in one workspace** — batch open, switch, search across documents, and receive live external updates.
- **Feel at home on a Mac** — open from Finder, use Command shortcuts, keep clear of the traffic-light controls, and collect several files in one workspace.

## Why BeiyeMD

| Principle | What it means in practice |
| --- | --- |
| **Files stay yours** | Local Markdown files are the source of truth. There are no accounts, cloud lock-in, or hidden document databases. |
| **Preview and source are peers** | Write in a clean rendered view, then switch to line-numbered Markdown when syntax needs inspection. |
| **One window, many documents** | Open, filter, rename, search, and switch files without turning every note into another app window. |
| **Friendly to external tools** | File changes made by another editor or an AI workflow are reflected live. |
| **Useful editing, restrained UI** | Table and image tools appear only when their content is selected; the rest of the workspace stays quiet. |

## Highlights

- Multi-select Open, drag-and-drop, recent documents, `Ctrl/Cmd + P` Quick Open, and cross-document content search.
- Each open document in a window remembers its own cursor and reading progress when switching documents; first visits start at the top.
- Resizable document sidebar with compact `Doc / TOC` states, heading outline, filename ellipsis, and close controls only when they are useful.
- Preview-first editing plus complete Markdown source, preserved cursor/reading progress between modes, soft wrapping, fixed line numbers, and a visible source scrollbar.
- Find and Replace highlights matches and automatically scrolls to the active result in preview and source modes while keeping focus in the search panel. Includes case, whole-word, regular-expression, replace-one, and replace-all controls.
- Markdown quality checks for heading jumps, duplicate headings, unclosed fences, uneven tables, trailing whitespace, unmatched emphasis, and missing local images.
- Persistent drag-to-resize table columns, plus row/column movement, alignment, equal-width, and content-fit actions.
- Pasted and dropped images keep their natural pixel size, save beside the document in `assets/`, use portable relative links, and support drag resizing and left/center/right alignment.
- GFM, task lists, `==highlight==`, localized LaTeX formula insertion, PDF export, and live external-file refresh.
- Five coordinated themes: Light, Dark, Mist, Sage, and Graphite. Light is true white; Dark is true black.
- Simplified Chinese by default, with complete English and Traditional Chinese UI translations.
- Built-in release notes and the Markdown handbook open as read-only references and close without save prompts.
- After installing on Windows, use **New > BeiyeMD Markdown Document** from a folder's context menu to create a `.md` file directly.

## Predictable window behavior

| Entry point | New | Open |
| --- | --- | --- |
| Application **File** menu | Creates a new window | Multi-selects files into a new window |
| Sidebar actions | Adds an untitled document here | Multi-selects files into this window |

This distinction stays consistent: a document close button closes a document, while the system window control closes the window.

## Keyboard map

| Action | Shortcut |
| --- | --- |
| Quick Open | `Ctrl/Cmd + P` |
| Find and Replace | `Ctrl/Cmd + F` |
| Save | `Ctrl/Cmd + S` |
| Insert formula | `Ctrl/Cmd + Shift + E` |
| Toggle document sidebar | `Ctrl/Cmd + Shift + B` |

The same shortcuts are discoverable from the footer of the document sidebar.

## Download

| System | Device | Download |
| --- | --- | --- |
| Windows x64 | Most 64-bit Windows PCs | `BeiyeMD-Setup-1.1.3-Windows-x64.exe` |
| macOS arm64 | Macs with Apple silicon (M1, M2, M3, M4, and later) | `BeiyeMD-1.1.3-mac-arm64.dmg` |
| macOS x64 | Intel-based Macs | `BeiyeMD-1.1.3-mac-x64.dmg` |

Download from [GitHub Releases](https://github.com/chenzhiyong1994/BeiyeMD/releases/latest) and compare the file with `SHA256SUMS.txt` on the same page. The Windows community build is not commercially code-signed, so SmartScreen may ask for confirmation. The macOS build uses an ad-hoc signature and is **not notarized by Apple**, so macOS may block the first launch. Only proceed when the download came from this official repository and its checksum matches; see [macOS installation and safety](docs/macos-installation.md).

## Run from source

Node.js 22.12 or later is required.

```bash
git clone https://github.com/chenzhiyong1994/BeiyeMD.git
cd BeiyeMD
npm ci
npm run dev
```

Build the production app or create a package for the current platform:

```bash
npm run build
npm run dist
```

## Validation

```bash
npm run check:workspace-ui
npm test
npm run legal:notices
npx tsc -p tsconfig.main.json --noEmit
npx tsc -p tsconfig.preload.json --noEmit
npx tsc -p tsconfig.renderer.json --noEmit
npm run build
npm run check:find-replace-ui
```

The UI regression check covers find navigation, per-document positions, Preview / Source switching, new and closed documents, saving, and languages.

## Project scope

BeiyeMD is intentionally a local desktop editor. Accounts, cloud sync, collaborative editing, knowledge-base databases, slide tooling, and hidden version history are out of scope. The goal is to make file-based Markdown work exceptionally well.

## Contributing

Issues and focused pull requests are welcome. Please describe the user workflow being improved, keep platform behavior consistent, and run the validation commands above before submitting a change.

## License and acknowledgements

BeiyeMD itself is available under the [MIT License](LICENSE). License texts for independent open-source components such as Milkdown, Electron, and KaTeX are generated from the locked dependency tree in [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt). Electron's bundled Chromium / Node notices are preserved in [ELECTRON_THIRD_PARTY_NOTICES.html](ELECTRON_THIRD_PARTY_NOTICES.html); both files ship with application packages.
