export type ImageAlignment = 'left' | 'center' | 'right'

export interface ImageLayout {
  width: string | null
  align: ImageAlignment
}

const CURRENT_IMAGE_PREFIX = 'beiye:image;'
const LEGACY_IMAGE_PREFIX = 'beiye-image:'
const COLUMN_MARKER = /^<!--\s*beiye:columns=([\d,\s]+)\s*-->\s*$/u
const LEGACY_COLUMN_MARKER = /^<!--\s*beiyemd:table-widths=([\d,\s]+)\s*-->\s*$/u

export function decodeImageLayout(title: string | null | undefined): ImageLayout {
  const legacyPercent = title?.match(/^beiye-width:(50|75|100)$/u)?.[1]
  if (legacyPercent) {
    return { width: legacyPercent === '100' ? null : `${legacyPercent}%`, align: 'center' }
  }

  const payload = title?.startsWith(CURRENT_IMAGE_PREFIX)
    ? title.slice(CURRENT_IMAGE_PREFIX.length)
    : title?.startsWith(LEGACY_IMAGE_PREFIX) ? title.slice(LEGACY_IMAGE_PREFIX.length) : null
  if (!payload) return { width: null, align: 'center' }

  const fields = new Map(payload.split(';').map((field) => field.split('=', 2) as [string, string]))
  const width = fields.get('width')
  const align = fields.get('align')
  return {
    width: width && /^(?:\d+(?:\.\d+)?px|(?:50|75)%)$/u.test(width) ? width : null,
    align: align === 'left' || align === 'right' ? align : 'center'
  }
}

export function encodeImageLayout(layout: ImageLayout): string | null {
  if (!layout.width && layout.align === 'center') return null
  return `${CURRENT_IMAGE_PREFIX}width=${layout.width ?? 'auto'};align=${layout.align}`
}

export function stripTableColumnWidths(markdown: string): { markdown: string; widths: number[][] } {
  const content: string[] = []
  const widths: number[][] = []
  let fence: '`' | '~' | null = null

  for (const line of markdown.split('\n')) {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/u)
    const marker = fence ? null : line.match(COLUMN_MARKER) ?? line.match(LEGACY_COLUMN_MARKER)
    if (marker) {
      widths.push(parseWidths(marker[1]))
    } else {
      content.push(line)
    }
    if (fenceMatch) {
      const nextFence = fenceMatch[1][0] as '`' | '~'
      fence = fence === nextFence ? null : fence ?? nextFence
    }
  }

  return { markdown: content.join('\n'), widths }
}

export function injectTableColumnWidths(markdown: string, tables: readonly number[][]): string {
  if (!tables.some((widths) => widths.some((width) => width > 0))) return markdown
  const lines = markdown.split('\n')
  const result: string[] = []
  let tableIndex = 0
  let fence: '`' | '~' | null = null

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/u)
    if (fenceMatch) {
      const nextFence = fenceMatch[1][0] as '`' | '~'
      fence = fence === nextFence ? null : fence ?? nextFence
    }
    if (!fence && isTableDelimiter(lines[index + 1] ?? '')) {
      const widths = tables[tableIndex++] ?? []
      if (widths.some((width) => width > 0)) result.push(`<!-- beiye:columns=${widths.join(',')} -->`)
    }
    result.push(line)
  }
  return result.join('\n')
}

function parseWidths(value: string): number[] {
  return value
    .split(',')
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((width) => Number.isFinite(width) && width >= 0)
}

function isTableDelimiter(line: string): boolean {
  const cells = line.trim().replace(/^\||\|$/gu, '').split('|')
  return cells.length > 1 && cells.every((cell) => /^\s*:?-+:?\s*$/u.test(cell))
}
