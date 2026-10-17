import { useCallback, useMemo, useState } from "react";
import type { CrudFilters } from "@refinedev/core";

import { useDebounce } from "@/hooks/use-debounce";
import { useHaptics } from "@/hooks/use-haptics";
import { useAdminTranslation } from "../../i18n";
import type { FilterField } from "../../pages/admin-transactions/filter-form";
import { NOTIFICATION_TYPES } from "./constants";

/** Search + filter state for the notifications table, plus the derived chips and popover fields. */
export function useNotificationFilters() {
  const { tap } = useHaptics();
  const { tAdmin } = useAdminTranslation();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [readFilter, setReadFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filters = useMemo<CrudFilters>(() => {
    const f: CrudFilters = [];
    if (debouncedSearch) {
      f.push({ field: "message", operator: "contains", value: debouncedSearch });
    }
    if (typeFilter !== "all") {
      f.push({ field: "type", operator: "eq", value: typeFilter });
    }
    if (readFilter !== "all") {
      f.push({ field: "is_read", operator: "eq", value: readFilter === "read" });
    }
    if (dateFrom) {
      f.push({ field: "created_at", operator: "gte", value: dateFrom });
    }
    if (dateTo) {
      f.push({ field: "created_at", operator: "lte", value: dateTo + "T23:59:59" });
    }
    return f;
  }, [debouncedSearch, typeFilter, readFilter, dateFrom, dateTo]);

  const clearFilters = useCallback(() => {
    tap();
    setSearch("");
    setTypeFilter("all");
    setReadFilter("all");
    setDateFrom("");
    setDateTo("");
  }, [tap]);

  const hasActiveFilters =
    search !== "" ||
    typeFilter !== "all" ||
    readFilter !== "all" ||
    dateFrom !== "" ||
    dateTo !== "";

  const readLabel = (value: string) => value === "read" ? tAdmin("status.read") : tAdmin("status.unread");

  const filterChips = [
    ...(typeFilter !== "all" ? [{ key: "type", label: `${tAdmin("common.type")}: ${tAdmin(`notifications.types.${typeFilter}`)}`, onRemove: () => { tap(); setTypeFilter("all"); } }] : []),
    ...(readFilter !== "all" ? [{ key: "read", label: tAdmin("transactions.filterChips.status", { value: readLabel(readFilter) }), onRemove: () => { tap(); setReadFilter("all"); } }] : []),
    ...(dateFrom !== "" ? [{ key: "dateFrom", label: tAdmin("transactions.filterChips.dateFrom", { value: dateFrom }), onRemove: () => setDateFrom("") }] : []),
    ...(dateTo !== "" ? [{ key: "dateTo", label: tAdmin("transactions.filterChips.dateTo", { value: dateTo }), onRemove: () => setDateTo("") }] : []),
  ];

  const filterFields: FilterField[] = [
    {
      kind: "select", key: "type", label: tAdmin("notifications.notificationType"), value: typeFilter, onChange: (v) => { tap(); setTypeFilter(v); },
      options: [{ value: "all", label: tAdmin("common.all") }, ...NOTIFICATION_TYPES.map((t) => ({ value: t, label: tAdmin(`notifications.types.${t}`) }))],
    },
    {
      kind: "select", key: "read", label: tAdmin("common.status"), value: readFilter, onChange: (v) => { tap(); setReadFilter(v); },
      options: [{ value: "all", label: tAdmin("common.all") }, { value: "read", label: readLabel("read") }, { value: "unread", label: readLabel("unread") }],
    },
    { kind: "date", key: "dateFrom", label: tAdmin("common.fromDate"), value: dateFrom, onChange: setDateFrom },
    { kind: "date", key: "dateTo", label: tAdmin("common.toDate"), value: dateTo, onChange: setDateTo },
  ];

  return {
    search,
    setSearch,
    showFilters,
    setShowFilters,
    filters,
    filterChips,
    filterFields,
    clearFilters,
    hasActiveFilters,
  };
}
