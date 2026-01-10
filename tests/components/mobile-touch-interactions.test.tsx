/**
 * Mobile Touch Interactions Tests
 * 
 * Tests for mobile touch interaction hooks and components
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import { useSwipeGesture, useHasTouch } from '@/hooks/use-touch-interactions';
import { TouchTarget, useTouchTargetClass } from '@/components/ui/touch-target';

describe('Mobile Touch Interactions', () => {
  describe('useHasTouch', () => {
    it('should detect touch support', () => {
      const { result } = renderHook(() => useHasTouch());
      expect(typeof result.current).toBe('boolean');
    });
  });

  describe('useTouchTargetClass', () => {
    it('should return correct class for default size', () => {
      const { result } = renderHook(() => useTouchTargetClass());
      expect(result.current).toContain('44px');
    });

    it('should return correct class for custom size', () => {
      const { result } = renderHook(() => useTouchTargetClass(60));
      expect(result.current).toContain('60px');
    });
  });

  describe('TouchTarget component', () => {
    it('should render children', () => {
      render(
        <TouchTarget>
          <button>Click me</button>
        </TouchTarget>
      );
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('should apply minimum size classes', () => {
      const { container } = render(
        <TouchTarget minSize={44}>
          <button>Click me</button>
        </TouchTarget>
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('min-h-[44px]');
      expect(wrapper.className).toContain('min-w-[44px]');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <TouchTarget className="custom-class">
          <button>Click me</button>
        </TouchTarget>
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('custom-class');
    });
  });

  describe('useSwipeGesture', () => {
    it('should create a ref', () => {
      const onSwipeUp = vi.fn();
      const { result } = renderHook(() => 
        useSwipeGesture({ onSwipeUp })
      );
      expect(result.current).toBeDefined();
      expect(result.current.current).toBeNull(); // Initially null
    });

    it('should accept all swipe direction callbacks', () => {
      const callbacks = {
        onSwipeUp: vi.fn(),
        onSwipeDown: vi.fn(),
        onSwipeLeft: vi.fn(),
        onSwipeRight: vi.fn(),
      };
      
      const { result } = renderHook(() => useSwipeGesture(callbacks));
      expect(result.current).toBeDefined();
    });
  });
});
