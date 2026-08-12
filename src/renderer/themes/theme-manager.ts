const themes: Record<string, string> = {
  light: 'theme-light',
  dark: 'theme-dark',
  mist: 'theme-mist',
  sage: 'theme-sage',
  graphite: 'theme-graphite'
}

export function applyTheme(name: string): void {
  const body = document.body
  Object.values(themes).forEach(cls => body.classList.remove(cls))
  const nextTheme = themes[name] ? name : 'light'
  body.classList.add(themes[nextTheme])
  localStorage.setItem('beiyemd-theme', nextTheme)
}

export function loadSavedTheme(): string {
  const savedTheme = localStorage.getItem('beiyemd-theme') || 'light'
  return themes[savedTheme] ? savedTheme : 'light'
}
