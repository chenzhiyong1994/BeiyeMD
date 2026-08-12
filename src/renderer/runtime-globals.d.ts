import type { ElectronAPI } from '../shared/contracts'

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
