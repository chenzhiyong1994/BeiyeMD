import type { MilkdownPlugin } from '@milkdown/kit/ctx'
import { markRule } from '@milkdown/kit/prose'
import { $inputRule, $markAttr, $markSchema } from '@milkdown/kit/utils'
import { SKIP, visit } from 'unist-util-visit'

interface MarkdownNode {
  type: string
  value?: string
  children?: MarkdownNode[]
}

const attributes = $markAttr('highlight')
const schema = $markSchema('highlight', (context) => ({
  parseDOM: [{ tag: 'mark' }],
  toDOM: (mark) => ['mark', context.get(attributes.key)(mark)],
  parseMarkdown: {
    match: (node) => node.type === 'mark',
    runner: (state, node, markType) => {
      state.openMark(markType)
      state.next(node.children)
      state.closeMark(markType)
    }
  },
  toMarkdown: {
    match: (mark) => mark.type.name === 'highlight',
    runner: (state, mark) => {
      state.withMark(mark, 'mark')
    }
  }
}))
const inputRule = $inputRule((context) => markRule(/==([^=]+)==/u, schema.type(context)))

export const highlightMark = [attributes, schema, inputRule] as unknown as MilkdownPlugin[]

export function parseHighlightSyntax(): (tree: unknown) => void {
  return (tree) => {
    visit(tree as MarkdownNode, 'text', (node: MarkdownNode, index, parent: MarkdownNode | undefined) => {
      if (!parent?.children || index === undefined || node.value === undefined) return undefined
      const fragments = splitText(node.value)
      if (!fragments.some((fragment) => fragment.type === 'mark')) return undefined
      parent.children.splice(index, 1, ...fragments)
      return [SKIP, index + fragments.length]
    })
  }
}

export function stringifyHighlight(node: any, _parent: any, state: any, info: any): string {
  const exit = state.enter('mark')
  const tracker = state.createTracker(info)
  let output = tracker.move('==')
  output += tracker.move(state.containerPhrasing(node, { before: output, after: '==', ...tracker.current() }))
  output += tracker.move('==')
  exit()
  return output
}

function splitText(value: string): MarkdownNode[] {
  const nodes: MarkdownNode[] = []
  const pattern = /==([^=\n]+)==/gu
  let cursor = 0
  for (const match of value.matchAll(pattern)) {
    const offset = match.index ?? 0
    if (offset > cursor) nodes.push({ type: 'text', value: value.slice(cursor, offset) })
    nodes.push({ type: 'mark', children: [{ type: 'text', value: match[1] }] })
    cursor = offset + match[0].length
  }
  if (cursor < value.length) nodes.push({ type: 'text', value: value.slice(cursor) })
  return nodes
}
