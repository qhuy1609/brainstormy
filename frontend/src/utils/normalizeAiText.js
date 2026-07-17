export function normalizeAiText(value) {
  let text = String(value ?? '')

  text = text.replace(/\\\$/g, '$')
  text = text.replace(/\\\((.*?)\\\)/gs, (_, math) => `$${math}$`)
  text = text.replace(/\\\[(.*?)\\\]/gs, (_, math) => `\n\n$$${math}$$\n\n`)
  text = text.replace(/\\text\{\s*([^{}]+?)\s*\}/g, (_, units) => `\\mathrm{${units}}`)

  return text.trim()
}

export function isSymbolicFinalAnswer(value) {
  const text = String(value ?? '').trim()
  return /^\$(?!\$)[\s\S]+\$(?!\$)$/.test(text)
}
