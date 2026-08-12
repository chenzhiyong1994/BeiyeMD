import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { nativeImage } from 'electron'

import type { ImageAssetInput, ImageAssetResult } from '../../shared/contracts'

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'])

export function imageMimeType(path: string): string | null {
  switch (extname(path).toLocaleLowerCase('en-US')) {
    case '.png': return 'image/png'
    case '.jpg':
    case '.jpeg': return 'image/jpeg'
    case '.gif': return 'image/gif'
    case '.webp': return 'image/webp'
    case '.bmp': return 'image/bmp'
    case '.svg': return 'image/svg+xml'
    default: return null
  }
}

export function assetUrl(path: string): string {
  return `beiye-asset://local/${encodeURIComponent(path.replaceAll('\\', '/'))}`
}

export function pathFromAssetUrl(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.protocol !== 'beiye-asset:') return null
    return decodeURIComponent(url.pathname.slice(1))
  } catch {
    return null
  }
}

function safeImageName(input: ImageAssetInput): { stem: string; extension: string } {
  const suppliedExtension = extname(input.name).toLocaleLowerCase('en-US')
  const mimeExtension = input.type === 'image/jpeg'
    ? '.jpg'
    : input.type === 'image/svg+xml'
      ? '.svg'
      : input.type.startsWith('image/') ? `.${input.type.slice(6)}` : '.png'
  const extension = IMAGE_EXTENSIONS.has(suppliedExtension)
    ? suppliedExtension
    : IMAGE_EXTENSIONS.has(mimeExtension) ? mimeExtension : '.png'
  const rawStem = basename(input.name || 'image', suppliedExtension)
  const stem = rawStem.replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/gu, '').slice(0, 64)
  return { stem: stem || 'image', extension }
}

export class AssetFiles {
  async store(documentPath: string, images: readonly ImageAssetInput[]): Promise<ImageAssetResult[]> {
    const directory = join(dirname(documentPath), 'assets')
    await mkdir(directory, { recursive: true })
    const saved: ImageAssetResult[] = []

    for (const [index, image] of images.entries()) {
      if (!image?.type.startsWith('image/') || !(image.data instanceof ArrayBuffer)) continue
      const { stem, extension } = safeImageName(image)
      const stamp = `${Date.now().toString(36)}-${index + 1}`
      let name = `${stem}-${stamp}${extension}`
      let path = join(directory, name)
      let collision = 2
      while (existsSync(path)) {
        name = `${stem}-${stamp}-${collision++}${extension}`
        path = join(directory, name)
      }

      const bytes = Buffer.from(image.data)
      await writeFile(path, bytes)
      const decoded = nativeImage.createFromBuffer(bytes).getSize()
      saved.push({
        name: stem,
        relativePath: relative(dirname(documentPath), path).replaceAll('\\', '/'),
        fileUrl: assetUrl(path),
        documentPath,
        width: positiveDimension(image.width) ?? positiveDimension(decoded.width),
        height: positiveDimension(image.height) ?? positiveDimension(decoded.height)
      })
    }

    return saved
  }

  async read(path: string): Promise<ArrayBuffer> {
    const bytes = await readFile(path)
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  }

  resolve(documentPath: string, source: string): string | null {
    try {
      if (source.startsWith('beiye-asset:')) return pathFromAssetUrl(source)
      if (source.startsWith('file:')) return fileURLToPath(source.split(/[?#]/u, 1)[0])
      if (/^(?:https?:|data:|blob:)/iu.test(source)) return null
      const normalized = decodeURIComponent(source.replace(/^<|>$/gu, '').split(/[?#]/u, 1)[0])
      return resolve(dirname(documentPath), normalized)
    } catch {
      return null
    }
  }
}

function positiveDimension(value: number | undefined): number | null {
  return Number.isFinite(value) && Number(value) > 0 ? Math.round(Number(value)) : null
}
