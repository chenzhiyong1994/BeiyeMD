# Recent Updates

## v1.1.4 · Remember each document's reading position

- Each open document remembers its own cursor and reading progress, restoring them when you return instead of inheriting another document's scroll position.
- Position restoration works in Preview and Source; first visits start at the top.
- Rapid Preview / Source changes and creating or closing documents preserve the correct position and source line numbers.
- Positions stay in the current window and are cleared when a document closes; unsaved drafts still survive document switches.

## v1.1.3 · Find result navigation

- Navigating search results in Preview and Source scrolls directly to the active match, including in long documents.
- Focus stays in the search panel for repeated Enter / Shift+Enter navigation and wrapping between the first and last results.
- Source navigation accounts for soft-wrapped lines, window resizing, and zero-width regular expression matches at the end of a document.
- Typing replacement text preserves the active result instead of resetting the highlight to the first match.

## v1.1.2 · Source fidelity and denser reading

- The first switch to Source preserves the original Markdown from disk instead of rewriting it through editor normalization.
- Blank lines deleted between list items no longer return after switching between Preview and Source.
- Tighter Source line spacing removes the visual impression of a blank row between every line.
- Denser spacing for Preview text, lists, headings, and blocks fits more readable content on a laptop screen.

## v1.1.1 · Editing refinements

- Freshly opened Markdown documents are no longer marked unsaved when the editor normalizes line endings.
- Switching between Preview and Source preserves cursor and reading progress instead of jumping to the end.
- Source view now has a clear, continuously visible vertical scrollbar.
- After installation on Windows, create a BeiyeMD Markdown document directly from Explorer's **New** menu.

## v1.1.0 · Windows and macOS

BeiyeMD now supports both Windows and macOS while staying focused on a lighter, faster way to read and edit local Markdown files. Separate Mac builds support Apple silicon and Intel processors without requiring an account or cloud service.

### New macOS support

- Download separate DMG packages for Apple silicon arm64 and Intel x64 Macs.
- Open Markdown files from Finder and collect consecutive opens in one workspace.
- Use Command-based shortcuts on Mac, with workspace spacing designed around the traffic-light window controls.
- Save, rename, image, PDF export, and live external-file refresh workflows remain consistent across platforms.

### Multi-document workspace

- Create, batch-open, switch between, and filter multiple Markdown documents in one window.
- Unsaved drafts survive document switches; the redundant close button disappears when only one document remains.
- Resize the sidebar by dragging, use compact labels at narrow widths, or reveal the edge-mounted collapse control on hover.
- Rename a document from its title and see save status and word count in the same header.

### Writing and review

- Use **Preview** for formatted writing and **Source** to inspect complete Markdown and fixed line numbers.
- The redesigned Find and Replace adds visible hit highlighting and active-result navigation, plus case sensitivity, whole-word matching, and regular expressions in both editor modes.
- The formula dialog supports Simplified Chinese, English, and Traditional Chinese, with inline and display formulas.
- Markdown Check covers heading order, duplicate headings, code fences, table column counts, trailing spaces, and missing local images.
- Resize table columns by dragging; pasted images retain their size and support drag resizing plus left, center, and right alignment.

### Visual system

- A wider writing canvas, lightweight document library, and consistent line icons keep the workspace focused.
- Choose from pure-white Light, pure-black Dark, Mist, Sage, and Graphite themes.
- The black-and-white app icon is tuned for application windows, installers, and small display sizes.

## Try these first

1. Select several Markdown files at once and switch between them in the same window.
2. Drag the sidebar edge and a table column boundary to see persistent widths.
3. Press `Ctrl+F` (`Command+F` on Mac) for Find and Replace, then switch to Source to verify line numbers.
4. Try inline and display formulas from **Edit → Insert Formula**.
5. Compare all five palettes from the **Theme** menu.
