"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { API_URL } from "../shared/config";

type PlayerForm = {
  name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  knltb_number: string;
  singles_rating: string;
  doubles_rating: string;
  entrance_song_query: string;
  registration_status: string;
  tournament_name: string;
  expires_at: string;
};

const emptyForm: PlayerForm = {
  name: "",
  email: "",
  phone: "",
  date_of_birth: "",
  knltb_number: "",
  singles_rating: "",
  doubles_rating: "",
  entrance_song_query: "",
  registration_status: "",
  tournament_name: "",
  expires_at: "",
};

export function usePlayerSelfService(token: string) {
  const [email, setEmail] = useState("");
  const [form, setForm] = useState<PlayerForm>(emptyForm);
  const [loading, setLoading] = useState(Boolean(token));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/players/me?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Je persoonlijke link is niet geldig.");
        setForm({ ...emptyForm, ...result.player });
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Je persoonlijke link is niet geldig."))
      .finally(() => setLoading(false));
  }, [token]);

  function update(field: keyof PlayerForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function requestLink(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/players/access-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "De link kon niet worden aangevraagd.");
      setLinkSent(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "De link kon niet worden aangevraagd.");
    } finally {
      setBusy(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/players/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, token }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Je inschrijving kon niet worden bijgewerkt.");
      setUpdated(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Je inschrijving kon niet worden bijgewerkt.");
    } finally {
      setBusy(false);
    }
  }

  return { email, setEmail, form, update, loading, busy, error, linkSent, updated, requestLink, save };
}
