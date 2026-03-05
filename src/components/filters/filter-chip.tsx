import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/use-haptics";

import { XIcon } from "@/components/ui/icons";
interface FilterChipProps {
  label: string;
  value: string;
  onRemove: () => void;
  className?: string;
}

export const FilterChip = ({ label, value, onRemove, className }: FilterChipProps) => {
  const { tap } = useHaptics();
  return (
    <Badge
      variant="secondary"
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium",
        className
      )}
    >
      <span className="text-muted-foreground">{label}:</span>
      <span>{value}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-3 w-3 p-0 hover:bg-transparent ml-0.5"
        onClick={(e) => {
          e.stopPropagation();
          tap();
          onRemove();
        }}
      >
        <XIcon className="h-3 w-3" />
      </Button>
    </Badge>
  );
};
