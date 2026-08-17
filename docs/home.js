(() => {
  const defaultLanguage = 'en'
  const storageKey = 'beiyemd-home-language'
  const supportedLanguages = new Set(['en', 'zh'])
  const languageDetails = {
    en: {
      htmlLanguage: 'en',
      title: 'BeiyeMD · A lighter way to open Markdown',
      description: 'BeiyeMD is a lightweight, local-first Markdown reader and editor for Windows and macOS.'
    },
    zh: {
      htmlLanguage: 'zh-CN',
      title: '北页 BeiyeMD · 一个更轻快的 Markdown 打开方式',
      description: '北页是一款轻巧、本地优先的 Windows 与 macOS Markdown 阅读和编辑器。'
    }
  }

  const readStoredLanguage = () => {
    try {
      return window.localStorage.getItem(storageKey)
    } catch {
      return null
    }
  }

  const writeStoredLanguage = (language) => {
    try {
      window.localStorage.setItem(storageKey, language)
    } catch {
      // The language switch still works when storage is unavailable.
    }
  }

  const requestedLanguage = new URLSearchParams(window.location.search).get('lang')
  const storedLanguage = readStoredLanguage()
  const initialLanguage = supportedLanguages.has(requestedLanguage)
    ? requestedLanguage
    : supportedLanguages.has(storedLanguage)
      ? storedLanguage
      : defaultLanguage

  const setLanguage = (language, { persist = true, updateUrl = true } = {}) => {
    if (!supportedLanguages.has(language)) return

    const details = languageDetails[language]
    document.documentElement.dataset.language = language
    document.documentElement.lang = details.htmlLanguage
    document.title = details.title
    document.querySelector('meta[name="description"]')?.setAttribute('content', details.description)

    for (const button of document.querySelectorAll('[data-language-option]')) {
      const active = button.dataset.languageOption === language
      button.setAttribute('aria-pressed', String(active))
    }

    if (persist) writeStoredLanguage(language)

    if (updateUrl) {
      const url = new URL(window.location.href)
      if (language === defaultLanguage) url.searchParams.delete('lang')
      else url.searchParams.set('lang', language)
      window.history.replaceState({}, '', url)
    }
  }

  for (const button of document.querySelectorAll('[data-language-option]')) {
    button.addEventListener('click', () => setLanguage(button.dataset.languageOption))
  }

  setLanguage(initialLanguage, { persist: false, updateUrl: false })
})()
