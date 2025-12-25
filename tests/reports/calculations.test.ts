import { describe, it, expect } from 'vitest';
import { format, startOfMonth, endOfMonth } from 'date-fns';

describe('Report Calculations', () => {
  describe('Date Range Presets', () => {
    it('should calculate this_month range correctly', () => {
      const now = new Date();
      const start = startOfMonth(now);
      const end = endOfMonth(now);

      expect(start.getMonth()).toBe(now.getMonth());
      expect(end.getMonth()).toBe(now.getMonth());
      expect(start.getDate()).toBe(1);
    });

    it('should calculate last_month range correctly', () => {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const start = startOfMonth(lastMonth);
      const end = endOfMonth(lastMonth);

      expect(start.getMonth()).toBe((now.getMonth() - 1 + 12) % 12);
      expect(end.getMonth()).toBe((now.getMonth() - 1 + 12) % 12);
    });
  });

  describe('Category Breakdown Calculations', () => {
    it('should calculate percentage correctly', () => {
      const total = 1000000;
      const categoryAmount = 250000;
      const percentage = (categoryAmount / total) * 100;

      expect(percentage).toBe(25);
    });

    it('should handle zero total', () => {
      const total = 0;
      const categoryAmount = 250000;
      const percentage = total > 0 ? (categoryAmount / total) * 100 : 0;

      expect(percentage).toBe(0);
    });
  });

  describe('Spending Summary Calculations', () => {
    it('should calculate net balance correctly', () => {
      const totalReceived = 1500000;
      const totalSpent = 800000;
      const netBalance = totalReceived - totalSpent;

      expect(netBalance).toBe(700000);
    });

    it('should calculate average correctly', () => {
      const expenseAmounts = [100000, 200000, 300000];
      const average = expenseAmounts.reduce((a, b) => a + b, 0) / expenseAmounts.length;

      expect(average).toBe(200000);
    });

    it('should handle empty expense array', () => {
      const expenseAmounts: number[] = [];
      const average = expenseAmounts.length > 0
        ? expenseAmounts.reduce((a, b) => a + b, 0) / expenseAmounts.length
        : 0;

      expect(average).toBe(0);
    });

    it('should find largest and smallest expense', () => {
      const expenseAmounts = [100000, 500000, 200000, 800000, 150000];
      const largest = Math.max(...expenseAmounts);
      const smallest = Math.min(...expenseAmounts);

      expect(largest).toBe(800000);
      expect(smallest).toBe(100000);
    });
  });

  describe('CSV Export Format', () => {
    it('should format CSV row correctly', () => {
      const category = 'food';
      const amount = 250000;
      const count = 5;
      const percentage = 25.5;

      const row = [category, amount.toString(), count.toString(), percentage.toFixed(2) + '%'];
      const csvRow = row.join(',');

      expect(csvRow).toBe('food,250000,5,25.50%');
    });

    it('should handle CSV with commas in data', () => {
      const category = 'food, dining';
      const csvSafeCategory = `"${category}"`;

      expect(csvSafeCategory).toBe('"food, dining"');
    });
  });

  describe('Trend Data Grouping', () => {
    it('should format date key correctly', () => {
      const date = new Date(2025, 0, 15); // January 15, 2025
      const key = format(date, 'yyyy-MM-dd');

      expect(key).toBe('2025-01-15');
    });

    it('should group expenses by month correctly', () => {
      const dates = [
        new Date(2025, 0, 5),
        new Date(2025, 0, 15),
        new Date(2025, 0, 25),
        new Date(2025, 1, 5),
      ];

      const monthKeys = dates.map(date =>
        format(new Date(date.getFullYear(), date.getMonth(), 1), 'yyyy-MM-dd')
      );

      expect(monthKeys[0]).toBe('2025-01-01');
      expect(monthKeys[1]).toBe('2025-01-01');
      expect(monthKeys[2]).toBe('2025-01-01');
      expect(monthKeys[3]).toBe('2025-02-01');
    });
  });

  describe('Currency Formatting', () => {
    it('should format VND correctly', () => {
      const amount = 1250000;
      const formatted = amount.toLocaleString('vi-VN');

      expect(formatted).toBe('1.250.000');
    });

    it('should handle large numbers', () => {
      const amount = 123456789;
      const formatted = amount.toLocaleString('vi-VN');

      expect(formatted).toBe('123.456.789');
    });

    it('should handle zero', () => {
      const amount = 0;
      const formatted = amount.toLocaleString('vi-VN');

      expect(formatted).toBe('0');
    });
  });
});
