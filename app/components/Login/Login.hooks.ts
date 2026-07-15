"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { API_URL } from "../shared/config";
import type { StaffUser } from "../shared/types";

export function useLogin(onLogin: (user: StaffUser) => void) {
  const [email, setEmail] = useState("info@matchpointtournament.nl");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Inloggen is niet gelukt.");
      onLogin(result.user);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Inloggen is niet gelukt.");
      setBusy(false);
    }
  }

  return { email, setEmail, password, setPassword, busy, error, submit };
}
