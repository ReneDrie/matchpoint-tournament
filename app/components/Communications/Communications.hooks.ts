"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { API_URL } from "../shared/config";
import type { EmailMessage, Player, StaffUser } from "../shared/types";

type RecipientFilter = "confirmed" | "all" | "checked_in";

export function useCommunications({ user, tournamentId, players }: { user: StaffUser; tournamentId: number; players: Player[] }) {
  const [filter, setFilter] = useState<RecipientFilter>("confirmed");
  const [selected, setSelected] = useState<number[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const eligible = useMemo(() => players.filter((player) => {
    if (filter === "all") return ["confirmed", "payment_pending"].includes(player.registration_status);
    if (filter === "checked_in") return Boolean(player.checked_in_at);
    return player.registration_status === "confirmed";
  }), [players, filter]);
  const recipients = selected.length ? eligible.filter((player) => selected.includes(player.id)) : eligible;

  async function load() {
    const response = await fetch(`${API_URL}/api/admin/emails?tournament_id=${tournamentId}`, { credentials: "include" });
    if (response.ok) setMessages((await response.json()).messages);
  }

  useEffect(() => {
    void fetch(`${API_URL}/api/admin/emails?tournament_id=${tournamentId}`, { credentials: "include" })
      .then(async (response) => { if (response.ok) setMessages((await response.json()).messages); });
  }, [tournamentId]);

  function changeFilter(value: string) {
    setFilter(value as RecipientFilter);
    setSelected([]);
  }

  function toggle(id: number) {
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!window.confirm(`E-mail versturen naar ${recipients.length} deelnemer${recipients.length === 1 ? "" : "s"}?`)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_URL}/api/admin/emails/broadcast`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": user.csrf_token },
        body: JSON.stringify({ tournament_id: tournamentId, subject, body, filter, player_ids: selected }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Verzenden is niet gelukt.");
      setNotice(`${result.recipients} e-mail${result.recipients === 1 ? "" : "s"} aangeboden aan Brevo.`);
      setSubject("");
      setBody("");
      setSelected([]);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Verzenden is niet gelukt.");
    } finally {
      setBusy(false);
    }
  }

  return { filter, changeFilter, eligible, selected, toggle, recipients, subject, setSubject, body, setBody, messages, busy, error, notice, submit };
}
