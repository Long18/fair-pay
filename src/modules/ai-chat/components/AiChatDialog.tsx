import { memo } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAiChatContext } from "../AiChatContext";
import { AiChatView } from "./AiChatView";

/** Large shadcn Dialog hosting the FairPay Assistant chat UI. */
export const AiChatDialog = memo(function AiChatDialog() {
  const { t } = useTranslation();
  const { isChatOpen, setChatOpen } = useAiChatContext();

  return (
    <Dialog open={isChatOpen} onOpenChange={setChatOpen}>
      <DialogContent
        showCloseButton
        className="flex h-[min(85dvh,900px)] max-h-[90vh] w-full max-w-[min(1100px,calc(100%-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(1100px,calc(100%-2rem))]"
      >
        <DialogTitle className="sr-only">{t("aiChat.title")}</DialogTitle>
        <DialogDescription className="sr-only">{t("aiChat.subtitle")}</DialogDescription>
        <div className="min-h-0 flex-1">
          <AiChatView />
        </div>
      </DialogContent>
    </Dialog>
  );
});
