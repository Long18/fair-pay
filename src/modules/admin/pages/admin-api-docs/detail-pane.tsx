import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookOpenIcon,
  CodeIcon,
  PlayIcon,
} from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";
import type { ApiCatalogEntry } from "../../api-docs/types";
import { displayName, friendlySummary } from "../../api-docs/api-docs-helpers";
import { type TFn, MethodBadge } from "./shared";
import { DocsPanel } from "./docs-panel";
import { CodePanel } from "./code-panel";
import { TryPanel } from "./try-panel";

export function DetailPane({ entry, t }: { entry: ApiCatalogEntry; t: TFn }) {
  const [tab, setTab] = useState("docs");
  const { tap } = useHaptics();

  return (
    <Card className="h-full min-h-0 flex flex-col gap-0 overflow-hidden py-0 hover:shadow-sm">
      <CardHeader className="border-b px-4 py-3 shrink-0 [.border-b]:pb-3">
        <div className="flex items-start gap-2 flex-wrap">
          <MethodBadge entry={entry} large />
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base font-mono truncate">{displayName(entry)}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{friendlySummary(entry)}</p>
          </div>
        </div>
      </CardHeader>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          tap();
          setTab(v);
        }}
        className="flex flex-col flex-1 min-h-0 overflow-hidden"
      >
        <TabsList className="shrink-0 mx-4 mt-2.5 justify-start h-8 w-fit">
          <TabsTrigger value="docs" className="text-xs">
            <BookOpenIcon className="w-3 h-3 mr-1.5" />
            {t("adminApiDocs.docsTab")}
          </TabsTrigger>
          <TabsTrigger value="try" className="text-xs">
            <PlayIcon className="w-3 h-3 mr-1.5" />
            {t("adminApiDocs.tryTab")}
          </TabsTrigger>
          <TabsTrigger value="code" className="text-xs">
            <CodeIcon className="w-3 h-3 mr-1.5" />
            {t("adminApiDocs.codeTab")}
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <TabsContent value="docs" className="p-3 mt-0">
            <DocsPanel entry={entry} t={t} />
          </TabsContent>
          <TabsContent value="try" className="p-3 mt-0">
            <TryPanel key={entry.id} entry={entry} t={t} />
          </TabsContent>
          <TabsContent value="code" className="p-3 mt-0">
            <CodePanel entry={entry} t={t} />
          </TabsContent>
        </div>
      </Tabs>
    </Card>
  );
}

export function EmptyPane({ t }: { t: TFn }) {
  return (
    <Card className="h-full flex items-center justify-center min-h-[12rem] py-0 hover:shadow-sm">
      <CardContent className="text-center py-8 max-w-sm">
        <CodeIcon className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
        <p className="text-base font-medium">{t("adminApiDocs.noSelectionTitle")}</p>
        <p className="text-sm text-muted-foreground mt-2">{t("adminApiDocs.noSelectionBody")}</p>
        <p className="text-xs text-muted-foreground mt-3">{t("adminApiDocs.pickHint")}</p>
      </CardContent>
    </Card>
  );
}
