import React, { lazy, Suspense, memo } from "react";
import { Authenticated, Refine } from "@refinedev/core";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import {
  HomeIcon,
  UsersIcon,
  UserPlusIcon,
  ReceiptIcon,
  FairPayIcon,
} from "./components/ui/icons";

import routerProvider, {
  CatchAllNavigate,
  NavigateToResource,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import { dataProvider, liveProvider } from "@refinedev/supabase";
import { BrowserRouter, Outlet, Route, Routes } from "react-router";
import "./App.css";
import authProvider from "./authProvider";
import { supabaseClient } from "./utility";
import { useDocumentTitle } from "./hooks/use-document-title";

// Core layout components (needed immediately)
import { ErrorComponent } from "./components/refine-ui/layout/error-component";
import { Layout } from "./components/refine-ui/layout/layout";
import { Toaster } from "./components/refine-ui/notification/toaster";
import { useNotificationProvider } from "./components/refine-ui/notification/use-notification-provider";
import { ThemeProvider } from "./components/refine-ui/theme/theme-provider";
import { ErrorBoundary } from "./components/error-boundary";

// Auth pages (critical for initial load)
import { Login } from "./pages/login";
import { Register } from "./pages/register";
import { ForgotPassword } from "./pages/forgot-password";
import { OAuthConsent } from "./pages/oauth";

// Dashboard (most common entry point)
import { Dashboard } from "./pages/dashboard";

// Lazy load non-critical components for better code splitting

// Profile module
const ProfileEdit = lazy(() => import("./modules/profile").then(m => ({ default: m.ProfileEdit })));
const ProfileShow = lazy(() => import("./modules/profile").then(m => ({ default: m.ProfileShow })));

// Groups module
const GroupList = lazy(() => import("./modules/groups").then(m => ({ default: m.GroupList })));
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
const FriendList = lazy(() => import("./modules/friends").then(m => ({ default: m.FriendList })));
const FriendShow = lazy(() => import("./modules/friends").then(m => ({ default: m.FriendShow })));

// Other modules
const NotificationList = lazy(() => import("./modules/notifications").then(m => ({ default: m.NotificationList })));
const ReportsPage = lazy(() => import("./pages/reports").then(m => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import("./modules/settings").then(m => ({ default: m.SettingsPage })));
const DonationSettings = lazy(() => import("./modules/settings").then(m => ({ default: m.DonationSettings })));
const DonationWidget = lazy(() => import("./components/donation-widget").then(m => ({ default: m.DonationWidget })));

// Legal pages
const PrivacyPage = lazy(() => import("./pages/privacy").then(m => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import("./pages/terms").then(m => ({ default: m.TermsPage })));

// Optimized loading fallback component
const PageLoader = memo(() => (
  <div className="flex items-center justify-center min-h-screen" role="status" aria-live="polite">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" aria-label="Loading..."></div>
  </div>
));

// Configure QueryClient with optimized caching
// Note: Refine internally uses its own QueryClient, so we configure via options
const queryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh
      gcTime: 10 * 60 * 1000, // 10 minutes - keep in memory (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
      refetchOnReconnect: true, // Refetch when user comes back online
      refetchOnMount: false, // Don't refetch when component mounts if data is fresh
      retry: 1, // Retry failed requests once
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    },
    mutations: {
      retry: 1, // Retry mutations once on failure
    },
  },
};

// Memoized wrapper component for document title
const DocumentTitle = memo(() => {
  useDocumentTitle();
  return null;
});

