"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { API_URL } from "../shared/config";
import type { Sponsor, SponsorTier, StaffUser } from "../shared/types";

export function useSponsors({ reloadPlayers, reloadSponsors }: { reloadPlayers: () => Promise<void>; reloadSponsors: () => Promise<void> }) {
  const [sponsorModal, setSponsorModal] = useState(false);
  const [playerSponsor, setPlayerSponsor] = useState<Sponsor | null>(null);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const [packageModal, setPackageModal] = useState<SponsorTier | "new" | null>(null);
  async function playerSaved() { await Promise.all([reloadPlayers(), reloadSponsors()]); }
  return { sponsorModal, setSponsorModal, playerSponsor, setPlayerSponsor, editingSponsor, setEditingSponsor, packageModal, setPackageModal, playerSaved };
}

export function useSponsorForm({ user, tiers, sponsor, saved, close }: { user: StaffUser; tiers: SponsorTier[]; sponsor?: Sponsor; saved: () => Promise<void>; close: () => void }) {
  const [name, setName] = useState(sponsor?.name ?? "");
  const [tierId, setTierId] = useState(sponsor?.tier_id ? String(sponsor.tier_id) : tiers[0]?.id ? String(tiers[0].id) : "");
  const [website, setWebsite] = useState(sponsor?.website_url ?? "");
  const [contactEmail, setContactEmail] = useState(sponsor?.contact_email ?? "");
  const [contactPhone, setContactPhone] = useState(sponsor?.contact_phone ?? "");
  const [playerLimitOverride, setPlayerLimitOverride] = useState(sponsor?.player_limit_override === null || sponsor?.player_limit_override === undefined ? "" : String(sponsor.player_limit_override));
  const [isActive, setIsActive] = useState(sponsor ? Boolean(sponsor.is_active) : true);
  const [showPublic, setShowPublic] = useState(sponsor ? Boolean(sponsor.show_on_public_pages) : true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch(sponsor ? `${API_URL}/api/admin/sponsors/${sponsor.id}` : `${API_URL}/api/admin/sponsors`, { method: sponsor ? "PATCH" : "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": user.csrf_token }, body: JSON.stringify({ name, tier_id: tierId, contact_email: contactEmail, contact_phone: contactPhone, website_url: website, player_limit_override: playerLimitOverride === "" ? null : Number(playerLimitOverride), is_active: isActive, show_on_public_pages: showPublic }) });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "Sponsor toevoegen is niet gelukt.");
      setBusy(false);
      return;
    }
    await saved();
    close();
  }

  return { name, setName, tierId, setTierId, website, setWebsite, contactEmail, setContactEmail, contactPhone, setContactPhone, playerLimitOverride, setPlayerLimitOverride, isActive, setIsActive, showPublic, setShowPublic, error, busy, submit };
}

export function useSponsorPackageForm({ user, sponsorPackage, saved, close }: { user: StaffUser; sponsorPackage?: SponsorTier; saved: () => Promise<void>; close: () => void }) {
  const [name, setName] = useState(sponsorPackage?.name ?? "");
  const [cost, setCost] = useState(sponsorPackage ? (sponsorPackage.cost_cents / 100).toFixed(2).replace(".", ",") : "0,00");
  const [includedPlayers, setIncludedPlayers] = useState(sponsorPackage?.included_players ?? 0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const costCents = Math.round(Number(cost.replace(",", ".")) * 100);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    const response = await fetch(sponsorPackage ? `${API_URL}/api/admin/sponsor-tiers/${sponsorPackage.id}` : `${API_URL}/api/admin/sponsor-tiers`, { method: sponsorPackage ? "PATCH" : "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": user.csrf_token }, body: JSON.stringify({ name, cost_cents: costCents, included_players: includedPlayers }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? "Sponsorpakket kon niet worden opgeslagen."); setBusy(false); return; }
    await saved(); close();
  }

  async function remove() {
    if (!sponsorPackage || !window.confirm(`Sponsorpakket “${sponsorPackage.name}” verwijderen?`)) return;
    setBusy(true); setError("");
    const response = await fetch(`${API_URL}/api/admin/sponsor-tiers/${sponsorPackage.id}`, { method: "DELETE", credentials: "include", headers: { "X-CSRF-Token": user.csrf_token } });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? "Sponsorpakket kon niet worden verwijderd."); setBusy(false); return; }
    await saved(); close();
  }

  return { name, setName, cost, setCost, includedPlayers, setIncludedPlayers, costCents, error, busy, submit, remove };
}
