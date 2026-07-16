"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { API_URL } from "../shared/config";
import type { Player, PlayerDetail, Sponsor, StaffUser, WaitlistEntry } from "../shared/types";

export function usePlayers({ user, rows, reload }: { user: StaffUser; rows: Player[]; reload: () => Promise<void> }) {
  const [activeTab, setActiveTab] = useState<"players" | "waitlist">("players");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [error, setError] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<PlayerDetail | null>(null);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const filtered = rows.filter((player) => {
    const haystack = `${player.name} ${player.email} ${player.knltb_number ?? ""}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) && (status === "all" || player.registration_status === status);
  });

  async function checkIn(player: Player) {
    setError("");
    const response = await fetch(`${API_URL}/api/admin/players/${player.id}/check-in`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": user.csrf_token },
      body: JSON.stringify({ checked_in: !player.checked_in_at }),
    });
    const result = await response.json();
    if (!response.ok) return setError(result.error ?? "Inchecken is niet gelukt.");
    await reload();
  }

  async function exportCsv() {
    setError("");
    const response = await fetch(`${API_URL}/api/admin/players/export`, { credentials: "include" });
    if (!response.ok) return setError("Exporteren is niet gelukt.");
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = "matchpoint-deelnemers.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function edit(player: Player) {
    setError("");
    const response = await fetch(`${API_URL}/api/admin/players/${player.id}`, { credentials: "include" });
    const result = await response.json();
    if (!response.ok) return setError(result.error ?? "Deelnemer laden is niet gelukt.");
    setEditingPlayer(result.player);
  }

  async function loadWaitlist() {
    if (user.role !== "administrator") return;
    setWaitlistLoading(true);
    const response = await fetch(`${API_URL}/api/admin/waitlist`, { credentials: "include" });
    if (response.ok) setWaitlist((await response.json()).entries);
    else setError("Wachtlijst laden is niet gelukt.");
    setWaitlistLoading(false);
  }

  async function invite(entry: WaitlistEntry) {
    if (!window.confirm(`${entry.name} uitnodigen? De plek wordt 48 uur gereserveerd.`)) return;
    setError("");
    setNotice("");
    const response = await fetch(`${API_URL}/api/admin/waitlist/${entry.id}/invite`, {
      method: "POST",
      credentials: "include",
      headers: { "X-CSRF-Token": user.csrf_token },
    });
    const result = await response.json();
    if (!response.ok) return setError(result.error ?? "Uitnodigen is niet gelukt.");
    setNotice(
      result.email_status === "sent"
        ? `De uitnodiging is verstuurd naar ${entry.email}.`
        : result.invite_url
          ? `De e-mail staat klaar. Lokale testlink: ${result.invite_url}`
          : "De uitnodiging staat klaar voor verzending zodra Brevo is geconfigureerd.",
    );
    await loadWaitlist();
  }

  async function removeWaitlistEntry(entry: WaitlistEntry) {
    if (!window.confirm(`${entry.name} van de wachtlijst verwijderen?`)) return;
    const response = await fetch(`${API_URL}/api/admin/waitlist/${entry.id}`, {
      method: "DELETE",
      credentials: "include",
      headers: { "X-CSRF-Token": user.csrf_token },
    });
    const result = await response.json();
    if (!response.ok) return setError(result.error ?? "Verwijderen is niet gelukt.");
    await loadWaitlist();
  }

  function selectTab(tab: "players" | "waitlist") {
    setActiveTab(tab);
    if (tab === "waitlist" && waitlist.length === 0) void loadWaitlist();
  }

  return {
    activeTab,
    selectTab,
    search,
    setSearch,
    status,
    setStatus,
    error,
    notice,
    manualOpen,
    setManualOpen,
    editingPlayer,
    setEditingPlayer,
    filtered,
    checkIn,
    exportCsv,
    edit,
    waitlist,
    waitlistLoading,
    invite,
    removeWaitlistEntry,
  };
}

export function usePlayerForm({
  user,
  player,
  initialSponsorId = "",
  saved,
  close,
}: {
  user: StaffUser;
  sponsors: Sponsor[];
  player?: PlayerDetail;
  initialSponsorId?: string;
  saved: () => Promise<void>;
  close: () => void;
}) {
  const [form, setForm] = useState({
    name: player?.name ?? "",
    email: player?.email ?? "",
    phone: player?.phone ?? "",
    date_of_birth: player?.date_of_birth ?? "",
    knltb_number: player?.knltb_number ?? "",
    singles_rating: player?.singles_rating ?? "",
    doubles_rating: player?.doubles_rating ?? "",
    entrance_song_query: player?.entrance_song_query ?? "",
    sponsor_id: player?.sponsor_id ? String(player.sponsor_id) : initialSponsorId,
    registration_status: player?.registration_status ?? "confirmed",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const complete = Boolean(
    form.name &&
    form.email &&
    form.phone &&
    form.date_of_birth &&
    form.entrance_song_query &&
    (form.knltb_number || (form.singles_rating && form.doubles_rating)),
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!complete) return;
    setBusy(true);
    setError("");
    const response = await fetch(
      player ? `${API_URL}/api/admin/players/${player.id}` : `${API_URL}/api/admin/players`,
      {
        method: player ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": user.csrf_token },
        body: JSON.stringify(form),
      },
    );
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "Deelnemer toevoegen is niet gelukt.");
      setBusy(false);
      return;
    }
    await saved();
    close();
  }

  return { form, update, busy, error, complete, submit };
}
