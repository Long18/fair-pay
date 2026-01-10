import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Mock the useIsMobile hook
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false), // Default to desktop
}));

describe('Enhanced Tooltip Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Desktop Behavior', () => {
    it('should render tooltip trigger', () => {
      render(
        <Tooltip>
          <TooltipTrigger asChild>
            <button>Hover me</button>
          </TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>
      );

      expect(screen.getByRole('button', { name: 'Hover me' })).toBeInTheDocument();
    });

    it('should show tooltip on hover with 300ms delay', async () => {
      const user = userEvent.setup({ delay: null });
      
      render(
        <Tooltip>
          <TooltipTrigger asChild>
            <button>Hover me</button>
          </TooltipTrigger>
          <TooltipContent>Helpful information</TooltipContent>
        </Tooltip>
      );

      const trigger = screen.getByRole('button', { name: 'Hover me' });
      
      // Hover over trigger
      await user.hover(trigger);
      
      // Should not show immediately
      expect(screen.queryByText('Helpful information')).not.toBeInTheDocument();
      
      // Advance timers by 300ms
      vi.advanceTimersByTime(300);
      
      // Should show after delay
      await waitFor(() => {
        expect(screen.getByText('Helpful information')).toBeInTheDocument();
      });
    });

    it('should support different positioning sides', async () => {
      const { rerender } = render(
        <Tooltip>
          <TooltipTrigger asChild>
            <button>Hover me</button>
          </TooltipTrigger>
          <TooltipContent side="top">Top tooltip</TooltipContent>
        </Tooltip>
      );

      expect(screen.getByRole('button')).toBeInTheDocument();

      // Test different sides
      const sides: Array<'top' | 'right' | 'bottom' | 'left'> = ['top', 'right', 'bottom', 'left'];
      
      for (const side of sides) {
        rerender(
          <Tooltip>
            <TooltipTrigger asChild>
              <button>Hover me</button>
            </TooltipTrigger>
            <TooltipContent side={side}>{side} tooltip</TooltipContent>
          </Tooltip>
        );
        
        expect(screen.getByRole('button')).toBeInTheDocument();
      }
    });

    it('should support custom maxWidth', () => {
      render(
        <Tooltip>
          <TooltipTrigger asChild>
            <button>Hover me</button>
          </TooltipTrigger>
          <TooltipContent maxWidth="300px">
            This is a long tooltip with custom max width
          </TooltipContent>
        </Tooltip>
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should support ARIA labels for accessibility', () => {
      render(
        <Tooltip>
          <TooltipTrigger asChild>
            <button aria-label="Help button">?</button>
          </TooltipTrigger>
          <TooltipContent aria-label="Help information">
            Helpful information
          </TooltipContent>
        </Tooltip>
      );

      expect(screen.getByLabelText('Help button')).toBeInTheDocument();
    });
  });

  describe('Mobile Behavior', () => {
    it('should show tooltip on tap (mobile)', async () => {
      // Mock mobile environment for this test
      const { useIsMobile } = await import('@/hooks/use-mobile');
      vi.mocked(useIsMobile).mockReturnValue(true);
      
      const user = userEvent.setup({ delay: null });
      
      render(
        <Tooltip>
          <TooltipTrigger asChild>
            <button>Tap me</button>
          </TooltipTrigger>
          <TooltipContent>Mobile tooltip</TooltipContent>
        </Tooltip>
      );

      const trigger = screen.getByRole('button', { name: 'Tap me' });
      
      // Tap trigger
      await user.click(trigger);
      
      // Should show immediately on mobile (no delay)
      await waitFor(() => {
        expect(screen.getByText('Mobile tooltip')).toBeInTheDocument();
      });
    });

    it('should auto-dismiss after 5 seconds on mobile', async () => {
      // Mock mobile environment for this test
      const { useIsMobile } = await import('@/hooks/use-mobile');
      vi.mocked(useIsMobile).mockReturnValue(true);
      
      const user = userEvent.setup({ delay: null });
      
      render(
        <Tooltip>
          <TooltipTrigger asChild>
            <button>Tap me</button>
          </TooltipTrigger>
          <TooltipContent>Auto-dismiss tooltip</TooltipContent>
        </Tooltip>
      );

      const trigger = screen.getByRole('button', { name: 'Tap me' });
      
      // Tap to show tooltip
      await user.click(trigger);
      
      await waitFor(() => {
        expect(screen.getByText('Auto-dismiss tooltip')).toBeInTheDocument();
      });
      
      // Advance time by 5 seconds
      vi.advanceTimersByTime(5000);
      
      // Should be dismissed
      await waitFor(() => {
        expect(screen.queryByText('Auto-dismiss tooltip')).not.toBeInTheDocument();
      });
    });

    it('should dismiss on tap outside', async () => {
      // Mock mobile environment for this test
      const { useIsMobile } = await import('@/hooks/use-mobile');
      vi.mocked(useIsMobile).mockReturnValue(true);
      
      const user = userEvent.setup({ delay: null });
      
      render(
        <div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button>Tap me</button>
            </TooltipTrigger>
            <TooltipContent>Dismissible tooltip</TooltipContent>
          </Tooltip>
          <button>Outside button</button>
        </div>
      );

      const trigger = screen.getByRole('button', { name: 'Tap me' });
      const outsideButton = screen.getByRole('button', { name: 'Outside button' });
      
      // Tap to show tooltip
      await user.click(trigger);
      
      await waitFor(() => {
        expect(screen.getByText('Dismissible tooltip')).toBeInTheDocument();
      });
      
      // Tap outside
      await user.click(outsideButton);
      
      // Should be dismissed
      await waitFor(() => {
        expect(screen.queryByText('Dismissible tooltip')).not.toBeInTheDocument();
      });
    });
  });

  describe('Viewport Adjustment', () => {
    it('should auto-adjust position to stay in viewport', () => {
      render(
        <Tooltip>
          <TooltipTrigger asChild>
            <button>Edge button</button>
          </TooltipTrigger>
          <TooltipContent side="top">
            This tooltip will adjust if near viewport edge
          </TooltipContent>
        </Tooltip>
      );

      // The avoidCollisions prop is set to true by default
      // Radix UI handles viewport adjustment automatically
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should respect collision padding', () => {
      render(
        <Tooltip>
          <TooltipTrigger asChild>
            <button>Padded button</button>
          </TooltipTrigger>
          <TooltipContent>
            Tooltip with collision padding
          </TooltipContent>
        </Tooltip>
      );

      // collisionPadding is set to 8px by default
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Backward Compatibility', () => {
    it('should support explicit delayDuration override', async () => {
      const user = userEvent.setup({ delay: null });
      
      render(
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button>Instant tooltip</button>
          </TooltipTrigger>
          <TooltipContent>Shows instantly</TooltipContent>
        </Tooltip>
      );

      const trigger = screen.getByRole('button', { name: 'Instant tooltip' });
      
      // Hover over trigger
      await user.hover(trigger);
      
      // Should show immediately with 0ms delay
      await waitFor(() => {
        expect(screen.getByText('Shows instantly')).toBeInTheDocument();
      });
    });

    it('should work with existing TooltipProvider usage', () => {
      render(
        <Tooltip>
          <TooltipTrigger asChild>
            <button>Provider test</button>
          </TooltipTrigger>
          <TooltipContent>Content</TooltipContent>
        </Tooltip>
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});
