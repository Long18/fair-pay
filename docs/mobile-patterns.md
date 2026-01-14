# Mobile UI Patterns

Comprehensive guide to mobile-optimized UI patterns for FairPay. This documentation covers bottom navigation, mobile app bars, responsive visibility utilities, and mobile-first best practices.

---

## Bottom Navigation

### Overview

Bottom navigation provides easy thumb-access navigation on mobile devices. Follows iOS Human Interface Guidelines and Material Design specifications for optimal mobile UX.

**Key Features**:
- 44px minimum touch targets (WCAG AAA compliance)
- Only visible on mobile (< 768px)
- Maximum 5 navigation items
- Active state indication
- Badge support for notifications
- Safe area support for notched devices

### Components

#### BottomNavigation

Root container for navigation items. Automatically handles layout, positioning, and mobile-only visibility.

```tsx
import {
  BottomNavigation,
  BottomNavigationItem,
  BottomNavigationSpacer,
} from "@/components/ui/bottom-navigation";
```

**Props**:
- `children` - BottomNavigationItem components
- `className` - Optional additional classes
- Extends `React.HTMLAttributes<HTMLElement>`

**Example**:
```tsx
<BottomNavigation>
  <BottomNavigationItem
    to="/dashboard"
    icon={<HomeIcon />}
    label="Home"
  />
  <BottomNavigationItem
    to="/balances"
    icon={<WalletIcon />}
    label="Balances"
    badge={3}
  />
  <BottomNavigationItem
    to="/groups"
    icon={<UsersIcon />}
    label="Groups"
  />
  <BottomNavigationItem
    to="/settings"
    icon={<SettingsIcon />}
    label="Settings"
  />
</BottomNavigation>
```

#### BottomNavigationItem

Individual navigation item with icon, label, and optional badge.

**Props**:
- `to` (required) - Route path for navigation
- `icon` (required) - Icon component (24x24px recommended)
- `label` (required) - Text label (short, 1-2 words)
- `badge` - Number or string for notification badge
- `onClick` - Optional click handler (called before navigation)

**Active State**:
Automatically highlights when the current route matches the `to` prop or starts with it (for nested routes).

```tsx
// Matches both /balances and /balances/123
<BottomNavigationItem
  to="/balances"
  icon={<WalletIcon />}
  label="Balances"
/>
```

**Badge Support**:
```tsx
// Numeric badge
<BottomNavigationItem
  to="/notifications"
  icon={<BellIcon />}
  label="Notifications"
  badge={5}
/>

// 99+ for large numbers
<BottomNavigationItem
  badge={150} // Shows "99+"
/>

// String badge
<BottomNavigationItem
  badge="NEW"
/>
```

#### BottomNavigationSpacer

Adds bottom padding to page content to prevent it from being hidden behind the bottom navigation bar.

**Usage**:
Place at the end of your page content, just before closing the main content container.

```tsx
<PageContainer>
  <PageContent>
    {/* Your content */}
  </PageContent>
  <BottomNavigationSpacer />
</PageContainer>
```

### Integration Patterns

#### Full Page Layout

For pages that use bottom navigation instead of the default sidebar:

```tsx
import { BottomNavigation, BottomNavigationItem, BottomNavigationSpacer } from "@/components/ui/bottom-navigation";

export function MyPage() {
  return (
    <>
      <PageContainer>
        <PageContent>
          {/* Page content */}
        </PageContent>
        <BottomNavigationSpacer />
      </PageContainer>

      <BottomNavigation>
        <BottomNavigationItem to="/dashboard" icon={<HomeIcon />} label="Home" />
        <BottomNavigationItem to="/balances" icon={<WalletIcon />} label="Balances" />
        <BottomNavigationItem to="/groups" icon={<UsersIcon />} label="Groups" />
      </BottomNavigation>
    </>
  );
}
```

#### Hybrid Navigation

Combine bottom nav (mobile) with sidebar (desktop):

```tsx
import { BottomNavigation } from "@/components/ui/bottom-navigation";
import { MobileOnly, DesktopOnly } from "@/components/ui/responsive";

export function Layout({ children }) {
  return (
    <>
      <DesktopOnly>
        <Sidebar />
      </DesktopOnly>

      <main>{children}</main>

      <MobileOnly>
        <BottomNavigation>
          {/* Nav items */}
        </BottomNavigation>
      </MobileOnly>
    </>
  );
}
```

### Design Guidelines

**Navigation Item Limits**:
- **Optimal**: 3-4 items (easy to scan and tap)
- **Maximum**: 5 items (Material Design limit)
- **Avoid**: 6+ items (causes crowding, small touch targets)

