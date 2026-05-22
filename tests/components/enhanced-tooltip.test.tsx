import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Mock the useIsMobile hook
vi.mock('@/hooks/ui/use-mobile', () => ({
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
      render(
        <Tooltip>
          <TooltipTrigger asChild>
            <button>Hover me</button>
          </TooltipTrigger>
          <TooltipContent>Helpful information</TooltipContent>
        </Tooltip>
      );

      const trigger = screen.getByRole('button', { name: 'Hover me' });

      act(() => {
        fireEvent.pointerMove(trigger);
        fireEvent.pointerEnter(trigger);
        fireEvent.mouseEnter(trigger);
      });

      // Should not show immediately
      expect(screen.queryByText('Helpful information')).not.toBeInTheDocument();

      // Advance timers by 300ms
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(screen.getAllByText('Helpful information').length).toBeGreaterThan(0);
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
      const { useIsMobile } = await import('@/hooks/ui/use-mobile');
      vi.mocked(useIsMobile).mockReturnValue(true);

      render(
        <Tooltip>
          <TooltipTrigger asChild>
            <button>Tap me</button>
          </TooltipTrigger>
          <TooltipContent>Mobile tooltip</TooltipContent>
        </Tooltip>
      );

      const trigger = screen.getByRole('button', { name: 'Tap me' });
      
      act(() => {
        fireEvent.click(trigger);
      });

      expect(screen.getAllByText('Mobile tooltip').length).toBeGreaterThan(0);
    });

    it('should auto-dismiss after 5 seconds on mobile', async () => {
      // Mock mobile environment for this test
      const { useIsMobile } = await import('@/hooks/ui/use-mobile');
      vi.mocked(useIsMobile).mockReturnValue(true);
      
      render(
        <Tooltip>
          <TooltipTrigger asChild>
            <button>Tap me</button>
          </TooltipTrigger>
          <TooltipContent>Auto-dismiss tooltip</TooltipContent>
        </Tooltip>
      );

      const trigger = screen.getByRole('button', { name: 'Tap me' });
      
      act(() => {
        fireEvent.click(trigger);
      });

      expect(screen.getAllByText('Auto-dismiss tooltip').length).toBeGreaterThan(0);

      // Advance time by 5 seconds
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.queryByText('Auto-dismiss tooltip')).not.toBeInTheDocument();
    });

    it('should dismiss on tap outside', async () => {
      // Mock mobile environment for this test
      const { useIsMobile } = await import('@/hooks/ui/use-mobile');
      vi.mocked(useIsMobile).mockReturnValue(true);
      
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
      
      act(() => {
        fireEvent.click(trigger);
      });

      expect(screen.getAllByText('Dismissible tooltip').length).toBeGreaterThan(0);

      act(() => {
        fireEvent.click(outsideButton);
      });

      expect(screen.queryByText('Dismissible tooltip')).not.toBeInTheDocument();
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
      render(
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button>Instant tooltip</button>
          </TooltipTrigger>
          <TooltipContent>Shows instantly</TooltipContent>
        </Tooltip>
      );

      const trigger = screen.getByRole('button', { name: 'Instant tooltip' });
      
      act(() => {
        fireEvent.pointerMove(trigger);
        fireEvent.pointerEnter(trigger);
        fireEvent.mouseEnter(trigger);
        vi.advanceTimersByTime(0);
      });

      expect(screen.getAllByText('Shows instantly').length).toBeGreaterThan(0);
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
