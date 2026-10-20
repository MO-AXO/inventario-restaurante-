export const MAX_PEDIDO_LINE = 120
export const MAX_PEDIDO_LINES = 40
export const MAX_NAME = 40

// Nombre de quien hace el pedido: sin espacios de más ni saltos de línea, con un largo razonable.
export function cleanName(raw: string): string {
  return (typeof raw === 'string' ? raw : '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME)
}

// Cada l\u00ednea del texto es un pedido. Se limpia el formato de lista (-, *, 1.) y se ignoran las vac\u00edas y repetidas.
export function splitLines(raw: string): string[] {
  const seen = new Set<string>()
  const lines: string[] = []
  for (const line of raw.split(/\r?\n/)) {
    const clean = line
      .replace(/^\s*(?:[-*\u2022\u00b7]|\d+[.)])\s*/, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_PEDIDO_LINE)
    if (!clean) continue
    const key = clean.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    lines.push(clean)
  }
  return lines
}
