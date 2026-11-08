import { describe, expect, it } from "vitest";
import { buildReadDigestViewModel } from "../read-digest-view-model";

describe("buildReadDigestViewModel", () => {
  it("maps debt rows to balances and totals", () => {
    const model = buildReadDigestViewModel({
      debt: [
        { counterparty_name: "A", amount: 100, currency: "VND", i_owe_them: false },
        { counterparty_name: "B", amount: 40, currency: "VND", i_owe_them: true },
      ],
    });
    expect(model.balances).toHaveLength(2);
    expect(model.owedToYouTotal).toBe(100);
    expect(model.youOweTotal).toBe(40);
    expect(model.net).toBe(60);
  });
});
