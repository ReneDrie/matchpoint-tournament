"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { API_URL } from "../shared/config";

export function usePasswordReset(token: string) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(Boolean(token));
  const [valid, setValid] = useState(!token);
  const [sent, setSent] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/auth/password-reset?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Deze herstellink is ongeldig of verlopen.");
        setValid(true);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Deze herstellink is ongeldig of verlopen."))
      .finally(() => setChecking(false));
  }, [token]);

  async function requestReset(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/auth/password-reset/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "De aanvraag is niet gelukt.");
      setSent(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "De aanvraag is niet gelukt.");
    } finally {
      setBusy(false);
    }
  }

  async function completeReset(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) return setError("De wachtwoorden komen niet overeen.");
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/auth/password-reset/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Het wachtwoord wijzigen is niet gelukt.");
      setCompleted(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Het wachtwoord wijzigen is niet gelukt.");
    } finally {
      setBusy(false);
    }
  }

  return {
    email,
    setEmail,
    password,
    setPassword,
    confirm,
    setConfirm,
    busy,
    checking,
    valid,
    sent,
    completed,
    error,
    requestReset,
    completeReset,
  };
}
