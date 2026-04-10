// Used in: Layout.tsx — popup panel triggered by "Get help" button in TopBar
import { Phone, Calendar, Globe, Lock } from 'lucide-react'

interface GetHelpPanelProps {
  onClose: () => void
}

export function GetHelpPanel({ onClose }: GetHelpPanelProps) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="absolute right-0 top-full mt-2 w-[520px] bg-white border border-[#E5E7EB] rounded-xl shadow-xl z-50 overflow-hidden">
        {/* Account Manager + Support Team row */}
        <div className="flex border-b border-[#E5E7EB]">
          {/* Account Manager */}
          <div className="flex-1 p-5 flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-[#E5E7EB] flex items-center justify-center flex-shrink-0">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"
                  fill="#9CA3AF"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#111827]">Account manager</h3>
              <p className="text-xs text-[#6B7280] mb-2">Not assigned yet</p>
              <button className="flex items-center gap-1 text-xs text-[#6B7280] hover:text-[#374151]">
                <Phone size={12} />
                Call
              </button>
            </div>
          </div>

          {/* Support Team */}
          <div className="flex-1 p-5 flex items-start gap-3 border-l border-[#E5E7EB]">
            <div className="w-12 h-12 rounded-full bg-[#F3F0FF] flex items-center justify-center flex-shrink-0">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z"
                  fill="#6C5CE7"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#111827]">Support Team</h3>
              <p className="text-xs text-[#6B7280] italic mb-2">Available soon</p>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-1 text-xs text-[#6C5CE7] font-medium hover:underline">
                  <Calendar size={12} />
                  Schedule
                </button>
                <button className="flex items-center gap-1 text-xs text-[#6B7280] hover:text-[#374151]">
                  <Phone size={12} />
                  Call
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tax Preparer */}
        <div className="p-5 border-b border-[#E5E7EB] flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-[#F3F4F6] flex items-center justify-center flex-shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM6 20V4H13V9H18V20H6Z"
                fill="#9CA3AF"
              />
              <path d="M8 14H16V16H8V14ZM8 10H16V12H8V10Z" fill="#9CA3AF" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#111827]">Tax Preparer</h3>
            <p className="text-xs text-[#6B7280] mb-2">
              An active subscription is required to enable a call with our tax expert
            </p>
            <button className="flex items-center gap-1 text-xs text-[#6C5CE7] font-medium hover:underline">
              <Globe size={12} />
              Upgrade for access
            </button>
          </div>
        </div>

        {/* Bookkeeping Expert */}
        <div className="p-5 border-b border-[#E5E7EB] flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-[#F3F4F6] flex items-center justify-center flex-shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z"
                fill="#9CA3AF"
              />
              <path d="M7 7H11V11H7V7ZM13 7H17V9H13V7ZM13 11H17V13H13V11ZM7 13H11V17H7V13ZM13 15H17V17H13V15Z" fill="#9CA3AF" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#111827]">Bookkeeping Expert</h3>
            <p className="text-xs text-[#6B7280] mb-2">
              An active bookkeeping service is required to enable a call with our bookkeeping expert
            </p>
            <button className="flex items-center gap-1 text-xs text-[#6C5CE7] font-medium hover:underline">
              <Globe size={12} />
              Upgrade for access
            </button>
          </div>
        </div>

        {/* CEO */}
        <div className="p-5 flex items-start gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6C5CE7] to-[#5B4BD5] flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              AK
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#10B981] border-2 border-white rounded-full" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#111827]">CEO</h3>
            <p className="text-xs text-[#6B7280] mb-2">Anand Krishna</p>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-1 text-xs text-[#6C5CE7] font-medium hover:underline">
                <Calendar size={12} />
                Schedule
              </button>
              <span className="text-[#E5E7EB]">|</span>
              <button className="flex items-center gap-1 text-xs text-[#6C5CE7] font-medium hover:underline">
                <Phone size={12} />
                Call
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
