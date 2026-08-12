function splitPath(value: string): string[] {
  return value.replace(/\\/g, '/').split('/').filter(Boolean)
}

function documentDirectory(documentPath: string): string {
  const normalized = documentPath.replace(/\\/g, '/')
  return normalized.slice(0, Math.max(0, normalized.lastIndexOf('/')))
}

function relativePath(fromDirectory: string, targetPath: string): string {
  const from = splitPath(fromDirectory)
  const target = splitPath(targetPath)
  const insensitive = /^[A-Za-z]:/.test(from[0] ?? '') && /^[A-Za-z]:/.test(target[0] ?? '')
  let common = 0
  while (common < from.length && common < target.length) {
    const left = insensitive ? from[common].toLocaleLowerCase() : from[common]
    const right = insensitive ? target[common].toLocaleLowerCase() : target[common]
    if (left !== right) break
    common += 1
  }
  if (common === 0 && insensitive) return targetPath.replace(/\\/g, '/')
  const result = [...Array.from({ length: from.length - common }, () => '..'), ...target.slice(common)].join('/')
  return result || '.'
}

function assetUrlFromPath(path: string): string {
  return `beiye-asset://local/${encodeURIComponent(path.replace(/\\/g, '/'))}`
}

function pathFromLocalUrl(source: string): string | null {
  try {
    const url = new URL(source)
    if (url.protocol === 'beiye-asset:') return decodeURIComponent(url.pathname.slice(1))
    if (url.protocol !== 'file:') return null
    let pathname = decodeURIComponent(url.pathname)
    if (/^\/[A-Za-z]:/.test(pathname)) pathname = pathname.slice(1)
    return pathname
  } catch {
    return null
  }
}

function transformMarkdownImages(markdown: string, transform: (source: string) => string): string {
  return markdown.replace(/(!\[[^\]]*\]\()(<[^>]+>|[^\s)]+)([^)]*\))/g, (_match, prefix: string, rawSource: string, suffix: string) => {
    const wrapped = rawSource.startsWith('<') && rawSource.endsWith('>')
    const source = wrapped ? rawSource.slice(1, -1) : rawSource
    const nextSource = transform(source)
    return `${prefix}${wrapped ? `<${nextSource}>` : nextSource}${suffix}`
  })
}

export function resolveMarkdownImagePaths(markdown: string, documentPath: string | null | undefined): string {
  if (!documentPath) return markdown
  const directory = documentDirectory(documentPath)
  return transformMarkdownImages(markdown, (source) => {
    if (/^(?:https?:|data:|blob:|file:|beiye-asset:)/i.test(source) || source.startsWith('#')) return source
    const [pathPart, fragment = ''] = source.split(/(?=[?#])/u, 2)
    const absolute = `${directory}/${decodeURIComponent(pathPart)}`
    return `${assetUrlFromPath(absolute)}${fragment}`
  })
}

export function makeMarkdownImagePathsPortable(markdown: string, documentPath: string | null | undefined): string {
  if (!documentPath) return markdown
  const directory = documentDirectory(documentPath)
  return transformMarkdownImages(markdown, (source) => {
    if (!/^(?:file:|beiye-asset:)/i.test(source)) return source
    const filePath = pathFromLocalUrl(source)
    return filePath ? relativePath(directory, filePath) : source
  })
}

export function extractLocalImageSources(markdown: string): string[] {
  const sources: string[] = []
  transformMarkdownImages(markdown, (source) => {
    if (!/^(?:https?:|data:|blob:)/i.test(source)) sources.push(source)
    return source
  })
  return [...new Set(sources)]
}
