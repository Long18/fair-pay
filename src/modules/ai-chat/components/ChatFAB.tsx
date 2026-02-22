import { memo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquareIcon, XIcon } from '@/components/ui/icons';
import { ChatPanel } from './ChatPanel';

export const ChatFAB = memo(function ChatFAB() {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  return (
    <>
      <ChatPanel open={open} onOpenChange={setOpen} />
      <Button
        onClick={toggle}
        size="icon"
        className="fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform"
        aria-label={open ? 'Close chat assistant' : 'Open chat assistant'}
      >
        {open ? <XIcon size={20} /> : <MessageSquareIcon size={20} />}
      </Button>
    </>
  );
});
