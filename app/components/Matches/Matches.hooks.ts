"use client";

import { useEffect, useMemo, useState } from "react";
import { API_URL } from "../shared/config";
import type { MatchesData, StaffUser, TournamentMatch } from "../shared/types";

export function roundLabel(round: number, roundCount: number) {
  if (round === roundCount) return "Finale";
  if (round === roundCount - 1) return "Halve finale";
  if (round === roundCount - 2) return "Kwartfinale";
  return `Ronde ${round}`;
}

export function useMatches(tournamentId: number, user: StaffUser) {
  const [data, setData] = useState<MatchesData>({ matches: [], round_count: 0 });
  const [round, setRound] = useState(1);
  const [selected, setSelected] = useState<{ match: TournamentMatch; winnerId: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/admin/matches?tournament_id=${tournamentId}`, {
        credentials: "include",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Wedstrijden konden niet worden geladen.");
      setData(result);
      if (result.round_count && round > result.round_count) setRound(result.round_count);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Wedstrijden konden niet worden geladen.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/api/admin/matches?tournament_id=${tournamentId}`, { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Wedstrijden konden niet worden geladen.");
        if (active) setData(result);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Wedstrijden konden niet worden geladen.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tournamentId]);

  const visible = useMemo(() => data.matches.filter((match) => match.round_number === round), [data.matches, round]);
  const completed = data.matches.filter((match) => match.status === "complete").length;

  function choose(match: TournamentMatch, winnerId: number | null) {
    if (!winnerId || !match.player_one_id || !match.player_two_id) return;
    setSelected({ match, winnerId });
  }

  async function confirmWinner() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/admin/matches/${selected.match.id}/winner`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": user.csrf_token },
        body: JSON.stringify({ winner_id: selected.winnerId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "De winnaar kon niet worden opgeslagen.");
      setData(result);
      setSelected(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "De winnaar kon niet worden opgeslagen.");
    } finally {
      setBusy(false);
    }
  }

  return {
    data,
    round,
    setRound,
    visible,
    selected,
    loading,
    busy,
    error,
    completed,
    choose,
    confirmWinner,
    closeConfirm: () => setSelected(null),
    reload: load,
  };
}
