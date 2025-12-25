import { cn } from "@/lib/utils";
import { getCategoryMeta } from "../lib/categories";

interface CategoryIconProps {
  category: string | null | undefined;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export const CategoryIcon = ({ 
  category, 
  size = "md", 
  showLabel = false,
  className 
}: CategoryIconProps) => {
  const meta = getCategoryMeta(category);
  const Icon = meta.icon;
  
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };
  
  const containerSizeClasses = {
    sm: "p-1",
    md: "p-1.5",
    lg: "p-2",
  };
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "rounded-md flex items-center justify-center",
          meta.bgColor,
          containerSizeClasses[size]
        )}
      >
        <Icon className={cn(sizeClasses[size], meta.color)} />
      </div>
      {showLabel && (
        <span className="text-sm font-medium">{meta.name}</span>
      )}
    </div>
  );
};

