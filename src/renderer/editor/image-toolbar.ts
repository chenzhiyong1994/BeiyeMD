import type { ImageAssetResult, Language } from '../../preload/index'
import { getActiveEditorView } from './editor-access'
import { decodeImageLayout, encodeImageLayout, type ImageAlignment, type ImageLayout } from './markdown-presentation'

const imageText = {
  'zh-CN': {
    size50: '缩放至正文宽度的 50%', size75: '缩放至正文宽度的 75%', original: '恢复图片原始尺寸',
    alignLeft: '左对齐', alignCenter: '居中', alignRight: '右对齐', replace: '替换图片', reveal: '在文件夹中显示', resize: '拖拽调整图片大小'
  },
  en: {
    size50: 'Scale to 50% of the page', size75: 'Scale to 75% of the page', original: 'Use original image size',
    alignLeft: 'Align left', alignCenter: 'Center', alignRight: 'Align right', replace: 'Replace image', reveal: 'Reveal in folder', resize: 'Drag to resize image'
  },
  'zh-TW': {
    size50: '縮放至頁面寬度的 50%', size75: '縮放至頁面寬度的 75%', original: '恢復圖片原始尺寸',
    alignLeft: '靠左對齊', alignCenter: '置中', alignRight: '靠右對齊', replace: '取代圖片', reveal: '在資料夾中顯示', resize: '拖曳調整圖片大小'
  }
} as const

type ImageAction = keyof typeof imageText['zh-CN']

const icon = (paths: string) => `<svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`

export class ImageToolbar {
  private container: HTMLDivElement
  private resizeHandle: HTMLButtonElement
  private image: HTMLImageElement | null = null
  private positionInDocument: number | null = null
  private language: Language
  private resizePointerId: number | null = null
  private resizeStartX = 0
  private resizeStartWidth = 0

