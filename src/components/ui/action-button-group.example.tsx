import { ActionButtonGroup } from "@/components/ui/action-button-group";
import { PencilIcon, Share2Icon, Trash2Icon } from "@/components/ui/icons";

/**
 * Example usage of ActionButtonGroup component
 * 
 * This component provides a flexible way to display action buttons with:
 * - Proper spacing (16px gap between actions, 24px before destructive)
 * - Layout variants (horizontal, vertical, dropdown)
 * - 44x44px touch targets on mobile
 * - Automatic separation of destructive actions
 */

export function ActionButtonGroupExamples() {
  const handleEdit = () => console.log("Edit clicked");
  const handleShare = () => console.log("Share clicked");
  const handleDelete = () => console.log("Delete clicked");

  const actions = [
    {
      label: "Edit",
      icon: PencilIcon,
      onClick: handleEdit,
      variant: "outline" as const,
    },
    {
      label: "Share",
      icon: Share2Icon,
      onClick: handleShare,
      variant: "outline" as const,
    },
    {
      label: "Delete",
      icon: Trash2Icon,
      onClick: handleDelete,
      variant: "destructive" as const,
      destructive: true, // This will add extra spacing
    },
  ];

  return (
    <div className="space-y-8 p-8">
      <div>
        <h3 className="mb-4 text-lg font-semibold">Horizontal Layout (Default)</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Actions displayed in a row with 16px gap. Destructive actions separated by 24px.
        </p>
        <ActionButtonGroup actions={actions} layout="horizontal" />
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold">Vertical Layout</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Actions stacked vertically with 16px gap. Destructive actions separated by 24px.
        </p>
        <ActionButtonGroup actions={actions} layout="vertical" />
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold">Dropdown Layout</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          All actions in a dropdown menu. Destructive actions separated by a divider.
        </p>
        <ActionButtonGroup actions={actions} layout="dropdown" />
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold">Without Icons</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Actions can be displayed without icons.
        </p>
        <ActionButtonGroup
          actions={[
            { label: "Save", onClick: () => {}, variant: "default" },
            { label: "Cancel", onClick: () => {}, variant: "outline" },
          ]}
        />
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold">Disabled Actions</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Actions can be disabled when not available.
        </p>
        <ActionButtonGroup
          actions={[
            { label: "Edit", onClick: () => {}, variant: "outline" },
            { label: "Delete", onClick: () => {}, variant: "destructive", disabled: true },
          ]}
        />
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold">Mobile Touch Targets</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          All buttons have minimum 44x44px touch targets on mobile (min-h-[44px]).
          On desktop (md breakpoint), they use standard height (h-9).
        </p>
        <ActionButtonGroup
          actions={[
            { label: "Action 1", onClick: () => {} },
            { label: "Action 2", onClick: () => {} },
          ]}
        />
      </div>
    </div>
  );
}
