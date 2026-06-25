import { memo, useState, useCallback } from 'react';
import { useHaptics } from "@/hooks/use-haptics";
import { useLocation } from 'react-router';
import { Button } from '@/components/ui/button';
import { MessageSquareIcon, XIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { ChatPanel } from './ChatPanel';

export const ChatFAB = memo(function ChatFAB() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const isDashboard = pathname === '/';
  const { tap } = useHaptics();

  const toggle = useCallback(() => { tap(); setOpen((prev) => !prev); }, [tap]);

  return (
    <>
      <ChatPanel open={open} onOpenChange={setOpen} />
      <Button
        onClick={toggle}
        size="icon"
        className={cn(
        'fixed bottom-24 z-[70] h-14 w-14 rounded-full shadow-xl hover:scale-105 active:scale-95 transition-transform md:bottom-8',
        isDashboard ? 'right-5 md:right-[7.5rem]' : 'right-5 md:right-8',
        )}
        aria-label={open ? 'Close chat assistant' : 'Open chat assistant'}
      >
        {open ? <XIcon size={20} /> : <MessageSquareIcon size={20} />}
      </Button>
    </>
  );
});
