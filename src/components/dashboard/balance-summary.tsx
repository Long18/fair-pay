import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUpIcon, TrendingDownIcon, MinusIcon } from "@/components/ui/icons";
interface BalanceSummaryProps {
  totalOwed: number;
  totalOwedToMe: number;
  netBalance: number;
}

export const BalanceSummary = ({
  totalOwed,
  totalOwedToMe,
  netBalance,
}: BalanceSummaryProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.abs(value));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* You Owe */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingDownIcon className="h-4 w-4 text-destructive" />
            You Owe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-destructive">
            ₫{formatCurrency(totalOwed)}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Total debt to others</p>
        </CardContent>
      </Card>

      {/* Owed to You */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingUpIcon className="h-4 w-4 text-green-500" />
            Owed to You
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">
            ₫{formatCurrency(totalOwedToMe)}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Total credit from others</p>
        </CardContent>
      </Card>

      {/* Net Balance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <MinusIcon className="h-4 w-4 text-muted-foreground" />
            Net Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-3xl font-bold ${
            netBalance > 0 ? 'text-green-600' : netBalance < 0 ? 'text-destructive' : 'text-muted-foreground'
          }`}>
            {netBalance > 0 ? '+' : ''}₫{formatCurrency(netBalance)}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {netBalance > 0 ? 'You are owed overall' : netBalance < 0 ? 'You owe overall' : 'All settled'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
