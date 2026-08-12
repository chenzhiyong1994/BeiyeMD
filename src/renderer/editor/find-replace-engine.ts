export interface FindReplaceOptions {
  query: string
  replacement?: string
  caseSensitive?: boolean
  wholeWord?: boolean
  regularExpression?: boolean
}

export interface TextMatch {
  start: number
  end: number
  value: string
  replacement: string
}

export type FindReplaceError = 'invalid-expression' | null

const wordCharacter = /[\p{L}\p{N}_]/u

function escapeExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}

export class FindReplaceEngine {
  readonly error: FindReplaceError
  private readonly expression: RegExp | null
  private readonly replacement: string
  private readonly wholeWord: boolean

  constructor(options: FindReplaceOptions) {
    this.replacement = options.replacement ?? ''
    this.wholeWord = options.wholeWord ?? false
    if (!options.query) {
      this.expression = null
      this.error = null
      return
    }
    try {
      const pattern = options.regularExpression ? options.query : escapeExpression(options.query)
      this.expression = new RegExp(pattern, `${options.caseSensitive ? '' : 'i'}gu`)
      this.error = null
    } catch {
      this.expression = null
      this.error = 'invalid-expression'
    }
  }

  locate(text: string): TextMatch[] {
    if (!this.expression) return []
    const expression = new RegExp(this.expression.source, this.expression.flags)
    const matches: TextMatch[] = []
    let match: RegExpExecArray | null
    while ((match = expression.exec(text)) !== null) {
      const start = match.index
      const end = start + match[0].length
      const completeWord = !this.wholeWord || (!wordCharacter.test(text[start - 1] ?? '') && !wordCharacter.test(text[end] ?? ''))
      if (completeWord) matches.push({ start, end, value: match[0], replacement: this.expandReplacement(match) })
      if (match[0].length === 0) expression.lastIndex += 1
    }
    return matches
  }

  replaceOne(text: string, match: TextMatch): string {
    return text.slice(0, match.start) + match.replacement + text.slice(match.end)
  }

  replaceEvery(text: string): string {
    const matches = this.locate(text)
    for (let index = matches.length - 1; index >= 0; index -= 1) text = this.replaceOne(text, matches[index])
    return text
  }

  private expandReplacement(match: RegExpExecArray): string {
    return this.replacement.replace(/\$(\$|&|`|'|\d{1,2})/gu, (token, reference: string) => {
      if (reference === '$') return '$'
      if (reference === '&') return match[0]
      if (reference === '`') return match.input.slice(0, match.index)
      if (reference === "'") return match.input.slice(match.index + match[0].length)
      const group = Number(reference)
      return Number.isInteger(group) && group > 0 ? match[group] ?? token : token
    })
  }
}
