export function formulaMarkdown(value: string, block: boolean): string {
  const formula = value.trim()
  if (!formula) return ''
  return block ? `\n$$\n${formula}\n$$\n` : `$${formula}$`
}
