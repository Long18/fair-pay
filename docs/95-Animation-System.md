# Animation System Documentation

## Overview

This document describes the animation system implemented for the Transaction Clarity & UX Improvements feature. The system provides consistent, performant animations across the FairPay application.

## Purpose

- Provide consistent animation durations and easing functions
- Improve user experience with smooth transitions
- Maintain performance with optimized animations
- Follow design guidelines (300ms for expand/collapse, 200ms for standard transitions)

## Tech Stack

- **Framer Motion**: v12.24.10 - Complex animations and gestures
- **Tailwind CSS**: v4.1.4 - Utility-based animations
- **tw-animate-css**: v1.2.5 - Additional animation utilities
- **CSS Custom Properties**: For configurable animation durations

## Architecture

### 1. Animation Utilities (`src/lib/animations.ts`)

Centralized framer-motion animation variants for consistent animations:

```typescript
import { expandCollapseVariants, fadeVariants, tabContentVariants } from '@/lib/animations';

// Usage in components
<motion.div
  variants={expandCollapseVariants}
  initial="collapsed"
  animate="expanded"
>
  {/* Content */}
</motion.div>
```

### 2. CSS Animation Utilities (`src/App.css`)

CSS-based animations for simple transitions:

```css
/* CSS Variables */
--animation-duration-fast: 150ms;
--animation-duration-normal: 200ms;
--animation-duration-slow: 300ms;

/* Usage in components */
<div className="animate-expand">
  {/* Content */}
</div>
```

### 3. Tailwind Utilities

Built-in Tailwind animations:

```tsx
<div className="transition-all duration-300 ease-out">
  {/* Content */}
</div>
```

## Animation Guidelines

### Duration Standards

| Duration | Use Case | Value |
|----------|----------|-------|
| Fast | Micro-interactions, hover effects | 150ms |
| Normal | Standard transitions, fades | 200ms |
| Slow | Expand/collapse, complex animations | 300ms |

### Easing Functions

| Easing | Use Case | Value |
|--------|----------|-------|
| ease-out | Entering animations | cubic-bezier(0, 0, 0.2, 1) |
| ease-in | Exiting animations | cubic-bezier(0.4, 0, 1, 1) |
| ease-in-out | Bidirectional animations | cubic-bezier(0.4, 0, 0.2, 1) |

## Available Animations

### 1. Expand/Collapse (300ms)

**Use Cases**: Activity rows, split cards, accordions

**Framer Motion**:
```tsx
import { expandCollapseVariants } from '@/lib/animations';

<motion.div
  variants={expandCollapseVariants}
  initial="collapsed"
  animate={isExpanded ? "expanded" : "collapsed"}
>
  {/* Content */}
</motion.div>
```

**CSS**:
```tsx
<div className={isExpanded ? "animate-expand" : "animate-collapse"}>
  {/* Content */}
</div>
```

### 2. Fade (200ms)

**Use Cases**: Overlays, modals, tooltips

**Framer Motion**:
```tsx
import { fadeVariants } from '@/lib/animations';

<motion.div
  variants={fadeVariants}
  initial="hidden"
  animate="visible"
>
  {/* Content */}
</motion.div>
```

**CSS**:
```tsx
<div className="animate-fade-in">
  {/* Content */}
</div>
```

### 3. Slide

**Use Cases**: Drawers, sheets, side panels

**Framer Motion**:
```tsx
import { slideVariants } from '@/lib/animations';

<motion.div
  variants={slideVariants.fromRight}
  initial="hidden"
  animate="visible"
  exit="exit"
>
  {/* Content */}
</motion.div>
```

**CSS**:
```tsx
<div className="animate-slide-in-from-right">
  {/* Content */}
</div>
```

### 4. Tab Transitions

**Use Cases**: Tab content switching

**Framer Motion**:
```tsx
import { AnimatePresence } from 'framer-motion';
import { tabContentVariants } from '@/lib/animations';

<AnimatePresence mode="wait" custom={direction}>
  <motion.div
    key={activeTab}
    custom={direction}
    variants={tabContentVariants}
    initial="enter"
    animate="center"
    exit="exit"
  >
    {/* Tab content */}
  </motion.div>
</AnimatePresence>
```

### 5. Stagger

**Use Cases**: Lists, grids

**Framer Motion**:
```tsx
import { staggerContainerVariants, staggerItemVariants } from '@/lib/animations';

<motion.div
  variants={staggerContainerVariants}
  initial="hidden"
  animate="visible"
>
  {items.map(item => (
    <motion.div key={item.id} variants={staggerItemVariants}>
      {/* Item content */}
    </motion.div>
  ))}
</motion.div>
```

### 6. Scale

**Use Cases**: Buttons, cards, interactive elements

**Framer Motion**:
```tsx
import { scaleVariants } from '@/lib/animations';

<motion.div
  variants={scaleVariants}
  initial="hidden"
  animate="visible"
>
  {/* Content */}
</motion.div>
```

**CSS**:
```tsx
<div className="animate-scale-in">
  {/* Content */}
</div>
```

### 7. Rotation

**Use Cases**: Chevrons, arrows, loading indicators

**Framer Motion**:
```tsx
import { rotateVariants } from '@/lib/animations';

<motion.div
  variants={rotateVariants}
  animate={isExpanded ? "expanded" : "collapsed"}
>
  <ChevronDownIcon />
</motion.div>
```

**CSS**:
```tsx
<ChevronDownIcon className={cn(
  "rotate-chevron",
  isExpanded && "expanded"
)} />
```

## Existing Animations

The following animations were already implemented and are being standardized:

### Radix UI Components

