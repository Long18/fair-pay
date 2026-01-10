# Mobile Touch Interactions

This document describes the mobile touch interaction features implemented in FairPay.

## Overview

Mobile touch interactions enhance the user experience on touch-enabled devices by providing intuitive gestures and ensuring proper touch target sizes for accessibility.

## Features Implemented

### 1. Touch Interaction Hooks

**Location:** `src/hooks/use-touch-interactions.ts`

#### `useSwipeGesture`
Detects swipe gestures in all four directions (up, down, left, right).

```tsx
const swipeRef = useSwipeGesture({
  onSwipeLeft: () => console.log('Swiped left'),
  onSwipeRight: () => console.log('Swiped right'),
  onSwipeUp: () => console.log('Swiped up'),
  onSwipeDown: () => console.log('Swiped down'),
}, 50); // threshold in pixels

<div ref={swipeRef}>Swipeable content</div>
```

#### `useSwipeToDismiss`
Provides drag state and handlers for implementing swipe-to-dismiss functionality with framer-motion.

```tsx
const { isDragging, dragY, dragProps } = useSwipeToDismiss(
  () => setOpen(false), // onDismiss callback
  100 // threshold
);

<motion.div {...dragProps}>
  Dismissible content
</motion.div>
```

#### `usePullToRefresh`
Implements pull-to-refresh functionality for scrollable containers.

```tsx
const { containerRef, isPulling, isRefreshing, pullProgress } = 
  usePullToRefresh(async () => {
    await refetchData();
  });

<div ref={containerRef}>
  Scrollable content
</div>
```

#### `useHasTouch`
Detects if the device supports touch input.

```tsx
const hasTouch = useHasTouch();
// Returns true on touch-enabled devices
```

### 2. Swipeable Dialog Component

**Location:** `src/components/ui/swipeable-dialog.tsx`

Enhanced dialog with swipe-to-dismiss functionality on mobile devices.

```tsx
<SwipeableDialog open={open} onOpenChange={setOpen}>
  <SwipeableDialogContent 
    enableSwipeToDismiss={true}
    onOpenChange={setOpen}
  >
    <SwipeableDialogHeader>
      <SwipeableDialogTitle>Title</SwipeableDialogTitle>
    </SwipeableDialogHeader>
    Content here
  </SwipeableDialogContent>
</SwipeableDialog>
```

**Features:**
- Swipe down to dismiss on mobile
- Visual drag indicator at top
- Smooth animations with framer-motion
- Automatic fallback to standard dialog on desktop

### 3. Swipeable Sheet Component

**Location:** `src/components/ui/swipeable-sheet.tsx`

Enhanced sheet (bottom sheet, side drawer) with swipe-to-dismiss.

```tsx
<SwipeableSheet open={open} onOpenChange={setOpen}>
  <SwipeableSheetContent 
    side="bottom"
    enableSwipeToDismiss={true}
    onOpenChange={setOpen}
  >
    <SwipeableSheetHeader>
      <SwipeableSheetTitle>Actions</SwipeableSheetTitle>
    </SwipeableSheetHeader>
    Content here
  </SwipeableSheetContent>
</SwipeableSheet>
```

**Features:**
- Swipe in direction of origin to dismiss
- Works with all sides (top, bottom, left, right)
- Visual drag indicator for bottom/top sheets
- Mobile-optimized with proper touch handling

### 4. Pull-to-Refresh Component

**Location:** `src/components/ui/pull-to-refresh.tsx`

Provides pull-to-refresh functionality for scrollable lists.

```tsx
<PullToRefresh 
  onRefresh={async () => {
    await refetchData();
  }}
  threshold={80}
  disabled={false}
>
  <div>Your scrollable content</div>
</PullToRefresh>
```

**Features:**
- Only enabled on mobile devices
- Visual loading indicator
- Smooth animations
- Configurable threshold
- Prevents interference with normal scrolling

### 5. Touch Target Utilities

**Location:** `src/components/ui/touch-target.tsx`

Ensures interactive elements meet WCAG minimum touch target size (44x44px).

```tsx
// Component wrapper
<TouchTarget minSize={44}>
  <button>Click me</button>
</TouchTarget>

// Hook for class names
const touchClass = useTouchTargetClass(44);
<button className={touchClass}>Click me</button>

// Spacing utility
const spacing = getTouchTargetSpacing(8);
<div className={spacing}>Buttons with proper spacing</div>
```

