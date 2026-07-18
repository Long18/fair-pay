import React, { lazy, Suspense, memo, useEffect } from "react";
import { Authenticated, Refine, useGetIdentity } from "@refinedev/core";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import { Analytics } from "@vercel/analytics/react";
import {
  HomeIcon,
  UsersIcon,
  UserPlusIcon,
  ActivityIcon,
  FairPayIcon,
} from "./components/ui/icons";

import routerProvider, {
  CatchAllNavigate,
  NavigateToResource,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import { dataProvider, liveProvider } from "@refinedev/supabase";
import { BrowserRouter, Outlet, Route, Routes, Navigate } from "react-router";
import { AnimatedOutlet } from "./components/animated-outlet";
import "./App.css";
import authProvider from "./authProvider";
import { supabaseClient } from "./utility";
import { useDocumentTitle } from "./hooks/ui/use-document-title";
import { GSAPProvider } from "./providers/gsap-provider";
import { useSmoothScroll } from "./hooks/use-smooth-scroll";
import { UndoManagerProvider } from "./contexts/undo-manager";
import { analyticsManager } from "./lib/analytics/instance";
import { JourneyTrackingBridge } from "./lib/journey-tracking";
import { TrackingNoticeBanner } from "./components/tracking-consent-banner";
import { ConsentBanner } from "./components/consent/ConsentBanner";
import { ScrollToTop } from "./components/ui/scroll-to-top";
import { SpeculationRules } from "./components/speculation-rules";

// Core layout components (needed immediately)
import { ErrorComponent } from "./components/refine-ui/layout/error-component";
import { Layout } from "./components/refine-ui/layout/layout";
import { Toaster } from "./components/refine-ui/notification/toaster";
import { useNotificationProvider } from "./components/refine-ui/notification/use-notification-provider";
import { ThemeProvider } from "./components/refine-ui/theme/theme-provider";
import { ErrorBoundary } from "./components/error-boundary";
import { BuildVersionMonitor } from "./components/system/build-version-monitor";
import { PageSkeleton, AdminPageSkeleton } from "./components/skeletons/PageSkeleton";

// Auth pages (critical for initial load)
import { Login } from "./pages/login";
import { Register } from "./pages/register";
import { ForgotPassword } from "./pages/forgot-password";
import { UpdatePassword } from "./pages/update-password";
import { OAuthConsent } from "./pages/oauth";

// Dashboard (most common entry point)
import { Dashboard } from "./pages/dashboard";
import { BalancesPage } from "./pages/balances";
import { PersonDebtBreakdown } from "./pages/person-debt-breakdown";

// Lazy load non-critical components for better code splitting

// Profile module
const ProfileShowUnified = lazy(() => import("./modules/profile").then(m => ({ default: m.ProfileShowUnified })));

// Groups module
const GroupCreate = lazy(() => import("./modules/groups").then(m => ({ default: m.GroupCreate })));
const GroupEdit = lazy(() => import("./modules/groups").then(m => ({ default: m.GroupEdit })));
const GroupShow = lazy(() => import("./modules/groups").then(m => ({ default: m.GroupShow })));

// Expenses module
const ExpenseCreate = lazy(() => import("./modules/expenses").then(m => ({ default: m.ExpenseCreate })));
const ExpenseContextSelector = lazy(() => import("./modules/expenses").then(m => ({ default: m.ExpenseContextSelector })));
const ExpenseEdit = lazy(() => import("./modules/expenses").then(m => ({ default: m.ExpenseEdit })));
const ExpenseShow = lazy(() => import("./modules/expenses").then(m => ({ default: m.ExpenseShow })));

// Payments module
const PaymentCreate = lazy(() => import("./modules/payments").then(m => ({ default: m.PaymentCreate })));
const PaymentShow = lazy(() => import("./modules/payments").then(m => ({ default: m.PaymentShow })));

// Friends module
const FriendShow = lazy(() => import("./modules/friends").then(m => ({ default: m.FriendShow })));

// Connections page
const ConnectionsPage = lazy(() => import("./pages/connections").then(m => ({ default: m.ConnectionsPage })));

// Other modules
const SettingsPage = lazy(() => import("./modules/settings").then(m => ({ default: m.SettingsPage })));
const DonationSettings = lazy(() => import("./modules/settings").then(m => ({ default: m.DonationSettings })));
const BankSettings = lazy(() => import("./modules/settings/pages/bank-settings").then(m => ({ default: m.BankSettingsPage })));
const SepaySettings = lazy(() => import("./modules/settings/pages/sepay-settings").then(m => ({ default: m.SepaySettingsPage })));
const DonationWidget = lazy(() => import("./components/donation-widget").then(m => ({ default: m.DonationWidget })));
// Onboarding module - lazy loaded (only needed on first visit)
const OnboardingProvider = lazy(() => import("./modules/onboarding").then(m => ({ default: m.OnboardingProvider })));
const OnboardingChecklistFAB = lazy(() => import("./modules/onboarding/components/OnboardingChecklist").then(m => ({ default: m.OnboardingChecklist })));

// Tools pages
const ExpenseCalculator = lazy(() => import("./pages/tools/expense-calculator"));

// Pricing page
const PricingPage = lazy(() => import("./pages/pricing"));

// Legal pages
const PrivacyPage = lazy(() => import("./pages/privacy").then(m => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import("./pages/terms").then(m => ({ default: m.TermsPage })));
const AboutPage = lazy(() => import("./pages/about").then(m => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import("./pages/contact").then(m => ({ default: m.ContactPage })));

// Admin module - lazy loaded
const AdminGuard = lazy(() => import("./modules/admin/components/AdminGuard").then(m => ({ default: m.AdminGuard })));
const AdminCapabilityGuard = lazy(() => import("./modules/admin/components/AdminCapabilityGuard").then(m => ({ default: m.AdminCapabilityGuard })));
const AdminLayout = lazy(() => import("./modules/admin/components/AdminLayout").then(m => ({ default: m.AdminLayout })));
const AdminOverview = lazy(() => import("./modules/admin/pages/AdminOverview").then(m => ({ default: m.AdminOverview })));
const AdminPeople = lazy(() => import("./modules/admin/pages/AdminPeople").then(m => ({ default: m.AdminPeople })));
const AdminUserJourney = lazy(() => import("./modules/admin/pages/AdminUserJourney").then(m => ({ default: m.AdminUserJourney })));
const AdminTransactions = lazy(() => import("./modules/admin/pages/AdminTransactions").then(m => ({ default: m.AdminTransactions })));
const AdminReactions = lazy(() => import("./modules/admin/pages/AdminReactions").then(m => ({ default: m.AdminReactions })));
const AdminDevTool = lazy(() => import("./modules/admin/pages/AdminDevTool").then(m => ({ default: m.AdminDevTool })));
const AdminMarketing = lazy(() => import("./modules/admin/pages/AdminMarketing").then(m => ({ default: m.AdminMarketing })));

// Profile Edit Redirect Component
const ProfileEditRedirect = () => {
  const { data: identity } = useGetIdentity();

  React.useEffect(() => {
    if (identity?.id) {
      window.location.href = `/profile/${identity.id}?edit=true`;
    }
  }, [identity]);

  return <PageSkeleton />;
};

const isVercelAnalyticsEnabled =
  import.meta.env.PROD && import.meta.env.VITE_ENABLE_VERCEL_ANALYTICS === "true";

// Analytics initializer component to set user identity
const AnalyticsInitializer = memo(() => {
  const { data: identity } = useGetIdentity();

  useEffect(() => {
    // If user is authenticated, identity will be set by authProvider.getIdentity()
    // If not authenticated, track as anonymous user
    if (!identity) {
      analyticsManager.setUser('unknown', { anonymous: true });
    }
  }, [identity]);

  return null;
});

// Configure QueryClient with optimized caching
// Note: Refine internally uses its own QueryClient, so we configure via options
const queryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh
      gcTime: 10 * 60 * 1000, // 10 minutes - keep in memory (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
      refetchOnReconnect: true, // Refetch when user comes back online
      refetchOnMount: true, // Refetch stale data on mount (needed for auth state after logout)
      retry: 1, // Retry failed requests once
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    },
    mutations: {
      retry: 1, // Retry mutations once on failure
    },
  },
};

