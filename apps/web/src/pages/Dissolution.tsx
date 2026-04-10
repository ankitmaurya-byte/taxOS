// Used in: App.tsx — route /dissolution (assisted dissolution service page)
// Navigated from: Sidebar → Others → Dissolution
import { ChevronRight } from 'lucide-react'
import { useState } from 'react'

export function DissolutionPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-[#111827] mb-6">Dissolution</h1>

      {/* Hero Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-8 mb-6 flex items-center gap-8">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-[#111827] mb-2">Assisted Dissolution</h2>
          <p className="text-sm font-semibold text-[#6C5CE7] mb-3">$350/per dissolution</p>
          <p className="text-sm text-[#6B7280] leading-relaxed mb-5 max-w-lg">
            Inkle facilitates the compliant filing of your Dissolution Certificate with the
            Delaware Secretary of State, prepares Stockholder Consent and Board of Directors
            Resolutions, closes your IRS tax account, and provides a comprehensive checklist and
            guidance for winding down all other activities and accounts.
          </p>
          <div className="flex items-center gap-4">
            <button className="h-10 px-6 bg-[#6C5CE7] text-white rounded-lg text-sm font-semibold hover:bg-[#5B4BD5] transition-colors">
              Get Started
            </button>
            <button className="text-sm font-medium text-[#6C5CE7] hover:underline">
              Unsure of your structure? Book a call
            </button>
          </div>
        </div>
        {/* Decorative illustration placeholder — sunset/dissolution theme */}
        <div className="w-64 h-40 bg-gradient-to-br from-[#F3F0FF] to-[#EDE9FD] rounded-xl flex items-center justify-center flex-shrink-0">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="40" r="28" fill="url(#paint_diss_circle)" />
            <path d="M12 45C12 45 22 38 40 38C58 38 68 45 68 45" stroke="white" strokeWidth="3" strokeLinecap="round" />
            <path d="M14 52C14 52 24 46 40 46C56 46 66 52 66 52" stroke="white" strokeWidth="3" strokeLinecap="round" />
            <path d="M18 59C18 59 26 54 40 54C54 54 62 59 62 59" stroke="white" strokeWidth="3" strokeLinecap="round" />
            <defs>
              <linearGradient id="paint_diss_circle" x1="12" y1="12" x2="68" y2="68" gradientUnits="userSpaceOnUse">
                <stop stopColor="#8B08FD" />
                <stop offset="1" stopColor="#5622FF" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  )
}
