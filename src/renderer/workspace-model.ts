import type { DocumentSummary, Language } from '../shared/contracts'

const documentStates = {
  'zh-CN': { saved: '已保存', dirty: '未保存', fresh: '新文档' },
  en: { saved: 'Saved', dirty: 'Unsaved', fresh: 'New document' },
  'zh-TW': { saved: '已儲存', dirty: '未儲存', fresh: '新文件' }
} as const

export class DocumentMarkdownBuffer {
  private readonly values = new Map<string, string>()
  private readonly previewEchoes = new Map<string, string>()

  load(documentId: string, markdown: string): void {
    this.values.set(documentId, markdown)
  }

  updateFromSource(documentId: string, markdown: string): void {
    this.values.set(documentId, markdown)
  }

  expectPreviewEcho(documentId: string, markdown: string): void {
    this.previewEchoes.set(documentId, markdown)
  }

  updateFromPreview(documentId: string, markdown: string): boolean {
    const echo = this.previewEchoes.get(documentId)
    this.previewEchoes.delete(documentId)
    if (echo === markdown) return false
    this.values.set(documentId, markdown)
    return true
  }

  forSourceMode(documentId: string | null, serializedFallback: string): string {
    return documentId ? (this.values.get(documentId) ?? serializedFallback) : serializedFallback
  }

  retain(documentIds: ReadonlySet<string>): void {
    for (const documentId of this.values.keys()) {
      if (!documentIds.has(documentId)) this.values.delete(documentId)
    }
    for (const documentId of this.previewEchoes.keys()) {
      if (!documentIds.has(documentId)) this.previewEchoes.delete(documentId)
    }
  }
}

export function countMarkdownWords(markdown: string): number {
  const visible = markdown
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/gu, ' ')
    .replace(/`[^`]*`/gu, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/gu, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/gu, '$1')
    .replace(/<[^>]+>/gu, ' ')
    .replace(/^\s{0,3}(?:#{1,6}|>|[-+*]|\d+[.)])\s+/gmu, '')
    .replace(/[~*_=`|{}[\]():>#+-]/gu, ' ')

  const cjk = visible.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu)?.length ?? 0
  const latin = visible
    .replace(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu, ' ')
    .match(/[\p{L}\p{N}]+(?:['’_-][\p{L}\p{N}]+)*/gu)?.length ?? 0
  return cjk + latin
}

export function filterDocuments(documents: readonly DocumentSummary[], query: string): DocumentSummary[] {
  const normalized = query.trim().normalize('NFKC').toLocaleLowerCase()
  if (!normalized) return [...documents]
  return documents.filter((document) => `${document.name}\n${document.path ?? ''}`.normalize('NFKC').toLocaleLowerCase().includes(normalized))
}

export function normalizeSidebarWidth(width: number, viewportWidth: number): number {
  const upper = Math.max(196, Math.min(420, Math.floor(viewportWidth * 0.42)))
  return Math.round(Math.min(upper, Math.max(196, Number.isFinite(width) ? width : 258)))
}

export function isCompactSidebarWidth(width: number): boolean {
  return width < 272
}

export function presentDocumentState(document: DocumentSummary, language: Language): string {
  if (document.readOnly) return language === 'en' ? 'Reference' : language === 'zh-TW' ? '參考資料' : '参考资料'
  const text = documentStates[language]
  if (document.dirty) return text.dirty
  return document.path ? text.saved : text.fresh
}
