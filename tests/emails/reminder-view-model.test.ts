import { describe, expect, it } from "vitest";

import {
  buildReminderViewModel,
  formatAsOf,
  formatMoneyMinor,
  formatReminderPlainText,
  maskEmail,
  reminderFixtures,
} from "@fairpay/emails";

function fixture(id: string) {
  const found = reminderFixtures.find((item) => item.id === id);
  if (!found) throw new Error(`missing fixture ${id}`);
  return buildReminderViewModel(found.input);
}

describe("reminder view model", () => {
  it("formats the as-of stamp in Asia/Ho_Chi_Minh regardless of server timezone", () => {
    expect(formatAsOf(new Date("2026-10-30T04:00:00.000Z"))).toEqual({ label: "11:00 30/10", year: "2026" });
    expect(formatAsOf(new Date("2026-12-31T17:30:00.000Z"))).toEqual({ label: "00:30 01/01", year: "2027" });
  });

  it("keeps a non-breaking space between amount and currency symbol", () => {
    expect(formatMoneyMinor(850000, "VND")).toBe("850.000\u00a0₫");
  });

  it("builds one line per counterparty whose sum equals the total", () => {
    const vm = fixture("F2");
    expect(vm.status).toBe("ok");
    expect(vm.lines.map((line) => [line.name, line.amountLabel, line.groupHint])).toEqual([
      ["Minh Tuấn", "350.000\u00a0₫", "Chuyến Đà Nẵng 2026"],
      ["Lan Anh", "250.000\u00a0₫", "Chuyến Đà Nẵng 2026"],
      ["Quang Huy", "250.000\u00a0₫", "Chi phí sinh hoạt Q2"],
    ]);
    expect(vm.lines.reduce((sum, line) => sum + line.amountMinor, 0)).toBe(vm.totalAmountMinor);
    expect(vm.totalLabel).toBe("850.000\u00a0₫");
    expect(vm.subject).toBe("FairPay: Còn 850.000\u00a0₫ chưa settle với 3 người");
    expect(vm.preheader).toBe("Minh Tuấn, Lan Anh và 1 người khác · Tính đến 11:00 30/10");
    expect(vm.totalMeta).toBe("với 3 người · Tính đến 11:00 30/10");
    expect(vm.greeting).toBe("Xin chào An,");
    expect(vm.trustLine).toBeNull();
    expect(vm.cta).toEqual({
      href: "https://long-pay.vercel.app/balances?src=email_reminder",
      label: "Xem số dư & thanh toán",
    });
    expect(vm.warnings).toEqual([]);
  });

  it("previews 1 and 2 names without an empty overflow clause", () => {
    expect(fixture("F1").preheader).toBe("Minh Tuấn · Tính đến 11:00 30/10");
    expect(fixture("F1").subject).toBe("FairPay: Còn 350.000\u00a0₫ chưa settle với 1 người");
    expect(fixture("F5").preheader).toBe("Long, Long · Tính đến 11:00 30/10");
  });

  it("shows the top 5 and an overflow line while counts use everyone", () => {
    const vm = fixture("F4");
    expect(vm.lines).toHaveLength(5);
    expect(vm.counterpartyCount).toBe(7);
    expect(vm.overflowLabel).toBe("và 2 người khác — xem đầy đủ trong FairPay");
    expect(vm.subject).toContain("với 7 người");
    expect(vm.totalLabel).toBe("1.200.000\u00a0₫");
  });

  it("breaks amount ties by Vietnamese name order", () => {
    expect(fixture("F2").lines.slice(1).map((line) => line.name)).toEqual(["Lan Anh", "Quang Huy"]);
  });

  it("masks emails only to disambiguate duplicate or missing names", () => {
    expect(maskEmail("long.a@gmail.com")).toBe("l***@gmail.com");
    const dupes = fixture("F5");
    expect(dupes.lines.map((line) => line.groupHint)).toEqual([
      "Chuyến Đà Nẵng 2026 · l***@gmail.com",
      "Chuyến Đà Nẵng 2026 · l***@yahoo.com",
    ]);
    expect(fixture("F2").lines.every((line) => line.maskedEmail === null)).toBe(true);
    expect(fixture("F10").lines.map((line) => line.name)).toEqual(["Minh Tuấn", "l***@gmail.com"]);
  });

  it("limits group hints to two names plus a count", () => {
    expect(fixture("F6").lines[0].groupHint).toBe("Chuyến Đà Nẵng 2026, Chi phí sinh hoạt Q2 +1 nhóm");
  });

  it("uses guest trust line, fallback CTA and guest footer", () => {
    const vm = fixture("F3");
    expect(vm.variant).toBe("guest");
    expect(vm.trustLine).toBe("Long dùng FairPay để chia chi phí nhóm Chuyến Đà Nẵng 2026.");
    expect(vm.cta).toEqual({
      href: "https://long-pay.vercel.app/register?src=email_reminder",
      label: "Tạo tài khoản FairPay",
    });
    expect(vm.footer).toBe("Bạn nhận email này vì Long đã thêm email của bạn vào một nhóm trên FairPay.");

    const fallback = fixture("F7");
    expect(fallback.trustLine).toBe("Bạn được thêm vào một nhóm chia chi phí trên FairPay.");
    expect(fallback.footer).toBe("Bạn nhận email này vì email của bạn đã được thêm vào một nhóm trên FairPay.");
  });

  it("builds the next-aware guest CTA when signup supports it", () => {
    const input = reminderFixtures.find((item) => item.id === "F3")!.input;
    expect(buildReminderViewModel({ ...input, guestCtaSupportsNext: true }).cta).toEqual({
      href: "https://long-pay.vercel.app/register?next=%2Fbalances&src=email_reminder",
      label: "Tạo tài khoản & xem chi tiết",
    });
  });

  it("falls back to the notification time when computed_at is missing", () => {
    expect(fixture("F8").asOfLabel).toBe("20:30 29/10");
  });

  it("skips multi-currency and empty snapshots", () => {
    expect(fixture("F9")).toMatchObject({ status: "skip", reason: "multi_currency" });
    expect(buildReminderViewModel({ recipient: { hasAccount: true }, context: {} })).toMatchObject({
      status: "skip",
      reason: "zero_total",
      greeting: "Xin chào,",
    });
  });

  it("warns when the snapshot total disagrees with the lines", () => {
    const vm = fixture("F12");
    expect(vm.totalAmountMinor).toBe(850000);
    expect(vm.warnings).toEqual([{ type: "total_mismatch", snapshotMinor: 900000, computedMinor: 850000 }]);
  });

  it("renders the plain text in the same order as the lines", () => {
    expect(formatReminderPlainText(fixture("F2"))).toBe(
      [
        "Xin chào An,",
        "",
        "Còn 850.000\u00a0₫ chưa settle với 3 người (tính đến 11:00 30/10).",
        "",
        "- Minh Tuấn: 350.000\u00a0₫ (Chuyến Đà Nẵng 2026)",
        "- Lan Anh: 250.000\u00a0₫ (Chuyến Đà Nẵng 2026)",
        "- Quang Huy: 250.000\u00a0₫ (Chi phí sinh hoạt Q2)",
        "",
        "Xem số dư & thanh toán: https://long-pay.vercel.app/balances?src=email_reminder",
        "",
        "Tắt email này: Cài đặt → Thông báo",
      ].join("\n"),
    );
    expect(formatReminderPlainText(fixture("F3"))).toContain(
      "Xin chào An,\n\nLong dùng FairPay để chia chi phí nhóm Chuyến Đà Nẵng 2026.\n\nCòn 850.000",
    );
    expect(formatReminderPlainText(fixture("F4"))).toContain("\nvà 2 người khác — xem đầy đủ trong FairPay\n");
  });
});
