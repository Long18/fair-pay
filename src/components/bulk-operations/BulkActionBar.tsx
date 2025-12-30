import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { Trash2Icon, XIcon } from "@/components/ui/icons";

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

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-primary text-primary-foreground shadow-lg rounded-lg px-6 py-3 flex items-center gap-4">
        <Badge variant="secondary" className="text-base">
          {t("bulk.selected", "{{count}} selected", { count: selectedCount })}
        </Badge>

        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            disabled={isDeleting}
          >
            <Trash2Icon className="h-4 w-4 mr-2" />
            {t("bulk.delete", "Delete")}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isDeleting}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <XIcon className="h-4 w-4 mr-2" />
            {t("common.cancel", "Cancel")}
          </Button>
        </div>
      </div>
    </div>
  );
};
