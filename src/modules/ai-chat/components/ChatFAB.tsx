import { memo, useState, useCallback, useEffect } from 'react';
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

  // Allow the main FAB's "Financial Assistant" action to open this panel
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('fairpay:open-chat', handler);
    return () => window.removeEventListener('fairpay:open-chat', handler);
  }, []);

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
