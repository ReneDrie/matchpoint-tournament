"use client";

import { useModalDismiss } from "../Modal/Modal.hooks";
import type { Sponsor, SponsorTier, StaffUser } from "../shared/types";
import { useSponsorForm } from "./Sponsors.hooks";

export function SponsorModal({
  user,
  tiers,
  sponsor,
  close,
  saved,
}: {
  user: StaffUser;
  tiers: SponsorTier[];
  sponsor?: Sponsor;
  close: () => void;
  saved: () => Promise<void>;
}) {
  useModalDismiss(close);
  const form = useSponsorForm({ user, tiers, sponsor, close, saved });
  const selectedTier = tiers.find((tier) => String(tier.id) === form.tierId);
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <form
        className="modal-card sponsor-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sponsor-modal-title"
        onSubmit={form.submit}
      >
        <div className="modal-header">
          <div>
            <p>{sponsor ? "PARTNER BEHEREN" : "NIEUWE PARTNER"}</p>
            <h2 id="sponsor-modal-title">{sponsor ? "Sponsor wijzigen" : "Sponsor toevoegen"}</h2>
          </div>
          <button type="button" className="modal-close" onClick={close} aria-label="Sluiten">
            ×
          </button>
        </div>
        <div className="modal-grid">
          <label>
            Naam
            <input autoFocus required value={form.name} onChange={(event) => form.setName(event.target.value)} />
          </label>
          <label>
            Sponsorpakket
            <select required value={form.tierId} onChange={(event) => form.setTierId(event.target.value)}>
              {tiers.map((tier) => (
                <option key={tier.id} value={tier.id}>
                  {tier.name}
                </option>
              ))}
            </select>
            <small>
              {selectedTier
                ? `€ ${(selectedTier.cost_cents / 100).toFixed(2).replace(".", ",")} · ${selectedTier.included_players} spelers inbegrepen`
                : ""}
            </small>
          </label>
          <label>
            Contact e-mail
            <input
              type="email"
              value={form.contactEmail}
              onChange={(event) => form.setContactEmail(event.target.value)}
            />
          </label>
          <label>
            Contact telefoon
            <input value={form.contactPhone} onChange={(event) => form.setContactPhone(event.target.value)} />
          </label>
          <label className="modal-wide">
            Website (optioneel)
            <input
              type="url"
              value={form.website}
              onChange={(event) => form.setWebsite(event.target.value)}
              placeholder="https://"
            />
          </label>
          <label className="modal-wide sponsor-logo-upload">
            Sponsorlogo (SVG)
            <input
              type="file"
              accept="image/svg+xml,.svg"
              onChange={(event) => form.setLogoFile(event.target.files?.[0] ?? null)}
            />
            <small>
              {sponsor?.logo_path
                ? "Kies een nieuw bestand om het huidige logo te vervangen."
                : "Alleen veilige SVG-bestanden, maximaal 2 MB."}
            </small>
          </label>
          <label>
            Spelersoverride
            <input
              type="number"
              min="0"
              max="256"
              value={form.playerLimitOverride}
              onChange={(event) => form.setPlayerLimitOverride(event.target.value)}
              placeholder={selectedTier ? `Standaard ${selectedTier.included_players}` : "Pakketstandaard"}
            />
            <small>Leeg gebruikt de pakketstandaard.</small>
          </label>
          {sponsor && (
            <div className="modal-wide sponsor-switches">
              <label>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => form.setIsActive(event.target.checked)}
                />{" "}
                Sponsor is actief
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.showPublic}
                  onChange={(event) => form.setShowPublic(event.target.checked)}
                />{" "}
                Tonen op openbare pagina’s
              </label>
            </div>
          )}
        </div>
        {form.error && <p className="form-error">{form.error}</p>}
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={close}>
            Annuleren
          </button>
          <button className="primary" disabled={!form.name || !form.tierId || form.busy}>
            {form.busy ? "Opslaan…" : sponsor ? "Wijzigingen opslaan" : "Sponsor toevoegen"}
          </button>
        </div>
      </form>
    </div>
  );
}
