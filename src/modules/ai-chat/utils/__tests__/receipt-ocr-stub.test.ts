import { describe, expect, it } from "vitest";
import {
  buildReceiptDraftPrompt,
  extractReceiptDraftFromFilename,
} from "../receipt-ocr-stub";

describe("extractReceiptDraftFromFilename", () => {
  it("extracts amount and description from underscore filename", () => {
    const draft = extractReceiptDraftFromFilename("lunch_150000_vnd.jpg");
    expect(draft.amount).toBe(150000);
    expect(draft.description.toLowerCase()).toContain("lunch");
    expect(draft.sourceFilename).toBe("lunch_150000_vnd.jpg");
  });

  it("prefers user prompt for description", () => {
    const draft = extractReceiptDraftFromFilename("IMG_0042.png", "Cafe sua da");
    expect(draft.description).toBe("Cafe sua da");
  });

  it("parses dotted thousands in filename", () => {
    const draft = extractReceiptDraftFromFilename("bill-250.000.jpg");
    expect(draft.amount).toBe(250000);
  });

  it("falls back when no amount is present", () => {
    const draft = extractReceiptDraftFromFilename("grocery-receipt.png");
    expect(draft.amount).toBeNull();
    expect(draft.description.length).toBeGreaterThan(0);
  });
});

describe("buildReceiptDraftPrompt", () => {
  it("mentions preview confirmation and filename", () => {
    const prompt = buildReceiptDraftPrompt({
      description: "Lunch",
      amount: 120000,
      sourceFilename: "lunch.jpg",
    });
    expect(prompt).toContain("lunch.jpg");
    expect(prompt).toContain("fairpay_preview_expense");
    expect(prompt).toContain("Lunch");
  });
});
