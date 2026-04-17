// Used in: App.tsx — route /rd-tax-credits (R&D tax credits page)
import { useState } from 'react'
import { ExternalLink, Tag } from 'lucide-react'
import { ServiceInquiryDialog } from '@/components/ServiceInquiryDialog'

export function RDTaxCreditsPage() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col lg:flex-row lg:items-start gap-8 lg:gap-12 py-4 sm:py-8">
      <div className="flex-[3]">
        <h1 className="text-xl sm:text-[24px] md:text-3xl text-[#061b31] mb-3" style={{ fontWeight: 300, letterSpacing: '-0.48px' }}>
          Unlock Potential R&amp;D Tax Credits
        </h1>
        <p className="text-sm text-[#64748d] leading-relaxed max-w-lg mb-8" style={{ fontWeight: 300 }}>
          R&amp;D Tax Credits are government incentives that help businesses offset costs related to
          research and development by reducing their corporate tax liability.
        </p>

        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 h-10 px-5 bg-[#533afd] text-white rounded text-sm transition-colors hover:bg-[#4434d4]"
            style={{ fontWeight: 400 }}
          >
            Claim Your Credits
            <ExternalLink size={14} />
          </button>
          <a
            href="https://www.irs.gov/businesses/research-credit"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 h-10 px-5 bg-white border border-[#e5edf5] text-[#273951] rounded text-sm transition-colors hover:bg-[#f6f9fc]"
            style={{ fontWeight: 400 }}
          >
            Learn More
          </a>
        </div>

        <p className="text-xs text-[#64748d]" style={{ fontWeight: 300 }}>powered by ADP</p>
      </div>

      <div className="flex-[2]">
        <div className="bg-gradient-to-br from-[#f6f9fc] to-[#ffd7ef] rounded-md p-4 sm:p-6">
          <div className="bg-white rounded-md p-5 shadow-[rgba(23,23,23,0.08)_0px_15px_35px_0px]">
            <p className="text-[13px] text-[#061b31] mb-4" style={{ fontWeight: 400 }}>R&amp;D Tax Saving</p>

            <div className="flex items-center justify-center mb-5">
              <div className="w-12 h-12 rounded-md bg-[#EDE9FD] flex items-center justify-center">
                <Tag size={24} className="text-[#533afd]" />
              </div>
            </div>

            <div className="space-y-2.5 mb-5" aria-hidden="true">
              <div className="h-2 bg-[#e5edf5] rounded w-full" />
              <div className="h-2 bg-[#e5edf5] rounded w-4/5" />
              <div className="h-2 bg-[#e5edf5] rounded w-3/5" />
            </div>

            <div
              className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-tnum"
              style={{
                backgroundColor: 'rgba(21,190,83,0.2)',
                color: '#108c3d',
                border: '1px solid rgba(21,190,83,0.4)',
                fontWeight: 300,
              }}
            >
              <Tag size={12} />
              Sample saving: $1,000
            </div>
          </div>
        </div>
      </div>

      <ServiceInquiryDialog
        open={open}
        title="Claim your R&D tax credits"
        serviceName="R&D Tax Credits"
        onClose={() => setOpen(false)}
      />
    </div>
  )
}
