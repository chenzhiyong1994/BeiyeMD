import { access, readFile, rename, writeFile } from 'node:fs/promises'
import { extname } from 'node:path'

import { MARKDOWN_EXTENSIONS } from '../application/document-names'
import type { OpenFileInput } from '../application/document-session'

export class MarkdownFileRepository {
  supports(filePath: string): boolean {
    return MARKDOWN_EXTENSIONS.has(extname(filePath).toLocaleLowerCase('en-US'))
  }

  async loadMany(paths: readonly string[]): Promise<OpenFileInput[]> {
    const loaded: OpenFileInput[] = []
    for (const path of paths) {
      if (!this.supports(path)) continue
      loaded.push({ path, content: await readFile(path, 'utf8') })
    }
    return loaded
  }

  save(path: string, content: string): Promise<void> {
    return writeFile(path, content, 'utf8')
  }

  saveBytes(path: string, content: Uint8Array): Promise<void> {
    return writeFile(path, content)
  }

  rename(previousPath: string, nextPath: string): Promise<void> {
    return rename(previousPath, nextPath)
  }

  async exists(path: string): Promise<boolean> {
    try {
      await access(path)
      return true
    } catch {
      return false
    }
  }
}
