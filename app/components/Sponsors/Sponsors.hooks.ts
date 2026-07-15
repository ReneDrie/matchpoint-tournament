"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { API_URL } from "../shared/config";
import type { Sponsor, SponsorTier, StaffUser } from "../shared/types";

export function useSponsors({ reloadPlayers, reloadSponsors }: { reloadPlayers: () => Promise<void>; reloadSponsors: () => Promise<void> }) {
  const [sponsorModal, setSponsorModal] = useState(false);
  const [playerSponsor, setPlayerSponsor] = useState<Sponsor | null>(null);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  async function playerSaved() { await Promise.all([reloadPlayers(), reloadSponsors()]); }
  return { sponsorModal, setSponsorModal, playerSponsor, setPlayerSponsor, editingSponsor, setEditingSponsor, playerSaved };
}

export function useSponsorForm({ user, tiers, sponsor, saved, close }: { user: StaffUser; tiers: SponsorTier[]; sponsor?: Sponsor; saved: () => Promise<void>; close: () => void }) {
  const [name, setName] = useState(sponsor?.name ?? "");
  const [tierId, setTierId] = useState(sponsor?.tier_id ? String(sponsor.tier_id) : tiers[0]?.id ? String(tiers[0].id) : "");
  const [website, setWebsite] = useState(sponsor?.website_url ?? "");
  const [isActive, setIsActive] = useState(sponsor ? Boolean(sponsor.is_active) : true);
  const [showPublic, setShowPublic] = useState(sponsor ? Boolean(sponsor.show_on_public_pages) : true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch(sponsor ? `${API_URL}/api/admin/sponsors/${sponsor.id}` : `${API_URL}/api/admin/sponsors`, { method: sponsor ? "PATCH" : "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": user.csrf_token }, body: JSON.stringify({ name, tier_id: tierId, website_url: website, is_active: isActive, show_on_public_pages: showPublic }) });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "Sponsor toevoegen is niet gelukt.");
      setBusy(false);
      return;
    }
    await saved();
    close();
  }

  return { name, setName, tierId, setTierId, website, setWebsite, isActive, setIsActive, showPublic, setShowPublic, error, busy, submit };
}
