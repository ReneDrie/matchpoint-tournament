"use client";

import { useEffect, useState } from "react";
import type { SetStateAction } from "react";
import { API_URL } from "../shared/config";
import type { AuditLogData } from "../shared/types";

const emptyData: AuditLogData = {
  entries: [],
  filters: { actions: [], entity_types: [] },
  pagination: { page: 1, per_page: 25, total: 0, pages: 1 },
};

export function useAuditLog() {
  const [data, setData] = useState<AuditLogData>(emptyData);
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const parameters = new URLSearchParams({ page: String(page), per_page: "25" });
    if (action) parameters.set("action", action);
    if (entityType) parameters.set("entity_type", entityType);
    if (dateFrom) parameters.set("date_from", dateFrom);
    if (dateTo) parameters.set("date_to", dateTo);

    void fetch(`${API_URL}/api/admin/audit-log?${parameters}`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "De auditlog kon niet worden geladen.");
        setData(result);
      })
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "De auditlog kon niet worden geladen.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [action, entityType, dateFrom, dateTo, page]);

  function changeFilter(setter: (value: string) => void, value: string) {
    setLoading(true);
    setError("");
    setter(value);
    setPage(1);
  }

  function clearFilters() {
    setLoading(true);
    setError("");
    setAction("");
    setEntityType("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  function changePage(value: SetStateAction<number>) {
    setLoading(true);
    setError("");
    setPage(value);
  }

  return {
    ...data,
    action,
    setAction: (value: string) => changeFilter(setAction, value),
    entityType,
    setEntityType: (value: string) => changeFilter(setEntityType, value),
    dateFrom,
    setDateFrom: (value: string) => changeFilter(setDateFrom, value),
    dateTo,
    setDateTo: (value: string) => changeFilter(setDateTo, value),
    page,
    setPage: changePage,
    loading,
    error,
    clearFilters,
    hasFilters: Boolean(action || entityType || dateFrom || dateTo),
  };
}
