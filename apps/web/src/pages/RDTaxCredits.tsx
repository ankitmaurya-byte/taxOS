// Used in: App.tsx — route /rd-tax-credits (R&D tax credits page)
import { ExternalLink, Tag } from 'lucide-react'

export function RDTaxCreditsPage() {
  return (
    <div className="flex items-start gap-12 py-8">
      {/* Left side */}
      <div className="flex-[3]">
        <h1 className="text-2xl font-semibold text-[#111827] mb-3">
          Unlock Potential R&D Tax Credits
        </h1>
        <p className="text-sm text-[#6B7280] leading-relaxed max-w-lg mb-8">
          R&D Tax Credits are government incentives that help businesses offset costs related to
          research and development by reducing their corporate tax liability.
        </p>

        <div className="flex items-center gap-3 mb-4">
          <button className="flex items-center gap-1.5 h-10 px-5 bg-[#6C5CE7] text-white rounded-lg text-sm font-medium hover:bg-[#5B4BD5] transition-colors">
            Claim Your Credits
            <ExternalLink size={14} />
          </button>
          <button className="flex items-center gap-1.5 h-10 px-5 bg-white border border-[#E5E7EB] text-[#374151] rounded-lg text-sm font-medium hover:bg-[#F3F4F6] transition-colors">
            Learn More
          </button>
        </div>

        <p className="text-xs text-[#9CA3AF]">powered by ADP</p>
      </div>

      {/* Right side - decorative card */}
      <div className="flex-[2]">
        <div className="bg-gradient-to-br from-[#F3F0FF] to-[#FDF2F8] rounded-2xl p-6">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <p className="text-[13px] font-medium text-[#111827] mb-4">R&D Tax Saving</p>

            <div className="flex items-center justify-center mb-5">
              <div className="w-12 h-12 rounded-lg bg-[#EDE9FD] flex items-center justify-center">
                <Tag size={24} className="text-[#6C5CE7]" />
              </div>
            </div>

            {/* Shimmer lines */}
            <div className="space-y-2.5 mb-5">
              <div className="h-2 bg-[#E5E7EB] rounded w-full" />
              <div className="h-2 bg-[#E5E7EB] rounded w-4/5" />
              <div className="h-2 bg-[#E5E7EB] rounded w-3/5" />
            </div>

            <button className="flex items-center gap-1.5 bg-[#10B981] text-white rounded-lg px-4 py-2 text-sm font-medium">
              <Tag size={14} />
              $1000 saved
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
