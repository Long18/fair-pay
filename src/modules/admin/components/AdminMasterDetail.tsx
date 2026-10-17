import { useSyncExternalStore, type ReactNode } from "react";
import { useDefaultLayout } from "react-resizable-panels";
import { Button } from "@/components/ui/button";
import { XIcon } from "@/components/ui/icons";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { useAdminTranslation } from "../i18n";
import {
  AdminDetailLayout,
  AdminDetailSheet,
  type AdminDetailSheetProps,
} from "./AdminDetailSheet";

const WIDE_QUERY = "(min-width: 1280px)";

function subscribeWide(callback: () => void) {
  const media = window.matchMedia(WIDE_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

const memoryStorage = new Map<string, string>();

const safeLayoutStorage = {
  getItem(key: string) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memoryStorage.get(key) ?? null;
    }
  },
  setItem(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      memoryStorage.set(key, value);
    }
  },
};

function useIsWide() {
  return useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => false
  );
}

export interface AdminMasterDetailProps
  extends Omit<AdminDetailSheetProps, "children"> {
  /** Unique id; the split ratio is persisted per id */
  id: string;
  master: ReactNode;
  detail: ReactNode;
  className?: string;
  /**
   * Vertical chrome (CSS length) above the split, excluding the navbar.
   * The detail pane height is `100dvh - navbar - paneOffset`.
   */
  paneOffset?: string;
}

/**
 * List + detail. On xl screens the detail opens as a resizable pane next to
 * the list (click another row to swap it); below xl it falls back to a sheet.
 */
export function AdminMasterDetail({
  id,
  master,
  detail,
  open,
  onOpenChange,
  title,
  description,
  headerActions,
  footer,
  size,
  className,
  bodyClassName,
  paneOffset = "5.5rem",
}: AdminMasterDetailProps) {
  const isWide = useIsWide();
  const { tAdmin } = useAdminTranslation();
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: `fairpay-admin-split-${id}`,
    panelIds: open ? ["master", "detail"] : ["master"],
    storage: safeLayoutStorage,
  });

  if (!isWide) {
    return (
      <>
        {master}
        <AdminDetailSheet
          open={open}
          onOpenChange={onOpenChange}
          title={title}
          description={description}
          headerActions={headerActions}
          footer={footer}
          size={size}
          bodyClassName={bodyClassName}
        >
          {detail}
        </AdminDetailSheet>
      </>
    );
  }

  return (
    <ResizablePanelGroup
      orientation="horizontal"
      defaultLayout={defaultLayout}
      onLayoutChanged={onLayoutChanged}
      className={cn("min-h-0 items-start", className)}
      style={{ ["--admin-pane-offset" as string]: paneOffset }}
    >
      <ResizablePanel id="master" minSize="45%" className="min-w-0">
        {master}
      </ResizablePanel>
      {open ? (
        <>
          <ResizableHandle withHandle className="mx-2 self-stretch" />
          <ResizablePanel
            id="detail"
            defaultSize="40%"
            minSize="22rem"
            maxSize="55%"
            className="min-w-0"
          >
            <aside
              aria-label={typeof title === "string" ? title : undefined}
              className="flex h-[max(24rem,calc(100dvh-var(--admin-nav-h)-var(--admin-pane-offset)))] flex-col overflow-hidden rounded-lg border bg-card"
            >
              <AdminDetailLayout
                titleSlot="pane"
                title={title}
                description={description}
                headerActions={headerActions}
                footer={footer}
                bodyClassName={bodyClassName}
                trailing={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label={tAdmin("layout.shell.closeDetail")}
                    onClick={() => onOpenChange(false)}
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                }
              >
                {detail}
              </AdminDetailLayout>
            </aside>
          </ResizablePanel>
        </>
      ) : null}
    </ResizablePanelGroup>
  );
}
