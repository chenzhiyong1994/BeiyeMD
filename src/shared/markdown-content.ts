/** Normalize only differences introduced by Markdown parsers during a load/serialize cycle. */
export function normalizeMarkdownForComparison(markdown: string): string {
  return markdown.replace(/\r\n?/gu, '\n').replace(/\n$/u, '')
}

export function markdownContentsEqual(left: string, right: string): boolean {
  return normalizeMarkdownForComparison(left) === normalizeMarkdownForComparison(right)
}
