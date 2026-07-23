"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { API_URL } from "../shared/config";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  date_of_birth: "",
  knltb_number: "",
  singles_rating: "",
  doubles_rating: "",
  no_tennis_association_membership: false,
  entrance_song_query: "",
  entrance_song_url: "",
  accept_privacy: false,
  accept_terms: false,
  website: "",
};

export function useRegistrationForm() {
  const invitationToken =
    typeof window === "undefined" ? "" : (new URLSearchParams(window.location.search).get("uitnodiging") ?? "");
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(initialForm);
  const [invitationLoading, setInvitationLoading] = useState(Boolean(invitationToken));
  const [invitationValid, setInvitationValid] = useState(!invitationToken);
  const update = (field: keyof typeof form, value: string | boolean) =>
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "no_tennis_association_membership" && value
        ? { knltb_number: "", singles_rating: "", doubles_rating: "" }
        : {}),
      ...(field === "entrance_song_query" ? { entrance_song_url: "" } : {}),
    }));
  const personalComplete = Boolean(form.name && form.email && form.phone && form.date_of_birth);
  const qualificationComplete = Boolean(
    form.knltb_number || (form.singles_rating && form.doubles_rating) || form.no_tennis_association_membership,
  );
  const readyToPay =
    qualificationComplete && Boolean(form.entrance_song_query && form.accept_privacy && form.accept_terms);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!readyToPay) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, invitation_token: invitationToken || undefined }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Inschrijven is niet gelukt.");
      window.location.assign(result.checkout_url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Inschrijven is niet gelukt.");
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!invitationToken) return;
    fetch(`${API_URL}/api/waitlist/invitation?token=${encodeURIComponent(invitationToken)}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Deze uitnodiging is niet geldig.");
        setForm((current) => ({ ...current, name: result.invitation.name, email: result.invitation.email }));
        setInvitationValid(true);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Deze uitnodiging is niet geldig."))
      .finally(() => setInvitationLoading(false));
  }, [invitationToken]);

  return {
    step,
    setStep,
    busy,
    error,
    form,
    update,
    personalComplete,
    readyToPay,
    submit,
    invitationToken,
    invitationLoading,
    invitationValid,
  };
}
