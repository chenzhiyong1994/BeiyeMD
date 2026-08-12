import type { Language } from '../../preload/index'

export interface OutlineHeading {
  level: number
  text: string
  line: number
  offset: number
  index: number
}

const outlineText = {
  'zh-CN': { empty: '当前文档还没有标题', line: '第 {line} 行' },
  en: { empty: 'No headings in this document', line: 'Line {line}' },
  'zh-TW': { empty: '目前文件還沒有標題', line: '第 {line} 行' }
} as const

export function extractOutline(markdown: string): OutlineHeading[] {
  const headings: OutlineHeading[] = []
  const lines = markdown.split('\n')
  let inFence = false
  let offset = 0
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      offset += line.length + 1
      continue
    }
    if (!inFence) {
      const match = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/)
      if (match) {
        headings.push({
          level: match[1].length,
          text: match[2].trim(),
          line: index + 1,
          offset,
          index: headings.length
        })
      }
    }
    offset += line.length + 1
  }
  return headings
}

export class OutlinePanel {
  private headings: OutlineHeading[] = []
  private language: Language

  constructor(
    private readonly container: HTMLElement,
    language: Language,
    private readonly onSelect: (heading: OutlineHeading) => void
  ) {
    this.language = language
    this.container.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-outline-index]')
      const heading = button ? this.headings[Number(button.dataset.outlineIndex)] : undefined
      if (heading) this.onSelect(heading)
    })
  }

  setLanguage(language: Language): void {
    this.language = language
    this.render()
  }

  setContent(markdown: string): void {
    this.headings = extractOutline(markdown)
    this.render()
  }

  private render(): void {
    this.container.innerHTML = ''
    if (this.headings.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'outline-empty'
      empty.textContent = outlineText[this.language].empty
      this.container.append(empty)
      return
    }
    for (const heading of this.headings) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'outline-item'
      button.dataset.outlineIndex = String(heading.index)
      button.style.setProperty('--outline-depth', String(heading.level - 1))
      button.style.setProperty('--outline-indent', `${Math.min(heading.level - 1, 4) * 11}px`)
      button.style.setProperty('--outline-rail-height', `${15 - Math.min(heading.level - 1, 4) * 1.6}px`)
      button.style.setProperty('--outline-copy-size', `${12 - Math.min(heading.level - 1, 3) * 0.25}px`)
      button.style.setProperty('--outline-copy-weight', String(680 - Math.min(heading.level - 1, 4) * 65))
      button.title = `${heading.text} · ${outlineText[this.language].line.replace('{line}', String(heading.line))}`
      const rail = document.createElement('span')
      rail.className = 'outline-rail'
      const copy = document.createElement('span')
      copy.className = 'outline-copy'
      copy.textContent = heading.text
      const level = document.createElement('span')
      level.className = 'outline-level'
      level.textContent = `H${heading.level}`
      button.append(rail, copy, level)
      this.container.append(button)
    }
  }
}
