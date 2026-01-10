/**
 * Partial Settlements Test Suite
 * 
 * Tests for partial payment functionality including:
 * - Database RPC function behavior
 * - TypeScript helper functions
 * - Edge cases and validation
 * 
 * Related: Task 1.9 - Define and implement "partial" payment semantics
 * Documentation: .kiro/specs/transaction-clarity-ux-improvements/PARTIAL-PAYMENT-SEMANTICS.md
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import {
  calculatePartialPercentage,
  getPaymentState,
  calculateRemainingAmount,
  formatPaymentState,
  validateSettlementAmount,
} from '@/lib/payment-utils';

// Initialize Supabase client for testing
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

describe('Payment Utils - Helper Functions', () => {
  describe('calculatePartialPercentage', () => {
    it('should calculate percentage correctly for partial payment', () => {
      expect(calculatePartialPercentage(50000, 100000)).toBe(50.0);
      expect(calculatePartialPercentage(33333, 100000)).toBe(33.3);
      expect(calculatePartialPercentage(75000, 100000)).toBe(75.0);
    });

    it('should return 0 for zero settled amount', () => {
      expect(calculatePartialPercentage(0, 100000)).toBe(0.0);
    });

    it('should return 100 for fully paid', () => {
      expect(calculatePartialPercentage(100000, 100000)).toBe(100.0);
    });

    it('should handle edge case of computed amount = 0', () => {
      expect(calculatePartialPercentage(50000, 0)).toBe(0);
    });

    it('should handle negative settled amount', () => {
      expect(calculatePartialPercentage(-10000, 100000)).toBe(0);
    });

    it('should round to 1 decimal place', () => {
      expect(calculatePartialPercentage(33333.33, 100000)).toBe(33.3);
      expect(calculatePartialPercentage(66666.67, 100000)).toBe(66.7);
    });
  });

  describe('getPaymentState', () => {
    it('should return "unpaid" when not settled', () => {
      expect(getPaymentState(false, 0, 100000)).toBe('unpaid');
      expect(getPaymentState(false, 50000, 100000)).toBe('unpaid');
    });

    it('should return "partial" for partial payment', () => {
      expect(getPaymentState(true, 50000, 100000)).toBe('partial');
      expect(getPaymentState(true, 1, 100000)).toBe('partial');
      expect(getPaymentState(true, 99999, 100000)).toBe('partial');
    });

    it('should return "paid" for full payment', () => {
      expect(getPaymentState(true, 100000, 100000)).toBe('paid');
    });

    it('should return "paid" for overpayment (edge case)', () => {
      expect(getPaymentState(true, 100001, 100000)).toBe('paid');
    });

    it('should handle floating point precision (epsilon = 0.01)', () => {
      expect(getPaymentState(true, 99.99, 100)).toBe('paid');
      expect(getPaymentState(true, 99.98, 100)).toBe('partial');
    });

    it('should return "unpaid" for inconsistent data (is_settled=true but amount=0)', () => {
      expect(getPaymentState(true, 0, 100000)).toBe('unpaid');
    });
  });

  describe('calculateRemainingAmount', () => {
    it('should calculate remaining amount correctly', () => {
      expect(calculateRemainingAmount(50000, 100000)).toBe(50000);
      expect(calculateRemainingAmount(30000, 100000)).toBe(70000);
      expect(calculateRemainingAmount(0, 100000)).toBe(100000);
    });

    it('should return 0 for fully paid', () => {
      expect(calculateRemainingAmount(100000, 100000)).toBe(0);
    });

    it('should return 0 for overpayment (not negative)', () => {
      expect(calculateRemainingAmount(100001, 100000)).toBe(0);
    });

    it('should handle null/undefined settled amount', () => {
      expect(calculateRemainingAmount(null as any, 100000)).toBe(100000);
      expect(calculateRemainingAmount(undefined as any, 100000)).toBe(100000);
    });
  });

  describe('formatPaymentState', () => {
    it('should format "paid" state', () => {
      expect(formatPaymentState('paid')).toBe('Paid');
    });

    it('should format "unpaid" state', () => {
      expect(formatPaymentState('unpaid')).toBe('Unpaid');
    });

    it('should format "partial" state without percentage', () => {
      expect(formatPaymentState('partial')).toBe('Partial');
    });

    it('should format "partial" state with percentage', () => {
      expect(formatPaymentState('partial', 45.5)).toBe('Partial (45.5%)');
      expect(formatPaymentState('partial', 33.3)).toBe('Partial (33.3%)');
    });
  });

  describe('validateSettlementAmount', () => {
    it('should validate correct settlement amount', () => {
      const result = validateSettlementAmount(50000, 0, 100000);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject zero amount', () => {
      const result = validateSettlementAmount(0, 0, 100000);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Settlement amount must be greater than 0');
    });

    it('should reject negative amount', () => {
      const result = validateSettlementAmount(-10000, 0, 100000);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Settlement amount must be greater than 0');
    });

    it('should reject amount exceeding remaining', () => {
      const result = validateSettlementAmount(60000, 50000, 100000);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot exceed remaining amount');
    });

    it('should allow settling exact remaining amount', () => {
      const result = validateSettlementAmount(50000, 50000, 100000);
      expect(result.isValid).toBe(true);
    });
  });
});

describe('Database RPC - settle_split Partial Payments', () => {
  let testUserId: string;
  let testExpenseId: string;
  let testSplitId: string;

  beforeAll(async () => {
    // Note: These tests require a running Supabase instance with test data
    // Skip if not in test environment
    if (!supabaseAnonKey) {
      console.warn('Skipping database tests: VITE_SUPABASE_ANON_KEY not set');
      return;
    }

    // Create test user, expense, and split
    // This is a placeholder - actual implementation would need proper test setup
  });

  afterAll(async () => {
    // Cleanup test data
    if (testExpenseId) {
      // Delete test expense (cascades to splits)
    }
  });

  it.skip('should settle split with partial amount', async () => {
    // Test: Settle 30% of split
    const { data, error } = await supabase.rpc('settle_split', {
      p_split_id: testSplitId,
      p_amount: 30000, // 30% of 100,000
    });

    expect(error).toBeNull();
    expect(data).toMatchObject({
      success: true,
      split_id: testSplitId,
      settled_amount: 30000,
      computed_amount: 100000,
      is_partial: true,
      percentage: 30.0,
    });
  });

  it.skip('should accumulate multiple partial payments', async () => {
    // Test: Settle 30%, then 40%, then 30%
    
    // First payment: 30%
    await supabase.rpc('settle_split', {
      p_split_id: testSplitId,
      p_amount: 30000,
    });

    // Second payment: 40% (cumulative 70%)
    const { data: data2 } = await supabase.rpc('settle_split', {
      p_split_id: testSplitId,
      p_amount: 40000,
    });

    expect(data2).toMatchObject({
      settled_amount: 70000,
      is_partial: true,
      percentage: 70.0,
      previous_settled_amount: 30000,
      amount_added: 40000,
    });

    // Third payment: 30% (cumulative 100%)
    const { data: data3 } = await supabase.rpc('settle_split', {
      p_split_id: testSplitId,
      p_amount: 30000,
    });

    expect(data3).toMatchObject({
      settled_amount: 100000,
      is_partial: false,
      percentage: 100.0,
    });
  });

  it.skip('should settle remaining amount when p_amount is NULL', async () => {
    // Test: Settle 30%, then settle remaining with NULL
    
    // First payment: 30%
    await supabase.rpc('settle_split', {
      p_split_id: testSplitId,
      p_amount: 30000,
    });

    // Second payment: NULL (should settle remaining 70%)
    const { data } = await supabase.rpc('settle_split', {
      p_split_id: testSplitId,
      p_amount: null,
    });

    expect(data).toMatchObject({
      settled_amount: 100000,
      is_partial: false,
      percentage: 100.0,
      amount_added: 70000,
    });
  });

  it.skip('should reject zero amount', async () => {
    const { error } = await supabase.rpc('settle_split', {
      p_split_id: testSplitId,
      p_amount: 0,
    });

    expect(error).not.toBeNull();
    expect(error?.message).toContain('must be greater than 0');
  });

  it.skip('should reject amount exceeding computed amount', async () => {
    const { error } = await supabase.rpc('settle_split', {
      p_split_id: testSplitId,
      p_amount: 150000, // More than 100,000
    });

    expect(error).not.toBeNull();
    expect(error?.message).toContain('cannot exceed computed amount');
  });

  it.skip('should reject settling already-fully-paid split', async () => {
    // First, fully settle the split
    await supabase.rpc('settle_split', {
      p_split_id: testSplitId,
      p_amount: null, // Settle full amount
    });

    // Try to settle again
    const { error } = await supabase.rpc('settle_split', {
      p_split_id: testSplitId,
      p_amount: 10000,
    });

    expect(error).not.toBeNull();
    expect(error?.message).toContain('already fully settled');
  });
});

describe('Integration - Payment State Display', () => {
  it('should correctly determine display state for various scenarios', () => {
    // Scenario 1: Unpaid
    const state1 = getPaymentState(false, 0, 100000);
    const display1 = formatPaymentState(state1);
    expect(display1).toBe('Unpaid');

    // Scenario 2: Partially paid (30%)
    const state2 = getPaymentState(true, 30000, 100000);
    const percentage2 = calculatePartialPercentage(30000, 100000);
    const display2 = formatPaymentState(state2, percentage2);
    expect(display2).toBe('Partial (30%)');

    // Scenario 3: Fully paid
    const state3 = getPaymentState(true, 100000, 100000);
    const display3 = formatPaymentState(state3);
    expect(display3).toBe('Paid');

    // Scenario 4: Partially paid (45.5%)
    const state4 = getPaymentState(true, 45500, 100000);
    const percentage4 = calculatePartialPercentage(45500, 100000);
    const display4 = formatPaymentState(state4, percentage4);
    expect(display4).toBe('Partial (45.5%)');
  });

  it('should calculate remaining amount for UI display', () => {
    // Scenario: 50,000 VND paid of 100,000 VND
    const remaining = calculateRemainingAmount(50000, 100000);
    expect(remaining).toBe(50000);

    // UI would display: "Remaining: 50,000 VND"
  });

  it('should validate user input before settlement', () => {
    // User wants to settle 60,000 VND, but only 50,000 VND remaining
    const validation = validateSettlementAmount(60000, 50000, 100000);
    expect(validation.isValid).toBe(false);
    
    // UI would show error: validation.error
  });
});
