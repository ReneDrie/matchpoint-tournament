"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { API_URL } from "../shared/config";
import type { StaffAccount, StaffInvitation, StaffUser } from "../shared/types";

export function useStaffAccounts(user: StaffUser) {
  const [accounts, setAccounts] = useState<StaffAccount[]>([]);
  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [name, setName] = useState(""); const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  async function load() { const response = await fetch(`${API_URL}/api/admin/staff`, { credentials: "include" }); if (response.ok) { const result = await response.json(); setAccounts(result.users); setInvitations(result.invitations); } }
  useEffect(() => { void fetch(`${API_URL}/api/admin/staff`, { credentials: "include" }).then(async response => { if (response.ok) { const result = await response.json(); setAccounts(result.users); setInvitations(result.invitations); } }); }, []);
  async function invite(event: FormEvent) { event.preventDefault(); setBusy(true); setError(""); setNotice(""); const response = await fetch(`${API_URL}/api/auth/invitations`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": user.csrf_token }, body: JSON.stringify({ name, email, role: "host" }) }); const result = await response.json(); if (!response.ok) { setError(result.error ?? "Uitnodigen is niet gelukt."); setBusy(false); return; } setName(""); setEmail(""); setNotice(result.email_status === "sent" ? "De uitnodiging is verstuurd." : result.accept_url ? `Uitnodiging klaargezet. Lokale testlink: ${result.accept_url}` : "De uitnodiging staat klaar voor verzending."); setBusy(false); await load(); }
  async function toggle(account: StaffAccount) { setError(""); const response = await fetch(`${API_URL}/api/admin/staff/${account.id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": user.csrf_token }, body: JSON.stringify({ is_active: !Boolean(account.is_active) }) }); const result = await response.json(); if (!response.ok) return setError(result.error ?? "Account wijzigen is niet gelukt."); await load(); }
  return { accounts, invitations, name, setName, email, setEmail, busy, error, notice, invite, toggle };
}
