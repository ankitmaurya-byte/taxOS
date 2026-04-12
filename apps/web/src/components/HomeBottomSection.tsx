import { useState } from 'react'
import {
  Copy,
  Gift,
  Mail,
  Linkedin,
  Twitter,
  MessageCircle,
  ArrowRight,
  ChevronRight,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth'

/* ─── Referral Card ─── */
function ReferralCard() {
  const user = useAuthStore((s) => s.user)
  const [copied, setCopied] = useState(false)
  const referralLink = `https://app.inkle.io/signup/?ref=${user?.email || 'taxos-user'}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* fallback: do nothing */ }
  }

  const shareLinks = [
    {
      icon: Mail,
      label: 'Email',
      href: `mailto:?subject=${encodeURIComponent('Join Inkle — we both get $100')}&body=${encodeURIComponent(`Check out Inkle for tax compliance:\n${referralLink}`)}`,
    },
    {
      icon: Twitter,
      label: 'X (Twitter)',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`I use @inkloHQ for tax compliance and love it. Join using my link and we both get $100 in credits:\n${referralLink}`)}`,
    },
    {
      icon: Linkedin,
      label: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`,
    },
    {
      icon: MessageCircle,
      label: 'WhatsApp',
      href: `https://wa.me/?text=${encodeURIComponent(`Join Inkle for tax compliance! We both get $100 in credits: ${referralLink}`)}`,
    },
  ]

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#F5F3FF] p-6 shadow-sm">
      {/* Content */}
      <div className="relative z-10">
        <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#6C5CE7] shadow-sm">
          <Gift size={18} />
        </div>
        <h3 className="text-lg font-semibold text-[#111827]">
          Invite a founder, earn $100 each
        </h3>
        <p className="mt-1 text-sm text-[#6B7280]">
          Refer someone to Inkle. When they join, you both receive $100 in Inkle credits.
        </p>

        {/* Referral link box */}
        <div className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5">
          <span className="min-w-0 truncate text-sm text-[#374151]">{referralLink}</span>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 rounded-md p-1.5 text-[#9CA3AF] transition-colors hover:bg-[#F3F0FF] hover:text-[#6C5CE7]"
            aria-label="Copy referral link"
          >
            <Copy size={16} />
          </button>
        </div>
        {copied && (
          <span className="mt-2 inline-block rounded-full bg-[#EDE9FD] px-2.5 py-1 text-xs font-medium text-[#6C5CE7]">
            Copied to clipboard!
          </span>
        )}

        {/* Share icons */}
        <div className="mt-4">
          <p className="text-sm text-[#6B7280]">Share via</p>
          <div className="mt-2 flex items-center gap-3">
            {shareLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#6B7280] transition-colors hover:bg-white hover:text-[#6C5CE7] hover:shadow-sm"
                aria-label={`Share via ${link.label}`}
                title={link.label}
              >
                <link.icon size={18} />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute -right-6 -bottom-6 h-32 w-32 rounded-full bg-[#E9E4FF] opacity-50" />
      <div className="absolute -right-2 -bottom-2 h-20 w-20 rounded-2xl bg-[#DDD6FE] opacity-30 rotate-12" />
    </div>
  )
}

/* ─── Promo / Ad Card ─── */
function PromoCard() {
  const [activeSlide, setActiveSlide] = useState(0)

  const slides = [
    {
      title: 'Brex offers the highest-returning, lowest-risk treasury product. Period.',
      subtitle:
        'Switch to Brex and earn up to 4.35%+ with same-hour liquidity, no minimums, no hidden fees. That\'s smarter spending.',
      cta: 'Apply now',
      ctaHref: '#',
      bg: 'bg-[#EEF6FF]',
    },
    {
      title: 'Mercury — banking built for startups that scale.',
      subtitle:
        'Open a free business checking account in minutes. No fees, FDIC-insured, and powerful financial tools.',
      cta: 'Get started',
      ctaHref: '#',
      bg: 'bg-[#F0FDF4]',
    },
    {
      title: 'Carta — equity management simplified.',
      subtitle:
        'Manage your cap table, 409A valuations, and equity plans all in one platform trusted by 40,000+ companies.',
      cta: 'Learn more',
      ctaHref: '#',
      bg: 'bg-[#FFFBEB]',
    },
  ]

  const current = slides[activeSlide]

  return (
    <div className={`relative overflow-hidden rounded-2xl ${current.bg} p-6 shadow-sm`}>
      <div className="relative z-10">
        <h3 className="text-lg font-semibold text-[#111827] leading-snug">
          {current.title}
        </h3>
        <p className="mt-2 text-sm text-[#6B7280] leading-relaxed">
          {current.subtitle}
        </p>

        <a
          href={current.ctaHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-[#374151] shadow-sm transition-colors hover:bg-[#F9FAFB]"
        >
          {current.cta}
          <ChevronRight size={14} />
        </a>

        {/* Carousel dots */}
        <div className="mt-6 flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveSlide(i)}
              className={`h-2 rounded-full transition-all ${
                i === activeSlide
                  ? 'w-6 bg-[#374151]'
                  : 'w-2 bg-[#D1D5DB] hover:bg-[#9CA3AF]'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/30" />
      <div className="absolute -right-4 bottom-4 h-24 w-24 rounded-full bg-white/20" />
    </div>
  )
}

/* ─── Main Export ─── */
export function HomeBottomSection() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ReferralCard />
        <PromoCard />
      </div>
    </div>
  )
}
