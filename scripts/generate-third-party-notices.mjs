import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { basename, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const lock = JSON.parse(readFileSync(resolve(root, 'package-lock.json'), 'utf8'))
const candidates = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license', 'license.md', 'license.txt', 'COPYING', 'COPYING.md']
const overrides = new Map([
  ['remark-math', resolve(root, 'scripts/license-overrides/remark-math.txt')]
])

function packageIdentity(directory, metadata) {
  const manifestPath = resolve(root, directory, 'package.json')
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {}
  return {
    name: manifest.name ?? metadata.name ?? basename(directory),
    version: manifest.version ?? metadata.version ?? 'unknown',
    license: manifest.license ?? metadata.license ?? 'unknown'
  }
}

function licenseText(directory, name) {
  const override = overrides.get(name)
  if (override) return { source: 'project override verified against the official repository', text: readFileSync(override, 'utf8') }
  for (const candidate of candidates) {
    const path = resolve(root, directory, candidate)
    if (existsSync(path)) return { source: `${directory}/${candidate}`, text: readFileSync(path, 'utf8') }
  }
  throw new Error(`Missing license text for ${name} (${directory})`)
}

const packages = Object.entries(lock.packages)
  .filter(([directory, metadata]) => directory && (metadata.dev !== true || directory === 'node_modules/electron'))
  .map(([directory, metadata]) => ({ directory, ...packageIdentity(directory, metadata) }))
  .sort((left, right) => left.name.localeCompare(right.name) || left.version.localeCompare(right.version) || left.directory.localeCompare(right.directory))

const groups = new Map()
for (const entry of packages) {
  const license = licenseText(entry.directory, entry.name)
  const normalized = license.text
    .replace(/\r\n/gu, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim()
  const group = groups.get(normalized) ?? { packages: [], sources: new Set() }
  group.packages.push(`${entry.name}@${entry.version} (${entry.license})`)
  group.sources.add(license.source)
  groups.set(normalized, group)
}

const sections = [...groups.entries()]
  .sort(([, left], [, right]) => left.packages[0].localeCompare(right.packages[0]))
  .map(([license, group]) => [
    '-'.repeat(78),
    group.packages.join('\n'),
    `License source(s): ${[...group.sources].sort().join('; ')}`,
    '',
    license
  ].join('\n'))

const header = [
  'BeiyeMD Third-Party Software Notices',
  '=====================================',
  '',
  'This file contains license texts for third-party packages distributed with',
  'BeiyeMD. The packages listed here are independent open-source components;',
  'their inclusion does not change the license or product identity of BeiyeMD.',
  '',
  `Generated from package-lock.json: ${packages.length} installed package entries, ${groups.size} distinct license texts.`,
  'Electron also distributes Chromium/Node third-party notices in ELECTRON_THIRD_PARTY_NOTICES.html.',
  'Run `npm run legal:notices` after changing dependencies.',
  ''
].join('\n')

writeFileSync(resolve(root, 'THIRD_PARTY_NOTICES.txt'), `${header}${sections.join('\n\n')}\n`, 'utf8')
const electronNotices = resolve(root, 'node_modules/electron/dist/LICENSES.chromium.html')
if (!existsSync(electronNotices)) throw new Error('Missing Electron Chromium third-party notice bundle')
writeFileSync(resolve(root, 'ELECTRON_THIRD_PARTY_NOTICES.html'), readFileSync(electronNotices))
console.log(`Generated THIRD_PARTY_NOTICES.txt for ${packages.length} package entries (${groups.size} license texts).`)
console.log('Copied Electron Chromium/Node notices to ELECTRON_THIRD_PARTY_NOTICES.html.')
