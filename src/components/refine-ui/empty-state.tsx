import * as React from "react"
import { Button } from "@/components/ui/button"
import { useHaptics } from "@/hooks/use-haptics"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const { tap } = useHaptics()
  return (
    <Empty className="py-12">
      <EmptyHeader>
        {icon && (
          <EmptyMedia variant="icon" className="mb-4">
            <div className="p-4 bg-muted/50 rounded-full">
              {icon}
            </div>
          </EmptyMedia>
        )}
        <EmptyTitle className="text-xl font-semibold mb-2">{title}</EmptyTitle>
        {description && (
          <EmptyDescription className="text-muted-foreground max-w-md mx-auto">
            {description}
          </EmptyDescription>
        )}
      </EmptyHeader>
      {action && (
        <EmptyContent className="mt-6">
          <Button onClick={() => { tap(); action.onClick(); }} size="lg" className="shadow-sm">
            {action.label}
          </Button>
        </EmptyContent>
      )}
    </Empty>
  )
}
