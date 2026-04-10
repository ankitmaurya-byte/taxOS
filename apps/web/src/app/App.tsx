import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Layout } from './Layout'
import { useAuthStore } from '@/stores/auth'
import { canAccessPath, getDefaultPathForRole, getDeniedPathForUser, getPostLoginPath } from '@/lib/access'

// Pages
import { LoginPage } from '@/pages/Login'
import { HomePage } from '@/pages/Home'
import { CommandCenter } from '@/pages/CommandCenter'
import { FilingsPage } from '@/pages/Filings'
import { FilingDetailPage } from '@/pages/FilingDetail'
import { EstimatedTaxPage } from '@/pages/EstimatedTax'
import { RegistrationsPage } from '@/pages/Registrations'
import { RDTaxCreditsPage } from '@/pages/RDTaxCredits'
import { EntitiesOverviewPage } from '@/pages/EntitiesOverview'
import { AddressBookPage } from '@/pages/AddressBook'
import { EntityDetailPage } from '@/pages/EntityDetail'
import { ChatPage } from '@/pages/Chat'
import { AIAdvisor } from '@/pages/AIAdvisor'
import { ActionCentrePage } from '@/pages/ActionCentre'
import { DocumentsPage } from '@/pages/Documents'
import { DocumentVault } from '@/pages/DocumentVault'
import { ApprovalQueue } from '@/pages/ApprovalQueue'
import { AuditTrail } from '@/pages/AuditTrail'
import { DeadlinesPage } from '@/pages/Deadlines'
import { IncorporationPage } from '@/pages/Incorporation'
import { DissolutionPage } from '@/pages/Dissolution'
import { FilingRoom } from '@/pages/FilingRoom'
import { DashboardPage } from '@/pages/Dashboard'
import { ProfilePage } from '@/pages/Profile'
import { CreateAccountPage } from '@/pages/CreateAccount'
import { FounderApplicationsPage } from '@/pages/FounderApplications'
import { VerifyEmailPage } from '@/pages/VerifyEmail'
import { AcceptInvitePage } from '@/pages/AcceptInvite'
import { OnboardingPage } from '@/pages/Onboarding'
import { FounderSignupPage } from '@/pages/FounderSignup'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading, user } = useAuthStore()
  if (isLoading)
    return (
      <div className="flex h-screen items-center justify-center text-[#6B7280]">Loading...</div>
    )
  if (!token) return <Navigate to="/login" replace />
  if (user?.role === 'founder' && user.status !== 'active') return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

function OnboardingProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading, user } = useAuthStore()
  if (isLoading) return <div className="flex h-screen items-center justify-center text-[#6B7280]">Loading...</div>
  if (!token || !user) return <Navigate to="/login" replace />
  if (user.role !== 'founder' || user.status === 'active') return <Navigate to={getPostLoginPath(user)} replace />
  return <>{children}</>
}

function AccessRoute({
  children,
  path,
}: {
  children: React.ReactNode
  path: string
}) {
  const user = useAuthStore((state) => state.user)
  if (!user) return <Navigate to="/login" replace />
  if (!canAccessPath(user, path)) return <Navigate to={getDeniedPathForUser(user)} replace />
  return <>{children}</>
}

function DefaultRoute() {
  const user = useAuthStore((state) => state.user)
  return <Navigate to={getPostLoginPath(user)} replace />
}

export function App() {
  const { checkAuth } = useAuthStore()
  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/onboarding/start" element={<FounderSignupPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/accept-invite" element={<AcceptInvitePage />} />
          <Route path="/onboarding" element={<OnboardingProtectedRoute><OnboardingPage /></OnboardingProtectedRoute>} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DefaultRoute />} />
            <Route path="dashboard" element={<AccessRoute path="/dashboard"><DashboardPage /></AccessRoute>} />
            <Route path="home" element={<AccessRoute path="/home"><HomePage /></AccessRoute>} />
            <Route path="command-center" element={<AccessRoute path="/command-center"><CommandCenter /></AccessRoute>} />
            <Route path="filings" element={<AccessRoute path="/filings"><FilingsPage /></AccessRoute>} />
            <Route path="filings/:id" element={<AccessRoute path="/filings/:id"><FilingDetailPage /></AccessRoute>} />
            <Route path="estimated-tax" element={<AccessRoute path="/estimated-tax"><EstimatedTaxPage /></AccessRoute>} />
            <Route path="registrations" element={<AccessRoute path="/registrations"><RegistrationsPage /></AccessRoute>} />
            <Route path="rd-tax-credits" element={<AccessRoute path="/rd-tax-credits"><RDTaxCreditsPage /></AccessRoute>} />
            <Route path="entities/overview" element={<AccessRoute path="/entities/overview"><EntitiesOverviewPage /></AccessRoute>} />
            <Route path="entities/address-book" element={<AccessRoute path="/entities/address-book"><AddressBookPage /></AccessRoute>} />
            <Route path="entities/:entityId" element={<AccessRoute path="/entities/:entityId"><EntityDetailPage /></AccessRoute>} />
            <Route path="entities" element={<Navigate to="/entities/overview" replace />} />
            <Route path="chat" element={<AccessRoute path="/chat"><ChatPage /></AccessRoute>} />
            <Route path="advisor" element={<AccessRoute path="/advisor"><AIAdvisor /></AccessRoute>} />
            <Route path="action-centre" element={<AccessRoute path="/action-centre"><ActionCentrePage /></AccessRoute>} />
            <Route path="documents" element={<AccessRoute path="/documents"><DocumentsPage /></AccessRoute>} />
            <Route path="documents/vault" element={<AccessRoute path="/documents/vault"><DocumentVault /></AccessRoute>} />
            <Route path="approvals" element={<AccessRoute path="/approvals"><ApprovalQueue /></AccessRoute>} />
            <Route path="audit" element={<AccessRoute path="/audit"><AuditTrail /></AccessRoute>} />
            <Route path="deadlines" element={<AccessRoute path="/deadlines"><DeadlinesPage /></AccessRoute>} />
            <Route path="filings/room" element={<AccessRoute path="/filings/room"><FilingRoom /></AccessRoute>} />
            <Route path="filings/room/:id" element={<AccessRoute path="/filings/room/:id"><FilingRoom /></AccessRoute>} />
            <Route path="incorporation" element={<AccessRoute path="/incorporation"><IncorporationPage /></AccessRoute>} />
            <Route path="dissolution" element={<AccessRoute path="/dissolution"><DissolutionPage /></AccessRoute>} />
            <Route path="profile" element={<AccessRoute path="/profile"><ProfilePage /></AccessRoute>} />
            <Route path="profile/create-account" element={<AccessRoute path="/profile/create-account"><CreateAccountPage /></AccessRoute>} />
            <Route path="admin/founder-applications" element={<AccessRoute path="/admin/founder-applications"><FounderApplicationsPage /></AccessRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
