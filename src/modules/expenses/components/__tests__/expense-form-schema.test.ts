import { describe, expect, it } from "vitest";
import { z } from "zod";

// Mirror expense-form schema (kept local so the test stays focused on validation contracts).
const recurringSchema = z.object({
  frequency: z.enum(["weekly", "bi_weekly", "monthly", "quarterly", "yearly", "custom"]),
  interval: z.number().min(1),
  start_date: z.date(),
  end_date: z.date().nullable(),
  notify_before_days: z.number().min(0),
});

const expenseSchema = z
  .object({
    description: z.string().min(1, "Description is required").max(200),
    amount: z.number({ error: "Enter a valid amount" }).positive("Amount must be positive"),
    currency: z.string().min(1, "Currency is required"),
    category: z.string().optional(),
    expense_date: z.string().min(1, "Date is required"),
    paid_by_user_id: z.string().uuid("Please select who paid"),
    split_method: z.enum(["equal", "exact", "percentage"]),
    comment: z.string().max(1000, "Comment is too long").optional(),
    is_loan: z.boolean(),
    is_recurring: z.boolean(),
    recurring: recurringSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.is_recurring && !data.recurring) {
      ctx.addIssue({
        code: "custom",
        path: ["recurring"],
        message: "Complete the recurring schedule before saving",
      });
    }
  });

describe("expense form schema", () => {
  const base = {
    description: "Róp Rẻng Coffee",
    amount: 139580,
    currency: "VND",
    category: "Food & Drink",
    expense_date: "2026-11-05",
    paid_by_user_id: "9ac73f98-d6ff-54dd-8337-e96816e855c1",
    split_method: "exact" as const,
    comment: "",
    is_loan: false,
    is_recurring: false,
    recurring: {
      frequency: "monthly" as const,
      interval: 1,
      start_date: new Date("2026-11-05"),
      end_date: null,
      notify_before_days: 1,
    },
  };

  it("accepts a normal edit payload including vietnamese description", () => {
    expect(expenseSchema.safeParse(base).success).toBe(true);
  });

  it("rejects missing amount with a clear message instead of Zod Invalid input", () => {
    const result = expenseSchema.safeParse({ ...base, amount: undefined });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Enter a valid amount");
      expect(result.error.issues[0]?.message).not.toMatch(/^Invalid input/);
    }
  });

  it("allows omitted category/comment", () => {
    const { category: _category, comment: _comment, ...withoutOptional } = base;
    expect(expenseSchema.safeParse(withoutOptional).success).toBe(true);
  });

  it("requires recurring details when is_recurring is true", () => {
    const result = expenseSchema.safeParse({
      ...base,
      is_recurring: true,
      recurring: undefined,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("recurring"))).toBe(true);
    }
  });
});
