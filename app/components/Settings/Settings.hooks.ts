"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { API_URL } from "../shared/config";
import type { Court, StaffUser, TournamentSettings } from "../shared/types";

type SettingsForm = Omit<TournamentSettings, "registration_price" | "schedule_defaults" | "presentation_defaults" | "venue" | "confirmed_players" | "registration_available" | "active_courts">;

function toInputDate(value: string) {
  return value.replace(" ", "T").slice(0, 16);
}

function toApiDate(value: string) {
  return `${value.replace("T", " ").slice(0, 16)}:00`;
}

function formFromTournament(tournament: TournamentSettings): SettingsForm {
  return { ...tournament, starts_at: toInputDate(tournament.starts_at), registration_deadline_at: toInputDate(tournament.registration_deadline_at) };
}

export function useSettings({ tournamentId, user, onTournamentSaved }: { tournamentId: number; user: StaffUser; onTournamentSaved: () => Promise<void> }) {
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [newCourtName, setNewCourtName] = useState("");
  const [newCourtSurface, setNewCourtSurface] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    const [settingsResponse, courtsResponse] = await Promise.all([
      fetch(`${API_URL}/api/admin/tournaments/${tournamentId}`, { credentials: "include" }),
      fetch(`${API_URL}/api/admin/tournaments/${tournamentId}/courts`, { credentials: "include" }),
    ]);
    const settingsResult = await settingsResponse.json();
    const courtsResult = await courtsResponse.json();
    if (!settingsResponse.ok || !courtsResponse.ok) {
      setError(settingsResult.error ?? courtsResult.error ?? "De instellingen konden niet worden geladen.");
    } else {
      setForm(formFromTournament(settingsResult.tournament));
      setCourts(courtsResult.courts);
    }
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`${API_URL}/api/admin/tournaments/${tournamentId}`, { credentials: "include" }),
      fetch(`${API_URL}/api/admin/tournaments/${tournamentId}/courts`, { credentials: "include" }),
    ]).then(async ([settingsResponse, courtsResponse]) => {
      const [settingsResult, courtsResult] = await Promise.all([settingsResponse.json(), courtsResponse.json()]);
      return { settingsResponse, courtsResponse, settingsResult, courtsResult };
    }).then(({ settingsResponse, courtsResponse, settingsResult, courtsResult }) => {
      if (!active) return;
      if (!settingsResponse.ok || !courtsResponse.ok) setError(settingsResult.error ?? courtsResult.error ?? "De instellingen konden niet worden geladen.");
      else {
        setForm(formFromTournament(settingsResult.tournament));
        setCourts(courtsResult.courts);
      }
      setLoading(false);
    }).catch(() => {
      if (active) {
        setError("De instellingen konden niet worden geladen.");
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [tournamentId]);

  function update<K extends keyof SettingsForm>(field: K, value: SettingsForm[K]) {
    setForm(current => current ? { ...current, [field]: value } : current);
    setSuccess("");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    setBusy(true);
    setError("");
    setSuccess("");
    const response = await fetch(`${API_URL}/api/admin/tournaments/${tournamentId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": user.csrf_token },
      body: JSON.stringify({ ...form, starts_at: toApiDate(form.starts_at), registration_deadline_at: toApiDate(form.registration_deadline_at) }),
    });
    const result = await response.json();
    if (!response.ok) setError(result.error ?? "Opslaan is niet gelukt.");
    else {
      setForm(formFromTournament(result.tournament));
      setSuccess("De toernooi-instellingen zijn opgeslagen.");
      await onTournamentSaved();
    }
    setBusy(false);
  }

  async function createCourt(event: FormEvent) {
    event.preventDefault();
    if (!newCourtName.trim()) return;
    setError("");
    const response = await fetch(`${API_URL}/api/admin/tournaments/${tournamentId}/courts`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": user.csrf_token },
      body: JSON.stringify({ name: newCourtName, surface: newCourtSurface }),
    });
    const result = await response.json();
    if (!response.ok) return setError(result.error ?? "Baan toevoegen is niet gelukt.");
    setNewCourtName("");
    setNewCourtSurface("");
    await load();
    await onTournamentSaved();
  }

  async function reloadCourts() {
    const response = await fetch(`${API_URL}/api/admin/tournaments/${tournamentId}/courts`, { credentials: "include" });
    const result = await response.json();
    if (response.ok) setCourts(result.courts);
  }

  async function courtSaved() {
    await Promise.all([reloadCourts(), onTournamentSaved()]);
  }

  return { form, update, courts, loading, busy, error, setError, success, save, newCourtName, setNewCourtName, newCourtSurface, setNewCourtSurface, createCourt, courtSaved };
}

export function useCourtEditor({ court, user, saved, onError }: { court: Court; user: StaffUser; saved: () => Promise<void>; onError: (message: string) => void }) {
  const [name, setName] = useState(court.name);
  const [surface, setSurface] = useState(court.surface ?? "");
  const [isActive, setIsActive] = useState(Boolean(court.is_active));
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    onError("");
    const response = await fetch(`${API_URL}/api/admin/courts/${court.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": user.csrf_token },
      body: JSON.stringify({ name, surface, is_active: isActive }),
    });
    const result = await response.json();
    if (!response.ok) onError(result.error ?? "Baan wijzigen is niet gelukt.");
    else await saved();
    setBusy(false);
  }

  async function remove() {
    if (!window.confirm(`Weet je zeker dat je ${court.name} wilt verwijderen?`)) return;
    setBusy(true);
    onError("");
    const response = await fetch(`${API_URL}/api/admin/courts/${court.id}`, { method: "DELETE", credentials: "include", headers: { "X-CSRF-Token": user.csrf_token } });
    const result = await response.json();
    if (!response.ok) onError(result.error ?? "Baan verwijderen is niet gelukt.");
    else await saved();
    setBusy(false);
  }

  return { name, setName, surface, setSurface, isActive, setIsActive, busy, save, remove };
}
