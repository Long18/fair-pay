import { Loader2Icon } from "@/components/ui/icons";
/**
 * Global refetching indicator shown when React Query is refetching data
 * Appears at the top of the screen as a subtle progress bar
 */
export function RefetchingIndicator() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-primary/10 py-2">
      <div className="flex items-center gap-2 text-sm text-primary">
        <Loader2Icon className="h-4 w-4 animate-spin" />
        <span>Updating...</span>
      </div>
    </div>
  );
}
