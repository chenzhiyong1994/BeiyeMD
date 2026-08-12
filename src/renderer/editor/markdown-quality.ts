import type { Language } from '../../preload/index'
import { extractOutline } from './outline-panel'

export type QualitySeverity = 'warning' | 'notice'

export interface QualityIssue {
  id: string
  severity: QualitySeverity
  line: number
  column: number
  title: string
  detail: string
}

export interface LocalImageReference {
  source: string
  line: number
  column: number
}

const qualityText = {
  'zh-CN': {
    headingJump: '标题层级跳跃', headingJumpDetail: '从 H{from} 直接跳到了 H{to}，建议补齐中间层级。',
    duplicateHeading: '重复标题', duplicateHeadingDetail: '标题“{title}”在文档中重复出现，锚点可能不够明确。',
    unclosedFence: '代码块未闭合', unclosedFenceDetail: '这个代码块缺少结束标记。',
    unevenTable: '表格列数不一致', unevenTableDetail: '这一行有 {actual} 列，表头定义了 {expected} 列。',
    trailingSpace: '多余的行尾空格', trailingSpaceDetail: '删除多余空格；Markdown 强制换行应恰好使用两个空格。',
    unclosedStrong: '粗体标记可能未闭合', unclosedStrongDetail: '文档中的 ** 标记数量不成对。',
    brokenImage: '图片文件不存在', brokenImageDetail: '找不到本地图片：{source}'
  },
  en: {
    headingJump: 'Skipped heading level', headingJumpDetail: 'Heading level jumps from H{from} to H{to}. Consider adding the missing level.',
    duplicateHeading: 'Duplicate heading', duplicateHeadingDetail: '“{title}” appears more than once, which may create ambiguous anchors.',
    unclosedFence: 'Unclosed code fence', unclosedFenceDetail: 'This fenced code block has no closing marker.',
    unevenTable: 'Uneven table columns', unevenTableDetail: 'This row has {actual} columns; the table header defines {expected}.',
    trailingSpace: 'Extra trailing spaces', trailingSpaceDetail: 'Remove extra spaces; a Markdown hard break should use exactly two spaces.',
    unclosedStrong: 'Bold marker may be unclosed', unclosedStrongDetail: 'The document contains an unmatched ** marker.',
    brokenImage: 'Image file is missing', brokenImageDetail: 'Cannot find local image: {source}'
  },
  'zh-TW': {
    headingJump: '標題層級跳躍', headingJumpDetail: '從 H{from} 直接跳到了 H{to}，建議補齊中間層級。',
    duplicateHeading: '重複標題', duplicateHeadingDetail: '標題「{title}」在文件中重複出現，錨點可能不夠明確。',
    unclosedFence: '程式碼區塊未閉合', unclosedFenceDetail: '這個程式碼區塊缺少結束標記。',
    unevenTable: '表格欄數不一致', unevenTableDetail: '這一列有 {actual} 欄，表頭定義了 {expected} 欄。',
    trailingSpace: '多餘的行尾空格', trailingSpaceDetail: '刪除多餘空格；Markdown 強制換行應恰好使用兩個空格。',
    unclosedStrong: '粗體標記可能未閉合', unclosedStrongDetail: '文件中的 ** 標記數量不成對。',
    brokenImage: '圖片檔案不存在', brokenImageDetail: '找不到本機圖片：{source}'
  }
} as const

function format(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce((result, [key, value]) => result.replaceAll(`{${key}}`, String(value)), template)
}

function countTableCells(line: string): number {
  const trimmed = line.trim().replace(/^\||\|$/g, '')
  let count = 1
  let escaped = false
  let inCode = false
  for (const char of trimmed) {
    if (escaped) {
      escaped = false
      continue
    }
    if (char === '\\') {
      escaped = true
      continue
    }
    if (char === '`') inCode = !inCode
    else if (char === '|' && !inCode) count += 1
  }
  return count
}

function isTableSeparator(line: string): boolean {
  const cells = line.trim().replace(/^\||\|$/g, '').split('|')
  return cells.length > 1 && cells.every((cell) => /^\s*:?-{3,}:?\s*$/.test(cell))
}

