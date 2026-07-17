import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { normalizeAiText } from '../utils/normalizeAiText.js'

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
