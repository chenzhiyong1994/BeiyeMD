# Markdown Writing Handbook

This handbook is organized around three goals: write clearly, revise safely, and deliver without formatting surprises. Draft in **Preview**, then switch to **Source** to inspect the original Markdown and line numbers.

> Tip: outline the document with headings first, fill in each section, and finish with **Markdown Check** in the upper-right corner.

---

## 1. Build the document structure first

```markdown
# Document title
## Background and goals
### Current problem
### Expected outcome
## Proposal
## Next steps
```

- A document should normally have only one level-one heading.
- Move through heading levels in order; avoid jumping from `##` directly to `####`.
- Put one space between the `#` markers and heading text.

## 2. Paragraphs, line breaks, and dividers

Leave one blank line between paragraphs so both the source and rendered page remain easy to scan.

```markdown
This is the first paragraph.

This is the second paragraph.

---

A new section after the divider.
```

BeiyeMD displays natural line breaks. When other tools render line breaks differently, blank lines are the most reliable way to separate paragraphs.

## 3. Emphasis

| Purpose | Markdown | Result |
| --- | --- | --- |
| Important conclusion | `**bold**` | **Needs confirmation** |
| Light emphasis | `*italic*` | *Additional context* |
| Obsolete content | `~~strikethrough~~` | ~~Old proposal~~ |
| Needs attention | `==highlight==` | ==Risk item== |
| Command or field | `` `inline code` `` | `npm run dev` |

To show Markdown punctuation literally, prefix it with a backslash, for example `\*not italic\*`.

## 4. Lists and tasks

```markdown
- Unordered item
  - Nested item

1. First step
2. Second step

- [ ] To do
- [x] Done
```

In Preview, task boxes are clickable. With the caret on a task line, press `Ctrl+Enter` (`⌘+Enter` on macOS) to toggle it.

## 5. Blockquotes

```markdown
> The first paragraph of a quote.
>
> Quotes may also contain **emphasis**, lists, and links.
```

When quoting an external source, add the source and relevant context immediately afterward so the excerpt is not misleading.

## 6. Links and images

```markdown
[Project homepage](https://github.com/chenzhiyong1994/BeiyeMD)

![Workspace overview](assets/workspace.png)
```

- Use complete `https://` addresses for web links.
- Keep local images in an `assets` folder beside the document and use relative paths.
- Write meaningful alt text; it explains the missing content if an image cannot load.
- In Preview, hold `Ctrl` (`⌘` on macOS) while clicking a link to open it in the browser.
- Select an image to adjust its width and left, center, or right alignment from the floating toolbar.

## 7. Code

Use inline code for short commands such as `npm run dev`.

Use fenced blocks for multiple lines and specify the language:

```javascript
function greet(name) {
  return `Hello, ${name}`
}
```

Common language identifiers include `javascript`, `typescript`, `json`, `bash`, and `css`. Both the opening and closing fence require three backticks.

## 8. Tables

```markdown
| Item | Status | Owner |
| :--- | :---: | ---: |
| Editing experience | In progress | Alex |
| Release preparation | Not started | Taylor |
```

The separator row controls alignment: `:---` for left, `:---:` for center, and `---:` for right.

Select a table in Preview to open its floating toolbar for adding, removing, or moving rows and columns. Drag a column boundary to resize it; BeiyeMD stores the width with the document.

## 9. Math

Wrap inline math in single dollar signs: `$E = mc^2$`.

Use double dollar signs for a display formula:

```markdown
$$
f(x) = \sum_{i=1}^{n} x_i
$$
```

You can also open the multilingual formula dialog from **Edit → Insert Formula**.

## 10. Escaping and common mistakes

These characters have special meaning at the beginning of a line or when paired:

```markdown
\# Not a heading
\- Not a list
\> Not a quote
\[Not a link\]
```

If formatting looks wrong, check these in order:

1. Are paired markers such as `**`, `~~`, and backticks closed?
2. Is there a space after heading and list markers?
3. Is there a blank line between paragraphs?
4. Does every table row have the same number of columns?
5. Is the local image path correct, including filename capitalization?
6. Does every code fence have a matching closing fence?

## 11. Reusable starter template

```markdown
# Document title

Explain in two or three sentences what the document solves and who it is for.

## Background

Provide only the context readers need.

## Goals

- [ ] Verifiable goal one
- [ ] Verifiable goal two

## Proposal

### Topic one

Content…

### Topic two

Content…

## Conclusion and next steps

1. State the decision clearly.
2. Record the owner and date.
```

---

Before delivery, switch to **Source** to inspect punctuation and line numbers, then run **Markdown Check** for headings, fences, tables, and local images.
