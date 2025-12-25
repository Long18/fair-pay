import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSplitCalculation } from '@/modules/expenses/hooks/use-split-calculation';

describe('useSplitCalculation', () => {
  describe('Participant Management', () => {
    it('should initialize with empty participants', () => {
      const { result } = renderHook(() => useSplitCalculation());

      expect(result.current.participants).toEqual([]);
      expect(result.current.isValid).toBe(false);
      expect(result.current.totalSplit).toBe(0);
    });

    it('should add a participant', () => {
      const { result } = renderHook(() => useSplitCalculation());

      act(() => {
        result.current.addParticipant('user-1');
      });

      expect(result.current.participants).toHaveLength(1);
      expect(result.current.participants[0]).toEqual({
        user_id: 'user-1',
        split_value: 0,
        computed_amount: 0,
      });
    });

    it('should not add duplicate participants', () => {
      const { result } = renderHook(() => useSplitCalculation());

      act(() => {
        result.current.addParticipant('user-1');
        result.current.addParticipant('user-1');
      });

      expect(result.current.participants).toHaveLength(1);
    });

    it('should add multiple participants', () => {
      const { result } = renderHook(() => useSplitCalculation());

      act(() => {
        result.current.addParticipant('user-1');
        result.current.addParticipant('user-2');
        result.current.addParticipant('user-3');
      });

      expect(result.current.participants).toHaveLength(3);
      expect(result.current.participants.map(p => p.user_id)).toEqual([
        'user-1',
        'user-2',
        'user-3',
      ]);
    });

    it('should remove a participant', () => {
      const { result } = renderHook(() => useSplitCalculation());

      act(() => {
        result.current.addParticipant('user-1');
        result.current.addParticipant('user-2');
        result.current.removeParticipant('user-1');
      });

      expect(result.current.participants).toHaveLength(1);
      expect(result.current.participants[0].user_id).toBe('user-2');
    });

    it('should set split value for a participant', () => {
      const { result } = renderHook(() => useSplitCalculation());

      act(() => {
        result.current.addParticipant('user-1');
        result.current.setSplitValue('user-1', 50);
      });

      expect(result.current.participants[0].split_value).toBe(50);
    });
  });

  describe('Equal Split Calculation', () => {
    it('should split amount equally among participants', () => {
      const { result } = renderHook(() => useSplitCalculation());

      act(() => {
        result.current.addParticipant('user-1');
        result.current.addParticipant('user-2');
        result.current.addParticipant('user-3');
        result.current.recalculate(100, 'equal');
      });

      expect(result.current.totalSplit).toBeCloseTo(100, 2);
      expect(result.current.participants[0].computed_amount).toBeCloseTo(33.34, 2);
      expect(result.current.participants[1].computed_amount).toBeCloseTo(33.33, 2);
      expect(result.current.participants[2].computed_amount).toBeCloseTo(33.33, 2);
    });

    it('should handle remainder correctly in equal split', () => {
      const { result } = renderHook(() => useSplitCalculation());

      act(() => {
        result.current.addParticipant('user-1');
        result.current.addParticipant('user-2');
        result.current.recalculate(100, 'equal');
      });

      const total = result.current.participants.reduce(
        (sum, p) => sum + p.computed_amount,
        0
      );
      expect(total).toBeCloseTo(100, 2);
      expect(result.current.participants[0].computed_amount).toBeCloseTo(50, 2);
      expect(result.current.participants[1].computed_amount).toBeCloseTo(50, 2);
    });

    it('should not recalculate if no participants', () => {
      const { result } = renderHook(() => useSplitCalculation());

      act(() => {
        result.current.recalculate(100, 'equal');
      });

      expect(result.current.participants).toEqual([]);
      expect(result.current.totalSplit).toBe(0);
    });

    it('should not recalculate if amount is zero or negative', () => {
      const { result } = renderHook(() => useSplitCalculation());

      act(() => {
        result.current.addParticipant('user-1');
        result.current.recalculate(100, 'equal');
      });

      const initialAmount = result.current.participants[0].computed_amount;

      act(() => {
        result.current.recalculate(0, 'equal');
      });

      expect(result.current.participants[0].computed_amount).toBe(initialAmount);

      act(() => {
        result.current.recalculate(-10, 'equal');
      });

      expect(result.current.participants[0].computed_amount).toBe(initialAmount);
    });
  });

  describe('Exact Split Calculation', () => {
    it('should use split_value as computed_amount for exact split', () => {
      const { result } = renderHook(() => useSplitCalculation());

      act(() => {
        result.current.addParticipant('user-1');
        result.current.addParticipant('user-2');
        result.current.setSplitValue('user-1', 60);
        result.current.setSplitValue('user-2', 40);
        result.current.recalculate(100, 'exact');
      });

      expect(result.current.participants[0].computed_amount).toBe(60);
      expect(result.current.participants[1].computed_amount).toBe(40);
      expect(result.current.totalSplit).toBe(100);
    });

    it('should handle zero split_value in exact split', () => {
      const { result } = renderHook(() => useSplitCalculation());

      act(() => {
        result.current.addParticipant('user-1');
        result.current.setSplitValue('user-1', 0);
        result.current.recalculate(100, 'exact');
      });

      expect(result.current.participants[0].computed_amount).toBe(0);
      expect(result.current.totalSplit).toBe(0);
    });
  });

  describe('Percentage Split Calculation', () => {
    it('should calculate amounts based on percentages', () => {
      const { result } = renderHook(() => useSplitCalculation());

      act(() => {
        result.current.addParticipant('user-1');
        result.current.addParticipant('user-2');
        result.current.setSplitValue('user-1', 60); // 60%
        result.current.setSplitValue('user-2', 40); // 40%
        result.current.recalculate(100, 'percentage');
      });

      expect(result.current.participants[0].computed_amount).toBeCloseTo(60, 2);
      expect(result.current.participants[1].computed_amount).toBeCloseTo(40, 2);
      expect(result.current.totalSplit).toBeCloseTo(100, 2);
    });

    it('should handle decimal percentages correctly', () => {
      const { result } = renderHook(() => useSplitCalculation());

      act(() => {
        result.current.addParticipant('user-1');
        result.current.addParticipant('user-2');
        result.current.setSplitValue('user-1', 33.33);
        result.current.setSplitValue('user-2', 66.67);
        result.current.recalculate(100, 'percentage');
      });

      expect(result.current.participants[0].computed_amount).toBeCloseTo(33.33, 2);
      expect(result.current.participants[1].computed_amount).toBeCloseTo(66.67, 2);
    });

    it('should round percentage calculations to 2 decimals', () => {
      const { result } = renderHook(() => useSplitCalculation());

      act(() => {
        result.current.addParticipant('user-1');
        result.current.setSplitValue('user-1', 33.333333);
        result.current.recalculate(100, 'percentage');
      });

      expect(result.current.participants[0].computed_amount).toBeCloseTo(33.33, 2);
    });
  });

  describe('Validation', () => {
    it('should be invalid when no participants', () => {
      const { result } = renderHook(() => useSplitCalculation());

      expect(result.current.isValid).toBe(false);
    });

    it('should be invalid when total split is zero', () => {
      const { result } = renderHook(() => useSplitCalculation());

      act(() => {
        result.current.addParticipant('user-1');
        result.current.recalculate(0, 'equal');
      });

      expect(result.current.isValid).toBe(false);
    });

    it('should be valid when total split is greater than zero', () => {
      const { result } = renderHook(() => useSplitCalculation());

      act(() => {
        result.current.addParticipant('user-1');
        result.current.recalculate(100, 'equal');
      });

      expect(result.current.isValid).toBe(true);
    });

    it('should allow small rounding differences', () => {
      const { result } = renderHook(() => useSplitCalculation());

      act(() => {
        result.current.addParticipant('user-1');
        result.current.addParticipant('user-2');
        result.current.recalculate(100, 'equal');
      });

      expect(result.current.isValid).toBe(true);
      expect(result.current.totalSplit).toBeCloseTo(100, 2);
    });
  });

  describe('Total Split Calculation', () => {
    it('should calculate total split correctly', () => {
      const { result } = renderHook(() => useSplitCalculation());

      act(() => {
        result.current.addParticipant('user-1');
        result.current.addParticipant('user-2');
        result.current.setSplitValue('user-1', 60);
        result.current.setSplitValue('user-2', 40);
        result.current.recalculate(100, 'exact');
      });

      expect(result.current.totalSplit).toBe(100);
    });

    it('should update total when participants change', () => {
      const { result } = renderHook(() => useSplitCalculation());

      act(() => {
        result.current.addParticipant('user-1');
        result.current.recalculate(100, 'equal');
      });

      const initialTotal = result.current.totalSplit;

      act(() => {
        result.current.addParticipant('user-2');
        result.current.recalculate(100, 'equal');
      });

      // Total should still be 100, but split differently
      expect(result.current.totalSplit).toBeCloseTo(100, 2);
      expect(result.current.participants).toHaveLength(2);
    });
  });
});

