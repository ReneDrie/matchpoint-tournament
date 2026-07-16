"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { API_URL } from "../shared/config";

export function useWaitlistForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [position, setPosition] = useState<number | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch(`${API_URL}/api/waitlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "Aanmelden voor de wachtlijst is niet gelukt.");
      setBusy(false);
      return;
    }
    setPosition(Number(result.position));
    setBusy(false);
  }
  return { name, setName, email, setEmail, busy, error, position, submit };
}
