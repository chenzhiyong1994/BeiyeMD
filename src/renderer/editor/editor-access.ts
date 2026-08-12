import { PluginKey } from '@milkdown/kit/prose/state'
import type { EditorView } from '@milkdown/kit/prose/view'

export const searchDecorationsKey = new PluginKey('beiye-search-decorations')

let activeView: EditorView | null = null

export function setActiveEditorView(view: EditorView | null): void {
  activeView = view
}

export function getActiveEditorView(): EditorView | null {
  return activeView
}
