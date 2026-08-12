export interface SourceSearchRange {
  from: number
  to: number
}

export interface SourceSearchSegment {
  kind: 'text' | 'match' | 'current'
  text: string
}

export function sourceSearchSegments(
  source: string,
  ranges: readonly SourceSearchRange[],
  activeIndex: number
): SourceSearchSegment[] {
  const ordered = ranges
    .map((range, index) => ({
      from: Math.max(0, Math.min(source.length, range.from)),
      to: Math.max(0, Math.min(source.length, range.to)),
      index
    }))
    .filter((range) => range.to > range.from)
    .sort((left, right) => left.from - right.from || left.to - right.to)

  const segments: SourceSearchSegment[] = []
  let cursor = 0
  for (const range of ordered) {
    if (range.from < cursor) continue
    if (range.from > cursor) segments.push({ kind: 'text', text: source.slice(cursor, range.from) })
    segments.push({ kind: range.index === activeIndex ? 'current' : 'match', text: source.slice(range.from, range.to) })
    cursor = range.to
  }
  if (cursor < source.length) segments.push({ kind: 'text', text: source.slice(cursor) })
  return segments
}

export function renderSourceSearchHighlights(
  root: HTMLElement,
  source: string,
  ranges: readonly SourceSearchRange[],
  activeIndex: number
): void {
  const nodes = sourceSearchSegments(source, ranges, activeIndex).map((segment) => {
    if (segment.kind === 'text') return document.createTextNode(segment.text)
    const mark = document.createElement('mark')
    mark.className = segment.kind === 'current' ? 'source-search-match-current' : 'source-search-match'
    mark.textContent = segment.text
    return mark
  })
  root.replaceChildren(...nodes)
}
