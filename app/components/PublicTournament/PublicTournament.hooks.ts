"use client";

import { useEffect, useMemo, useState } from "react";
import { API_URL } from "../shared/config";
import type { PublicTournamentData, PublicTournamentTab } from "../shared/types";

export function usePublicTournament() {
  const [data, setData] = useState<PublicTournamentData | null>(null);
  const [tab, setTab] = useState<PublicTournamentTab>("schedule");
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let active = true;

    async function refresh() {
      try {
        const response = await fetch(`${API_URL}/api/public/tournament-page`, { cache: "no-store" });
        if (!response.ok) throw new Error("De toernooigegevens konden niet worden geladen.");
        const result = await response.json();
        if (active) {
          setData(result);
          setOffline(false);
        }
      } catch {
        if (active) setOffline(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    void refresh();
    const interval = window.setInterval(refresh, 10_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const schedule = useMemo(() => {
    if (!data) return [];
    const matches = data.matches
      .filter((match) => match.scheduled_at)
      .map((match) => ({ kind: "match" as const, starts_at: match.scheduled_at as string, match }));
    const items = data.schedule_items.map((item) => ({ kind: "item" as const, starts_at: item.starts_at, item }));
    return [...matches, ...items].sort((left, right) => left.starts_at.localeCompare(right.starts_at));
  }, [data]);

  const results = useMemo(
    () =>
      data?.matches
        .filter((match) => match.status === "complete")
        .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? "")) ?? [],
    [data],
  );

  return { data, tab, setTab, schedule, results, loading, offline };
}
