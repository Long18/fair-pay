import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAiChatContext } from "../AiChatContext";
import {
  detectUserMessageLanguage,
  resolveResponseLanguage,
  type ResponseLanguageCode,
} from "../utils/detect-user-message-language";

/** Locale for chat chrome (greeting, shortcuts, placeholders) — aligned with orchestrator + vi history. */
export function useAiChatDisplayLanguage(): ResponseLanguageCode {
  const { i18n } = useTranslation();
  const { conversations, messages } = useAiChatContext();

  return useMemo(() => {
    const uiLang = i18n.resolvedLanguage || i18n.language;
    if (uiLang?.startsWith("vi")) return "vi";

    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser?.content?.trim()) {
      return resolveResponseLanguage(lastUser.content, uiLang);
    }

    for (const conv of conversations) {
      if (conv.title?.trim() && detectUserMessageLanguage(conv.title) === "vi") {
        return "vi";
      }
    }

    return resolveResponseLanguage("", uiLang);
  }, [conversations, i18n.language, i18n.resolvedLanguage, messages]);
}