**Icon Selection**:
- Use 24x24px icons for best clarity
- Choose filled variants for active state
- Outlined variants for inactive state
- Ensure high contrast for accessibility

**Label Guidelines**:
- Keep labels short (1-2 words max)
- Use sentence case ("Home", not "HOME")
- Match navigation item to page title
- Avoid truncation where possible

**Accessibility**:
- All items have `aria-label` with full label text
- Active item has `aria-current="page"`
- Minimum 44x44px touch targets
- Color contrast ratio ≥ 4.5:1

---

## Mobile App Bar

### Overview

Mobile app bar provides a simplified header for pages using bottom navigation. Compact design maximizes content space while maintaining clear navigation affordances.

**Key Features**:
- 48px compact height (vs 64px standard header)
- Optional back button with auto-navigation
- Support for page-level actions
- Subtitle support
- Only visible on mobile (< 768px)

### Components

#### MobileAppBar

Simplified mobile header for content-focused pages.

```tsx
import { MobileAppBar } from "@/components/ui/mobile-app-bar";
```

**Props**:
- `title` (required) - Page title (ReactNode)
- `showBack` - Show back button (default: false)
- `onBack` - Custom back handler (default: navigate(-1))
- `action` - Action buttons/controls (ReactNode)
- `subtitle` - Subtitle/description text
- `className` - Optional additional classes

**Basic Example**:
```tsx
<MobileAppBar title="Expense Details" />
```

**With Back Button**:
```tsx
<MobileAppBar
  title="Edit Profile"
  showBack
/>
```

**With Actions**:
```tsx
<MobileAppBar
  title="New Expense"
  showBack
  action={
    <>
      <Button variant="ghost" size="sm">Cancel</Button>
      <Button size="sm">Save</Button>
    </>
  }
/>
```

**With Subtitle**:
```tsx
<MobileAppBar
  title="Monthly Report"
  subtitle="January 2025"
  showBack
/>
```

#### DesktopAppBar

Full-featured desktop header with generous spacing.

**Props**:
- `title` (required) - Page title
- `description` - Description text
- `action` - Action buttons
- `breadcrumb` - Breadcrumb navigation
- `className` - Optional additional classes

**Example**:
```tsx
<DesktopAppBar
  title="Dashboard"
  description="Manage your expenses and balances"
  action={<Button>Create Expense</Button>}
  breadcrumb={
    <Breadcrumb>
      <BreadcrumbItem>Home</BreadcrumbItem>
      <BreadcrumbItem>Dashboard</BreadcrumbItem>
    </Breadcrumb>
  }
/>
```

#### ResponsiveAppBar

Automatically switches between mobile and desktop variants based on screen size.

**Example**:
```tsx
<ResponsiveAppBar
  title="Expense Details"
  description="View and edit expense information"
  subtitle="Created on Jan 14, 2025" // Mobile only
  showBack
  action={<Button>Save</Button>}
/>
```

### Usage Patterns

#### Content Page with Bottom Nav

```tsx
export function ExpenseDetail() {
  return (
    <>
      <MobileAppBar
        title="Expense Details"
        showBack
        action={<Button size="sm">Edit</Button>}
      />

      <PageContainer>
        <PageContent>
          {/* Content */}
        </PageContent>
        <BottomNavigationSpacer />
      </PageContainer>

      <BottomNavigation>{/* Nav items */}</BottomNavigation>
    </>
  );
}
```

#### Modal/Dialog Header

```tsx
<Dialog>
  <DialogContent>
    <MobileAppBar
      title="Filter Options"
      action={
        <Button variant="ghost" size="sm" onClick={onClose}>
          Done
        </Button>
      }
    />
    {/* Dialog content */}
  </DialogContent>
</Dialog>
```

---

## Responsive Visibility Utilities

### Overview

Utilities for controlling component visibility across breakpoints. Follows mobile-first responsive design principles.

**Breakpoints** (Tailwind defaults):
- `sm`: 640px (large mobile/small tablet)
- `md`: 768px (tablet - primary mobile/desktop threshold)
- `lg`: 1024px (small desktop)
- `xl`: 1280px (large desktop)
- `2xl`: 1536px (extra large desktop)

### Components

#### MobileOnly

Shows content only on mobile devices (< 768px).

```tsx
import { MobileOnly } from "@/components/ui/responsive";

<MobileOnly>
  <BottomNavigation>{/* Nav */}</BottomNavigation>
</MobileOnly>
```

**Props**:
- `children` - Content to show on mobile
- `asSpan` - Render as span instead of div (default: false)
- `className` - Additional classes

