import type { NodeViewConstructor } from '@milkdown/kit/prose/view'
import { htmlSchema } from '@milkdown/kit/preset/commonmark'
import { $view } from '@milkdown/kit/utils'

export const rawHtmlView = $view(htmlSchema.node, (): NodeViewConstructor => (node) => {
  const element = document.createElement('span')
  element.className = 'milkdown-html-inline'
  element.innerHTML = String(node.attrs.value ?? '')
  return { dom: element, stopEvent: () => true }
})
