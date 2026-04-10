import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth'

export function FounderApplicationsPage() {
  const { founderApplications, founderApplicationsLoading, fetchFounderApplications, reviewFounderApplication } = useAuthStore()
  const [reviewing, setReviewing] = useState<string | null>(null)

  useEffect(() => {
    if (founderApplications.length === 0 && !founderApplicationsLoading) {
      fetchFounderApplications()
    }
  }, [])

  const handleReview = async (id: string, decision: 'approved' | 'rejected', reviewNotes?: string) => {
    setReviewing(id)
    try {
      await reviewFounderApplication(id, decision, reviewNotes)
    } finally {
      setReviewing(null)
    }
  }

  if (founderApplicationsLoading) return <div className="p-6 text-sm text-[#6B7280]">Loading founder applications...</div>

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#111827]">Founder Applications</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Review Certificate of Incorporation details before creating the organization.</p>
      </div>

      <div className="space-y-4">
        {founderApplications.map((application) => (
          <div key={application.id} className="rounded-xl border border-[#E5E7EB] bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-medium text-[#111827]">{application.organizationName}</h2>
                <p className="text-sm text-[#6B7280]">{application.name} · {application.email}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs ${application.status === 'pending' ? 'bg-[#FEF3C7] text-[#92400E]' : application.status === 'approved' ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEE2E2] text-[#991B1B]'}`}>
                {application.status}
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm text-[#374151]">
              <p><span className="font-medium">Legal name:</span> {application.legalCompanyName}</p>
              <p><span className="font-medium">Registration #:</span> {application.registrationNumber}</p>
              <p><span className="font-medium">Jurisdiction:</span> {application.country} / {application.stateOrJurisdiction}</p>
              <p><span className="font-medium">Incorporated:</span> {application.incorporationDate}</p>
              {application.certificateStorageUrl && (
                <p className="md:col-span-2"><span className="font-medium">Certificate:</span> <a className="text-[#6C5CE7] underline" href={application.certificateStorageUrl} target="_blank" rel="noreferrer">{application.certificateFileName}</a></p>
              )}
            </div>

            {application.status === 'pending' && (
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => handleReview(application.id, 'approved')}
                  disabled={reviewing === application.id}
                  className="rounded-lg bg-[#166534] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {reviewing === application.id ? 'Processing...' : 'Approve'}
                </button>
                <button
                  onClick={() => {
                    const reason = window.prompt('Reason for rejection') || ''
                    if (reason) handleReview(application.id, 'rejected', reason)
                  }}
                  disabled={reviewing === application.id}
                  className="rounded-lg bg-[#B91C1C] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
        {!founderApplications.length && <p className="text-sm text-[#6B7280]">No founder applications found.</p>}
      </div>
    </div>
  )
}
