// ─── Runtime Catalog ──────────────────────────────────────────────────────────
// Merges generated entries with manual overrides.
// Import this — never import catalog.generated.ts or catalog.overrides.ts directly.

import { generatedCatalog } from './catalog.generated';
import { catalogOverrides } from './catalog.overrides';
import type { ApiCatalogEntry, ApiFilterState } from './types';

/** Merged, sorted catalog. Generated entries enriched with manual overrides. */
export const catalog: ApiCatalogEntry[] = generatedCatalog
  .map((entry) => {
    const override = catalogOverrides[entry.id];
    if (!override) return entry;
    return { ...entry, ...override } as ApiCatalogEntry;
  })
  .sort((a, b) => {
    // HTTP before RPC, then alphabetically by name
    if (a.kind !== b.kind) return a.kind === 'http' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

/** Filter catalog entries by the current filter state */
export function filterCatalog(
  entries: ApiCatalogEntry[],
  filters: ApiFilterState
): ApiCatalogEntry[] {
  return entries.filter((e) => {
    // Active-first: if showAll is false, only show used_in_code entries
    if (!filters.showAll && !e.used_in_code) return false;

    // Search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const searchable = [
        e.name,
        e.path ?? '',
        e.function_name ?? '',
        e.summary,
        ...e.tags,
      ].join(' ').toLowerCase();
      if (!searchable.includes(q)) return false;
    }

    // Kind filter
    if (filters.kind !== 'all' && e.kind !== filters.kind) return false;

    // Status filter
    if (filters.status !== 'all' && e.status !== filters.status) return false;

    // Auth filter
    if (filters.auth !== 'all' && e.auth_level !== filters.auth) return false;

    // Risk filter
    if (filters.risk !== 'all' && e.risk !== filters.risk) return false;

    // Callable filter
    if (filters.callable !== 'all') {
      const isCallable = e.callability !== 'disabled';
      if (filters.callable === 'yes' && !isCallable) return false;
      if (filters.callable === 'no' && isCallable) return false;
    }

    // usedInCode filter (independent of showAll)
    if (filters.usedInCode !== 'all' && e.used_in_code !== filters.usedInCode) return false;

    return true;
  });
}

/** Get catalog stats for display */
export function getCatalogStats(entries: ApiCatalogEntry[]) {
  return {
    total: entries.length,
    http: entries.filter((e) => e.kind === 'http').length,
    rpc: entries.filter((e) => e.kind === 'rpc').length,
    active: entries.filter((e) => e.status === 'active').length,
    usedInCode: entries.filter((e) => e.used_in_code).length,
    callable: entries.filter((e) => e.callability !== 'disabled').length,
  };
}