// Wrapper component for document title (needs Refine context)
const DocumentTitle = () => {
  useDocumentTitle();
  return null;
};

// Smooth scroll initializer — must render inside GSAPProvider
const SmoothScrollInit = () => {
  useSmoothScroll();
  return null;
};

// Main App component
function App() {
  return (
    <BrowserRouter>
      <RefineKbarProvider>
        <ThemeProvider>
          <GSAPProvider>
          <Refine
                dataProvider={dataProvider(supabaseClient)}
                liveProvider={liveProvider(supabaseClient)}
                authProvider={authProvider}
                routerProvider={routerProvider}
                notificationProvider={useNotificationProvider()}
                options={{
                  syncWithLocation: true,
                  warnWhenUnsavedChanges: true,
                  mutationMode: "optimistic",
                  projectId: "efvxeD-2r07zg-niV06o",
                  // Application branding - controls browser tab title and sidebar display
                  title: {
                    text: "FairPay",
                    icon: <FairPayIcon className="w-6 h-6" />,
                  },
                  reactQuery: {
                    clientConfig: queryClientConfig,
                  },
                }}
                resources={[
                  {
                    name: "dashboard",
                    list: "/",
                    meta: {
                      label: "Dashboard",
                      icon: <HomeIcon className="w-5 h-5" />,
                    },
                  },
                  {
                    name: "connections",
                    list: "/connections",
                    meta: {
                      label: "Connections",
                      icon: <UsersIcon className="w-5 h-5" />,
                    },
                  },
                  {
                    name: "profiles",
                    meta: {
                      label: "Profile",
                    },
                  },
                  {
                    name: "groups",
                    list: "/groups",
                    create: "/groups/create",
                    edit: "/groups/edit/:id",
                    show: "/groups/show/:id",
                    meta: {
                      canDelete: true,
                      label: "Groups",
                      hide: true,
                      icon: <UsersIcon className="w-5 h-5" />,
                    },
                  },
                  {
                    name: "friends",
                    list: "/friends",
                    meta: {
                      label: "Friends",
                      hide: true,
                      icon: <UserPlusIcon className="w-5 h-5" />,
                    },
                  },
                  {
                    name: "friendships",
                    meta: {
                      label: "Friendships",
                      hide: true,
                    },
                  },
                  {
                    name: "group_members",
                    meta: {
                      label: "Group Members",
                      hide: true,
                    },
                  },
                  {
                    name: "expenses",
                    show: "/expenses/show/:id",
                    edit: "/expenses/edit/:id",
                    meta: {
                      label: "Expenses",
                      hide: true,
                    },
                  },
                  {
                    name: "expense_splits",
                    meta: {
                      label: "Expense Splits",
                      hide: true,
                    },
                  },
                  {
                    name: "payments",
                    show: "/payments/show/:id",
                    meta: {
                      label: "Payments",
                      hide: true,
                    },
                  },
                  {
                    name: "reports",
                    list: "/reports",
                    meta: {
                      label: "Reports",
                      hide: true,
                    },
                  },
                  {
                    name: "balances",
                    list: "/balances",
                    meta: {
                      label: "Insights",
                      icon: <ActivityIcon className="w-5 h-5" />,
                    },
                  },
                  {
                    name: "user_settings",
                    meta: {
                      label: "User Settings",
                      hide: true,
                    },
                  },
                ]}
              >
              <UndoManagerProvider>
                <Suspense fallback={null}>
                <OnboardingProvider>
                <Routes>
                  {/* OAuth consent route - public but requires authentication */}
                  <Route path="/oauth/consent" element={<OAuthConsent />} />

                  {/* Public routes - accessible without authentication */}
                  <Route
                    element={
                      <Layout>
                        <AnimatedOutlet />
                      </Layout>
                    }
                  >
                    <Route index element={
                      <Authenticated
                        key="authenticated-dashboard"
                        fallback={<Dashboard />}
                      >
                        <Dashboard />
                      </Authenticated>
                    } />

                    {/* Public legal pages */}
                    <Route path="/privacy" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <PrivacyPage />
                      </Suspense>
                    } />
                    <Route path="/terms" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <TermsPage />
                      </Suspense>
                    } />
                    <Route path="/about" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <AboutPage />
                      </Suspense>
                    } />
                    <Route path="/contact" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <ContactPage />
                      </Suspense>
                    } />

                    {/* Public tools - no auth required */}
                    <Route path="/tools/expense-calculator" element={
                      <Suspense fallback={null}>
                        <ExpenseCalculator />
                      </Suspense>
                    } />

                    {/* Pricing page - public */}
                    <Route path="/pricing" element={
                      <Suspense fallback={null}>
                        <PricingPage />
                      </Suspense>
                    } />

                    {/* Public profile view */}
                    <Route path="/profile/:id" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <ErrorBoundary context="Profile Details">
                          <ProfileShowUnified />
                        </ErrorBoundary>
                      </Suspense>
                    } />

                  </Route>

                  {/* Authenticated financial routes */}
                  <Route
                    element={
                      <Authenticated
                        key="authenticated-financial"
                        fallback={<CatchAllNavigate to="/login" />}
                      >
                        <Layout>
                          <AnimatedOutlet />
                        </Layout>
                      </Authenticated>
                    }
                  >
                    {/* Person debt breakdown view */}
                    <Route path="/debts/:userId" element={
                      <ErrorBoundary context="Person Debt Breakdown">
                        <PersonDebtBreakdown />
                      </ErrorBoundary>
                    } />

                    {/* Expense detail view */}
                    <Route path="/expenses/show/:id" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <ErrorBoundary context="Expense Details">
                          <ExpenseShow />
                        </ErrorBoundary>
                      </Suspense>
                    } />

                    {/* Payment detail view */}
                    <Route path="/payments/show/:id" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <ErrorBoundary context="Payment Details">
                          <PaymentShow />
                        </ErrorBoundary>
                      </Suspense>
                    } />
                  </Route>

                  {/* Admin routes - lazy loaded, separate layout */}
                  <Route
                    path="/admin"
                    element={
                      <Authenticated
                        key="authenticated-admin"
                        fallback={<CatchAllNavigate to="/login" />}
                      >
                        <Suspense fallback={<AdminPageSkeleton />}>
                          <AdminGuard>
                            <AdminLayout />
                          </AdminGuard>
                        </Suspense>
                      </Authenticated>
                    }
                  >
                    <Route index element={<Suspense fallback={<AdminPageSkeleton />}><AdminOverview /></Suspense>} />
                    <Route path="people" element={<Suspense fallback={<AdminPageSkeleton />}><AdminPeople /></Suspense>} />
                    <Route path="people/:id/journey" element={<Suspense fallback={<AdminPageSkeleton />}><AdminCapabilityGuard capability="canViewTracking"><AdminUserJourney /></AdminCapabilityGuard></Suspense>} />
                    <Route path="transactions" element={<Suspense fallback={<AdminPageSkeleton />}><AdminTransactions /></Suspense>} />
                    <Route path="audit-logs" element={<Suspense fallback={<AdminPageSkeleton />}><AdminCapabilityGuard capability="canViewAuditLogs"><Navigate to="/admin/devtool?tab=audit-logs" replace /></AdminCapabilityGuard></Suspense>} />
                    <Route path="reactions" element={<Suspense fallback={<AdminPageSkeleton />}><AdminReactions /></Suspense>} />
                    <Route path="utm" element={<Suspense fallback={<AdminPageSkeleton />}><AdminCapabilityGuard capability="canUseDevtool"><Navigate to="/admin/devtool?tab=utm" replace /></AdminCapabilityGuard></Suspense>} />
                    <Route path="devtool" element={<Suspense fallback={<AdminPageSkeleton />}><AdminCapabilityGuard capability="canUseDevtool"><AdminDevTool /></AdminCapabilityGuard></Suspense>} />
                    <Route path="og-preview" element={<Suspense fallback={<AdminPageSkeleton />}><AdminCapabilityGuard capability="canUseDevtool"><Navigate to="/admin/devtool" replace /></AdminCapabilityGuard></Suspense>} />
                    <Route path="marketing" element={<Suspense fallback={<AdminPageSkeleton />}><AdminCapabilityGuard capability="canViewGrowth"><AdminMarketing /></AdminCapabilityGuard></Suspense>} />
                    <Route path="growth" element={<Suspense fallback={<AdminPageSkeleton />}><AdminCapabilityGuard capability="canViewGrowth"><Navigate to="/admin/marketing?tab=growth" replace /></AdminCapabilityGuard></Suspense>} />
                    <Route path="retention" element={<Suspense fallback={<AdminPageSkeleton />}><AdminCapabilityGuard capability="canViewRetention"><Navigate to="/admin/marketing?tab=retention" replace /></AdminCapabilityGuard></Suspense>} />
                    <Route path="agent-operations" element={<Suspense fallback={<AdminPageSkeleton />}><AdminCapabilityGuard capability="canViewAuditLogs"><Navigate to="/admin/devtool?tab=agent-ops" replace /></AdminCapabilityGuard></Suspense>} />
                  </Route>

                  {/* Authenticated routes - require login */}
                  <Route
                    element={
                      <Authenticated
                        key="authenticated-inner"
                        fallback={<CatchAllNavigate to="/login" />}
                      >
                        <Layout>
                          <ErrorBoundary>
                            <AnimatedOutlet />
                          </ErrorBoundary>
                        </Layout>
                      </Authenticated>
                    }
                  >
                    <Route path="/connections" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <ErrorBoundary context="Connections">
                          <ConnectionsPage />
                        </ErrorBoundary>
                      </Suspense>
                    } />
                    <Route path="/groups">
                      <Route index element={
                        <Navigate to="/connections?tab=groups" replace />
                      } />
                      <Route path="create" element={
                        <Suspense fallback={<PageSkeleton />}>
                          <GroupCreate />
                        </Suspense>
                      } />
                      <Route path="edit/:id" element={
                        <Suspense fallback={<PageSkeleton />}>
                          <GroupEdit />
                        </Suspense>
                      } />
                      <Route path="show/:id" element={
                        <Suspense fallback={<PageSkeleton />}>
                          <ErrorBoundary context="Group Details">
                            <GroupShow />
                          </ErrorBoundary>
                        </Suspense>
                      } />
                      <Route path=":groupId/expenses/create" element={
                        <Suspense fallback={<PageSkeleton />}>
                          <ExpenseCreate />
                        </Suspense>
                      } />
                      <Route path=":groupId/payments/create" element={
                        <Suspense fallback={<PageSkeleton />}>
                          <PaymentCreate />
                        </Suspense>
                      } />
                    </Route>
                    <Route path="/friends">
                      {/* Canonical Friends Routes - All friend navigation should use these routes */}
                      <Route index element={
                        <Navigate to="/connections?tab=friends" replace />
                      } />
                      {/* Canonical Friend Detail - Accepts both friendship ID and user ID */}
                      <Route path=":id" element={
                        <Suspense fallback={<PageSkeleton />}>
                          <ErrorBoundary context="Friend Show">
                            <FriendShow />
                          </ErrorBoundary>
                        </Suspense>
                      } />
                      <Route path=":friendshipId/expenses/create" element={
                        <Suspense fallback={<PageSkeleton />}>
                          <ExpenseCreate />
                        </Suspense>
                      } />
                      <Route path=":friendshipId/payments/create" element={
                        <Suspense fallback={<PageSkeleton />}>
                          <PaymentCreate />
                        </Suspense>
                      } />
                    </Route>
                    <Route path="/expenses">
                      <Route path="create" element={
                        <Suspense fallback={<PageSkeleton />}>
                          <ExpenseContextSelector />
                        </Suspense>
                      } />
                      <Route path="edit/:id" element={
                        <Suspense fallback={<PageSkeleton />}>
                          <ExpenseEdit />
                        </Suspense>
                      } />
                    </Route>
                    <Route path="/payments">
                      <Route path="create" element={
                        <Suspense fallback={<PageSkeleton />}>
                          <PaymentCreate />
                        </Suspense>
                      } />
                    </Route>
                    <Route path="/reports" element={<Navigate to="/balances" replace />} />
                    <Route path="/balances" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <ErrorBoundary context="Balances Page">
                          <BalancesPage />
                        </ErrorBoundary>
                      </Suspense>
                    } />
                    <Route path="/ai-chat" element={<Navigate to="/" replace />} />
                    <Route path="/settings" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <SettingsPage />
                      </Suspense>
                    } />
                    <Route path="/settings/donation" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <DonationSettings />
                      </Suspense>
                    } />
                    <Route path="/settings/bank" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <BankSettings />
                      </Suspense>
                    } />
                    <Route path="/settings/sepay" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <SepaySettings />
                      </Suspense>
                    } />
                    <Route path="/profile/edit" element={
                      <ProfileEditRedirect />
                    } />
                    <Route path="*" element={<ErrorComponent />} />
                  </Route>
                  <Route
                    element={
                      <Authenticated
                        key="authenticated-outer"
                        fallback={<Outlet />}
                      >
                        <NavigateToResource />
                      </Authenticated>
                    }
                  >
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                  </Route>
                  <Route path="/update-password" element={<UpdatePassword />} />
                </Routes>

                <Toaster />
                <BuildVersionMonitor />
                <RefineKbar />
                <UnsavedChangesNotifier />
                <DocumentTitle />
                <SpeculationRules />
                <JourneyTrackingBridge />
                <AnalyticsInitializer />
                {isVercelAnalyticsEnabled ? <Analytics /> : null}
                <TrackingNoticeBanner />
                <ConsentBanner />
                <ScrollToTop />
                <Suspense fallback={null}>
                  <DonationWidget />
                </Suspense>
                <Authenticated key="onboarding-checklist" fallback={null}>
                  <Suspense fallback={null}>
                    <OnboardingChecklistFAB />
                  </Suspense>
                </Authenticated>
                <SmoothScrollInit />
                </OnboardingProvider>
                </Suspense>
              </UndoManagerProvider>
              </Refine>
          </GSAPProvider>
        </ThemeProvider>
      </RefineKbarProvider>
    </BrowserRouter>
  );
}

export default App;
