# Phase 7: Mobile Optimization

**Status:** Pending
**Priority:** High (Mobile-First User Base)
**Estimated Time:** 12-16 hours
**Dependencies:** All previous phases (1-6)

---

## Overview

Optimize entire group UX for mobile devices with proper touch targets, gestures, bottom sheets, and performance.

---

## Problem Statement

Current mobile issues:
- Touch targets too small (<44px)
- Modals cover entire screen (should use bottom sheets)
- No swipe gestures for common actions
- Slow rendering with large lists
- Desktop-first design doesn't translate well

---

## Solution Components

### 1. Touch Target Optimization

**Minimum Size:** 44px × 44px (Apple HIG, Material Design guidelines)

**Audit & Fix:**

```tsx
// BAD: Small touch targets
<Button size="sm">...</Button> // May be < 44px
<IconButton><Icon /></IconButton> // 24px icon only

// GOOD: Adequate touch targets
<Button size="lg" className="min-h-[44px]">...</Button>
<IconButton className="min-h-[44px] min-w-[44px]">...</IconButton>
```

**Create Touch Target Utility:**
```tsx
// /src/lib/mobile-utils.ts
import { cn } from './utils';

export const touchTarget = (className?: string) =>
  cn('min-h-[44px] min-w-[44px] touch-manipulation', className);

// Usage:
<Button className={touchTarget()}>Pay Now</Button>
```

**Systematic Review:**
1. All buttons in debt cards → minimum 44px height
2. All dropdown triggers → minimum 44px
3. All checkbox/radio inputs → minimum 44px
4. All nav items → minimum 44px
5. All swipeable cards → minimum 44px vertical spacing

---

### 2. Bottom Sheet Modals (Mobile)

**Replace full-screen dialogs with bottom sheets on mobile**

**Install Dependency:**
```bash
pnpm add vaul
```

**Create BottomSheet Component:**
```tsx
// /src/components/ui/bottom-sheet.tsx
import { Drawer } from 'vaul';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/use-media-query';

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  snapPoints?: number[]; // [0.5, 0.8, 1] for partial heights
}

export function BottomSheet({
  open,
  onOpenChange,
  children,
  title,
  description,
  snapPoints = [1],
}: BottomSheetProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (!isMobile) {
    // Use regular Dialog on desktop
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          {title && <DialogTitle>{title}</DialogTitle>}
          {description && <DialogDescription>{description}</DialogDescription>}
          {children}
        </DialogContent>
      </Dialog>
    );
  }

  // Use Drawer (bottom sheet) on mobile
  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={snapPoints}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl bg-background">
          {/* Drag Handle */}
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted my-4" />

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 pb-8">
            {title && (
              <Drawer.Title className="text-lg font-semibold mb-2">
                {title}
              </Drawer.Title>
            )}
            {description && (
              <Drawer.Description className="text-sm text-muted-foreground mb-4">
                {description}
              </Drawer.Description>
            )}
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
```

**Usage in Quick Settlement Dialog:**
```tsx
// Replace Dialog with BottomSheet
<BottomSheet
  open={quickSettleDialogOpen}
  onOpenChange={setQuickSettleDialogOpen}
  title={`Settle Debt with ${selectedUser?.name}`}
  description="Record a payment to settle your debt."
  snapPoints={[0.6, 0.9]} // Can drag to 60% or 90% height
>
  {/* Settlement form content */}
</BottomSheet>
```

---

### 3. Swipe Gestures

**Add swipe actions to debt cards**

**Already have:** SwipeableCard component
**Enhance for group context:**

```tsx
// Debt Card with Swipe Actions
<SwipeableCard
  rightActions={{
    primary: {
      label: 'Pay',
      icon: <CheckCircle2Icon className="h-5 w-5" />,
      color: 'bg-green-600',
      onAction: () => handleQuickSettle(user.id, amount),
    },
  }}
  leftActions={{
    secondary: {
      label: 'Details',
      icon: <EyeIcon className="h-5 w-5" />,
      color: 'bg-blue-600',
      onAction: () => setExpandedCardId(user.id),
    },
  }}
  className="md:[&>*:first-child]:pointer-events-auto"
>
  <BalanceCard {...props} />
</SwipeableCard>
```

**Add Swipe Hint for First-Time Users:**
```tsx
// Show hint on first group visit
const [showSwipeHint, setShowSwipeHint] = useState(() => {
  return !localStorage.getItem('hide-swipe-hint');
});

{showSwipeHint && (
  <Card className="border-2 border-primary bg-primary/5 mb-4">
    <CardContent className="py-3 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-2xl">👉</span>
        <p>
          <strong>Tip:</strong> Swipe cards left/right for quick actions
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setShowSwipeHint(false);
          localStorage.setItem('hide-swipe-hint', 'true');
        }}
      >
        Got it
      </Button>
    </CardContent>
  </Card>
)}
```