  constructor(
    private readonly editorRoot: HTMLElement,
    language: Language,
    private readonly chooseReplacement: () => Promise<ImageAssetResult | null>,
    private readonly revealImage: (source: string) => Promise<boolean>
  ) {
    this.language = language
    this.container = document.createElement('div')
    this.container.className = 'image-toolbar'
    this.container.hidden = true
    this.container.setAttribute('role', 'toolbar')

    this.container.append(
      this.button('50%', 'size50', () => this.setWidth('50%'), '50%'),
      this.button('75%', 'size75', () => this.setWidth('75%'), '75%'),
      this.button('原始', 'original', () => this.setWidth(null), 'auto'),
      this.separator(),
      this.button(icon('<path d="M3 4h12M3 7.5h8M3 11h11M3 14.5h7"/>'), 'alignLeft', () => this.setAlignment('left'), undefined, true),
      this.button(icon('<path d="M3 4h12M5 7.5h8M3.5 11h11M5.5 14.5h7"/>'), 'alignCenter', () => this.setAlignment('center'), undefined, true),
      this.button(icon('<path d="M3 4h12M7 7.5h8M4 11h11M8 14.5h7"/>'), 'alignRight', () => this.setAlignment('right'), undefined, true),
      this.separator(),
      this.button('替换', 'replace', () => void this.replace()),
      this.button(icon('<path d="M6.2 4H4.4A1.4 1.4 0 0 0 3 5.4v8.2A1.4 1.4 0 0 0 4.4 15h8.2a1.4 1.4 0 0 0 1.4-1.4v-1.8M9.5 3H15v5.5M15 3 8.2 9.8"/>'), 'reveal', () => void this.reveal(), undefined, true)
    )

    this.resizeHandle = document.createElement('button')
    this.resizeHandle.type = 'button'
    this.resizeHandle.className = 'image-resize-handle'
    this.resizeHandle.hidden = true
    this.resizeHandle.innerHTML = icon('<path d="M4 14 14 4M8.5 14H14V8.5M4 9.5V14h4.5"/>')
    this.resizeHandle.addEventListener('pointerdown', (event) => this.startResize(event))
    this.resizeHandle.addEventListener('pointermove', (event) => this.resize(event))
    this.resizeHandle.addEventListener('pointerup', (event) => this.finishResize(event))
    this.resizeHandle.addEventListener('pointercancel', (event) => this.finishResize(event))

    document.body.append(this.container, this.resizeHandle)
    this.setLanguage(language)

    this.editorRoot.addEventListener('click', (event) => {
      const image = (event.target as HTMLElement).closest<HTMLImageElement>('img')
      if (!image) {
        this.hide()
        return
      }
      this.showFor(image)
    })
    this.editorRoot.addEventListener('scroll', () => this.place(), { passive: true })
    window.addEventListener('resize', () => this.place())
    document.addEventListener('mousedown', (event) => {
      const target = event.target as HTMLElement
      if (!this.container.contains(target) && !this.resizeHandle.contains(target) && !target.closest('#editor img')) this.hide()
    })
    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement
      if (!this.container.contains(target) && !this.resizeHandle.contains(target) && !this.editorRoot.contains(target)) this.hide()
    })
  }

  setLanguage(language: Language): void {
    this.language = language
    this.container.setAttribute('aria-label', language === 'en' ? 'Image tools' : language === 'zh-TW' ? '圖片工具' : '图片工具')
    for (const button of this.container.querySelectorAll<HTMLButtonElement>('[data-image-action]')) {
      const action = button.dataset.imageAction as ImageAction
      button.title = imageText[language][action]
      button.setAttribute('aria-label', button.title)
      if (action === 'replace') button.textContent = language === 'en' ? 'Replace' : language === 'zh-TW' ? '取代' : '替换'
      if (action === 'original') button.textContent = language === 'en' ? 'Actual' : language === 'zh-TW' ? '原始' : '原始'
    }
    this.resizeHandle.title = imageText[language].resize
    this.resizeHandle.setAttribute('aria-label', this.resizeHandle.title)
  }

  hide(): void {
    if (this.resizePointerId !== null) return
    this.container.hidden = true
    this.resizeHandle.hidden = true
    this.image = null
    this.positionInDocument = null
  }

  private button(label: string, action: ImageAction, onClick: () => void, width?: string, html = false): HTMLButtonElement {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'image-tool'
    button.dataset.imageAction = action
    if (width) button.dataset.imageWidth = width
    if (action.startsWith('align')) button.dataset.imageAlign = action.slice(5).toLowerCase()
    if (html) button.innerHTML = label
    else button.textContent = label
    button.addEventListener('mousedown', (event) => event.preventDefault())
    button.addEventListener('click', onClick)
    return button
  }

  private separator(): HTMLSpanElement {
    const separator = document.createElement('span')
    separator.className = 'image-toolbar-separator'
    return separator
  }

  private showFor(image: HTMLImageElement): void {
    const view = getActiveEditorView()
    if (!view) return
    let position = view.posAtDOM(image, 0)
    if (view.state.doc.nodeAt(position)?.type.name !== 'image' && view.state.doc.nodeAt(position - 1)?.type.name === 'image') position -= 1
    if (view.state.doc.nodeAt(position)?.type.name !== 'image') return
    this.image = image
    this.positionInDocument = position
    this.container.hidden = false
    this.resizeHandle.hidden = false
    this.syncState()
    this.place()
  }

  private currentPresentation(): ImageLayout {
    if (this.positionInDocument == null) return { width: null, align: 'center' }
    const node = getActiveEditorView()?.state.doc.nodeAt(this.positionInDocument)
    return decodeImageLayout(node?.attrs.title)
  }

  private updatePresentation(patch: Partial<ImageLayout>): void {
    if (this.positionInDocument == null) return
    const next = { ...this.currentPresentation(), ...patch }
    if (this.updateImage({ title: encodeImageLayout(next) })) {
      window.setTimeout(() => {
        this.syncState()
        this.place()
      }, 0)
    }
  }

  private place(): void {
    if (this.container.hidden || !this.image) return
    const imageRect = this.image.getBoundingClientRect()
    const toolbarRect = this.container.getBoundingClientRect()
    const left = Math.max(12, Math.min(window.innerWidth - toolbarRect.width - 12, imageRect.left + (imageRect.width - toolbarRect.width) / 2))
    const above = imageRect.top - toolbarRect.height - 10
    const top = above >= 82 ? above : Math.min(window.innerHeight - toolbarRect.height - 12, imageRect.top + 10)
    this.container.style.left = `${Math.round(left)}px`
    this.container.style.top = `${Math.round(top)}px`
    this.resizeHandle.style.left = `${Math.round(imageRect.right - 8)}px`
    this.resizeHandle.style.top = `${Math.round(imageRect.bottom - 8)}px`
  }

  private syncState(): void {
    if (!this.image) return
    const width = this.image.dataset.beiyeWidth ?? 'auto'
    const align = this.image.dataset.beiyeAlign ?? 'center'
    this.container.querySelectorAll<HTMLButtonElement>('[data-image-width]').forEach((button) => {
      button.classList.toggle('active', button.dataset.imageWidth === width)
    })
    this.container.querySelectorAll<HTMLButtonElement>('[data-image-align]').forEach((button) => {
      button.classList.toggle('active', button.dataset.imageAlign === align)
    })
  }

  private setWidth(width: '50%' | '75%' | null): void {
    this.updatePresentation({ width })
  }

  private setAlignment(align: ImageAlignment): void {
    this.updatePresentation({ align })
  }

  private startResize(event: PointerEvent): void {
    if (!this.image || !event.isPrimary || event.button !== 0) return
    this.resizePointerId = event.pointerId
    this.resizeStartX = event.clientX
    this.resizeStartWidth = this.image.getBoundingClientRect().width
    this.resizeHandle.setPointerCapture(event.pointerId)
    document.body.classList.add('is-resizing-image')
    event.preventDefault()
  }

  private resize(event: PointerEvent): void {
    if (!this.image || event.pointerId !== this.resizePointerId) return
    const editorWidth = this.editorRoot.querySelector<HTMLElement>('.ProseMirror')?.clientWidth ?? this.editorRoot.clientWidth
    const width = Math.round(Math.min(editorWidth, Math.max(24, this.resizeStartWidth + event.clientX - this.resizeStartX)))
    this.image.style.width = `${width}px`
    this.image.dataset.beiyeWidth = `${width}px`
    this.place()
  }

  private finishResize(event: PointerEvent): void {
    if (!this.image || event.pointerId !== this.resizePointerId) return
    const width = Math.round(this.image.getBoundingClientRect().width)
    if (this.resizeHandle.hasPointerCapture(event.pointerId)) this.resizeHandle.releasePointerCapture(event.pointerId)
    this.resizePointerId = null
    document.body.classList.remove('is-resizing-image')
    this.updatePresentation({ width: `${width}px` })
  }

  private async replace(): Promise<void> {
    if (this.positionInDocument == null) return
    const result = await this.chooseReplacement()
    if (!result) return
    this.updateImage({ src: result.fileUrl, alt: result.name })
    window.setTimeout(() => this.place(), 0)
  }

  private async reveal(): Promise<void> {
    if (this.positionInDocument == null) return
    const node = getActiveEditorView()?.state.doc.nodeAt(this.positionInDocument)
    if (node?.type.name === 'image') await this.revealImage(String(node.attrs.src ?? ''))
  }

  private updateImage(attributes: { src?: string; alt?: string; title?: string | null }): boolean {
    if (this.positionInDocument == null) return false
    const view = getActiveEditorView()
    const node = view?.state.doc.nodeAt(this.positionInDocument)
    if (!view || node?.type.name !== 'image') return false
    view.dispatch(view.state.tr.setNodeMarkup(this.positionInDocument, undefined, { ...node.attrs, ...attributes }))
    view.focus()
    return true
  }
}
