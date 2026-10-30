import { describe, expect, it } from "vitest";

import { buildReminderViewModel, renderableReminderFixtures, renderDebtReminderEmail, renderInviteEmail } from "@fairpay/emails";

describe("reminder email snapshots", () => {
  it.each(renderableReminderFixtures.map((fixture) => [fixture.id, fixture] as const))(
    "%s renders stable HTML and plain text",
    async (_id, fixture) => {
      const email = await renderDebtReminderEmail(fixture.input);
      expect(email.subject).toMatchSnapshot("subject");
      expect(email.previewText).toMatchSnapshot("preheader");
      expect(email.text).toMatchSnapshot("text");
      expect(email.html).toMatchSnapshot("html");
    },
  );

  it.each(renderableReminderFixtures.map((fixture) => [fixture.id, fixture] as const))(
    "%s lists the same amounts in the same order in HTML and text",
    async (_id, fixture) => {
      const vm = buildReminderViewModel(fixture.input);
      const email = await renderDebtReminderEmail(fixture.input);
      const positions = (haystack: string) => vm.lines.map((line) => haystack.indexOf(`${line.name}`));

      for (const line of vm.lines) {
        expect(email.text).toContain(`${line.name}: ${line.amountLabel}`);
        expect(email.html).toContain(line.amountLabel);
      }
      const textPositions = positions(email.text);
      expect([...textPositions].sort((a, b) => a - b)).toEqual(textPositions);
      expect(vm.lines.reduce((sum, line) => sum + line.amountMinor, 0) <= vm.totalAmountMinor).toBe(true);
    },
  );
});

describe("invite email", () => {
  it("renders stable HTML on the transactional shell", async () => {
    const email = await renderInviteEmail({
      inviterName: "Long",
      appUrl: "https://long-pay.vercel.app",
      now: new Date("2026-10-30T04:00:00.000Z"),
    });
    expect(email.html).toMatchSnapshot("invite-html");
    expect(email.text).toMatchSnapshot("invite-text");
  });
});
