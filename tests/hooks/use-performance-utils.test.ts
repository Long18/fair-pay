import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce, throttle } from '@/lib/performance';

describe('Performance Utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('debounce', () => {
    it('should delay function execution', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 300);

      debouncedFn();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(299);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should cancel previous calls', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 300);

      debouncedFn();
      vi.advanceTimersByTime(100);
      debouncedFn();
      vi.advanceTimersByTime(100);
      debouncedFn();

      vi.advanceTimersByTime(300);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should pass arguments correctly', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 300);

      debouncedFn('arg1', 'arg2');
      vi.advanceTimersByTime(300);

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should handle multiple rapid calls', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 300);

      // Rapid calls
      for (let i = 0; i < 10; i++) {
        debouncedFn(i);
        vi.advanceTimersByTime(50);
      }

      // Wait for debounce
      vi.advanceTimersByTime(300);

      // Should only call once with last argument
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith(9);
    });
  });

  describe('throttle', () => {
    it('should execute immediately on first call', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 300);

      throttledFn();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should throttle subsequent calls', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 300);

      throttledFn();
      expect(fn).toHaveBeenCalledTimes(1);

      throttledFn();
      throttledFn();
      throttledFn();
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(300);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should pass arguments correctly', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 300);

      throttledFn('arg1');
      expect(fn).toHaveBeenCalledWith('arg1');

      throttledFn('arg2');
      vi.advanceTimersByTime(300);
      expect(fn).toHaveBeenCalledWith('arg2');
    });

    it('should allow calls after wait period', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 300);

      throttledFn();
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(300);
      throttledFn();
      expect(fn).toHaveBeenCalledTimes(2);

      vi.advanceTimersByTime(300);
      throttledFn();
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });
});
