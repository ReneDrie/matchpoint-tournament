"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { API_URL } from "../shared/config";
import type { DrawData, DrawPlayer, DrawSlot, StaffUser } from "../shared/types";

const POSITIONS_PER_BLOCK = 32;

export function useDraw({ tournamentId, user }: { tournamentId: number; user: StaffUser }) {
  const [data, setData] = useState<DrawData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [playerSearch, setPlayerSearch] = useState("");
  const [pickerSearch, setPickerSearch] = useState("");
  const [activePosition, setActivePosition] = useState<number | null>(null);
  const [block, setBlock] = useState(0);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const pendingSaves = useRef(0);

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/api/admin/tournaments/${tournamentId}/draw`, { credentials: "include" })
      .then(async (response) => ({ response, result: await response.json() }))
      .then(({ response, result }) => {
        if (!active) return;
        if (!response.ok) setError(result.error ?? "De loting kon niet worden geladen.");
        else setData(result);
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setError("De loting kon niet worden geladen.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [tournamentId]);

  const assignedIds = useMemo(
    () => new Set(data?.slots.filter((slot) => slot.player_id).map((slot) => slot.player_id as number) ?? []),
    [data?.slots],
  );
  const assignedCount = data?.slots.filter((slot) => slot.player_id !== null).length ?? 0;
  const byeCount = data?.slots.filter((slot) => slot.is_bye).length ?? 0;
  const emptyCount = data ? data.slots.length - assignedCount - byeCount : 0;
  const blocks = data ? Math.ceil(data.slots.length / POSITIONS_PER_BLOCK) : 1;
  const visibleSlots = data?.slots.slice(block * POSITIONS_PER_BLOCK, (block + 1) * POSITIONS_PER_BLOCK) ?? [];
  const activeSlot =
    activePosition === null ? null : (data?.slots.find((slot) => slot.position === activePosition) ?? null);
  const availablePlayers = data?.players.filter((player) => !assignedIds.has(player.id)) ?? [];
  const filteredPlayers = availablePlayers.filter((player) =>
    `${player.name} ${player.email} ${player.sponsor_name ?? ""}`.toLowerCase().includes(playerSearch.toLowerCase()),
  );

  function persist(nextSlots: DrawSlot[]) {
    pendingSaves.current += 1;
    setSaving(true);
    setSaved(false);
    setError("");
    setMessage("");
    const request = async () => {
      const response = await fetch(`${API_URL}/api/admin/tournaments/${tournamentId}/draw`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": user.csrf_token },
        body: JSON.stringify({
          slots: nextSlots.map((slot) => ({ position: slot.position, player_id: slot.player_id, is_bye: slot.is_bye })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "De conceptloting kon niet worden opgeslagen.");
      setData((current) => (current ? { ...current, draw: result.draw, players: result.players } : result));
    };
    const queued = saveQueue.current
      .then(request)
      .catch((cause) => {
        setError(cause instanceof Error ? cause.message : "De conceptloting kon niet worden opgeslagen.");
      })
      .finally(() => {
        pendingSaves.current -= 1;
        if (pendingSaves.current === 0) {
          setSaving(false);
          setSaved(true);
        }
      });
    saveQueue.current = queued;
    return queued;
  }

  function updateSlot(position: number, assignment: { player?: DrawPlayer; isBye?: boolean }) {
    if (!data) return;
    if (
      data.draw.status === "published" &&
      !window.confirm(
        "Deze loting is al gepubliceerd. Een wijziging zet de loting terug naar concept en verwijdert de aangemaakte wedstrijden. Doorgaan?",
      )
    )
      return;
    const nextSlots = data.slots.map((slot) =>
      slot.position === position
        ? {
            ...slot,
            player_id: assignment.player?.id ?? null,
            player: assignment.player ?? null,
            is_bye: Boolean(assignment.isBye),
          }
        : slot,
    );
    setData((current) =>
      current
        ? { ...current, slots: nextSlots, draw: { ...current.draw, status: "draft", published_at: null } }
        : current,
    );
    setActivePosition(null);
    setPickerSearch("");
    void persist(nextSlots);
  }

  function assignFirstEmpty(player: DrawPlayer) {
    if (!data) return;
    const empty = data.slots.find((slot) => slot.player_id === null && !slot.is_bye);
    if (!empty) return setError("Er zijn geen lege posities meer.");
    setBlock(Math.floor((empty.position - 1) / POSITIONS_PER_BLOCK));
    updateSlot(empty.position, { player });
  }

  function openSlot(position: number) {
    setActivePosition(position);
    setPickerSearch("");
  }

  function fillEmptyWithByes() {
    if (!data || emptyCount === 0) return;
    const publishedWarning =
      data.draw.status === "published"
        ? " De gepubliceerde loting wordt hierdoor teruggezet naar concept en de wedstrijden worden verwijderd."
        : "";
    if (!window.confirm(`Wil je de resterende ${emptyCount} posities als bye invullen?${publishedWarning}`)) return;
    const nextSlots = data.slots.map((slot) =>
      slot.player_id === null && !slot.is_bye ? { ...slot, is_bye: true } : slot,
    );
    setData((current) =>
      current
        ? { ...current, slots: nextSlots, draw: { ...current.draw, status: "draft", published_at: null } }
        : current,
    );
    void persist(nextSlots);
  }

  function clearDraw() {
    if (!data || (assignedCount === 0 && byeCount === 0)) return;
    const publishedWarning =
      data.draw.status === "published" ? " De gepubliceerde wedstrijden worden ook verwijderd." : "";
    if (!window.confirm(`Weet je zeker dat je de volledige loting wilt leegmaken?${publishedWarning}`)) return;
    const nextSlots = data.slots.map((slot) => ({ ...slot, player_id: null, player: null, is_bye: false }));
    setData((current) =>
      current
        ? { ...current, slots: nextSlots, draw: { ...current.draw, status: "draft", published_at: null } }
        : current,
    );
    setBlock(0);
    void persist(nextSlots);
  }

  async function publish() {
    if (!data || emptyCount > 0) return;
    if (!window.confirm(`Loting publiceren en ${data.slots.length / 2} wedstrijden voor ronde 1 aanmaken?`)) return;
    await saveQueue.current;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/api/admin/tournaments/${tournamentId}/draw/publish`, {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRF-Token": user.csrf_token },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Publiceren is niet gelukt.");
      setData(result);
      setMessage(`De loting is gepubliceerd. Ronde 1 bevat ${result.matches_created} wedstrijden.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Publiceren is niet gelukt.");
    } finally {
      setSaving(false);
    }
  }

  return {
    data,
    loading,
    error,
    saving,
    saved,
    message,
    playerSearch,
    setPlayerSearch,
    pickerSearch,
    setPickerSearch,
    activeSlot,
    assignedIds,
    assignedCount,
    byeCount,
    emptyCount,
    blocks,
    block,
    setBlock,
    visibleSlots,
    filteredPlayers,
    openSlot,
    updateSlot,
    assignFirstEmpty,
    fillEmptyWithByes,
    clearDraw,
    publish,
    closePicker: () => setActivePosition(null),
  };
}
