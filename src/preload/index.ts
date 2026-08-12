import { contextBridge, ipcRenderer, webUtils } from 'electron'

import { channels, type DesktopPlatform, type DocumentPayload, type DocumentSnapshot, type DocumentsPayload, type ElectronAPI, type ImageAssetInput, type Language } from '../shared/contracts'

export type {
  CommandPalettePayload,
  DocumentPayload,
  DocumentSnapshot,
  DocumentsPayload,
  DocumentSummary,
  DesktopPlatform,
  ElectronAPI,
  ImageAssetInput,
  ImageAssetResult,
  Language,
  PaletteDocument,
  RecentDocument
} from '../shared/contracts'

function on<T>(channel: string, callback: (data: T) => void): void {
  ipcRenderer.on(channel, (_event, data: T) => callback(data))
}

function onCommand(channel: string, callback: () => void): void {
  ipcRenderer.on(channel, callback)
}

const api: ElectronAPI = {
  platform: process.platform as DesktopPlatform,
  getLanguage: () => ipcRenderer.invoke(channels.getLanguage),
  getDocuments: () => ipcRenderer.invoke(channels.getDocuments),
  getActiveDocument: () => ipcRenderer.invoke(channels.getActiveDocument),
  newDocument: (snapshot?: DocumentSnapshot) => ipcRenderer.invoke(channels.newDocument, snapshot),
  openDocuments: (snapshot?: DocumentSnapshot) => ipcRenderer.invoke(channels.openDocuments, snapshot),
  openFilePaths: (paths: string[], snapshot?: DocumentSnapshot) => ipcRenderer.invoke(channels.openFilePaths, paths, snapshot),
  activateDocument: (documentId: string, snapshot?: DocumentSnapshot) => ipcRenderer.invoke(channels.activateDocument, documentId, snapshot),
  closeDocument: (documentId: string, snapshot?: DocumentSnapshot) => ipcRenderer.invoke(channels.closeDocument, documentId, snapshot),
  renameDocument: (documentId: string, name: string, snapshot?: DocumentSnapshot) => ipcRenderer.invoke(channels.renameDocument, documentId, name, snapshot),
  updateDocumentDraft: (snapshot: DocumentSnapshot) => ipcRenderer.invoke(channels.updateDocumentDraft, snapshot),
  getCommandPaletteData: () => ipcRenderer.invoke(channels.getCommandPaletteData),
  openRecentDocument: (path: string, snapshot?: DocumentSnapshot) => ipcRenderer.invoke(channels.openRecentDocument, path, snapshot),
  saveImageAssets: (documentId: string, images: ImageAssetInput[], snapshot?: DocumentSnapshot) => ipcRenderer.invoke(channels.saveImageAssets, documentId, images, snapshot),
  chooseImageAsset: (documentId: string, snapshot?: DocumentSnapshot) => ipcRenderer.invoke(channels.chooseImageAsset, documentId, snapshot),
  revealImageAsset: (documentId: string, source: string) => ipcRenderer.invoke(channels.revealImageAsset, documentId, source),
  checkLocalAssets: (documentId: string, sources: string[]) => ipcRenderer.invoke(channels.checkLocalAssets, documentId, sources),
  saveFile: (documentId: string, content: string) => ipcRenderer.invoke(channels.saveFile, documentId, content),
  saveFileAs: (documentId: string, content: string) => ipcRenderer.invoke(channels.saveFileAs, documentId, content),
  exportPDF: () => ipcRenderer.invoke(channels.exportPDF),
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  openExternal: (url: string) => ipcRenderer.send(channels.openExternal, url),
  onDocumentOpened: (callback: (data: DocumentPayload) => void) => on(channels.documentOpened, callback),
  onDocumentChanged: (callback: (data: { id: string; content: string }) => void) => on(channels.documentChanged, callback),
  onDocumentSaved: (callback: (data: { id: string; path: string }) => void) => on(channels.documentSaved, callback),
  onDocumentsChanged: (callback: (data: DocumentsPayload) => void) => on(channels.documentsChanged, callback),
  onMenuSave: (callback: () => void) => onCommand(channels.menuSave, callback),
  onMenuSaveAs: (callback: () => void) => onCommand(channels.menuSaveAs, callback),
  onMenuCloseDocument: (callback: () => void) => onCommand(channels.menuCloseDocument, callback),
  onMenuExportPDF: (callback: () => void) => onCommand(channels.menuExportPDF, callback),
  onSetTheme: (callback: (theme: string) => void) => on(channels.setTheme, callback),
  onSearch: (callback: () => void) => onCommand(channels.search, callback),
  onQuickOpen: (callback: () => void) => onCommand(channels.quickOpen, callback),
  onMathModal: (callback: () => void) => onCommand(channels.mathModal, callback),
  onToggleFilePanel: (callback: () => void) => onCommand(channels.toggleFilePanel, callback),
  onSetLanguage: (callback: (language: Language) => void) => on(channels.setLanguage, callback)
}

contextBridge.exposeInMainWorld('electronAPI', api)
