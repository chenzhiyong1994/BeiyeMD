import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '..')
const read = (path: string): string => readFileSync(resolve(root, path), 'utf8')

test('v1.1.0 发布配置显式生成两种 macOS 架构', () => {
  const packageJson = JSON.parse(read('package.json')) as { version: string; engines: { node: string } }
  const builder = read('electron-builder.yml')
  const workflow = read('.github/workflows/release.yml')

  assert.equal(packageJson.version, '1.1.0')
  assert.match(packageJson.engines.node, /22/u)
  assert.match(builder, /artifactName:.*\$\{arch\}/u)
  assert.match(builder, /identity:\s*["']-["']/u)
  assert.match(builder, /notarize:\s*false/u)
  assert.match(workflow, /macos-15-intel/u)
  assert.match(workflow, /architecture:\s*arm64/u)
  assert.match(workflow, /architecture:\s*x64/u)
  assert.match(workflow, /electron-builder --mac dmg --\$\{\{ matrix\.architecture \}\}/u)
})

test('macOS CI 验证临时签名、架构、文件关联、DMG 和随附声明', () => {
  const workflow = read('.github/workflows/release.yml')

  for (const evidence of [
    'plutil -lint resources/macos-entitlements.plist',
    'codesign --verify --deep --strict',
    'Signature=adhoc',
    'CFBundleDocumentTypes',
    'THIRD_PARTY_NOTICES.txt',
    'ELECTRON_THIRD_PARTY_NOTICES.html',
    'hdiutil attach',
    'SHA256SUMS.txt'
  ]) assert.ok(workflow.includes(evidence), `发布工作流缺少：${evidence}`)
})

test('macOS 权限文件可由 Apple plist 工具安全解析', () => {
  const entitlements = read('resources/macos-entitlements.plist')

  assert.doesNotMatch(entitlements, /<!--/u)
  assert.match(entitlements, /com\.apple\.security\.cs\.allow-jit/u)
})

test('双平台下载与未认证安装说明属于 v1.1.0 发布材料', () => {
  const chineseReadme = read('README_CN.md')
  const englishReadme = read('README.md')
  const releaseNotes = read('docs/releases/v1.1.0.md')
  const installation = read('docs/macos-installation.md')

  for (const text of [chineseReadme, englishReadme, releaseNotes]) {
    assert.match(text, /arm64/u)
    assert.match(text, /x64/u)
  }
  assert.match(chineseReadme, /未经 Apple 公证/u)
  assert.match(englishReadme, /not notarized by Apple/iu)
  assert.match(installation, /隐私与安全性/u)
  assert.match(installation, /仍要打开/u)
  assert.match(installation, /Privacy & Security/u)
  assert.match(installation, /Open Anyway/u)
})
