import { extname } from 'node:path'

export const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown', '.mdown', '.mkd'])

const WINDOWS_RESERVED_NAME = /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/iu
const FORBIDDEN_FILE_NAME_CHARACTER = /[<>:"/\\|?*\u0000-\u001f]/u

export function normalizeMarkdownFileName(input: string): string | null {
  const trimmed = input.trim().replace(/[. ]+$/gu, '')
  if (trimmed.length === 0 || FORBIDDEN_FILE_NAME_CHARACTER.test(trimmed)) return null

  const extension = extname(trimmed)
  if (extension && !MARKDOWN_EXTENSIONS.has(extension.toLocaleLowerCase('en-US'))) return null
  const result = extension ? trimmed : `${trimmed}.md`
  const stem = result.slice(0, result.length - extname(result).length)
  return WINDOWS_RESERVED_NAME.test(stem) ? null : result
}
