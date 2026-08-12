export type Language = 'zh-CN' | 'en' | 'zh-TW'

export interface DocumentSummary {
  id: string
  name: string
  path: string | null
  dirty: boolean
  readOnly: boolean
}

export interface DocumentsPayload {
  documents: DocumentSummary[]
  activeDocumentId: string | null
}

export interface DocumentPayload {
  id: string
  path: string | null
  content: string
  dirty: boolean
  readOnly: boolean
}

export interface DocumentSnapshot {
  id: string
  content: string
  dirty: boolean
}

export interface PaletteDocument extends DocumentSummary {
  content: string
}

export interface RecentDocument {
  name: string
  path: string
}

export interface CommandPalettePayload {
  openDocuments: PaletteDocument[]
  recentDocuments: RecentDocument[]
}

export interface ImageAssetInput {
  name: string
  type: string
  data: ArrayBuffer
  width?: number
  height?: number
}

export interface ImageAssetResult {
  name: string
  relativePath: string
  fileUrl: string
  documentPath: string
  width: number | null
  height: number | null
}

export interface ElectronAPI {
  getLanguage: () => Promise<Language>
  getDocuments: () => Promise<DocumentsPayload | null>
  getActiveDocument: () => Promise<DocumentPayload | null>
  newDocument: (snapshot?: DocumentSnapshot) => Promise<boolean>
  openDocuments: (snapshot?: DocumentSnapshot) => Promise<boolean>
  openFilePaths: (paths: string[], snapshot?: DocumentSnapshot) => Promise<boolean>
  activateDocument: (documentId: string, snapshot?: DocumentSnapshot) => Promise<boolean>
  closeDocument: (documentId: string, snapshot?: DocumentSnapshot) => Promise<boolean>
  renameDocument: (documentId: string, name: string, snapshot?: DocumentSnapshot) => Promise<boolean>
  updateDocumentDraft: (snapshot: DocumentSnapshot) => Promise<boolean>
  getCommandPaletteData: () => Promise<CommandPalettePayload | null>
  openRecentDocument: (path: string, snapshot?: DocumentSnapshot) => Promise<boolean>
  saveImageAssets: (documentId: string, images: ImageAssetInput[], snapshot?: DocumentSnapshot) => Promise<ImageAssetResult[]>
  chooseImageAsset: (documentId: string, snapshot?: DocumentSnapshot) => Promise<ImageAssetResult | null>
  revealImageAsset: (documentId: string, source: string) => Promise<boolean>
  checkLocalAssets: (documentId: string, sources: string[]) => Promise<Record<string, boolean>>
  saveFile: (documentId: string, content: string) => Promise<boolean>
  saveFileAs: (documentId: string, content: string) => Promise<boolean>
  exportPDF: () => Promise<boolean>
  getPathForFile: (file: File) => string
  openExternal: (url: string) => void
  onDocumentOpened: (callback: (data: DocumentPayload) => void) => void
  onDocumentChanged: (callback: (data: { id: string; content: string }) => void) => void
  onDocumentSaved: (callback: (data: { id: string; path: string }) => void) => void
  onDocumentsChanged: (callback: (data: DocumentsPayload) => void) => void
  onMenuSave: (callback: () => void) => void
  onMenuSaveAs: (callback: () => void) => void
  onMenuCloseDocument: (callback: () => void) => void
  onMenuExportPDF: (callback: () => void) => void
  onSetTheme: (callback: (theme: string) => void) => void
  onSearch: (callback: () => void) => void
  onQuickOpen: (callback: () => void) => void
  onMathModal: (callback: () => void) => void
  onToggleFilePanel: (callback: () => void) => void
  onSetLanguage: (callback: (language: Language) => void) => void
}

export const channels = {
  getLanguage: 'settings:get-language',
  getDocuments: 'workspace:get-documents',
  getActiveDocument: 'workspace:get-active-document',
  newDocument: 'workspace:new-document',
  openDocuments: 'workspace:choose-documents',
  openFilePaths: 'workspace:open-paths',
  activateDocument: 'workspace:activate-document',
  closeDocument: 'workspace:close-document',
  renameDocument: 'workspace:rename-document',
  updateDocumentDraft: 'workspace:update-draft',
  getCommandPaletteData: 'workspace:get-palette-data',
  openRecentDocument: 'workspace:open-recent',
  saveImageAssets: 'assets:save-images',
  chooseImageAsset: 'assets:choose-image',
  revealImageAsset: 'assets:reveal-image',
  checkLocalAssets: 'assets:check-images',
  saveFile: 'workspace:save-document',
  saveFileAs: 'workspace:save-document-as',
  exportPDF: 'workspace:export-pdf',
  openExternal: 'navigation:open-external',
  documentOpened: 'workspace:document-opened',
  documentChanged: 'workspace:document-changed',
  documentSaved: 'workspace:document-saved',
  documentsChanged: 'workspace:documents-changed',
  menuSave: 'commands:save',
  menuSaveAs: 'commands:save-as',
  menuCloseDocument: 'commands:close-document',
  menuExportPDF: 'commands:export-pdf',
  setTheme: 'settings:set-theme',
  search: 'commands:search',
  quickOpen: 'commands:quick-open',
  mathModal: 'commands:insert-math',
  toggleFilePanel: 'commands:toggle-sidebar',
  setLanguage: 'settings:set-language'
} as const
