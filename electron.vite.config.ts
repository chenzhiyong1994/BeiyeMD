import { defineConfig } from 'electron-vite'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = dirname(fileURLToPath(import.meta.url))
const fromRoot = (...segments: string[]) => resolve(projectRoot, ...segments)
const processBundle = (source: string, output: string) => ({
  build: {
    outDir: fromRoot('dist', output),
    rollupOptions: { input: fromRoot('src', source, 'index.ts') }
  }
})

export default defineConfig({
  main: processBundle('main', 'main'),
  preload: processBundle('preload', 'preload'),
  renderer: {
    root: fromRoot('src', 'renderer'),
    build: {
      outDir: fromRoot('dist', 'renderer'),
      rollupOptions: { input: fromRoot('src', 'renderer', 'index.html') }
    }
  }
})
