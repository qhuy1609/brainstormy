import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

function normalizeAiText(value) {
  let text = String(value ?? '')

  // Some AI/API layers escape Markdown math delimiters. Unescape them so KaTeX can render.
  text = text.replace(/\\\$/g, '$')

  // Convert common LaTeX math delimiters to remark-math delimiters.
  text = text.replace(/\\\((.*?)\\\)/gs, (_, math) => `$${math}$`)
  text = text.replace(/\\\[(.*?)\\\]/gs, (_, math) => `$$${math}$$`)

  // Keep numbered items readable if the model returns them on one long line.
  text = text.replace(/\s+(\d+\.\s+)/g, '\n$1')

  return text.trim()
}

export default function MathText({ children, inline = false }) {
  const normalized = normalizeAiText(children)

  return (
    <span className={inline ? 'math-text math-text-inline' : 'math-text'}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }) => inline ? <span>{children}</span> : <p>{children}</p>,
        }}
      >
        {normalized}
      </ReactMarkdown>
    </span>
  )
}
