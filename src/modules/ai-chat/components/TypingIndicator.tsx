import { memo } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FairPayIcon } from "@/components/ui/icons";

export const TypingIndicator = memo(function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="relative shrink-0">
        <Avatar className="h-8 w-8 border bg-background">
          <AvatarFallback className="bg-background p-1 text-primary">
            <FairPayIcon size={22} className="rounded-sm" />
          </AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
      </div>
      <div className="flex items-center gap-1 rounded-lg border bg-card px-3 py-2 shadow-sm">
        <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-[bounce_1.4s_ease-in-out_infinite]" />
        <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-[bounce_1.4s_ease-in-out_0.2s_infinite]" />
        <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-[bounce_1.4s_ease-in-out_0.4s_infinite]" />
      </div>
    </div>
  );
});
