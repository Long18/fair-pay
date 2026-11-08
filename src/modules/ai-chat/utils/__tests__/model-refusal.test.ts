import { describe, expect, it } from "vitest";
import { looksLikeHollowRefusal } from "../model-refusal";
import { guessReadIntentId, matchReadIntent } from "../../orchestrator/read-intent-registry";

describe("model-refusal recovery helpers", () => {
  it("detects Vietnamese hollow refusals", () => {
    expect(
      looksLikeHollowRefusal(
        "Tôi không có thông tin về các nhóm mà bạn tham gia. Bạn có thể thử xem xét…",
      ),
    ).toBe(true);
  });

  it("guesses group intent when regex misses slightly", () => {
    const text = "cho tôi biết nhóm đang join";
    expect(matchReadIntent(text)).toBeNull();
    expect(guessReadIntentId(text)).toBe("group_list");
  });
});
