import { readFile, writeFile } from 'node:fs/promises'

import type { Language } from '../../shared/contracts'

interface SettingsData {
  language: Language
  recentDocumentPaths: string[]
}

const defaults: SettingsData = { language: 'zh-CN', recentDocumentPaths: [] }

function isLanguage(value: unknown): value is Language {
  return value === 'zh-CN' || value === 'en' || value === 'zh-TW'
}

export class SettingsStore {
  private data: SettingsData = { ...defaults }

  constructor(private readonly path: string) {}

  get language(): Language {
    return this.data.language
  }

  get recentDocumentPaths(): readonly string[] {
    return this.data.recentDocumentPaths
  }

  async load(): Promise<void> {
    try {
      const parsed = JSON.parse(await readFile(this.path, 'utf8')) as Record<string, unknown>
      this.data = {
        language: isLanguage(parsed.language) ? parsed.language : defaults.language,
        recentDocumentPaths: Array.isArray(parsed.recentDocumentPaths)
          ? parsed.recentDocumentPaths.filter((item): item is string => typeof item === 'string').slice(0, 20)
          : Array.isArray(parsed.recentFilePaths)
            ? parsed.recentFilePaths.filter((item): item is string => typeof item === 'string').slice(0, 20)
            : []
      }
    } catch {
      this.data = { ...defaults }
    }
  }

  async setLanguage(language: Language): Promise<void> {
    this.data.language = language
    await this.persist()
  }

  async rememberDocument(path: string): Promise<void> {
    const normalized = path.toLocaleLowerCase('en-US')
    this.data.recentDocumentPaths = [path, ...this.data.recentDocumentPaths.filter((item) => item.toLocaleLowerCase('en-US') !== normalized)].slice(0, 20)
    await this.persist()
  }

  async replaceRecentPath(previousPath: string, nextPath: string): Promise<void> {
    const previous = previousPath.toLocaleLowerCase('en-US')
    this.data.recentDocumentPaths = this.data.recentDocumentPaths.filter((item) => item.toLocaleLowerCase('en-US') !== previous)
    await this.rememberDocument(nextPath)
  }

  private persist(): Promise<void> {
    return writeFile(this.path, `${JSON.stringify(this.data, null, 2)}\n`, 'utf8')
  }
}
