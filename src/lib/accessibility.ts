/**
 * Accessibility utilities and constants
 * Helps ensure the app is accessible to all users
 */

// ARIA labels for common actions
export const ARIA_LABELS = {
  close: 'Close',
  open: 'Open',
  menu: 'Menu',
  search: 'Search',
  loading: 'Loading',
  error: 'Error',
  success: 'Success',
  warning: 'Warning',
  info: 'Information',
  delete: 'Delete',
  edit: 'Edit',
  save: 'Save',
  cancel: 'Cancel',
  next: 'Next',
  previous: 'Previous',
  sort: 'Sort',
  filter: 'Filter',
} as const;

// Focus management utilities
export const focusManagement = {
  /**
   * Trap focus within an element (useful for modals)
   */
  trapFocus: (element: HTMLElement) => {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    element.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => element.removeEventListener('keydown', handleTabKey);
  },

  /**
   * Return focus to a previous element (useful when closing modals)
   */
  returnFocus: (element: HTMLElement) => {
    element?.focus();
  },
};

// Keyboard navigation helpers
export const keyboard = {
  /**
   * Check if Enter or Space key was pressed (for custom interactive elements)
   */
  isActionKey: (e: KeyboardEvent) => {
    return e.key === 'Enter' || e.key === ' ';
  },

  /**
   * Check if Escape key was pressed
   */
  isEscapeKey: (e: KeyboardEvent) => {
    return e.key === 'Escape';
  },
};

// Screen reader utilities
export const screenReader = {
  /**
   * Create a live region for announcements
   */
  announce: (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  },
};

// Color contrast helpers
export const contrast = {
  /**
   * Check if text color has sufficient contrast against background
   * WCAG AA requires 4.5:1 for normal text, 3:1 for large text
   */
  meetsWCAGAA: (_foreground: string, _background: string, _isLargeText = false) => {
    // Implementation would require color parsing library
    // For now, this is a placeholder
    console.warn('Color contrast checking not yet implemented');
    return true;
  },
};
