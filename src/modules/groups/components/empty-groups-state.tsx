import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusIcon } from '@/components/ui/icons';
import { useGo } from '@refinedev/core';
import { useHaptics } from '@/hooks/use-haptics';

interface EmptyGroupsStateProps {
  hasGroups: boolean; // true if search returned no results
}

export function EmptyGroupsState({ hasGroups }: EmptyGroupsStateProps) {
  const go = useGo();
  const { tap } = useHaptics();

  if (hasGroups) {
    // Search/filter returned no results
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="py-16 text-center">
          <div className="space-y-4">
            <div className="text-6xl">🔍</div>
            <div>
              <p className="font-semibold text-lg">No groups found</p>
              <p className="text-muted-foreground mt-1">
                Try adjusting your search or filter criteria
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No groups at all
  return (
    <Card className="border-2 border-dashed">
      <CardContent className="py-20 text-center">
        <div className="space-y-6 max-w-md mx-auto">
          <div className="text-7xl">👥</div>
          <div>
            <h3 className="font-bold text-2xl mb-2">Create Your First Group</h3>
            <p className="text-muted-foreground">
              Groups help you split expenses with friends, roommates, or travel companions.
              Start by creating a group and adding members.
            </p>
          </div>
          <div className="space-y-3">
            <Button
              size="lg"
              onClick={() => { tap(); go({ to: '/groups/create' }); }}
              className="w-full sm:w-auto"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Your First Group
            </Button>
            <p className="text-xs text-muted-foreground">
              💡 Pro tip: Add friends first to quickly create groups
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
