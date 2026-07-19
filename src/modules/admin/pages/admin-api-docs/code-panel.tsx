import type { ApiCatalogEntry } from "../../api-docs/types";
import {
  generateCurlSnippet,
  generateFetchSnippet,
  generateRpcSnippet,
} from "../../api-docs/api-docs-helpers";
import { type TFn, CopyButton } from "./shared";

export function CodePanel({ entry, t }: { entry: ApiCatalogEntry; t: TFn }) {
  const curl = generateCurlSnippet(entry);
  const fetchSnip = generateFetchSnippet(entry);
  const rpc = generateRpcSnippet(entry);

  return (
    <div className="space-y-4">
      {entry.kind === "http" && (
        <>
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold">{t("adminApiDocs.entry.snippetCurl")}</h3>
              <CopyButton text={curl} label={t("adminApiDocs.copyToClipboard")} />
            </div>
            <pre className="rounded-lg border p-3 text-xs font-mono overflow-x-auto bg-muted/20">{curl}</pre>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold">{t("adminApiDocs.entry.snippetFetch")}</h3>
              <CopyButton text={fetchSnip} label={t("adminApiDocs.copyToClipboard")} />
            </div>
            <pre className="rounded-lg border p-3 text-xs font-mono overflow-x-auto bg-muted/20">
              {fetchSnip}
            </pre>
          </div>
        </>
      )}
      {entry.kind === "rpc" && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold">{t("adminApiDocs.entry.snippetRpc")}</h3>
            <CopyButton text={rpc} label={t("adminApiDocs.copyToClipboard")} />
          </div>
          <pre className="rounded-lg border p-3 text-xs font-mono overflow-x-auto bg-muted/20">{rpc}</pre>
        </div>
      )}
    </div>
  );
}
