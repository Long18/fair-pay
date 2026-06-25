import { memo, useState, useCallback } from 'react';
import { useHaptics } from "@/hooks/use-haptics";
import { useLocation } from 'react-router';
import { Button } from '@/components/ui/button';
import { FairPayIcon, XIcon } from '@/components/ui/icons';
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
          'fixed left-4 z-[70] h-14 w-14 rounded-full shadow-xl transition-transform hover:scale-105 active:scale-95',
          'bottom-[calc(env(safe-area-inset-bottom)+5rem)] md:bottom-8 md:left-8',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:ring-offset-2',
          isDashboard && 'md:left-8',
        )}
        aria-label={open ? 'Close chat assistant' : 'Open chat assistant'}
      >
        {open ? <XIcon size={20} /> : <FairPayIcon size={24} className="rounded-sm" />}
      </Button>
    </>
  );
});
