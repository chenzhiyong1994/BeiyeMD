/** A document owned by one application window. */
export interface SessionDocument {
  readonly id: string
  name: string
  path: string | null
  content: string
  savedContent: string
  dirty: boolean
  readOnly: boolean
  externalChangePending: boolean
}

export interface OpenFileInput {
  path: string
  content: string
}

export interface DocumentSessionOptions {
  createId: () => string
  untitledName: () => string
  canonicalizePath: (value: string) => string
}

export type ExternalChangeResult = 'applied' | 'deferred' | 'missing'

function fileName(filePath: string): string {
  const normalized = filePath.replaceAll('\\', '/')
  return normalized.slice(normalized.lastIndexOf('/') + 1) || filePath
}

export class DocumentSession {
  readonly documents: SessionDocument[] = []
  activeDocumentId: string | null = null

  constructor(private readonly options: DocumentSessionOptions) {
    this.createUntitled()
  }

  get activeDocument(): SessionDocument | null {
    return this.documents.find((document) => document.id === this.activeDocumentId) ?? null
  }

  createUntitled(content = ''): SessionDocument {
    const document: SessionDocument = {
      id: this.options.createId(),
      name: this.options.untitledName(),
      path: null,
      content,
      savedContent: '',
      dirty: content.length > 0,
      readOnly: false,
      externalChangePending: false
    }
    this.documents.push(document)
    this.activeDocumentId = document.id
    return document
  }

  loadInitialContent(content: string): void {
    const document = this.activeDocument
    if (!document || this.documents.length !== 1 || document.path !== null) return
    document.content = content
    document.savedContent = content
    document.dirty = false
  }

  loadReferenceContent(name: string, content: string): void {
    const document = this.activeDocument
    if (!document || this.documents.length !== 1 || document.path !== null) return
    document.name = name
    document.content = content
    document.savedContent = content
    document.dirty = false
    document.readOnly = true
  }

  openFiles(files: OpenFileInput[]): void {
    if (files.length === 0) return
    this.removeEmptyPlaceholder()

    for (const file of files) {
      const canonicalPath = this.options.canonicalizePath(file.path)
      const existing = this.documents.find((document) =>
        document.path !== null && this.options.canonicalizePath(document.path) === canonicalPath
      )
      if (existing) {
        this.activeDocumentId = existing.id
        continue
      }

      const document: SessionDocument = {
        id: this.options.createId(),
        name: fileName(file.path),
        path: file.path,
        content: file.content,
        savedContent: file.content,
        dirty: false,
        readOnly: false,
        externalChangePending: false
      }
      this.documents.push(document)
      this.activeDocumentId = document.id
    }

    if (this.documents.length === 0) this.createUntitled()
  }

  activate(documentId: string): boolean {
    if (!this.documents.some((document) => document.id === documentId)) return false
    this.activeDocumentId = documentId
    return true
  }

  updateDraft(documentId: string, content: string): boolean {
    const document = this.find(documentId)
    if (!document || document.readOnly) return false
    document.content = content
    document.dirty = content !== document.savedContent
    return true
  }

  renameDisplayName(documentId: string, name: string): boolean {
    const document = this.find(documentId)
    const normalized = name.trim()
    if (!document || document.readOnly || normalized.length === 0) return false
    document.name = normalized
    return true
  }

  relocate(documentId: string, path: string): boolean {
    const document = this.find(documentId)
    if (!document || document.readOnly) return false
    document.path = path
    document.name = fileName(path)
    return true
  }

  get(documentId: string): SessionDocument | null {
    return this.find(documentId) ?? null
  }

  close(documentId: string): boolean {
    if (this.documents.length <= 1) return false
    const index = this.documents.findIndex((document) => document.id === documentId)
    if (index < 0) return false

    const wasActive = this.activeDocumentId === documentId
    this.documents.splice(index, 1)
    if (wasActive) {
      this.activeDocumentId = this.documents[Math.min(index, this.documents.length - 1)]?.id ?? null
    }
    return true
  }

  markSaved(documentId: string, path: string, content: string): boolean {
    const document = this.find(documentId)
    if (!document || document.readOnly) return false
    document.path = path
    document.name = fileName(path)
    document.content = content
    document.savedContent = content
    document.dirty = false
    document.externalChangePending = false
    return true
  }

  applyExternalChange(documentId: string, content: string): ExternalChangeResult {
    const document = this.find(documentId)
    if (!document) return 'missing'
    if (document.dirty) {
      document.externalChangePending = true
      return 'deferred'
    }

    document.content = content
    document.savedContent = content
    document.externalChangePending = false
    return 'applied'
  }

  private find(documentId: string): SessionDocument | undefined {
    return this.documents.find((document) => document.id === documentId)
  }

  private removeEmptyPlaceholder(): void {
    if (this.documents.length !== 1) return
    const [document] = this.documents
    if (document.path === null && document.content.length === 0 && !document.dirty) {
      this.documents.splice(0, 1)
      this.activeDocumentId = null
    }
  }
}
