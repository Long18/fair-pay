# UX Optimizations

Documentation for UX flow improvements implemented in Phase 4 to enhance user experience through state persistence, keyboard navigation, and interaction optimizations.

---

## Tab State Persistence

### Problem

Users lose their tab selection when navigating away and returning to pages with tabbed interfaces (Dashboard, Balances page). This forces them to re-select their preferred tab every time, creating unnecessary friction.

### Solution

Implemented `usePersistedState` hook to automatically save and restore tab selections to localStorage with cross-tab synchronization.

### Implementation

**Hook**: `src/hooks/use-persisted-state.ts`

```tsx
const [activeTab, setActiveTab] = usePersistedState<"balances" | "activity">(
  "dashboard-tab",
  "balances"
);
```

**Features**:
- Automatic localStorage persistence
- Cross-tab synchronization
- Type-safe generic implementation
- Graceful error handling

### Usage Examples

#### Dashboard Tab Persistence

**File**: `src/pages/dashboard.tsx`

```tsx
import { usePersistedState } from "@/hooks/use-persisted-state";

export const Dashboard = () => {
  const [activeTab, setActiveTab] = usePersistedState<"balances" | "activity">(
    "dashboard-tab",
    "balances"
  );

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "balances" | "activity")}>
      <TabsList>
        <TabsTrigger value="balances">Balances</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
      </TabsList>
      {/* Tab content */}
    </Tabs>
  );
};
```

#### Balances Page Tab Persistence

**File**: `src/pages/balances.tsx`

```tsx
const [activeTab, setActiveTab] = usePersistedState<'you-owe' | 'owed-to-you'>(
  'balances-tab',
  'you-owe'
);
```

### Benefits

- **User Convenience**: Tab selection persists across sessions
- **Reduced Clicks**: Users don't re-select tabs every visit
- **Context Preservation**: Returns users to their last viewed content
- **Cross-Tab Sync**: Changes in one tab reflect immediately in other tabs

---

## Keyboard Navigation

### Problem

Power users cannot efficiently navigate the application using keyboard shortcuts, forcing them to rely on mouse interactions for all actions.

### Solution

Implemented `useKeyboardShortcut` hook providing a declarative API for registering keyboard shortcuts with automatic cleanup.

### Implementation

**Hook**: `src/hooks/use-keyboard-shortcut.ts`

```tsx
useKeyboardShortcut([
  {
    key: "cmd+k",
    callback: () => openCommandPalette(),
    description: "Open command palette",
  },
  {
    key: "esc",
    callback: () => closeModal(),
    description: "Close modal",
  }
]);
```

### Supported Key Patterns

#### Modifier Keys

- `cmd` or `meta` - Command (Mac) / Windows key
- `ctrl` - Control key
- `shift` - Shift key
- `alt` or `option` - Alt/Option key

#### Special Keys

- `esc` - Escape
- `enter` - Enter/Return
- `space` - Spacebar
- `tab` - Tab
- `up`, `down`, `left`, `right` - Arrow keys

#### Letter and Number Keys

- `a-z` - Letter keys
- `0-9` - Number keys

### Common Shortcuts

```tsx
// Command palette
useKeyboardShortcut([
  { key: "cmd+k", callback: () => setCommandPaletteOpen(true) }
]);

// Save form
useKeyboardShortcut([
  {
    key: "cmd+s",
    callback: () => saveForm(),
    preventDefault: true // Prevent browser save dialog
  }
]);

// Close modal
useKeyboardShortcut([
  {
    key: "esc",
    callback: () => setModalOpen(false),
    enabled: modalOpen // Only active when modal is open
  }
]);

// Navigate tabs
useKeyboardShortcut([
  { key: "1", callback: () => setActiveTab("tab1") },
  { key: "2", callback: () => setActiveTab("tab2") },
  { key: "3", callback: () => setActiveTab("tab3") }
]);
```

### Convenience Hooks

#### useCommandPaletteShortcut

Quick setup for command palette (cmd+k):

```tsx
import { useCommandPaletteShortcut } from "@/hooks/use-keyboard-shortcut";

function MyComponent() {
  useCommandPaletteShortcut(() => setCommandPaletteOpen(true));
}
```

#### useEscapeKey

Handle Escape key for modals/dialogs:

```tsx
import { useEscapeKey } from "@/hooks/use-keyboard-shortcut";

function MyModal({ isOpen, onClose }) {
  useEscapeKey(onClose, isOpen);
}
```

### Input Protection

The hook automatically ignores keyboard events when user is typing in:
- `<input>` fields
- `<textarea>` fields
- ContentEditable elements

This prevents shortcuts from interfering with text entry.

### Best Practices

