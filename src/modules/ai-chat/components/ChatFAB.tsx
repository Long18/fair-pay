import { memo, useState, useCallback } from 'react';
import { useHaptics } from "@/hooks/use-haptics";
import { useLocation } from 'react-router';
import { FairPayIcon, XIcon } from '@/components/ui/icons';
import { FloatingActionStack, FloatingPill } from '@/components/ui/floating-stack';
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
      <FloatingActionStack
        side="left"
        trigger={
          <FloatingPill
            variant="primary"
            size="default"
            onClick={toggle}
            ariaLabel={open ? 'Close chat assistant' : 'Open chat assistant'}
          >
            {open ? <XIcon size={20} /> : <FairPayIcon size={24} className="rounded-sm" />}
          </FloatingPill>
        }
      />
    </>
  );
});
