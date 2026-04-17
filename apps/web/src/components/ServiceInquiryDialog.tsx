import { FormEvent, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { notify } from '@/stores/notifications'

interface ServiceInquiryDialogProps {
  open: boolean
  title: string
  serviceName: string
  onClose: () => void
}

const CONTACT_EMAIL = 'sales@inkle.io'

export function ServiceInquiryDialog({ open, title, serviceName, onClose }: ServiceInquiryDialogProps) {
  const nameRef = useRef<HTMLInputElement | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (open) {
      nameRef.current?.focus()
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
      }
      window.addEventListener('keydown', handler)
      return () => window.removeEventListener('keydown', handler)
    }
  }, [open, onClose])

  if (!open) return null

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const body = `Service: ${serviceName}\n\n${message || '(no additional details provided)'}\n\n— ${name || 'Unnamed founder'}`
    const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`${serviceName} inquiry`)}&body=${encodeURIComponent(body)}`
    window.location.href = mailto
    notify({
      title: 'Request received',
      message: `Our team will reach out about ${serviceName} within 1 business day.`,
      tone: 'success',
    })
    setName('')
    setEmail('')
    setMessage('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#061b31]/35" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md max-w-[calc(100vw-1.5rem)] rounded-lg border border-[#e5edf5] bg-white shadow-[rgba(50,50,93,0.25)_0px_30px_45px_-30px,rgba(0,0,0,0.1)_0px_18px_36px_-18px]"
      >
        <div className="flex items-center justify-between border-b border-[#e5edf5] px-4 sm:px-6 py-3 sm:py-4">
          <h2 className="text-[17px] text-[#061b31]" style={{ fontWeight: 400 }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded text-[#64748d] transition-colors hover:bg-[#f6f9fc] hover:text-[#061b31]"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>
        <form className="px-4 sm:px-6 py-4 sm:py-5 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label htmlFor="inquiry-name" className="text-[13px] text-[#273951]">Your name</label>
            <input
              ref={nameRef}
              id="inquiry-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-[#e5edf5] px-3 py-2 text-[13px] text-[#061b31] placeholder:text-[#64748d] focus:outline-none focus:border-[#533afd]"
              placeholder="Jane Founder"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="inquiry-email" className="text-[13px] text-[#273951]">Work email</label>
            <input
              id="inquiry-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-[#e5edf5] px-3 py-2 text-[13px] text-[#061b31] placeholder:text-[#64748d] focus:outline-none focus:border-[#533afd]"
              placeholder="you@company.com"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="inquiry-message" className="text-[13px] text-[#273951]">What can we help with?</label>
            <textarea
              id="inquiry-message"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full resize-none rounded border border-[#e5edf5] px-3 py-2 text-[13px] text-[#061b31] placeholder:text-[#64748d] focus:outline-none focus:border-[#533afd]"
              placeholder="Brief context, jurisdiction, timing…"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-[#e5edf5] bg-white px-3 py-2 text-[13px] text-[#273951] transition-colors hover:bg-[#f6f9fc]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded bg-[#533afd] px-4 py-2 text-[13px] text-white transition-colors hover:bg-[#4434d4]"
            >
              Send inquiry
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
