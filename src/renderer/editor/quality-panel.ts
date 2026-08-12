import type { Language } from '../../preload/index'
import { analyzeMarkdown, findLocalImageReferences, type QualityIssue } from './markdown-quality'

const panelText = {
  'zh-CN': { title: 'Markdown 检查', clean: '没有发现格式问题', issueCount: '{count} 个问题', line: '第 {line} 行', close: '关闭检查面板' },
  en: { title: 'Markdown Check', clean: 'No formatting issues found', issueCount: '{count} issues', line: 'Line {line}', close: 'Close check panel' },
  'zh-TW': { title: 'Markdown 檢查', clean: '沒有發現格式問題', issueCount: '{count} 個問題', line: '第 {line} 行', close: '關閉檢查面板' }
} as const

export class QualityPanel {
  private panel: HTMLDivElement
  private title: HTMLDivElement
  private summary: HTMLDivElement
  private list: HTMLDivElement
  private closeButton: HTMLButtonElement
  private issues: QualityIssue[] = []
  private language: Language
  private debounceTimer: number | null = null
  private analysisVersion = 0

  constructor(
    private readonly trigger: HTMLButtonElement,
    language: Language,
    private readonly getDocumentId: () => string | null,
    private readonly getMarkdown: () => string,
    private readonly checkAssets: (documentId: string, sources: string[]) => Promise<Record<string, boolean>>,
    private readonly onNavigate: (issue: QualityIssue) => void
  ) {
    this.language = language
    this.panel = document.createElement('div')
    this.panel.className = 'quality-panel'
    this.panel.hidden = true

    const heading = document.createElement('div')
    heading.className = 'quality-panel-heading'
    this.title = document.createElement('div')
    this.title.className = 'quality-panel-title'
    this.summary = document.createElement('div')
    this.summary.className = 'quality-panel-summary'
    this.closeButton = document.createElement('button')
    this.closeButton.type = 'button'
    this.closeButton.className = 'quality-panel-close'
    this.closeButton.textContent = '×'
    this.closeButton.addEventListener('click', () => this.hide())
    heading.append(this.title, this.summary, this.closeButton)
    this.list = document.createElement('div')
    this.list.className = 'quality-panel-list'
    this.panel.append(heading, this.list)
    document.body.append(this.panel)

    this.trigger.addEventListener('click', () => this.toggle())
    this.list.addEventListener('click', (event) => {
      const row = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-quality-index]')
      const issue = row ? this.issues[Number(row.dataset.qualityIndex)] : undefined
      if (issue) {
        this.hide()
        this.onNavigate(issue)
      }
    })
    document.addEventListener('mousedown', (event) => {
      const target = event.target as HTMLElement
      if (!this.panel.hidden && !this.panel.contains(target) && !this.trigger.contains(target)) this.hide()
    })
    this.setLanguage(language)
  }

  setLanguage(language: Language): void {
    this.language = language
    const text = panelText[language]
    this.title.textContent = text.title
    this.closeButton.title = text.close
    this.closeButton.setAttribute('aria-label', text.close)
    this.trigger.title = text.title
    this.trigger.setAttribute('aria-label', text.title)
    this.render()
  }

  schedule(): void {
    if (this.debounceTimer != null) window.clearTimeout(this.debounceTimer)
    this.debounceTimer = window.setTimeout(() => void this.analyze(), 220)
  }

  async analyze(): Promise<void> {
    const version = ++this.analysisVersion
    const markdown = this.getMarkdown()
    const documentId = this.getDocumentId()
    const sources = findLocalImageReferences(markdown).map((item) => item.source)
    const assetStatus = documentId && sources.length > 0 ? await this.checkAssets(documentId, sources) : {}
    if (version !== this.analysisVersion) return
    this.issues = analyzeMarkdown(markdown, this.language, assetStatus)
    this.render()
  }

  hide(): void {
    this.panel.hidden = true
    this.trigger.setAttribute('aria-expanded', 'false')
  }

  private toggle(): void {
    this.panel.hidden = !this.panel.hidden
    this.trigger.setAttribute('aria-expanded', String(!this.panel.hidden))
    if (!this.panel.hidden) void this.analyze()
  }

  private render(): void {
    const text = panelText[this.language]
    const count = this.issues.length
    this.summary.textContent = count ? text.issueCount.replace('{count}', String(count)) : text.clean
    this.trigger.classList.toggle('has-issues', count > 0)
    const countElement = this.trigger.querySelector<HTMLElement>('.quality-count')
    if (countElement) countElement.textContent = count ? String(Math.min(count, 99)) : ''
    this.list.innerHTML = ''
    if (count === 0) {
      const empty = document.createElement('div')
      empty.className = 'quality-panel-empty'
      empty.innerHTML = '<span aria-hidden="true">✓</span>'
      const label = document.createElement('p')
      label.textContent = text.clean
      empty.append(label)
      this.list.append(empty)
      return
    }
    this.issues.forEach((issue, index) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = `quality-issue quality-issue-${issue.severity}`
      button.dataset.qualityIndex = String(index)
      const marker = document.createElement('span')
      marker.className = 'quality-issue-marker'
      marker.textContent = issue.severity === 'warning' ? '!' : '·'
      const copy = document.createElement('span')
      copy.className = 'quality-issue-copy'
      const title = document.createElement('strong')
      title.textContent = issue.title
      const detail = document.createElement('span')
      detail.textContent = issue.detail
      copy.append(title, detail)
      const line = document.createElement('span')
      line.className = 'quality-issue-line'
      line.textContent = text.line.replace('{line}', String(issue.line))
      button.append(marker, copy, line)
      this.list.append(button)
    })
  }
}