export function findLocalImageReferences(markdown: string): LocalImageReference[] {
  const references: LocalImageReference[] = []
  markdown.split('\n').forEach((line, lineIndex) => {
    const regex = /!\[[^\]]*\]\((<[^>]+>|[^\s)]+)(?:\s+['"][^)]*['"])?\)/g
    let match: RegExpExecArray | null
    while ((match = regex.exec(line)) !== null) {
      const source = match[1].replace(/^<|>$/g, '')
      if (!/^(?:https?:|data:|blob:)/i.test(source)) {
        references.push({ source, line: lineIndex + 1, column: match.index + 1 })
      }
    }
  })
  return references
}

export function analyzeMarkdown(markdown: string, language: Language, assetStatus: Record<string, boolean> = {}): QualityIssue[] {
  const text = qualityText[language]
  const lines = markdown.split('\n')
  const issues: QualityIssue[] = []
  const headings = extractOutline(markdown)

  for (let index = 1; index < headings.length; index += 1) {
    const previous = headings[index - 1]
    const heading = headings[index]
    if (heading.level > previous.level + 1) {
      issues.push({
        id: `heading-jump-${heading.line}`, severity: 'warning', line: heading.line, column: 1,
        title: text.headingJump,
        detail: format(text.headingJumpDetail, { from: previous.level, to: heading.level })
      })
    }
  }

  const headingOccurrences = new Map<string, typeof headings>()
  for (const heading of headings) {
    const key = heading.text.normalize('NFKC').trim().toLocaleLowerCase()
    const occurrences = headingOccurrences.get(key) ?? []
    occurrences.push(heading)
    headingOccurrences.set(key, occurrences)
  }
  for (const occurrences of headingOccurrences.values()) {
    if (occurrences.length < 2) continue
    for (const heading of occurrences.slice(1)) {
      issues.push({
        id: `duplicate-heading-${heading.line}`, severity: 'notice', line: heading.line, column: 1,
        title: text.duplicateHeading,
        detail: format(text.duplicateHeadingDetail, { title: heading.text })
      })
    }
  }

  let openFence: { marker: string; line: number } | null = null
  let strongMarkerCount = 0
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const fence = line.match(/^\s*(`{3,}|~{3,})/)
    if (fence) {
      if (!openFence) openFence = { marker: fence[1][0], line: index + 1 }
      else if (fence[1][0] === openFence.marker) openFence = null
      continue
    }
    if (openFence) continue

    const trailing = line.match(/[ \t]+$/)?.[0]
    if (trailing && trailing !== '  ') {
      issues.push({
        id: `trailing-space-${index + 1}`, severity: 'notice', line: index + 1, column: line.length - trailing.length + 1,
        title: text.trailingSpace, detail: text.trailingSpaceDetail
      })
    }
    const withoutInlineCode = line.replace(/`[^`]*`/g, '')
    strongMarkerCount += withoutInlineCode.match(/(?<!\\)\*\*/g)?.length ?? 0
  }
  if (openFence) {
    issues.push({
      id: `unclosed-fence-${openFence.line}`, severity: 'warning', line: openFence.line, column: 1,
      title: text.unclosedFence, detail: text.unclosedFenceDetail
    })
  }
  if (strongMarkerCount % 2 !== 0) {
    const line = lines.findIndex((item) => /(?<!\\)\*\*/.test(item)) + 1
    issues.push({
      id: `unclosed-strong-${line}`, severity: 'warning', line: Math.max(1, line), column: 1,
      title: text.unclosedStrong, detail: text.unclosedStrongDetail
    })
  }

  for (let index = 1; index < lines.length; index += 1) {
    if (!isTableSeparator(lines[index])) continue
    const expected = countTableCells(lines[index - 1])
    let row = index + 1
    while (row < lines.length && lines[row].includes('|') && lines[row].trim()) {
      const actual = countTableCells(lines[row])
      if (actual !== expected) {
        issues.push({
          id: `uneven-table-${row + 1}`, severity: 'warning', line: row + 1, column: 1,
          title: text.unevenTable,
          detail: format(text.unevenTableDetail, { actual, expected })
        })
      }
      row += 1
    }
  }

  for (const image of findLocalImageReferences(markdown)) {
    if (assetStatus[image.source] !== false) continue
    issues.push({
      id: `broken-image-${image.line}-${image.column}`, severity: 'warning', line: image.line, column: image.column,
      title: text.brokenImage,
      detail: format(text.brokenImageDetail, { source: image.source })
    })
  }

  return issues.sort((left, right) => left.line - right.line || left.column - right.column)
}
