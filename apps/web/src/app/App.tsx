import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { Layout } from './Layout'
import { useAuthStore } from '@/stores/auth'
import { canAccessPath, getDefaultPathForRole, getDeniedPathForUser, getPostLoginPath } from '@/lib/access'
import { useNotifications } from '@/hooks/useNotifications'

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
import { AdminUserTracking } from '@/pages/AdminUserTracking'
import { VerifyEmailPage } from '@/pages/VerifyEmail'
import { AcceptInvitePage } from '@/pages/AcceptInvite'
import { OnboardingPage } from '@/pages/Onboarding'

// Newly Added Admin Pages
import { AdminOrganizations } from '@/pages/admin/AdminOrganizations'
import { AdminOrganizationDetails } from '@/pages/admin/AdminOrganizationDetails'
import { AdminUserDetails } from '@/pages/admin/AdminUserDetails'
import { AdminEntities } from '@/pages/admin/AdminEntities'
import { AdminFilings } from '@/pages/admin/AdminFilings'
import { FounderSignupPage } from '@/pages/FounderSignup'
import { CpaReviewQueue } from '@/pages/CpaReviewQueue'
import { TeamManagementPage } from '@/pages/TeamManagement'
import { ChatHubPage } from '@/pages/ChatHub'

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

const publicRoutes = [
  { path: '/login', element: <LoginPage /> },
  { path: '/onboarding/start', element: <FounderSignupPage /> },
  { path: '/verify-email', element: <VerifyEmailPage /> },
  { path: '/accept-invite', element: <AcceptInvitePage /> },
  { path: '/onboarding', element: <OnboardingProtectedRoute><OnboardingPage /></OnboardingProtectedRoute> },
]

type RouteGroup = {
  all?: { path: string; element: JSX.Element }[]
  admin?: { path: string; element: JSX.Element }[]
  founder?: { path: string; element: JSX.Element }[]
  cpa?: { path: string; element: JSX.Element }[]
  team_member?: { path: string; element: JSX.Element }[]
}

const routeGroups: RouteGroup = {
  all: [
    { path: 'profile', element: <ProfilePage /> },
    { path: 'chat', element: <ChatPage /> },
    { path: 'chat-hub', element: <ChatHubPage /> },
    { path: 'advisor', element: <AIAdvisor /> },
    { path: 'audit', element: <AuditTrail /> },
    { path: 'documents', element: <DocumentsPage /> },
    { path: 'documents/vault', element: <DocumentVault /> },
  ],
  admin: [
    { path: 'dashboard', element: <DashboardPage /> },
    { path: 'admin/founder-applications', element: <FounderApplicationsPage /> },
    { path: 'admin/tracking', element: <AdminUserTracking /> },
    { path: 'admin/users/:id', element: <AdminUserDetails /> },
    { path: 'admin/organizations', element: <AdminOrganizations /> },
    { path: 'admin/organizations/:id', element: <AdminOrganizationDetails /> },
    { path: 'admin/entities', element: <AdminEntities /> },
    { path: 'admin/filings', element: <AdminFilings /> },
  ],
  founder: [
    { path: 'home', element: <HomePage /> },
    { path: 'profile/create-account', element: <CreateAccountPage /> },
    { path: 'team', element: <TeamManagementPage /> },
    { path: 'command-center', element: <CommandCenter /> },
    { path: 'filings', element: <FilingsPage /> },
    { path: 'filings/:id', element: <FilingDetailPage /> },
    { path: 'estimated-tax', element: <EstimatedTaxPage /> },
    { path: 'registrations', element: <RegistrationsPage /> },
    { path: 'rd-tax-credits', element: <RDTaxCreditsPage /> },
    { path: 'entities/overview', element: <EntitiesOverviewPage /> },
    { path: 'entities/address-book', element: <AddressBookPage /> },
    { path: 'entities/:entityId', element: <EntityDetailPage /> },
    { path: 'entities', element: <Navigate to="/entities/overview" replace /> },
    { path: 'deadlines', element: <DeadlinesPage /> },
    { path: 'action-centre', element: <ActionCentrePage /> },
    { path: 'filings/room', element: <FilingRoom /> },
    { path: 'filings/room/:id', element: <FilingRoom /> },
    { path: 'incorporation', element: <IncorporationPage /> },
    { path: 'dissolution', element: <DissolutionPage /> },
  ],
  cpa: [
    { path: 'dashboard', element: <DashboardPage /> },
    { path: 'cpa/review', element: <CpaReviewQueue /> },
  ],
  team_member: [
    { path: 'dashboard', element: <DashboardPage /> },
    { path: 'home', element: <HomePage /> },
  ],
}

function NotificationsProvider() {
  useNotifications()
  return null
}

function useUserRole() {
  return useAuthStore((state) => state.user?.role)
}

export function App() {
  const { checkAuth } = useAuthStore()
  const userRole = useUserRole()
  
  const protectedRoutes = useMemo(() => {
    const routes: { path: string; element: JSX.Element }[] = []
    
    if (routeGroups.all) routes.push(...routeGroups.all)
    
    switch (userRole) {
      case 'admin':
        if (routeGroups.admin) routes.push(...routeGroups.admin)
        break
      case 'founder':
        if (routeGroups.founder) routes.push(...routeGroups.founder)
        break
      case 'cpa':
        if (routeGroups.cpa) routes.push(...routeGroups.cpa)
        break
      case 'team_member':
        if (routeGroups.team_member) routes.push(...routeGroups.team_member)
        break
    }
    
    return routes
  }, [userRole])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <NotificationsProvider />
        <Routes>
          {publicRoutes.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DefaultRoute />} />
            {protectedRoutes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={<AccessRoute path={`/${route.path}`}>{route.element}</AccessRoute>}
              />
            ))}
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
