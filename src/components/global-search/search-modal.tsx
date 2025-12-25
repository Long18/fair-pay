import { useState, useEffect, useCallback } from "react";
import { useGo } from "@refinedev/core";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Receipt,
  Users,
  UserCircle,
  Clock,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGlobalSearch } from "./use-global-search";
import { SearchResult } from "./types";
import { getCategoryMeta } from "@/modules/expenses/lib/categories";
import { formatNumber } from "@/lib/locale-utils";

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SearchModal = ({ open, onOpenChange }: SearchModalProps) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const go = useGo();

  const {
    results,
    isSearching,
    recentSearches,
    addToRecentSearches,
    clearRecentSearches,
  } = useGlobalSearch(query);

  const groupedResults = {
    expenses: results.filter((r) => r.type === "expense").slice(0, 5),
    groups: results.filter((r) => r.type === "group").slice(0, 5),
    friends: results.filter((r) => r.type === "friend").slice(0, 5),
  };

  const totalResults =
    groupedResults.expenses.length +
    groupedResults.groups.length +
    groupedResults.friends.length;

  const handleSelectResult = useCallback(
    (result: SearchResult) => {
      addToRecentSearches(query);
      go({ to: result.link });
      onOpenChange(false);
      setQuery("");
    },
    [query, go, onOpenChange, addToRecentSearches]
  );

  const handleSelectRecentSearch = useCallback((search: string) => {
    setQuery(search);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < totalResults - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter" && totalResults > 0) {
        e.preventDefault();
        const allResults = [
          ...groupedResults.expenses,
          ...groupedResults.groups,
          ...groupedResults.friends,
        ];
        if (allResults[selectedIndex]) {
          handleSelectResult(allResults[selectedIndex]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    open,
    selectedIndex,
    totalResults,
    groupedResults,
    handleSelectResult,
  ]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Reset query when modal closes
  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  const getResultIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "expense":
        return Receipt;
      case "group":
        return Users;
      case "friend":
        return UserCircle;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search expenses, groups, friends..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto p-0"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">ESC</span>
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[500px] overflow-y-auto">
          {!query || query.length < 2 ? (
            <div className="p-4 space-y-4">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Recent Searches
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                      onClick={clearRecentSearches}
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((search, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="h-auto px-3 py-1.5 text-sm"
                        onClick={() => handleSelectRecentSearch(search)}
                      >
                        <Clock className="h-3 w-3 mr-1.5" />
                        {search}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Start typing to search expenses, groups, and friends
                </p>
              </div>
            </div>
          ) : isSearching ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">Searching...</p>
            </div>
          ) : totalResults === 0 ? (
            <div className="p-8 text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium mb-1">No results found</p>
              <p className="text-xs text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="py-2">
              {/* Expenses */}
              {groupedResults.expenses.length > 0 && (
                <div>
                  <div className="px-4 py-2">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase">
                      Expenses ({groupedResults.expenses.length})
                    </h3>
                  </div>
                  {groupedResults.expenses.map((result, index) => {
                    const Icon = getResultIcon(result.type);
                    const categoryMeta = result.metadata?.category
                      ? getCategoryMeta(result.metadata.category)
                      : null;
                    const CategoryIcon = categoryMeta?.icon;

                    return (
                      <button
                        key={result.id}
                        className={cn(
                          "w-full px-4 py-2 flex items-center gap-3 hover:bg-muted transition-colors text-left",
                          index === selectedIndex && "bg-muted"
                        )}
                        onClick={() => handleSelectResult(result)}
                      >
                        {CategoryIcon ? (
                          <div
                            className={cn(
                              "rounded-md p-1.5 flex items-center justify-center",
                              categoryMeta.bgColor
                            )}
                          >
                            <CategoryIcon
                              className={cn("h-4 w-4", categoryMeta.color)}
                            />
                          </div>
                        ) : (
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {result.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {result.subtitle}
                          </p>
                        </div>
                        {result.metadata?.amount && (
                          <div className="text-sm font-medium">
                            {formatNumber(result.metadata.amount)}{" "}
                            {result.metadata.currency}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Groups */}
              {groupedResults.groups.length > 0 && (
                <div>
                  <div className="px-4 py-2">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase">
                      Groups ({groupedResults.groups.length})
                    </h3>
                  </div>
                  {groupedResults.groups.map((result, index) => {
                    const Icon = getResultIcon(result.type);
                    const adjustedIndex =
                      index + groupedResults.expenses.length;

                    return (
                      <button
                        key={result.id}
                        className={cn(
                          "w-full px-4 py-2 flex items-center gap-3 hover:bg-muted transition-colors text-left",
                          adjustedIndex === selectedIndex && "bg-muted"
                        )}
                        onClick={() => handleSelectResult(result)}
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {result.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {result.subtitle}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Friends */}
              {groupedResults.friends.length > 0 && (
                <div>
                  <div className="px-4 py-2">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase">
                      Friends ({groupedResults.friends.length})
                    </h3>
                  </div>
                  {groupedResults.friends.map((result, index) => {
                    const Icon = getResultIcon(result.type);
                    const adjustedIndex =
                      index +
                      groupedResults.expenses.length +
                      groupedResults.groups.length;

                    return (
                      <button
                        key={result.id}
                        className={cn(
                          "w-full px-4 py-2 flex items-center gap-3 hover:bg-muted transition-colors text-left",
                          adjustedIndex === selectedIndex && "bg-muted"
                        )}
                        onClick={() => handleSelectResult(result)}
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {result.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {result.subtitle}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
