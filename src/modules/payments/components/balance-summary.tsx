import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp } from "lucide-react";
import { UserBalance } from "../types";

interface BalanceSummaryProps {
  balances: UserBalance[];
  currentUserId: string;
  onSettleUp?: (toUserId: string, amount: number) => void;
  currency?: string;
}

export const BalanceSummary = ({
  balances,
  currentUserId,
  onSettleUp,
  currency = "VND",
}: BalanceSummaryProps) => {
  const currentUserBalance = balances.find(b => b.user_id === currentUserId);
  const myBalance = currentUserBalance?.balance || 0;

  // Calculate totals
  const totalOwedToMe = balances
    .filter(b => b.user_id !== currentUserId && b.balance < 0)
    .reduce((sum, b) => sum + Math.abs(b.balance), 0);

  const totalIOwe = myBalance < 0 ? Math.abs(myBalance) : 0;

  // People who owe me (they have negative balance, meaning they spent less than paid)
  const peopleWhoOweMe = balances.filter(
    b => b.user_id !== currentUserId && b.balance < 0
  );

  // People I owe (I have negative balance, meaning I spent more than I paid)
  const peopleIOwe = myBalance < 0
    ? balances.filter(b => b.user_id !== currentUserId && b.balance > 0)
    : [];

  const formatCurrency = (amount: number) => {
    return `${Math.abs(amount).toLocaleString("vi-VN")} ${currency}`;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-full">
                <ArrowDown className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">You are owed</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalOwedToMe)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-full">
                <ArrowUp className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">You owe</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(totalIOwe)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* People I Owe */}
      {peopleIOwe.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">You Owe</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {peopleIOwe.map((person) => (
                <div
                  key={person.user_id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {person.user_name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{person.user_name}</div>
                      <div className="text-sm text-red-600">
                        You owe {formatCurrency(Math.abs(myBalance))}
                      </div>
                    </div>
                  </div>
                  {onSettleUp && (
                    <Button
                      onClick={() => onSettleUp(person.user_id, Math.abs(myBalance))}
                      variant="default"
                    >
                      Settle Up
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* People Who Owe Me */}
      {peopleWhoOweMe.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Owes You</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {peopleWhoOweMe.map((person) => (
                <div
                  key={person.user_id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {person.user_name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{person.user_name}</div>
                      <div className="text-sm text-green-600">
                        Owes you {formatCurrency(Math.abs(person.balance))}
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary">Waiting</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Settled */}
      {totalIOwe === 0 && totalOwedToMe === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-lg font-medium text-green-600">
              ✓ All settled up!
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              No outstanding balances in this group
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
