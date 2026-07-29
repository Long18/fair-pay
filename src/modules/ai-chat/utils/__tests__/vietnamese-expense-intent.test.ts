import { describe, expect, it } from "vitest";
import {
  appendExpenseIntentToUserMessage,
  isEchoOfUserMessage,
  parseExpenseIntent,
  parseVietnameseExpenseIntent,
} from "../vietnamese-expense-intent";

describe("parseVietnameseExpenseIntent", () => {
  it("parses the banana example (10.000 VND, date, member, quantity)", () => {
    const intent = parseVietnameseExpenseIntent(
      "Thêm giao dịch ngày 28/07/2026 với Tuyến hôm qua mua chuối 10.000 Vnd",
    );
    expect(intent.looks_like_add_expense).toBe(true);
    expect(intent.amount_vnd).toBe(10000);
    expect(intent.expense_date).toBe("2026-07-28");
    expect(intent.member_name_hint).toBe("Tuyến");
    expect(intent.item_description).toMatch(/chuối/i);
  });

  it("parses 10k shorthand", () => {
    const intent = parseVietnameseExpenseIntent("mua chuối 10k");
    expect(intent.amount_vnd).toBe(10000);
  });

  it("parses quantity in follow-up", () => {
    const intent = parseVietnameseExpenseIntent("1 quả");
    expect(intent.quantity).toBe(1);
  });

  it("parses structured English expense requests", () => {
    const intent = parseExpenseIntent(
      "Add a new transaction dated 2026-07-28: buyer/party is 'Tuyến', item purchased is 1 banana, quantity = 1, total amount = 10,000 VND",
    );
    expect(intent.looks_like_add_expense).toBe(true);
    expect(intent.amount_vnd).toBe(10000);
    expect(intent.expense_date).toBe("2026-07-28");
    expect(intent.member_name_hint).toBe("Tuyến");
  });
});

describe("isEchoOfUserMessage", () => {
  it("detects exact echo", () => {
    const msg = "Thêm giao dịch ngày 28/07/2026";
    expect(isEchoOfUserMessage(msg, msg)).toBe(true);
  });
});

describe("appendExpenseIntentToUserMessage", () => {
  it("appends JSON hints block", () => {
    const intent = parseVietnameseExpenseIntent("mua chuối 10000 VND");
    const out = appendExpenseIntentToUserMessage("mua chuối 10000 VND", intent);
    expect(out).toContain("[FairPay parsed hints");
    expect(out).toContain('"amount_vnd":10000');
  });
});
