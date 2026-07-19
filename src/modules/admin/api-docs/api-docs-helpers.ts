/**
 * Shared helpers + category grouping for Admin API Docs.
 * Keep presentation strings out of here — they live in locales adminApiDocs.*.
 */

import type { ApiCatalogEntry } from "./types";

export type ApiDocsCategory =
  | "all"
  | "http"
  | "edge"
  | "safe"
  | "mutation"
  | "admin"
  | "agent";

export function resolveHttpBaseUrl(entryPath: string): string {
  const isSupabasePath =
    entryPath.startsWith("/functions/v1/") ||
    entryPath.startsWith("/rest/v1/") ||
    entryPath.startsWith("/storage/v1/");
  if (isSupabasePath) {
    return (import.meta.env.VITE_SUPABASE_URL as string | undefined) || "<VITE_SUPABASE_URL>";
  }
  return typeof window !== "undefined" ? window.location.origin : "";
}

export function entryCategory(entry: ApiCatalogEntry): ApiDocsCategory {
  if (entry.kind === "http" && entry.path?.startsWith("/functions/v1/")) {
    if (entry.tags.includes("agent")) return "agent";
    return "edge";
  }
  if (entry.kind === "http") return "http";
  if (entry.auth_level === "admin" || entry.tags.includes("admin")) return "admin";
  if (entry.risk === "high" || entry.risk === "critical") return "mutation";
  return "safe";
}

export function matchesCategory(entry: ApiCatalogEntry, category: ApiDocsCategory): boolean {
  if (category === "all") return true;
  return entryCategory(entry) === category;
}

/** Human-friendly one-liner when catalog summary is still machine-generated. */
export function friendlySummary(entry: ApiCatalogEntry): string {
  if (entry.description?.trim()) return entry.description;
  if (entry.summary && !entry.summary.startsWith("RPC function:") && !/^GET |^POST |^PUT |^PATCH |^DELETE /.test(entry.summary)) {
    return entry.summary;
  }
  if (entry.kind === "http") {
    return `${entry.method ?? "GET"} ${entry.path ?? entry.name}`;
  }
  return entry.function_name ?? entry.name;
}

export function displayName(entry: ApiCatalogEntry): string {
  if (entry.kind === "http") return entry.path ?? entry.name;
  return entry.function_name ?? entry.name;
}

export function exampleValue(p: ApiCatalogEntry["params"][number]): unknown {
  if (p.example !== undefined) return p.example;
  if (p.default !== undefined) return p.default;
  return "";
}

export function buildInitialRpcArgs(entry: ApiCatalogEntry): string {
  if (entry.params.length === 0) return "{}";
  return JSON.stringify(
    Object.fromEntries(entry.params.map((p) => [p.name, exampleValue(p)])),
    null,
    2
  );
}

export function buildInitialBody(entry: ApiCatalogEntry): string {
  if (entry.request_body_schema && Object.keys(entry.request_body_schema).length > 0) {
    return JSON.stringify(entry.request_body_schema, null, 2);
  }
  return "{}";
}

export function generateCurlSnippet(entry: ApiCatalogEntry): string {
  if (entry.kind === "rpc") return "";
  const urlPath = entry.path ?? "";
  const base = resolveHttpBaseUrl(urlPath);
  const method = entry.method ?? "GET";
  const auth =
    entry.auth_level !== "public"
      ? ' \\\n  -H "Authorization: Bearer <your-token>"'
      : "";
  const apikey = urlPath.startsWith("/functions/v1/")
    ? ' \\\n  -H "apikey: <VITE_SUPABASE_ANON_KEY>"'
    : "";
  const body =
    method !== "GET"
      ? ' \\\n  -H "Content-Type: application/json" \\\n  -d \'{}\''
      : "";
  return `curl -X ${method} "${base}${urlPath}"${auth}${apikey}${body}`;
}

export function generateFetchSnippet(entry: ApiCatalogEntry): string {
  if (entry.kind === "rpc") return "";
  const method = entry.method ?? "GET";
  const urlPath = entry.path ?? "";
  const base = resolveHttpBaseUrl(urlPath);
  const fullUrl = `${base}${urlPath}`;
  const needsAuth = entry.auth_level !== "public";
  const isFn = urlPath.startsWith("/functions/v1/");
  const headers: string[] = ["'Content-Type': 'application/json'"];
  if (needsAuth) headers.push("'Authorization': `Bearer ${session.access_token}`");
  if (isFn) headers.push("'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY");
  const body = method !== "GET" ? "  body: JSON.stringify({}),\n" : "";
  return `const resp = await fetch('${fullUrl}', {\n  method: '${method}',\n  headers: {\n    ${headers.join(",\n    ")},\n  },\n${body}});\nconst data = await resp.json();`;
}

export function generateRpcSnippet(entry: ApiCatalogEntry): string {
  if (entry.kind !== "rpc") return "";
  const args =
    entry.params.length > 0
      ? "{\n  " +
        entry.params
          .map((p) => {
            const val =
              p.example !== undefined
                ? JSON.stringify(p.example)
                : p.default !== undefined
                  ? JSON.stringify(p.default)
                  : `<${p.type}>`;
            return `${p.name}: ${val}`;
          })
          .join(",\n  ") +
        "\n}"
      : "{}";
  return `const { data, error } = await supabase\n  .rpc('${entry.function_name}', ${args});\n\nif (error) console.error(error);\nconsole.log(data);`;
}
