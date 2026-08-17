import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '..')
const read = (path: string): string => readFileSync(resolve(root, path), 'utf8')

test('项目主页默认英文并提供中文切换', () => {
  const html = read('docs/index.html')
  const script = read('docs/home.js')

  assert.match(html, /<html lang="en" data-language="en">/u)
  assert.match(html, /data-language-option="en"[^>]*aria-pressed="true"/u)
  assert.match(html, /data-language-option="zh"[^>]*aria-pressed="false"/u)
  assert.match(html, /data-copy="en"/u)
  assert.match(html, /data-copy="zh"/u)
  assert.match(script, /const defaultLanguage = 'en'/u)
  assert.match(script, /localStorage\.setItem/u)
  assert.match(script, /URLSearchParams/u)
})

test('项目主页包含下载、源码、产品截图与静态发布入口', () => {
  const html = read('docs/index.html')
  const css = read('docs/home.css')

  assert.match(html, /releases\/latest/u)
  assert.match(html, /github\.com\/chenzhiyong1994\/BeiyeMD/u)
  assert.match(html, /screenshots\/beiyemd-workspace\.png/u)
  assert.match(css, /@media \(max-width: 620px\)/u)
  assert.match(css, /prefers-reduced-motion/u)
  assert.equal(existsSync(resolve(root, 'docs/.nojekyll')), true)
})
