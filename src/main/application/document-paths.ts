import { realpathSync } from 'node:fs'
import { resolve } from 'node:path'

export type DesktopPlatform = 'win32' | 'darwin' | 'linux'

export function documentFileNameMatches(left: string, right: string, platform: DesktopPlatform = process.platform as DesktopPlatform): boolean {
  return platform === 'win32'
    ? left.toLocaleLowerCase('en-US') === right.toLocaleLowerCase('en-US')
    : left === right
}

export function canonicalDocumentPath(value: string, platform: DesktopPlatform = process.platform as DesktopPlatform): string {
  const normalized = resolve(value)
  let physicalPath = normalized
  try {
    physicalPath = realpathSync.native(normalized)
  } catch {
    // New save targets do not exist yet; their resolved path is still a stable key.
  }
  return platform === 'win32' ? physicalPath.toLocaleLowerCase('en-US') : physicalPath
}