#### DesktopOnly

Shows content only on desktop devices (≥ 768px).

```tsx
<DesktopOnly>
  <Sidebar />
</DesktopOnly>
```

#### TabletUp

Shows content on tablet and desktop (≥ 640px).

```tsx
<TabletUp>
  <DetailedChart />
</TabletUp>
```

#### TabletOnly

Shows content only on tablets (640px - 1024px).

```tsx
<TabletOnly>
  <CompactNavigation />
</TabletOnly>
```

#### LargeDesktopOnly

Shows content only on large desktops (≥ 1024px).

```tsx
<LargeDesktopOnly>
  <AdvancedFilters />
</LargeDesktopOnly>
```

#### ResponsiveText

Shows different text content based on screen size.

```tsx
<ResponsiveText
  mobile="Save"
  tablet="Save Changes"
  desktop="Save All Changes"
/>

// In a button
<Button>
  <ResponsiveText
    mobile={<SaveIcon />}
    desktop="Save"
  />
</Button>
```

#### ShowAt / HideAt

Flexible breakpoint control.

```tsx
<ShowAt breakpoint="lg">
  <AdvancedOptions />
</ShowAt>

<HideAt breakpoint="md">
  <MobileMenu />
</HideAt>
```

**Available breakpoints**: `sm`, `md`, `lg`, `xl`, `2xl`

### Usage Patterns

#### Responsive Navigation

```tsx
// Desktop sidebar, mobile bottom nav
<>
  <DesktopOnly>
    <Sidebar />
  </DesktopOnly>

  <MobileOnly>
    <BottomNavigation>{/* Nav */}</BottomNavigation>
  </MobileOnly>
</>
```

#### Responsive Labels

```tsx
<Button>
  <SaveIcon />
  <ResponsiveText
    mobile=""
    desktop="Save Changes"
  />
</Button>
```

#### Responsive Layouts

```tsx
// Different layouts for mobile vs desktop
<MobileOnly>
  <StackedLayout>{/* Content */}</StackedLayout>
</MobileOnly>

<DesktopOnly>
  <SideBySideLayout>{/* Content */}</SideBySideLayout>
</DesktopOnly>
```

#### Conditional Features

```tsx
// Show advanced features only on desktop
<TabletUp>
  <AdvancedFilters />
  <BulkActions />
</TabletUp>
```

---

## Mobile-First Best Practices

### Touch Target Sizing

**Minimum Sizes** (WCAG 2.1):
- **Level AA**: 24x24px (absolute minimum)
- **Level AAA**: 44x44px (recommended)
- **Optimal**: 48x48px (most comfortable)

**Implementation**:
```tsx
// Good - 44px minimum
<Button className="min-h-[44px] min-w-[44px]">
  <Icon />
</Button>

// Better - 48px optimal
<Button size="lg" className="h-12 w-12">
  <Icon />
</Button>
```

### Spacing and Layout

**Thumb Zones**:
- Bottom third of screen: easiest to reach
- Top corners: hardest to reach
- Place primary actions in thumb zone

**Safe Areas**:
- Use `pb-safe` for notched devices
- Account for bottom navigation (64px)
- Leave 16px padding around interactive elements

### Typography

**Mobile Font Sizes**:
- Page title: 20-24px (text-xl to text-2xl)
- Section heading: 16-18px (text-base to text-lg)
- Body text: 14-16px (text-sm to text-base)
- Caption: 12-14px (text-xs to text-sm)

**Line Height**:
- Increase line height on mobile for readability
- Minimum 1.5 for body text
- Minimum 1.4 for headings

### Performance

**Mobile Optimizations**:
- Lazy load images and heavy components
- Use smaller image sizes on mobile
- Minimize JavaScript bundle for mobile
- Implement virtual scrolling for long lists

**Example**:
```tsx
import { lazy, Suspense } from "react";

const HeavyChart = lazy(() => import("./HeavyChart"));

<DesktopOnly>
  <Suspense fallback={<Skeleton />}>
    <HeavyChart />
  </Suspense>
</DesktopOnly>
```

### Gestures

**Common Mobile Gestures**:
- **Swipe**: Navigate between pages, dismiss items
- **Pull-to-refresh**: Reload data
- **Long press**: Show context menu
- **Pinch**: Zoom (for images, maps)

See `docs/MOBILE-TOUCH-INTERACTIONS.md` for gesture implementation details.

---

## Component Reference

### File Locations

```
src/components/ui/
├── bottom-navigation.tsx     # Bottom nav components
├── mobile-app-bar.tsx        # Mobile app bar components
└── responsive.tsx            # Responsive visibility utilities
```

