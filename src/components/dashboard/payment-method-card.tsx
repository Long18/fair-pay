import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface PaymentMethodCardProps {
  icon: LucideIcon;
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
  return (
    <Card
      className="border-gray-200 hover:border-green-300 hover:shadow-md transition-all cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-4 p-4">
        <div className="p-3 bg-gray-100 rounded-lg">
          <Icon className="h-6 w-6 text-gray-700" />
        </div>
        <div className="flex-1">
          <p className="text-base font-semibold text-gray-900">{title}</p>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
};
