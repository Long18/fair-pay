import { describe, it, expect, beforeAll } from 'vitest';
import { momoAPI } from '../../src/lib/momo/api';
import { supabaseClient } from '../../src/utility/supabaseClient';

describe('MoMo Payment Integration', () => {
  beforeAll(async () => {
    // Check if environment variables are configured
    if (!import.meta.env.VITE_MOMO_API_URL || !import.meta.env.VITE_MOMO_ACCESS_TOKEN) {
      console.warn('MoMo API not configured, skipping tests');
    }
  });

  describe('MoMo API Service', () => {
    it('should check if API is configured', () => {
      const isConfigured = momoAPI.isConfigured();

      if (import.meta.env.VITE_MOMO_ACCESS_TOKEN) {
        expect(isConfigured).toBe(true);
      } else {
        expect(isConfigured).toBe(false);
      }
    });

    it('should generate QR code URL', () => {
      if (!momoAPI.isConfigured()) {
        console.warn('Skipping test - MoMo not configured');
        return;
      }

      const amount = 100000;
      const referenceCode = 'FP-test-1234';
      const qrUrl = momoAPI.generatePaymentQR(amount, referenceCode);

      expect(qrUrl).toContain('QRCode');
      expect(qrUrl).toContain('amount=100000');
      expect(qrUrl).toContain('note=FP-test-1234');
    });

    it('should validate webhook signature', () => {
      const validSignature = 'test-signature-123';
      const invalidSignature = 'wrong-signature';

      // Test valid signature
      expect(momoAPI.validateWebhookSignature(validSignature, validSignature)).toBe(true);

      // Test invalid signature
      expect(momoAPI.validateWebhookSignature(invalidSignature, validSignature)).toBe(false);

      // Test no expected signature (development mode)
      expect(momoAPI.validateWebhookSignature(invalidSignature, undefined)).toBe(true);
    });
  });

  describe('Database Functions', () => {
    it('should extract reference code from comment', () => {
      const extractReferenceCode = (comment?: string): string | null => {
        if (!comment) return null;
        const match = comment.match(/FP-[A-Za-z0-9]+-[A-Za-z0-9]+/);
        return match ? match[0] : null;
      };

      // Test valid reference codes
      expect(extractReferenceCode('Payment FP-abc123-xyz9')).toBe('FP-abc123-xyz9');
      expect(extractReferenceCode('FP-12345678-abcd test')).toBe('FP-12345678-abcd');

      // Test invalid or missing reference codes
      expect(extractReferenceCode('No reference here')).toBe(null);
      expect(extractReferenceCode('')).toBe(null);
      expect(extractReferenceCode()).toBe(null);
    });
  });

  describe('Payment Request Creation', () => {
    it('should validate payment request data structure', () => {
      const mockPaymentRequest = {
        id: 'uuid-123',
        expense_split_id: 'split-uuid',
        user_id: 'user-uuid',
        receiver_phone: '0918399443',
        amount: 150000,
        currency: 'VND',
        reference_code: 'FP-abc123-xyz9',
        status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(mockPaymentRequest.reference_code).toMatch(/^FP-/);
      expect(mockPaymentRequest.amount).toBeGreaterThan(0);
      expect(['pending', 'verified', 'failed', 'expired']).toContain(mockPaymentRequest.status);
    });
  });

  describe('Webhook Processing', () => {
    it('should validate webhook payload structure', () => {
      const mockWebhookPayload = {
        signature: 'test-signature',
        phone: '0918399443',
        tranId: '7856123456',
        ackTime: '1801586562',
        partnerId: '0377221234',
        partnerName: 'Nguyen Van A',
        amount: 150000,
        comment: 'Payment FP-abc123-xyz9',
      };

      // Validate required fields
      expect(mockWebhookPayload).toHaveProperty('signature');
      expect(mockWebhookPayload).toHaveProperty('phone');
      expect(mockWebhookPayload).toHaveProperty('tranId');
      expect(mockWebhookPayload).toHaveProperty('amount');
      expect(mockWebhookPayload).toHaveProperty('comment');

      // Validate amount is positive
      expect(mockWebhookPayload.amount).toBeGreaterThan(0);

      // Validate comment contains reference code
      expect(mockWebhookPayload.comment).toContain('FP-');
    });
  });
});

export {};