// Main App component
function App() {
  return (
    <BrowserRouter>
      <RefineKbarProvider>
        <ThemeProvider>
          <Refine
                dataProvider={dataProvider(supabaseClient)}
                liveProvider={liveProvider(supabaseClient)}
                authProvider={authProvider}
                routerProvider={routerProvider}
                notificationProvider={useNotificationProvider()}
                options={{
                  syncWithLocation: true,
                  warnWhenUnsavedChanges: true,
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
                      icon: <UsersIcon className="w-5 h-5" />,
                    },
                  },
                  {
                    name: "friends",
                    list: "/friends",
                    meta: {
                      label: "Friends",
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
                      icon: <ReceiptIcon className="w-5 h-5" />,
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
                <Routes>
                  {/* OAuth consent route - public but requires authentication */}
                  <Route path="/oauth/consent" element={<OAuthConsent />} />

                  {/* Public routes - accessible without authentication */}
                  <Route
                    element={
                      <Layout>
                        <Outlet />
                      </Layout>
                    }
                  >
                    <Route index element={<Dashboard />} />

                    {/* Public legal pages */}
                    <Route path="/privacy" element={
                      <Suspense fallback={<PageLoader />}>
                        <PrivacyPage />
                      </Suspense>
                    } />
                    <Route path="/terms" element={
                      <Suspense fallback={<PageLoader />}>
                        <TermsPage />
                      </Suspense>
                    } />

                    {/* Public profile view */}
                    <Route path="/profile/:id" element={
                      <Suspense fallback={<PageLoader />}>
                        <ErrorBoundary context="Profile Details">
                          <ProfileShow />
                        </ErrorBoundary>
                      </Suspense>
                    } />

                    {/* Public expense view */}
                    <Route path="/expenses/show/:id" element={
                      <Suspense fallback={<PageLoader />}>
                        <ErrorBoundary context="Expense Details">
                          <ExpenseShow />
                        </ErrorBoundary>
                      </Suspense>
                    } />

                    {/* Public payment view */}
                    <Route path="/payments/show/:id" element={
                      <Suspense fallback={<PageLoader />}>
                        <ErrorBoundary context="Payment Details">
                          <PaymentShow />
                        </ErrorBoundary>
                      </Suspense>
                    } />
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
                            <Outlet />
                          </ErrorBoundary>
                        </Layout>
                      </Authenticated>
                    }
                  >
                    <Route path="/groups">
                      <Route index element={
                        <Suspense fallback={<PageLoader />}>
                          <ErrorBoundary context="Groups List">
                            <GroupList />
                          </ErrorBoundary>
                        </Suspense>
                      } />
                      <Route path="create" element={
                        <Suspense fallback={<PageLoader />}>
                          <GroupCreate />
                        </Suspense>
                      } />
                      <Route path="edit/:id" element={
                        <Suspense fallback={<PageLoader />}>
                          <GroupEdit />
                        </Suspense>
                      } />
                      <Route path="show/:id" element={
                        <Suspense fallback={<PageLoader />}>
                          <ErrorBoundary context="Group Details">
                            <GroupShow />
                          </ErrorBoundary>
                        </Suspense>
                      } />
                      <Route path=":groupId/expenses/create" element={
                        <Suspense fallback={<PageLoader />}>
                          <ExpenseCreate />
                        </Suspense>
                      } />
                      <Route path=":groupId/payments/create" element={
                        <Suspense fallback={<PageLoader />}>
                          <PaymentCreate />
                        </Suspense>
                      } />
                    </Route>
                    <Route path="/friends">
                      <Route index element={
                        <Suspense fallback={<PageLoader />}>
                          <ErrorBoundary context="Friends List">
                            <FriendList />
                          </ErrorBoundary>
                        </Suspense>
                      } />
                      <Route path=":id" element={
                        <Suspense fallback={<PageLoader />}>
                          <ErrorBoundary context="Friend Show">
                            <FriendShow />
                          </ErrorBoundary>
                        </Suspense>
                      } />
                      <Route path=":friendshipId/expenses/create" element={
                        <Suspense fallback={<PageLoader />}>
                          <ExpenseCreate />
                        </Suspense>
                      } />
                      <Route path=":friendshipId/payments/create" element={
                        <Suspense fallback={<PageLoader />}>
                          <PaymentCreate />
                        </Suspense>
                      } />
                    </Route>
                    <Route path="/expenses">
                      <Route path="create" element={
                        <Suspense fallback={<PageLoader />}>
                          <ExpenseContextSelector />
                        </Suspense>
                      } />
                      <Route path="edit/:id" element={
                        <Suspense fallback={<PageLoader />}>
                          <ExpenseEdit />
                        </Suspense>
                      } />
                    </Route>
                    <Route path="/payments">
                      <Route path="create" element={
                        <Suspense fallback={<PageLoader />}>
                          <PaymentCreate />
                        </Suspense>
                      } />
                    </Route>
                    <Route path="/notifications" element={
                      <Suspense fallback={<PageLoader />}>
                        <NotificationList />
                      </Suspense>
                    } />
                    <Route path="/reports" element={
                      <Suspense fallback={<PageLoader />}>
                        <ReportsPage />
                      </Suspense>
                    } />
                    <Route path="/settings" element={
                      <Suspense fallback={<PageLoader />}>
                        <SettingsPage />
                      </Suspense>
                    } />
                    <Route path="/settings/donation" element={
                      <Suspense fallback={<PageLoader />}>
                        <DonationSettings />
                      </Suspense>
                    } />
                    <Route path="/profile/edit" element={
                      <Suspense fallback={<PageLoader />}>
                        <ProfileEdit />
                      </Suspense>
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
                </Routes>

                <Toaster />
                <RefineKbar />
                <UnsavedChangesNotifier />
                <DocumentTitle />
                <Suspense fallback={null}>
                  <DonationWidget />
                </Suspense>
              </Refine>
        </ThemeProvider>
      </RefineKbarProvider>
    </BrowserRouter>
  );
}

export default App;
