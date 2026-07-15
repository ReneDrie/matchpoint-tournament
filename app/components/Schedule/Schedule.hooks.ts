"use client";

import { useEffect, useMemo, useState } from "react";
import { API_URL } from "../shared/config";
import type { ScheduleData, ScheduleItem, StaffUser, TournamentMatch } from "../shared/types";

export type ScheduleRef = { kind: "match" | "item"; id: number };

export function toInputDate(value: string) {
  return value.replace(" ", "T").slice(0, 16);
}

export function useSchedule(tournamentId: number, user: StaffUser) {
  const [data, setData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [planOpen, setPlanOpen] = useState(false);
  const [item, setItem] = useState<ScheduleItem | "new" | null>(null);
  const [match, setMatch] = useState<TournamentMatch | null>(null);
  const [dragging, setDragging] = useState<ScheduleRef | null>(null);

  async function request(path: string, options?: RequestInit) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}${path}`, { credentials: "include", ...options, headers: { "Content-Type": "application/json", "X-CSRF-Token": user.csrf_token, ...(options?.headers ?? {}) } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "De planning kon niet worden opgeslagen.");
      setData(result);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "De planning kon niet worden opgeslagen.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/api/admin/tournaments/${tournamentId}/schedule`, { credentials: "include" }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "De planning kon niet worden geladen.");
      if (active) setData(result);
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "De planning kon niet worden geladen."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tournamentId]);

  const scheduledMatches = useMemo(() => data?.matches.filter(entry => entry.scheduled_at && entry.court_id) ?? [], [data]);
  const unscheduled = useMemo(() => data?.matches.filter(entry => !entry.scheduled_at) ?? [], [data]);
  const globalItems = useMemo(() => data?.items.filter(entry => entry.is_tournament_wide) ?? [], [data]);

  async function plan(payload: Record<string, unknown>) {
    const success = await request(`/api/admin/tournaments/${tournamentId}/schedule/plan`, { method: "POST", body: JSON.stringify(payload) });
    if (success) setPlanOpen(false);
  }

  async function saveItem(payload: Record<string, unknown>) {
    const editing = item !== "new" && item;
    const success = await request(editing ? `/api/admin/schedule/items/${editing.id}` : `/api/admin/tournaments/${tournamentId}/schedule/items`, { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) });
    if (success) setItem(null);
  }

  async function deleteItem(itemId: number) {
    if (!window.confirm("Dit programmaonderdeel verwijderen?")) return;
    const success = await request(`/api/admin/schedule/items/${itemId}`, { method: "DELETE" });
    if (success) setItem(null);
  }

  async function saveMatch(payload: Record<string, unknown>) {
    if (!match) return;
    const success = await request(`/api/admin/matches/${match.id}/schedule`, { method: "PATCH", body: JSON.stringify(payload) });
    if (success) setMatch(null);
  }

  async function drop(target: ScheduleRef) {
    if (!dragging || (dragging.kind === target.kind && dragging.id === target.id)) return setDragging(null);
    await request(`/api/admin/tournaments/${tournamentId}/schedule/swap`, { method: "POST", body: JSON.stringify({ first: dragging, second: target }) });
    setDragging(null);
  }

  return { data, loading, busy, error, planOpen, setPlanOpen, item, setItem, match, setMatch, scheduledMatches, unscheduled, globalItems, dragging, setDragging, plan, saveItem, deleteItem, saveMatch, drop };
}