Radix UI components (Dialog, Popover, Dropdown, etc.) have built-in animations using `data-[state]` attributes:

```tsx
// Already implemented in shadcn/ui components
<DialogContent className="data-[state=open]:animate-in data-[state=closed]:animate-out">
  {/* Content */}
</DialogContent>
```

### Tailwind Utilities

Existing Tailwind animations:
- `animate-spin` - Loading spinners
- `animate-pulse` - Skeleton loaders
- `transition-colors` - Color transitions
- `transition-all` - All property transitions

### Framer Motion Components

Already using framer-motion:
- `src/components/ui/swipeable-dialog.tsx`
- `src/components/ui/pull-to-refresh.tsx`
- `src/components/dashboard/activity-time-period-group.tsx`
- `src/components/dashboard/enhanced-activity-row.tsx`
- `src/modules/expenses/components/expense-split-card.tsx`
- `src/modules/profile/components/*` (multiple components)

## Performance Considerations

### Best Practices

1. **Use CSS animations for simple transitions**
   - Faster than JavaScript animations
   - Hardware-accelerated
   - Lower CPU usage

2. **Use framer-motion for complex animations**
   - Gestures (swipe, drag)
   - Coordinated animations
   - Dynamic animations

3. **Avoid animating expensive properties**
   - ❌ Avoid: `width`, `height`, `top`, `left`
   - ✅ Prefer: `transform`, `opacity`

4. **Use `will-change` sparingly**
   - Only for animations that will definitely happen
   - Remove after animation completes

5. **Optimize AnimatePresence**
   - Use `mode="wait"` for tab transitions
   - Use `mode="popLayout"` for list animations

### Performance Monitoring

Monitor animation performance using:
- Chrome DevTools Performance tab
- React DevTools Profiler
- Lighthouse performance audits

## Toast Notifications

Toast notifications use the Sonner library, which already has built-in animations. No additional configuration needed:

```tsx
import { toast } from 'sonner';

toast.success('Payment settled successfully');
```

## Accessibility

### Motion Preferences

Respect user's motion preferences:

```tsx
import { useReducedMotion } from 'framer-motion';

const shouldReduceMotion = useReducedMotion();

<motion.div
  animate={shouldReduceMotion ? {} : { scale: 1.05 }}
>
  {/* Content */}
</motion.div>
```

### Focus Management

Ensure animations don't interfere with keyboard navigation:
- Maintain focus during animations
- Announce state changes to screen readers
- Provide skip animation options

## Testing

### Visual Regression Testing

Test animations using visual regression tools:
- Capture snapshots of animation states
- Test on multiple browsers
- Test on multiple devices

### Performance Testing

Monitor animation performance:
- Frame rate (target: 60fps)
- CPU usage
- Memory usage

## Migration Guide

### Updating Existing Components

1. **Identify animation patterns**
   - Find components with transitions
   - Check for inline animation code

2. **Replace with utilities**
   ```tsx
   // Before
   <div style={{ transition: 'all 0.3s ease-out' }}>
   
   // After
   <div className="transition-smooth-slow">
   ```

3. **Use framer-motion for complex animations**
   ```tsx
   // Before
   <div className={isExpanded ? "h-auto" : "h-0"}>
   
   // After
   <motion.div
     variants={expandCollapseVariants}
     animate={isExpanded ? "expanded" : "collapsed"}
   >
   ```

## Examples

### Example 1: Enhanced Activity Row

```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { expandCollapseVariants, rotateVariants } from '@/lib/animations';

export function EnhancedActivityRow({ expense, paymentEvents, isExpanded, onToggle }) {
  return (
    <div>
      <div onClick={onToggle}>
        <motion.div
          variants={rotateVariants}
          animate={isExpanded ? "expanded" : "collapsed"}
        >
          <ChevronDownIcon />
        </motion.div>
        {/* Expense info */}
      </div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            variants={expandCollapseVariants}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
          >
            {paymentEvents.map(event => (
              <div key={event.id}>{/* Event details */}</div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

### Example 2: Tab Transitions

```tsx
import { AnimatePresence, motion } from 'framer-motion';
import { tabContentVariants } from '@/lib/animations';

export function TabContent({ activeTab, tabs }) {
  const [direction, setDirection] = useState(0);
  
  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={activeTab}
        custom={direction}
        variants={tabContentVariants}
        initial="enter"
        animate="center"
        exit="exit"
      >
        {tabs[activeTab].content}
      </motion.div>
    </AnimatePresence>
  );
}
```

## Troubleshooting

### Common Issues

1. **Animation not playing**
   - Check if `initial` and `animate` props are set
   - Verify variant names match
   - Check if AnimatePresence is needed

2. **Janky animations**
   - Use `transform` instead of `width`/`height`
   - Add `will-change` for complex animations
   - Reduce animation complexity

3. **Layout shift during animation**
   - Use `layout` prop on motion components
   - Set explicit dimensions
   - Use `overflow: hidden` on parent

## Future Enhancements

- [ ] Add spring animations for more natural feel
- [ ] Implement gesture-based animations (swipe, drag)
- [ ] Add animation presets for common patterns
- [ ] Create animation playground for testing
- [ ] Add animation performance monitoring

## References

- [Framer Motion Documentation](https://www.framer.com/motion/)
- [Tailwind CSS Animations](https://tailwindcss.com/docs/animation)
- [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)
- [CSS Transitions](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Transitions)

## Conclusion

The animation system provides a consistent, performant foundation for animations across the FairPay application. By following these guidelines and using the provided utilities, developers can create smooth, accessible animations that enhance the user experience.
