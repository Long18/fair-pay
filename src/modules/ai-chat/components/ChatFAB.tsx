import { memo, useState, useCallback } from 'react';
import { useLocation } from 'react-router';
import { Button } from '@/components/ui/button';
import { MessageSquareIcon, XIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { ChatPanel } from './ChatPanel';

export const ChatFAB = memo(function ChatFAB() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const isDashboard = pathname === '/';

  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  return (
    <>
      <ChatPanel open={open} onOpenChange={setOpen} />
      <Button
        onClick={toggle}
        size="icon"
        className={cn(
          'fixed bottom-6 z-50 h-12 w-12 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform',
          isDashboard ? 'right-[6rem] md:right-[6.75rem]' : 'right-6',
        )}
        aria-label={open ? 'Close chat assistant' : 'Open chat assistant'}
      >
        {open ? <XIcon size={20} /> : <MessageSquareIcon size={20} />}
      </Button>
    </>
  );
});
