import { DataCard } from "@/components/ui/data-card";
import { Button } from "@/components/ui/button";
import { AlertCircleIcon, MoreVerticalIcon } from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";
interface CreditorCardProps {
  name: string;
  logo?: string;
  description: string;
  instalmentsLeft: number;
  amountPaid: number;
  amountDue: number;
  hasIssue?: boolean;
  currency?: string;
  onMenuClick?: () => void;
}

export const CreditorCard = ({
  name,
  logo,
  description,
  instalmentsLeft,
  amountPaid,
  amountDue,
  hasIssue = false,
  currency: _currency = "VND",
  onMenuClick,
}: CreditorCardProps) => {
  const { tap } = useHaptics();
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value);
  };

  return (
    <DataCard className="border-border">
      <DataCard.Header
        title={
          <div className="flex items-center gap-3">
            {logo ? (
              <img src={logo} alt={name} className="h-10 w-10 object-contain" />
            ) : (
              <div className="h-10 w-10 bg-muted rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold text-muted-foreground">{name.charAt(0)}</span>
              </div>
            )}
            <div>
              <div className="text-base font-bold text-foreground">{name}</div>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
        }
        badge={
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { tap(); onMenuClick?.(); }}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <MoreVerticalIcon className="h-4 w-4" />
          </Button>
        }
      />
      <DataCard.Content>
        {hasIssue && (
          <div className="flex items-center gap-2 mb-4 p-2 bg-red-50 rounded-lg">
            <AlertCircleIcon className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-red-700">Payment issue</span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="relative inline-flex items-center justify-center w-16 h-16 mb-2">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="var(--status-warning-bg, oklch(0.95 0.05 80))"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="var(--status-warning, oklch(0.75 0.15 80))"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${(instalmentsLeft / 20) * 176} 176`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-lg font-bold text-foreground">{instalmentsLeft}</span>
            </div>
            <p className="text-xs text-muted-foreground">Instalments Left</p>
          </div>

          <div className="text-center">
            <div className="relative inline-flex items-center justify-center w-16 h-16 mb-2">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="var(--status-success-bg, oklch(0.95 0.05 160))"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="var(--status-success, oklch(0.65 0.15 160))"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray="176 176"
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-sm font-bold text-semantic-positive">₫{formatCurrency(amountPaid)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Paid</p>
          </div>

          <div className="text-center">
            <div className="relative inline-flex items-center justify-center w-16 h-16 mb-2">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="var(--status-error-bg, oklch(0.95 0.05 27))"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="var(--status-error, oklch(0.577 0.245 27.325))"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${(amountDue / (amountPaid + amountDue)) * 176} 176`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-sm font-bold text-semantic-negative">₫{formatCurrency(amountDue)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Due</p>
          </div>
        </div>
      </DataCard.Content>
    </DataCard>
  );
};
