import { memo } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SparklesIcon } from '@/components/ui/icons';

export const TypingIndicator = memo(function TypingIndicator() {
  return (
    <div className="flex gap-3 py-3" role="status" aria-label="Assistant is thinking">
      <div className="relative h-7 w-7 shrink-0" aria-hidden="true">
        <Avatar className="h-7 w-7">
          <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
            <SparklesIcon size={14} className="animate-pulse" />
          </AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
      </div>

      <div className="flex items-center gap-1.5 rounded-xl rounded-bl-sm bg-muted px-4 py-3">
        <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-[bounce_1.4s_ease-in-out_infinite]" />
        <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-[bounce_1.4s_ease-in-out_0.2s_infinite]" />
        <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-[bounce_1.4s_ease-in-out_0.4s_infinite]" />
      </div>
    </div>
  );
});