### 6. Enhanced Split Card

**Location:** `src/modules/expenses/components/expense-split-card.tsx`

The expense split card has been enhanced with:
- Tap-to-expand functionality on mobile (already existed, verified)
- Proper 44x44px touch targets for all buttons
- Adequate spacing between interactive elements
- Larger chevron icon for better visibility

## Touch Target Requirements

All interactive elements in the application must meet these requirements:

### Minimum Sizes
- **Touch targets:** 44x44px minimum (WCAG 2.1 Level AAA)
- **Spacing between targets:** 8px minimum

### Implementation
```tsx
// Using TouchTarget component
<TouchTarget>
  <button>Action</button>
</TouchTarget>

// Using Tailwind classes directly
<button className="min-h-[44px] min-w-[44px]">
  Action
</button>
```

## Mobile Detection

The application uses a consistent mobile breakpoint:

```tsx
import { useIsMobile } from '@/hooks/use-mobile';

const isMobile = useIsMobile();
// Returns true when viewport width < 768px
```

## Best Practices

### 1. Conditional Touch Features
Only enable touch-specific features on touch-capable devices:

```tsx
const hasTouch = useHasTouch();
const isMobile = useIsMobile();

const shouldEnableSwipe = hasTouch && isMobile;
```

### 2. Prevent Scroll Conflicts
When implementing custom touch gestures, be careful not to interfere with native scrolling:

```tsx
element.addEventListener('touchmove', handleTouchMove, { 
  passive: false // Allows preventDefault
});

// Only prevent default when necessary
if (shouldPreventScroll) {
  e.preventDefault();
}
```

### 3. Provide Visual Feedback
Always provide visual feedback for touch interactions:

```tsx
// Drag indicator for swipeable modals
<div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />

// Loading indicator for pull-to-refresh
<RefreshCwIcon className={isRefreshing ? "animate-spin" : ""} />
```

### 4. Test on Real Devices
Touch interactions should be tested on actual mobile devices, not just browser dev tools:
- iOS Safari
- Chrome Mobile (Android)
- Various screen sizes

## Accessibility

All touch interactions maintain accessibility standards:

1. **Keyboard Navigation:** All interactive elements remain keyboard accessible
2. **Screen Readers:** Proper ARIA labels and semantic HTML
3. **Focus Indicators:** Visible focus states for all interactive elements
4. **Touch Target Size:** Minimum 44x44px for all touch targets
5. **Spacing:** Adequate spacing between interactive elements

## Examples

See `src/components/ui/mobile-touch-interactions.example.tsx` for comprehensive usage examples including:
- Swipeable dialogs and sheets
- Pull-to-refresh lists
- Custom swipe gestures
- Touch target wrappers
- Conditional touch features
- Real-world activity list implementation

## Testing

Tests are located at `tests/components/mobile-touch-interactions.test.tsx`

Run tests:
```bash
npx vitest run tests/components/mobile-touch-interactions.test.tsx
```

## Browser Support

Touch interactions are supported on:
- iOS Safari 12+
- Chrome Mobile 80+
- Firefox Mobile 80+
- Samsung Internet 12+

Graceful degradation for non-touch devices:
- Touch-specific features automatically disabled
- Standard mouse/keyboard interactions work normally
- No JavaScript errors on non-touch devices

## Performance Considerations

1. **Passive Event Listeners:** Used where possible to improve scroll performance
2. **Debouncing:** Not needed for touch events (they're already discrete)
3. **Animation Performance:** Uses CSS transforms and framer-motion for 60fps animations
4. **Memory Management:** Proper cleanup of event listeners in useEffect

## Future Enhancements

Potential improvements for future iterations:
- Haptic feedback on supported devices
- Multi-touch gestures (pinch, rotate)
- Long-press gestures
- Swipe-to-delete for list items
- Customizable swipe thresholds per component
- Gesture conflict resolution system

## Related Requirements

This implementation addresses the following requirements from the spec:
- **Requirement 10.1:** Tap-to-expand for split cards on mobile
- **Requirement 10.2:** Minimum 44x44px touch targets
- **Requirement 10.3:** Pull-to-refresh on activity lists (optional)
- **Requirement 10.7:** Swipe-to-dismiss for modals (optional)
