import { useState, lazy, Suspense } from "react";
import { Authenticated, Refine } from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import {
  HomeIcon,
  CustomersIcon,
  BalancesIcon,
  SettingsIcon,
  AuditLogsIcon,
} from "./components/ui/icons";

import routerProvider, {
  CatchAllNavigate,
  DocumentTitleHandler,
  NavigateToResource,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import { dataProvider, liveProvider } from "@refinedev/supabase";
import { BrowserRouter, Outlet, Route, Routes } from "react-router";
import "./App.css";
import authProvider from "./authProvider";
import { ErrorComponent } from "./components/refine-ui/layout/error-component";
import { Layout } from "./components/refine-ui/layout/layout";
import { Toaster } from "./components/refine-ui/notification/toaster";
import { useNotificationProvider } from "./components/refine-ui/notification/use-notification-provider";
import { ThemeProvider } from "./components/refine-ui/theme/theme-provider";

// Eagerly loaded components (critical path)
import {
  BlogPostCreate,
  BlogPostEdit,
  BlogPostList,
  BlogPostShow,
} from "./pages/blog-posts";
import {
  CategoryCreate,
  CategoryEdit,
  CategoryList,
  CategoryShow,
} from "./pages/categories";
import { ForgotPassword } from "./pages/forgot-password";
import { Login } from "./pages/login";
import { Register } from "./pages/register";
import { ProfileEdit } from "./modules/profile";
import { GroupList, GroupCreate, GroupEdit, GroupShow } from "./modules/groups";
import { ExpenseCreate, ExpenseShow } from "./modules/expenses";
import { PaymentCreate } from "./modules/payments";
import { FriendList, FriendShow } from "./modules/friends";
import { NotificationList } from "./modules/notifications";
import { Dashboard } from "./pages/dashboard";
import { ErrorBoundary } from "./components/error-boundary";
import { supabaseClient } from "./utility";

// Lazy loaded components (code splitting)
const BalancesPage = lazy(() => import("./pages/balances").then(m => ({ default: m.BalancesPage })));
const ReportsPage = lazy(() => import("./pages/reports").then(m => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import("./modules/settings").then(m => ({ default: m.SettingsPage })));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

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

function App() {
  return (
    <BrowserRouter>
      <RefineKbarProvider>
        <ThemeProvider>
          <DevtoolsProvider>
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
                    icon: <CustomersIcon className="w-5 h-5" />,
                  },
                },
                {
                  name: "friends",
                  list: "/friends",
                  meta: {
                    label: "Friends",
                    icon: <CustomersIcon className="w-5 h-5" />,
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
                  meta: {
                    label: "Payments",
                    hide: true,
                  },
                },
                {
                  name: "balances",
                  list: "/balances",
                  meta: {
                    label: "Balances",
                    icon: <AuditLogsIcon className="w-5 h-5" />,
                  },
                },
                {
                  name: "reports",
                  list: "/reports",
                  meta: {
                    label: "Reports",
                    icon: <AuditLogsIcon className="w-5 h-5" />,
                  },
                },
                {
                  name: "settings",
                  list: "/settings",
                  meta: {
                    label: "Settings",
                    icon: <SettingsIcon className="w-5 h-5" />,
                  },
                },
                {
                  name: "user_settings",
                  meta: {
                    label: "User Settings",
                    hide: true,
                  },
                },
                {
                  name: "blog_posts",
                  list: "/blog-posts",
                  create: "/blog-posts/create",
                  edit: "/blog-posts/edit/:id",
                  show: "/blog-posts/show/:id",
                  meta: {
                    canDelete: true,
                  },
                },
                {
                  name: "categories",
                  list: "/categories",
                  create: "/categories/create",
                  edit: "/categories/edit/:id",
                  show: "/categories/show/:id",
                  meta: {
                    canDelete: true,
                  },
                },
              ]}
            >
              <Routes>
                {/* Public Dashboard route - accessible without authentication */}
                <Route
                  element={
                    <Layout>
                      <Outlet />
                    </Layout>
                  }
                >
                  <Route index element={<Dashboard />} />
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
                  <Route path="/blog-posts">
                    <Route index element={<BlogPostList />} />
                    <Route path="create" element={<BlogPostCreate />} />
                    <Route path="edit/:id" element={<BlogPostEdit />} />
                    <Route path="show/:id" element={<BlogPostShow />} />
                  </Route>
                  <Route path="/categories">
                    <Route index element={<CategoryList />} />
                    <Route path="create" element={<CategoryCreate />} />
                    <Route path="edit/:id" element={<CategoryEdit />} />
                    <Route path="show/:id" element={<CategoryShow />} />
                  </Route>
                  <Route path="/groups">
                    <Route index element={
                      <ErrorBoundary context="Groups List">
                        <GroupList />
                      </ErrorBoundary>
                    } />
                    <Route path="create" element={<GroupCreate />} />
                    <Route path="edit/:id" element={<GroupEdit />} />
                    <Route path="show/:id" element={
                      <ErrorBoundary context="Group Details">
                        <GroupShow />
                      </ErrorBoundary>
                    } />
                    <Route path=":groupId/expenses/create" element={<ExpenseCreate />} />
                    <Route path=":groupId/payments/create" element={<PaymentCreate />} />
                  </Route>
                  <Route path="/friends">
                    <Route index element={
                      <ErrorBoundary context="Friends List">
                        <FriendList />
                      </ErrorBoundary>
                    } />
                    <Route path="show/:id" element={
                      <ErrorBoundary context="Friend Details">
                        <FriendShow />
                      </ErrorBoundary>
                    } />
                    <Route path=":friendshipId/expenses/create" element={<ExpenseCreate />} />
                    <Route path=":friendshipId/payments/create" element={<PaymentCreate />} />
                  </Route>
                  <Route path="/expenses">
                    <Route path="show/:id" element={<ExpenseShow />} />
                  </Route>
                  <Route path="/notifications" element={<NotificationList />} />
                  <Route path="/balances" element={
                    <Suspense fallback={<PageLoader />}>
                      <BalancesPage />
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
                  <Route path="/profile/edit" element={<ProfileEdit />} />
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
              <DocumentTitleHandler />
            </Refine>
            <DevtoolsPanel />
          </DevtoolsProvider>
        </ThemeProvider>
      </RefineKbarProvider>
    </BrowserRouter>
  );
}

export default App;
