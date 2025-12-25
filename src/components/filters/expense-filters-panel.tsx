import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, X } from "lucide-react";
import { ExpenseFilters, DateFilterOption } from "./types";
import { EXPENSE_CATEGORIES } from "@/modules/expenses/types";
import { getCategoryMeta } from "@/modules/expenses/lib/categories";
import { format } from "date-fns";

interface ExpenseFiltersPanelProps {
  filters: ExpenseFilters;
  onFiltersChange: (filters: Partial<ExpenseFilters>) => void;
  onClearAll: () => void;
  members?: Array<{ id: string; full_name: string }>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const ExpenseFiltersPanel = ({
  filters,
  onFiltersChange,
  onClearAll,
  members = [],
  open: controlledOpen,
  onOpenChange,
}: ExpenseFiltersPanelProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;

  const [dateOption, setDateOption] = useState<DateFilterOption>(
    filters.dateRange?.option || 'last_30_days'
  );
  const [customStartDate, setCustomStartDate] = useState(
    filters.dateRange?.startDate || format(new Date(), 'yyyy-MM-dd')
  );
  const [customEndDate, setCustomEndDate] = useState(
    filters.dateRange?.endDate || format(new Date(), 'yyyy-MM-dd')
  );
  const [minAmount, setMinAmount] = useState<string>(
    filters.amountRange?.min?.toString() || ''
  );
  const [maxAmount, setMaxAmount] = useState<string>(
    filters.amountRange?.max?.toString() || ''
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    filters.categories || []
  );
  const [selectedPayers, setSelectedPayers] = useState<string[]>(
    filters.paidBy || []
  );

  const handleApply = () => {
    const newFilters: Partial<ExpenseFilters> = {};

    if (dateOption !== 'custom') {
      newFilters.dateRange = { option: dateOption };
    } else {
      newFilters.dateRange = {
        option: 'custom',
        startDate: customStartDate,
        endDate: customEndDate,
      };
    }

    if (minAmount || maxAmount) {
      newFilters.amountRange = {
        min: minAmount ? parseFloat(minAmount) : undefined,
        max: maxAmount ? parseFloat(maxAmount) : undefined,
      };
    }

    if (selectedCategories.length > 0) {
      newFilters.categories = selectedCategories;
    }

    if (selectedPayers.length > 0) {
      newFilters.paidBy = selectedPayers;
    }

    onFiltersChange(newFilters);
    setOpen(false);
  };

  const handleClear = () => {
    setDateOption('last_30_days');
    setCustomStartDate(format(new Date(), 'yyyy-MM-dd'));
    setCustomEndDate(format(new Date(), 'yyyy-MM-dd'));
    setMinAmount('');
    setMaxAmount('');
    setSelectedCategories([]);
    setSelectedPayers([]);
    onClearAll();
    setOpen(false);
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const togglePayer = (payerId: string) => {
    setSelectedPayers((prev) =>
      prev.includes(payerId)
        ? prev.filter((id) => id !== payerId)
        : [...prev, payerId]
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filter Expenses</SheetTitle>
          <SheetDescription>
            Apply filters to narrow down your expense results
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Date Range */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Date Range</Label>
            <Select
              value={dateOption}
              onValueChange={(value) => setDateOption(value as DateFilterOption)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {dateOption === 'custom' && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="start-date" className="text-xs">
                    Start Date
                  </Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date" className="text-xs">
                    End Date
                  </Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Amount Range */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Amount Range (VND)</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="min-amount" className="text-xs">
                  Min Amount
                </Label>
                <Input
                  id="min-amount"
                  type="number"
                  placeholder="0"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-amount" className="text-xs">
                  Max Amount
                </Label>
                <Input
                  id="max-amount"
                  type="number"
                  placeholder="∞"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Categories</Label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {EXPENSE_CATEGORIES.map((category) => {
                const meta = getCategoryMeta(category);
                const Icon = meta.icon;

                return (
                  <div
                    key={category}
                    className="flex items-center space-x-2 py-1.5"
                  >
                    <Checkbox
                      id={`category-${category}`}
                      checked={selectedCategories.includes(category)}
                      onCheckedChange={() => toggleCategory(category)}
                    />
                    <label
                      htmlFor={`category-${category}`}
                      className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      <div className={`rounded p-1 ${meta.bgColor}`}>
                        <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                      </div>
                      {category}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Paid By */}
          {members.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Paid By</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center space-x-2 py-1.5"
                  >
                    <Checkbox
                      id={`payer-${member.id}`}
                      checked={selectedPayers.includes(member.id)}
                      onCheckedChange={() => togglePayer(member.id)}
                    />
                    <label
                      htmlFor={`payer-${member.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {member.full_name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleClear}
          >
            <X className="h-4 w-4 mr-2" />
            Clear All
          </Button>
          <Button
            className="flex-1"
            onClick={handleApply}
          >
            Apply Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

