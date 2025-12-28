import { ErrorBoundary } from './error-boundary';
import { Card, CardContent } from '@/components/ui/card';
import { ReactNode } from 'react';

import { AlertTriangleIcon } from "@/components/ui/icons";
export function DashboardErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      context="Dashboard"
      fallback={
        <Card className="border-destructive bg-destructive/5 p-6">
          <CardContent className="p-0">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangleIcon className="h-5 w-5 text-destructive" />
              <h3 className="font-semibold text-destructive">Dashboard Error</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Failed to load dashboard. Please refresh the page or try again later.
            </p>
          </CardContent>
        </Card>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
