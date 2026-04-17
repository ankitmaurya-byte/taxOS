// Shared assistant message renderer: markdown body + metadata footer (confidence, sources, CPA review).
import type React from 'react'
import { AlertTriangle, BookOpen } from 'lucide-react'

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[\s\S]+?\*\*|\*[^*\n]+\*|`[^`\n]+`|\[[^\]]+\]\([^)]+\))/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4)
      return <strong key={i} className="font-semibold text-[#061b31]">{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2)
      return <em key={i} className="italic">{part.slice(1, -1)}</em>
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2)
      return <code key={i} className="bg-[#f6f9fc] border border-[#e5edf5] px-1 py-0.5 rounded text-[11px] font-mono">{part.slice(1, -1)}</code>
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (link)
      return <a key={i} href={link[2]} target="_blank" rel="noreferrer" className="text-[#533afd] underline-offset-2 hover:underline">{link[1]}</a>
    return <span key={i}>{part}</span>
  })
}

export function MarkdownBody({ text }: { text: string }) {
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []
  let i = 0
  let k = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('```')) {
      const buf: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        buf.push(lines[i])
        i++
      }
      if (i < lines.length) i++
      nodes.push(
        <pre key={k++} className="my-2 bg-[#f6f9fc] border border-[#e5edf5] rounded-md p-2 overflow-x-auto text-[11px] font-mono text-[#273951]">
          <code>{buf.join('\n')}</code>
        </pre>
      )
      continue
    }

    if (line.startsWith('### ')) {
      nodes.push(
        <h3 key={k++} className="text-[13px] font-bold text-[#061b31] mt-3 mb-1 first:mt-0">
          {renderInline(line.slice(4))}
        </h3>
      )
      i++
    } else if (line.startsWith('## ')) {
      nodes.push(
        <h2 key={k++} className="text-sm font-bold text-[#061b31] mt-4 mb-1.5 first:mt-0">
          {renderInline(line.slice(3))}
        </h2>
      )
      i++
    } else if (line.startsWith('# ')) {
      nodes.push(
        <h1 key={k++} className="text-sm font-bold text-[#061b31] mt-4 mb-1.5 first:mt-0">
          {renderInline(line.slice(2))}
        </h1>
      )
      i++
    } else if (/^\s*(\d+\.|\*|-)\s/.test(line)) {
      const isOrdered = /^\s*\d+\./.test(line)
      const items: { text: string; indent: number }[] = []
      while (i < lines.length && /^\s*(\d+\.|\*|-)\s/.test(lines[i])) {
        const indent = lines[i].match(/^(\s*)/)?.[1].length ?? 0
        const itemText = lines[i].replace(/^\s*(\d+\.|\*|-)\s+/, '')
        items.push({ text: itemText, indent })
        i++
      }
      const Tag = isOrdered ? 'ol' : 'ul'
      nodes.push(
        <Tag key={k++} className={`my-2 space-y-1 ${isOrdered ? 'list-decimal' : 'list-disc'} pl-5 marker:text-[#533afd]`}>
          {items.map((item, j) => (
            <li
              key={j}
              className="text-[13px] text-[#273951] leading-relaxed"
              style={{ marginLeft: item.indent > 0 ? item.indent * 3 : 0 }}
            >
              {renderInline(item.text)}
            </li>
          ))}
        </Tag>
      )
    } else if (line.trim() === '') {
      i++
    } else {
      const paras: string[] = []
      while (
        i < lines.length &&
        lines[i].trim() !== '' &&
        !lines[i].startsWith('#') &&
        !lines[i].startsWith('```') &&
        !/^\s*(\d+\.|\*|-)\s/.test(lines[i])
      ) {
        paras.push(lines[i])
        i++
      }
      nodes.push(
        <p key={k++} className="text-[13px] text-[#273951] leading-relaxed my-1">
          {renderInline(paras.join(' '))}
        </p>
      )
    }
  }

  return <div className="space-y-0.5">{nodes}</div>
}

function getSourceUrl(source: string): string {
  const pubMatch = source.match(/IRS\s+Publication\s+(\d+)/i)
  if (pubMatch) return `https://www.irs.gov/publications/p${pubMatch[1]}`
  const ircMatch = source.match(/I\.?R\.?C\.?\s*§\s*(\d+)/i)
  if (ircMatch) return `https://www.law.cornell.edu/uscode/text/26/${ircMatch[1]}`
  const formMatch = source.match(/(?:IRS\s+)?Form\s+([\dA-Z-]+)/i)
  if (formMatch) return `https://www.irs.gov/forms-instructions/about-form-${formMatch[1].toLowerCase()}`
  return `https://www.google.com/search?q=${encodeURIComponent(source)}`
}

function extractMeta(content: string): { body: string; meta: Record<string, unknown> | null } {
  const idx = content.indexOf('\nMETADATA:')
  if (idx === -1) return { body: content.trim(), meta: null }
  const jsonPart = content.slice(idx).replace(/^\nMETADATA:\s*\n?/, '').trim()
  try {
    return { body: content.slice(0, idx).trim(), meta: JSON.parse(jsonPart) }
  } catch {
    return { body: content.trim(), meta: null }
  }
}

function MetaFooter({ meta }: { meta: Record<string, unknown> }) {
  const conf = meta.confidence as string | undefined
  const confStyle =
    conf === 'HIGH' ? 'text-[#065F46] bg-[#ECFDF5] border-[#A7F3D0]' :
    conf === 'MEDIUM' ? 'text-[#92400E] bg-[#FFFBEB] border-[#FDE68A]' :
    conf === 'LOW' ? 'text-[#991B1B] bg-[#FEF2F2] border-[#FECACA]' :
    'text-[#64748d] bg-[#f6f9fc] border-[#e5edf5]'

  const sources = Array.isArray(meta.sources) ? meta.sources as string[] : []

  return (
    <div className="mt-3 pt-3 border-t border-[#e5edf5] space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {conf && (
          <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border ${confStyle}`} style={{ fontWeight: 400 }}>
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
            {conf} CONFIDENCE
          </span>
        )}
        {Boolean(meta.requiresCpaReview) && (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border text-[#7a4f1f] bg-[rgba(155,104,41,0.12)] border-[rgba(155,104,41,0.25)]" style={{ fontWeight: 400 }}>
            <AlertTriangle size={9} />
            CPA Review Recommended
          </span>
        )}
      </div>
      {typeof meta.cpaEscalationReason === 'string' && meta.cpaEscalationReason && (
        <p className="text-[11px] text-[#64748d] leading-relaxed">{meta.cpaEscalationReason}</p>
      )}
      {sources.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <BookOpen size={11} className="text-[#64748d] flex-shrink-0" />
          {sources.map((src, i) => (
            <a
              key={i}
              href={getSourceUrl(src)}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-[#533afd] bg-[#f6f9fc] border border-[#D8D3FF] px-1.5 py-0.5 rounded hover:bg-[#EDE9FD] transition-colors underline-offset-2 hover:underline"
            >
              {src}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

export function MessageContent({ content }: { content: string }) {
  const { body, meta } = extractMeta(content)
  return (
    <div>
      <MarkdownBody text={body} />
      {meta && <MetaFooter meta={meta} />}
    </div>
  )
}
