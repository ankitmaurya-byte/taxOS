// Used in: Documents.tsx, FilingRoom.tsx, ApprovalQueue.tsx, DocumentVault.tsx, CommandCenter.tsx
import { CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react'

export function ConfidenceBadge({ score }: { score: number }) {
  if (score >= 0.85) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#D1FAE5] text-[#065F46]">
        <CheckCircle size={12} />
        AI confident ({Math.round(score * 100)}%)
      </span>
    )
  }
  if (score >= 0.75) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#FEF3C7] text-[#92400E]">
        <AlertTriangle size={12} />
        CPA review recommended ({Math.round(score * 100)}%)
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#FEE2E2] text-[#991B1B]">
      <AlertCircle size={12} />
      CPA must verify ({Math.round(score * 100)}%)
    </span>
  )
}
