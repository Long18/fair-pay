import { memo } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/ui/use-media-query";
import { FloatingChatWindow } from "./FloatingChatWindow";
import { ChatPanelContent } from "./ChatPanelContent";

interface ChatPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ChatPanel = memo(function ChatPanel({ open, onOpenChange }: ChatPanelProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <FloatingChatWindow
        open={open}
        onClose={() => onOpenChange(false)}
      >
        <ChatPanelContent />
      </FloatingChatWindow>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col w-full h-[100dvh] sm:h-full gap-0 p-0 sm:max-w-[520px]">
        {/* Visually hidden title for accessibility */}
        <SheetHeader className="sr-only">
          <SheetTitle>FairPay Assistant</SheetTitle>
          <SheetDescription>AI-powered chat assistant</SheetDescription>
        </SheetHeader>
        <ChatPanelContent />
      </SheetContent>
    </Sheet>
  );
});

export default ChatPanel;
