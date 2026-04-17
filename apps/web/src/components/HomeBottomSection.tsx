import { useEffect, useState } from "react";
import {
  Copy,
  Gift,
  Mail,
  Linkedin,
  Twitter,
  MessageCircle,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth";

/* ─── Referral Card ─── */
function ReferralCard() {
  const user = useAuthStore((s) => s.user);
  const [copied, setCopied] = useState(false);
  const referralLink = `https://app.inkle.io/signup/?ref=${user?.email || "taxos-user"}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback: do nothing */
    }
  };

  const shareLinks = [
    {
      icon: Mail,
      label: "Email",
      href: `mailto:?subject=${encodeURIComponent("Join Inkle — we both get $100")}&body=${encodeURIComponent(`Check out Inkle for tax compliance:\n${referralLink}`)}`,
    },
    {
      icon: Twitter,
      label: "X (Twitter)",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`I use @inkloHQ for tax compliance and love it. Join using my link and we both get $100 in credits:\n${referralLink}`)}`,
    },
    {
      icon: Linkedin,
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`,
    },
    {
      icon: MessageCircle,
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodeURIComponent(`Join Inkle for tax compliance! We both get $100 in credits: ${referralLink}`)}`,
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-lg bg-[#f6f9fc] p-6 shadow-sm">
      {/* Content */}
      <div className="relative z-10">
        <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md bg-white text-[#533afd] shadow-sm">
          <Gift size={18} />
        </div>
        <h3 className="text-lg font-normal text-[#061b31]" style={{ fontWeight: 400 }}>
          Invite a founder, earn $100 each
        </h3>
        <p className="mt-1 text-sm text-[#64748d]">
          Refer someone to Inkle. When they join, you both receive $100 in Inkle
          credits.
        </p>

        {/* Referral link box */}
        <div className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-[#e5edf5] bg-white px-4 py-2.5">
          <span className="min-w-0 truncate text-sm text-[#273951]">
            {referralLink}
          </span>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 rounded-md p-1.5 text-[#64748d] transition-colors hover:bg-[#f6f9fc] hover:text-[#533afd]"
            aria-label="Copy referral link"
          >
            <Copy size={16} />
          </button>
        </div>
        {copied && (
          <span className="mt-2 inline-block rounded-md bg-[#EDE9FD] px-2.5 py-1 text-xs font-medium text-[#533afd]">
            Copied to clipboard!
          </span>
        )}

        {/* Share icons */}
        <div className="mt-4">
          <p className="text-sm text-[#64748d]">Share via</p>
          <div className="mt-2 flex items-center gap-3">
            {shareLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#64748d] transition-colors hover:bg-white hover:text-[#533afd] hover:shadow-sm"
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
      <div className="absolute -right-6 -bottom-6 h-32 w-32 rounded-md bg-[#E9E4FF] opacity-50" />
      <div className="absolute -right-2 -bottom-2 h-20 w-20 rounded-lg bg-[#DDD6FE] opacity-30 rotate-12" />
    </div>
  );
}

/* ─── Promo / Ad Card ─── */

function PromoCard() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);

  const slides = [
    {
      title:
        "Brex offers the highest-returning, lowest-risk treasury product. Period.",
      subtitle:
        "Switch to Brex and earn up to 4.35%+ with same-hour liquidity, no minimums, no hidden fees.",
      cta: "Apply now",
      href: "https://www.brex.com/",
      bg: "bg-[#EEF6FF]",
    },
    {
      title:
        "Unlock up to 65% of Your Revenue in Non-Dilutive Financing!",
      points: [
        "Get up to $2M with Efficient Capital Labs",
        "Exclusive Offer: 25 bps fee discount through Inkle",
      ],
      cta: "Reveal Instructions",
      href: "https://www.efficientcapitallabs.com/",
      bg: "bg-[#FFF7ED]",
    },
    {
      title: "50+ perks from the best",
      subtitle:
        "Get access to 50+ perks from top brands to maximize your company benefits",
      cta: "View perks",
      href: "/action-centre",
      bg: "bg-[#f6f9fc]",
    },
  ];

  // 👇 clone first slide at end
  let extendedSlides = [...slides, ...slides,...slides,...slides,];

  useEffect(() => {
    const interval = setInterval(() => {
      
        setActiveSlide((prev) => (prev + 1)  % extendedSlides.length);
      
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-lg shadow-sm h-full">
      {/* TRACK */}
      <div
        className="flex h-full transition-transform duration-500 ease-in-out"
        style={{
          transform: `translateX(-${activeSlide * 100}%)`,
        }}
      >
        {extendedSlides.map((slide, i) => (
          <div
            key={i}
            className={`min-w-full h-full p-6 ${slide.bg} flex flex-col justify-between relative`}
          >
            <div>
              <h3 className="text-lg font-normal text-[#061b31]" style={{ fontWeight: 400 }}>
                {slide.title}
              </h3>

              {slide.points ? (
                <div className="mt-3 space-y-1 text-sm text-[#64748d]">
                  {slide.points.map((p, idx) => (
                    <div key={idx} className="flex gap-2">
                      ✔ <span>{p}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-[#64748d]">
                  {slide.subtitle}
                </p>
              )}
            </div>

            <a
              href={slide.href}
              target={slide.href.startsWith('http') ? '_blank' : undefined}
              rel={slide.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="mt-4 inline-flex items-center gap-1 text-sm text-[#533afd] hover:underline"
            >
              {slide.cta}
              <ChevronRight size={14} />
            </a>

            <div className="absolute -right-8 -top-8 h-36 w-36 rounded-md bg-white/30" />
          </div>
        ))}
      </div>

      {/* DOTS */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveSlide(i)}
            className={`h-2 rounded-full ${
              i === activeSlide % 3 ? "w-6 bg-[#273951]" : "w-2 bg-[#e5edf5]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
/* ─── Main Export ─── */
export function HomeBottomSection() {
  return (
    <div className=" py-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ReferralCard />
        <PromoCard />
      </div>
    </div>
  );
}
