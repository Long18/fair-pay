import { Authenticated, GitHubBanner, Refine } from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";

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
import { FriendList } from "./modules/friends";
import { Dashboard } from "./pages/dashboard";
import { supabaseClient } from "./utility";

function App() {
  return (
    <BrowserRouter>
      <GitHubBanner />
      <RefineKbarProvider>
        <ThemeProvider>
          <DevtoolsProvider>
            <Refine
              dataProvider={dataProvider(supabaseClient)}
              liveProvider={liveProvider(supabaseClient)}
              authProvider={authProvider}
              routerProvider={routerProvider}
              notificationProvider={useNotificationProvider()}
              resources={[
                {
                  name: "dashboard",
                  list: "/",
                  meta: {
                    label: "Dashboard",
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
                  },
                },
                {
                  name: "friends",
                  list: "/friends",
                  meta: {
                    label: "Friends",
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
              options={{
                syncWithLocation: true,
                warnWhenUnsavedChanges: true,
                projectId: "efvxeD-2r07zg-niV06o",
              }}
            >
              <Routes>
                <Route
                  element={
                    <Authenticated
                      key="authenticated-inner"
                      fallback={<CatchAllNavigate to="/login" />}
                    >
                      <Layout>
                        <Outlet />
                      </Layout>
                    </Authenticated>
                  }
                >
                  <Route
                    index
                    element={<Dashboard />}
                  />
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
                    <Route index element={<GroupList />} />
                    <Route path="create" element={<GroupCreate />} />
                    <Route path="edit/:id" element={<GroupEdit />} />
                    <Route path="show/:id" element={<GroupShow />} />
                    <Route path=":groupId/expenses/create" element={<ExpenseCreate />} />
                    <Route path=":groupId/payments/create" element={<PaymentCreate />} />
                  </Route>
                  <Route path="/friends">
                    <Route index element={<FriendList />} />
                  </Route>
                  <Route path="/expenses">
                    <Route path="show/:id" element={<ExpenseShow />} />
                  </Route>
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
