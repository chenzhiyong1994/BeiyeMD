import { type FSWatcher, watch } from 'node:fs'
import { basename, dirname } from 'node:path'

import { documentFileNameMatches } from '../application/document-paths'

export class DocumentWatch {
  private readonly watchers = new Map<string, FSWatcher>()
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>()

  start(documentId: string, path: string, onChange: () => void): void {
    this.stop(documentId)
    const expectedName = basename(path)
    try {
      const watcher = watch(dirname(path), (_event, changedName) => {
        if (changedName && !documentFileNameMatches(changedName.toString(), expectedName)) return
        const previousTimer = this.timers.get(documentId)
        if (previousTimer) clearTimeout(previousTimer)
        this.timers.set(documentId, setTimeout(onChange, 90))
      })
      watcher.on('error', () => this.stop(documentId))
      this.watchers.set(documentId, watcher)
    } catch {
      // A document can still be edited if its parent directory cannot be watched.
    }
  }

  stop(documentId: string): void {
    this.watchers.get(documentId)?.close()
    this.watchers.delete(documentId)
    const timer = this.timers.get(documentId)
    if (timer) clearTimeout(timer)
    this.timers.delete(documentId)
  }

  dispose(): void {
    for (const documentId of [...this.watchers.keys()]) this.stop(documentId)
  }
}
