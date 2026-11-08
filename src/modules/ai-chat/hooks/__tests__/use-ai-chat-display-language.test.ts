import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAiChatDisplayLanguage } from "../use-ai-chat-display-language";

const mockUseTranslation = vi.fn();
const mockUseAiChatContext = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => mockUseTranslation(),
}));

vi.mock("../../AiChatContext", () => ({
  useAiChatContext: () => mockUseAiChatContext(),
}));

describe("useAiChatDisplayLanguage", () => {
  it("uses vi when app locale is vi", () => {
    mockUseTranslation.mockReturnValue({ i18n: { language: "en", resolvedLanguage: "vi" } });
    mockUseAiChatContext.mockReturnValue({ conversations: [], messages: [] });
    const { result } = renderHook(() => useAiChatDisplayLanguage());
    expect(result.current).toBe("vi");
  });

  it("sticks to vi when recent conversation titles are Vietnamese", () => {
    mockUseTranslation.mockReturnValue({ i18n: { language: "en", resolvedLanguage: "en" } });
    mockUseAiChatContext.mockReturnValue({
      conversations: [{ id: "1", title: "Tổng hợp FairPay", messages: [], history: [], createdAt: "", updatedAt: "" }],
      messages: [],
    });
    const { result } = renderHook(() => useAiChatDisplayLanguage());
    expect(result.current).toBe("vi");
  });

  it("falls back to en for empty en UI with no vi signal", () => {
    mockUseTranslation.mockReturnValue({ i18n: { language: "en", resolvedLanguage: "en-US" } });
    mockUseAiChatContext.mockReturnValue({
      conversations: [{ id: "1", title: "Who owes me", messages: [], history: [], createdAt: "", updatedAt: "" }],
      messages: [],
    });
    const { result } = renderHook(() => useAiChatDisplayLanguage());
    expect(result.current).toBe("en");
  });
});