1. **Use Standard Shortcuts**: Follow platform conventions (cmd+k for search, esc to close, etc.)
2. **Provide Visual Hints**: Show keyboard shortcuts in tooltips and menus
3. **Make Shortcuts Discoverable**: Include keyboard shortcut list in help/settings
4. **Conditional Shortcuts**: Use `enabled` prop to activate shortcuts contextually
5. **Prevent Default**: Use `preventDefault: true` to avoid browser conflicts

---

## State Persistence API

### usePersistedState Hook

**Signature**:
```tsx
function usePersistedState<T>(
  key: string,
  initialValue: T,
  options?: {
    syncAcrossTabs?: boolean;
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
  }
): [T, (value: T | ((prev: T) => T)) => void, () => void]
```

**Parameters**:
- `key` - localStorage key for persistence
- `initialValue` - Default value if no persisted value exists
- `options.syncAcrossTabs` - Enable cross-tab synchronization (default: true)
- `options.serialize` - Custom serializer (default: JSON.stringify)
- `options.deserialize` - Custom deserializer (default: JSON.parse)

**Returns**: `[state, setState, clearState]`
- `state` - Current state value
- `setState` - State setter (same API as React.useState)
- `clearState` - Function to clear persisted state and reset to initial value

### Common Use Cases

#### Filter State Persistence

```tsx
const [filters, setFilters, clearFilters] = usePersistedState(
  'expense-filters',
  { status: 'all', dateRange: '30d' }
);
```

#### Sort Preference Persistence

```tsx
const [sortConfig, setSortConfig] = usePersistedState(
  'table-sort',
  { field: 'date', direction: 'desc' }
);
```

#### View Mode Persistence

```tsx
const [viewMode, setViewMode] = usePersistedState<'grid' | 'list'>(
  'expenses-view-mode',
  'grid'
);
```

#### Sidebar Collapse State

```tsx
const [isSidebarCollapsed, setIsSidebarCollapsed] = usePersistedState(
  'sidebar-collapsed',
  false
);
```

---

## Migration Guide

### Converting Tabs from Uncontrolled to Controlled

**Before**:
```tsx
<Tabs defaultValue="balances">
  <TabsList>
    <TabsTrigger value="balances">Balances</TabsTrigger>
    <TabsTrigger value="activity">Activity</TabsTrigger>
  </TabsList>
  {/* Content */}
</Tabs>
```

**After**:
```tsx
const [activeTab, setActiveTab] = usePersistedState("my-page-tab", "balances");

<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="balances">Balances</TabsTrigger>
    <TabsTrigger value="activity">Activity</TabsTrigger>
  </TabsList>
  {/* Content */}
</Tabs>
```

### Adding Keyboard Shortcuts

**Before**:
```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
    }
    if (e.metaKey && e.key === 'k') {
      e.preventDefault();
      openSearch();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

**After**:
```tsx
useKeyboardShortcut([
  { key: "esc", callback: closeModal },
  { key: "cmd+k", callback: openSearch, preventDefault: true }
]);
```

---

## Performance Considerations

### localStorage Access

- `usePersistedState` reads from localStorage only on mount
- Writes are batched via useEffect to avoid excessive storage operations
- Failed operations are logged but don't break functionality

### Cross-Tab Synchronization

- Uses native `storage` event for cross-tab sync
- Minimal performance impact (event-driven, not polling)
- Can be disabled via `syncAcrossTabs: false` option

### Keyboard Event Listeners

- Single global listener per hook instance
- Automatic cleanup on unmount
- Input field detection prevents interference with typing

---

## Accessibility

### Keyboard Navigation

All keyboard shortcuts enhance accessibility by:
- Providing mouse-free navigation
- Following WCAG 2.1 keyboard interaction guidelines
- Supporting screen readers (focus management)
- Not interfering with native browser shortcuts

### State Persistence

Tab persistence improves accessibility by:
- Reducing cognitive load (users don't remember where they were)
- Maintaining context across sessions
- Supporting users with memory difficulties

---

## Future Improvements

### Planned Enhancements

1. **Command Palette**: Global search/command interface (cmd+k)
2. **Focus Management**: Automatic focus restoration after navigation
3. **Keyboard Shortcut Help**: In-app shortcut reference (?)
4. **Filter Persistence**: Remember filter selections across sessions
5. **Form Draft Autosave**: Persist form state to prevent data loss

### Performance Optimizations

1. **Debounced Persistence**: Batch rapid state changes before writing to localStorage
2. **Compression**: Compress large persisted states (JSON → compressed string)
3. **IndexedDB Migration**: Use IndexedDB for large datasets instead of localStorage

---

## Related Documentation

- [Interaction Rules](./design-system/interaction-rules.md)
- [Component Rules](./design-system/component-rules.md)
- [Layout Components](./components/layout.md)
