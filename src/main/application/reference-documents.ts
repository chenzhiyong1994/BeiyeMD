import type { Language } from '../../shared/contracts'

export function referenceDocumentFileName(baseName: string, language: Language): string {
  if (language === 'zh-CN') return `${baseName}.md`
  return `${baseName}.${language}.md`
}