### Import Examples

```tsx
// Bottom Navigation
import {
  BottomNavigation,
  BottomNavigationItem,
  BottomNavigationSpacer,
} from "@/components/ui/bottom-navigation";

// Mobile App Bar
import {
  MobileAppBar,
  DesktopAppBar,
  ResponsiveAppBar,
} from "@/components/ui/mobile-app-bar";

// Responsive Utilities
import {
  MobileOnly,
  DesktopOnly,
  TabletUp,
  TabletOnly,
  LargeDesktopOnly,
  ResponsiveText,
  ShowAt,
  HideAt,
} from "@/components/ui/responsive";
```

---

## Migration Guide

### Converting to Bottom Navigation

**Before** (using drawer sidebar on mobile):
```tsx
export function MyPage() {
  return (
    <Layout>
      <PageContent>
        {/* Content */}
      </PageContent>
    </Layout>
  );
}
```

**After** (using bottom navigation):
```tsx
export function MyPage() {
  return (
    <>
      <MobileAppBar title="My Page" />

      <PageContainer>
        <PageContent>
          {/* Content */}
        </PageContent>
        <BottomNavigationSpacer />
      </PageContainer>

      <MobileOnly>
        <BottomNavigation>
          <BottomNavigationItem to="/home" icon={<HomeIcon />} label="Home" />
          <BottomNavigationItem to="/search" icon={<SearchIcon />} label="Search" />
        </BottomNavigation>
      </MobileOnly>
    </>
  );
}
```

### Adding Responsive Visibility

**Before** (always showing):
```tsx
<Sidebar />
```

**After** (desktop only):
```tsx
<DesktopOnly>
  <Sidebar />
</DesktopOnly>
```

### Responsive App Headers

**Before** (inconsistent mobile/desktop headers):
```tsx
export function MyPage() {
  const isMobile = useMediaQuery("(max-width: 768px)");

  return (
    <>
      {isMobile ? (
        <header className="h-12 px-4">
          <h1 className="text-sm">{title}</h1>
        </header>
      ) : (
        <header className="mb-6">
          <h1 className="text-2xl">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </header>
      )}
      {/* Content */}
    </>
  );
}
```

**After** (using ResponsiveAppBar):
```tsx
export function MyPage() {
  return (
    <>
      <ResponsiveAppBar
        title={title}
        description={description}
      />
      {/* Content */}
    </>
  );
}
```

---

## Testing

### Manual Testing Checklist

**Bottom Navigation**:
- [ ] Navigation items visible on mobile (< 768px)
- [ ] Hidden on desktop (≥ 768px)
- [ ] Active state highlights current page
- [ ] Badge displays correctly
- [ ] Touch targets are 44px minimum
- [ ] Safe area padding on notched devices
- [ ] Content not hidden behind nav bar (with spacer)

**Mobile App Bar**:
- [ ] Shows only on mobile
- [ ] Back button navigates correctly
- [ ] Action buttons work as expected
- [ ] Title truncates properly when long
- [ ] Subtitle displays on second line

**Responsive Utilities**:
- [ ] MobileOnly hidden on desktop
- [ ] DesktopOnly hidden on mobile
- [ ] ResponsiveText switches correctly
- [ ] No layout shift during breakpoint transitions

### Automated Testing

```tsx
// Example test for BottomNavigation
import { render, screen } from "@testing-library/react";
import { BottomNavigation, BottomNavigationItem } from "@/components/ui/bottom-navigation";

describe("BottomNavigation", () => {
  it("renders navigation items", () => {
    render(
      <BottomNavigation>
        <BottomNavigationItem to="/home" icon={<HomeIcon />} label="Home" />
      </BottomNavigation>
    );

    expect(screen.getByLabelText("Home")).toBeInTheDocument();
  });

  it("highlights active item", () => {
    // Mock useLocation to return /home
    render(
      <BottomNavigation>
        <BottomNavigationItem to="/home" icon={<HomeIcon />} label="Home" />
      </BottomNavigation>
    );

    const item = screen.getByLabelText("Home");
    expect(item).toHaveAttribute("aria-current", "page");
  });
});
```

---

## Related Documentation

- [Mobile Touch Interactions](./MOBILE-TOUCH-INTERACTIONS.md) - Swipe gestures, pull-to-refresh
- [Layout Components](./components/layout.md) - Page layout system
- [UX Optimizations](./ux-optimizations.md) - State persistence, keyboard shortcuts
- [Component Rules](./design-system/component-rules.md) - Component design patterns
- [Interaction Rules](./design-system/interaction-rules.md) - Touch and click interactions
