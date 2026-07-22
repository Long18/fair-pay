import { Card, CardContent } from "@/components/ui/card";
import React from "react";
import type { IconProps } from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";

interface PaymentMethodCardProps {
  icon: React.FC<IconProps>;
  title: string;
  description: string;
  onClick?: () => void;
}

export const PaymentMethodCard = ({
  icon: Icon,
  title,
  description,
  onClick,
}: PaymentMethodCardProps) => {
  const { tap } = useHaptics();
  return (
    <Card
      className="border-border hover:border-green-300 hover:shadow-md transition-all cursor-pointer"
      onClick={() => { tap(); onClick?.(); }}
    >
      <CardContent className="flex items-center gap-4 p-4">
        <div className="p-3 bg-muted rounded-lg">
          <Icon className="h-6 w-6 text-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-base font-semibold text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
};
