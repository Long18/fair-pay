import React from "react";
import { useHaptics } from "@/hooks/use-haptics";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { Trash2Icon, XIcon } from "@/components/ui/icons";
import { FloatingBar } from "@/components/ui/floating-stack";

interface BulkActionBarProps {
  selectedCount: number;
  onDelete: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  onDelete,
  onCancel,
  isDeleting = false,
}) => {
  const { t } = useTranslation();
  const { tap, warning } = useHaptics();

  if (selectedCount === 0) {
    return null;
  }

  return (
    <FloatingBar className="gap-4">
      <Badge variant="secondary" className="text-base">
        {t("bulk.selected", "{{count}} selected", { count: selectedCount })}
      </Badge>

      <div className="flex items-center gap-2">
        <Button
          variant="destructive"
          size="sm"
          onClick={() => { warning(); onDelete(); }}
          disabled={isDeleting}
        >
          <Trash2Icon className="h-4 w-4 mr-2" />
          {t("bulk.delete", "Delete")}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => { tap(); onCancel(); }}
          disabled={isDeleting}
        >
          <XIcon className="h-4 w-4 mr-2" />
          {t("common.cancel", "Cancel")}
        </Button>
      </div>
    </FloatingBar>
  );
};
