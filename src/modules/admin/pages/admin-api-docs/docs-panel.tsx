import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CodeIcon } from "@/components/ui/icons";
import type { ApiCatalogEntry } from "../../api-docs/types";
import { friendlySummary } from "../../api-docs/api-docs-helpers";
import {
  type TFn,
  callabilityIcon,
  httpStatusColor,
} from "./shared";

export function DocsPanel({ entry, t }: { entry: ApiCatalogEntry; t: TFn }) {
  return (
    <div className="space-y-5">
      <section className="rounded-lg border bg-muted/20 p-3 space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("adminApiDocs.entry.description")}
        </h3>
        <p className="text-sm leading-relaxed">{friendlySummary(entry)}</p>
        <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            {callabilityIcon(entry.callability)}
            {t(`adminApiDocs.badges.${entry.callability}`)}
          </span>
          <span>·</span>
          <span>{t(`adminApiDocs.badges.${entry.auth_level}`)}</span>
          <span>·</span>
          <span>{t("adminApiDocs.riskLabel", { risk: t(`adminApiDocs.badges.${entry.risk}`) })}</span>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold mb-2">{t("adminApiDocs.entry.parameters")}</h3>
        {entry.params.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("adminApiDocs.entry.noParams")}</p>
        ) : (
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs">{t("adminApiDocs.entry.paramName")}</TableHead>
                  <TableHead className="text-xs">{t("adminApiDocs.entry.paramType")}</TableHead>
                  <TableHead className="text-xs">{t("adminApiDocs.entry.paramRequired")}</TableHead>
                  <TableHead className="text-xs">{t("adminApiDocs.entry.paramDescription")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entry.params.map((p) => (
                  <TableRow key={p.name} className="text-xs">
                    <TableCell className="font-mono font-medium">{p.name}</TableCell>
                    <TableCell>
                      <span className="bg-muted rounded px-1.5 py-0.5 font-mono">{p.type}</span>
                    </TableCell>
                    <TableCell>
                      {p.required ? (
                        <span className="text-destructive font-medium">{t("adminApiDocs.yes")}</span>
                      ) : (
                        t("adminApiDocs.no")
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.description ?? (p.example !== undefined ? String(p.example) : "—")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {entry.response_examples.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold mb-2">{t("adminApiDocs.entry.responses")}</h3>
          <div className="space-y-2">
            {entry.response_examples.map((ex) => (
              <div
                key={`${ex.status}-${ex.description ?? JSON.stringify(ex.body)}`}
                className="rounded-lg border overflow-hidden"
              >
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 border-b">
                  <span className={cn("font-mono text-xs font-bold", httpStatusColor(ex.status))}>
                    {ex.status}
                  </span>
                  {ex.description && (
                    <span className="text-xs text-muted-foreground">{ex.description}</span>
                  )}
                </div>
                <pre className="p-3 text-xs font-mono overflow-x-auto max-h-48">
                  {JSON.stringify(ex.body, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-sm font-semibold mb-2">{t("adminApiDocs.entry.sourceFiles")}</h3>
        <ul className="space-y-1">
          {entry.source_files.map((f) => (
            <li key={f} className="text-xs font-mono text-muted-foreground flex gap-2">
              <CodeIcon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {f}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
