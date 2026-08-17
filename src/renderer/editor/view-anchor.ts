export interface RelativeViewAnchor {
  cursorRatio: number
  scrollRatio: number
}

export interface ViewPosition {
  cursorOffset: number
  contentLength: number
  scrollTop: number
  scrollHeight: number
  viewportHeight: number
}

export interface ViewExtent {
  contentLength: number
  scrollHeight: number
  viewportHeight: number
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
}

export function captureRelativeViewAnchor(position: ViewPosition): RelativeViewAnchor {
  const contentLength = Math.max(0, position.contentLength)
  const maximumScroll = Math.max(0, position.scrollHeight - position.viewportHeight)
  return {
    cursorRatio: contentLength === 0 ? 0 : clamp(position.cursorOffset / contentLength, 0, 1),
    scrollRatio: maximumScroll === 0 ? 0 : clamp(position.scrollTop / maximumScroll, 0, 1)
  }
}

export function restoreRelativeViewAnchor(anchor: RelativeViewAnchor, extent: ViewExtent): Pick<ViewPosition, 'cursorOffset' | 'scrollTop'> {
  const contentLength = Math.max(0, extent.contentLength)
  const maximumScroll = Math.max(0, extent.scrollHeight - extent.viewportHeight)
  return {
    cursorOffset: Math.round(clamp(anchor.cursorRatio, 0, 1) * contentLength),
    scrollTop: clamp(anchor.scrollRatio, 0, 1) * maximumScroll
  }
}