---

### 4. Virtual Scrolling (Performance)

**For large member lists (50+ members)**

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

function MemberList({ members }: { members: any[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Only virtualize if > 50 members
  const shouldVirtualize = members.length > 50;

  const rowVirtualizer = useVirtualizer({
    count: members.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Estimated row height
    overscan: 5,
    enabled: shouldVirtualize,
  });

  if (!shouldVirtualize) {
    // Regular rendering for small lists
    return (
      <div className="space-y-2">
        {members.map(member => (
          <MemberCard key={member.id} member={member} />
        ))}
      </div>
    );
  }

  // Virtual scrolling for large lists
  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <MemberCard member={members[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### 5. Image Lazy Loading

**Optimize avatar image loading**

```tsx
// Add loading="lazy" to all Avatar images
<Avatar>
  <AvatarImage
    src={user.avatar_url}
    loading="lazy"
    alt={user.full_name}
  />
  <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
</Avatar>

// Use native lazy loading for better performance
```

---

### 6. Sticky Header Optimization

**Ensure sticky hero balance section doesn't cause jank**

```tsx
// Add proper z-index layering and will-change
<div className="sticky top-0 z-10 bg-background pb-4 will-change-transform">
  <Card className="border-2 bg-gradient-to-br from-primary/5 to-primary/10">
    {/* Hero balance content */}
  </Card>
</div>

// Add scroll padding to prevent content hiding under sticky header
<div className="scroll-mt-32">
  {/* Content sections */}
</div>
```

---

### 7. Haptic Feedback (iOS/Android)

**Add tactile feedback for actions**

```tsx
// /src/lib/haptics.ts
export const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  // Check if Haptic API available (iOS/Android)
  if ('vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
    };
    navigator.vibrate(patterns[type]);
  }
};

// Usage on button clicks
<Button
  onClick={() => {
    triggerHaptic('medium');
    handleSettleUp(userId, amount);
  }}
>
  Pay Now
</Button>

// On swipe actions
onAction: () => {
  triggerHaptic('light');
  handleQuickSettle(user.id, amount);
}
```

---

### 8. Pull-to-Refresh

**Add pull-to-refresh for group detail page**

```tsx
import { useCallback, useState } from 'react';

function GroupShow() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    triggerHaptic('light');

    await Promise.all([
      groupQuery.refetch(),
      membersQuery.refetch(),
      expensesQuery.refetch(),
      paymentsQuery.refetch(),
    ]);

    setIsRefreshing(false);
    triggerHaptic('light');
  }, [groupQuery, membersQuery, expensesQuery, paymentsQuery]);

  return (
    <div
      className="min-h-screen overflow-y-auto"
      onTouchStart={(e) => {
        const touch = e.touches[0];
        if (window.scrollY === 0 && touch.clientY > 0) {
          // Start tracking pull gesture
          setPullStartY(touch.clientY);
        }
      }}
      onTouchMove={(e) => {
        if (pullStartY !== null) {
          const touch = e.touches[0];
          const pullDistance = touch.clientY - pullStartY;

          if (pullDistance > 80 && !isRefreshing) {
            handleRefresh();
            setPullStartY(null);
          }
        }
      }}
    >
      {isRefreshing && (
        <div className="absolute top-0 left-0 right-0 flex justify-center py-4 z-50">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}
      {/* Page content */}
    </div>
  );
}
```

---

### 9. Responsive Text Sizes

**Ensure text readable on all devices**

```tsx
// Use responsive text classes
<h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
  {group.name}
</h1>

<p className="text-sm sm:text-base text-muted-foreground">
  {group.description}
</p>

// Balance amounts
<span className="text-xl sm:text-2xl md:text-3xl font-bold">
  {formatNumber(amount)} ₫
</span>
```

---

### 10. Safe Area Insets (iOS Notch)

**Handle notch, home indicator on iOS**

```css
/* src/styles/globals.css */

/* Safe area padding */
.safe-top {
  padding-top: env(safe-area-inset-top);
}

.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

.safe-left {
  padding-left: env(safe-area-inset-left);
}

.safe-right {
  padding-right: env(safe-area-inset-right);
}

/* For sticky headers */
.sticky-with-safe {
  top: env(safe-area-inset-top);
}

/* For bottom sheets/modals */
.modal-bottom-safe {
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
}
```

**Usage:**
```tsx
// Sticky hero with safe area
<div className="sticky sticky-with-safe z-10 bg-background pb-4">
  <Card>...</Card>
</div>

// Bottom sheet content
<BottomSheet>
  <div className="modal-bottom-safe">
    {/* Content */}
  </div>
</BottomSheet>
```

---

### 11. Prevent iOS Zoom on Input Focus

```html
<!-- In index.html or root layout -->
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
/>
```

**Or use font-size >= 16px on inputs:**
```tsx
// Ensure all inputs have min 16px font
<Input className="text-base" /> // Not text-sm (14px)
```

---

### 12. Offline Support Indicators

**Show when offline, queue actions**

```tsx
// /src/hooks/use-online-status.ts
import { useEffect, useState } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// Usage:
function GroupShow() {
  const isOnline = useOnlineStatus();

  return (
    <>
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-yellow-900 px-4 py-2 text-center text-sm font-medium">
          ⚠️ You're offline. Changes will sync when reconnected.
        </div>
      )}
      {/* Page content */}
    </>
  );
}
```

---

## Systematic Audit Checklist

### Touch Targets (44px minimum)
- [ ] All buttons in debt cards
- [ ] Settlement buttons
- [ ] Add expense buttons
- [ ] Member action buttons
- [ ] Dropdown triggers
- [ ] Checkbox/radio inputs
- [ ] Tab triggers (if any remain)
- [ ] Navigation items

### Bottom Sheets
- [ ] Quick settlement dialog
- [ ] Add member form
- [ ] Settle all dialog
- [ ] Expense detail view
- [ ] Filter/sort menus

### Swipe Gestures
- [ ] Debt cards (left: details, right: pay)
- [ ] Expense cards (left: edit, right: delete)
- [ ] Member cards (right: remove)

### Performance
- [ ] Virtual scrolling for 50+ members
- [ ] Image lazy loading (all avatars)
- [ ] Memoize expensive calculations
- [ ] Debounce search inputs
- [ ] Optimize re-renders (React.memo)

### Layout
- [ ] Responsive text sizes
- [ ] Safe area insets (iOS)
- [ ] Prevent zoom on inputs
- [ ] Sticky headers don't jank
- [ ] Bottom sheets fit content

### Feedback
- [ ] Haptic feedback on actions
- [ ] Loading states visible
- [ ] Success/error toasts
- [ ] Offline indicator
- [ ] Pull-to-refresh

---

## File Changes

### New Files
1. `/src/components/ui/bottom-sheet.tsx` - Bottom sheet component
2. `/src/lib/mobile-utils.ts` - Touch target utilities
3. `/src/lib/haptics.ts` - Haptic feedback utilities
4. `/src/hooks/use-online-status.ts` - Online/offline detection

### Modified Files
1. All pages with buttons - Add `touchTarget()` utility
2. All dialogs - Replace with BottomSheet on mobile
3. All cards - Add swipe gestures where appropriate
4. MemberList - Add virtual scrolling
5. All Avatar components - Add lazy loading

### CSS Files
1. `/src/styles/globals.css` - Add safe area inset utilities

---

## Dependencies

**New:**
- `vaul` - Bottom sheet component (modern, performant)
- `@tanstack/react-virtual` - Virtual scrolling

**Existing:**
- SwipeableCard component (already implemented)
- useMediaQuery hook

---

## Success Criteria

- [ ] All touch targets minimum 44px
- [ ] Bottom sheets work on mobile (dialogs on desktop)
- [ ] Swipe gestures functional on all cards
- [ ] Virtual scrolling smooth with 100+ members
- [ ] No layout shift from images loading
- [ ] Sticky header doesn't jank on scroll
- [ ] Haptic feedback on button presses
- [ ] Pull-to-refresh works
- [ ] Safe area insets respected (iOS)
- [ ] No zoom on input focus
- [ ] Offline indicator shows when disconnected
- [ ] 60fps scrolling performance

---

## Testing Checklist

**Devices to Test:**
- iPhone SE (small screen)
- iPhone 14 Pro (notch)
- Android (various sizes)
- iPad (tablet)

**Scenarios:**
1. Tap all buttons - Verify 44px+ and haptic feedback
2. Open dialogs - Bottom sheets on mobile, dialogs on desktop
3. Swipe cards - Left/right actions work, no conflicts
4. Scroll large lists - Smooth, no jank, virtualization kicks in
5. Rotate device - Layout adapts, no breaks
6. Offline mode - Indicator shows, actions queue
7. Pull to refresh - Works on group detail page
8. Sticky header - Stays visible, no overlap issues

---

## Performance Targets

- **Time to Interactive:** < 2 seconds
- **Largest Contentful Paint:** < 2.5 seconds
- **First Input Delay:** < 100ms
- **Cumulative Layout Shift:** < 0.1
- **Scroll FPS:** 60fps minimum

**Measure with:**
```bash
# Lighthouse mobile audit
pnpm lighthouse --view --preset=mobile <url>

# React DevTools Profiler
# Check for unnecessary re-renders
```

---

## Next Phase

Phase 8: Testing & Refinement (usability testing, accessibility audit, bug fixes)
