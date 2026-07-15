"use client";

/* eslint-disable @next/next/no-img-element */

import { ManualPlayerModal } from "../Players/ManualPlayerModal";
import type { Player, Sponsor, SponsorTier, StaffUser } from "../shared/types";
import { SponsorModal } from "./SponsorModal";
import { SponsorPackageModal } from "./SponsorPackageModal";
import { useSponsors } from "./Sponsors.hooks";

const money = (cents: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(cents / 100);

export function Sponsors({ user, sponsors, tiers, players, reloadSponsors, reloadPlayers }: { user: StaffUser; sponsors: Sponsor[]; tiers: SponsorTier[]; players: Player[]; reloadSponsors: () => Promise<void>; reloadPlayers: () => Promise<void> }) {
  const controller = useSponsors({ reloadPlayers, reloadSponsors });
  const editingPackage = controller.packageModal !== "new" ? controller.packageModal : null;
  return <>
    <section className="sponsor-page">
      <div className="settings-tabs sponsor-tabs" role="tablist" aria-label="Sponsorbeheer">
        <button type="button" role="tab" aria-selected={controller.activeTab === "sponsors"} className={controller.activeTab === "sponsors" ? "active" : ""} onClick={() => controller.setActiveTab("sponsors")}><strong>Sponsors</strong><span>Partners en gekoppelde spelers</span></button>
        <button type="button" role="tab" aria-selected={controller.activeTab === "packages"} className={controller.activeTab === "packages" ? "active" : ""} onClick={() => controller.setActiveTab("packages")}><strong>Sponsorpakketten</strong><span>Kosten en inbegrepen spelers</span></button>
      </div>
      {controller.activeTab === "packages" && <section className="panel sponsor-packages" role="tabpanel">
        <div className="table-heading"><div><p>FACTURATIE EN SPELERS</p><h2>Sponsorpakketten</h2></div><button className="secondary" onClick={() => controller.setPackageModal("new")}>＋ Pakket toevoegen</button></div>
        <div className="sponsor-package-grid">{tiers.map(tier => <button key={tier.id} onClick={() => controller.setPackageModal(tier)}><div><span>{tier.sponsor_count} sponsor{tier.sponsor_count === 1 ? "" : "s"}</span><h3>{tier.name}</h3></div><strong>{money(Number(tier.cost_cents))}</strong><small>Eenmalig · {tier.included_players} extra spelers inbegrepen</small><i>Wijzigen →</i></button>)}</div>
      </section>}
      {controller.activeTab === "sponsors" && <section className="panel full" role="tabpanel">
        <div className="table-heading"><div><p>PARTNERS VAN HET TOERNOOI</p><h2>Sponsors</h2></div><button className="primary" onClick={() => controller.setSponsorModal(true)} disabled={tiers.length === 0}>＋ Sponsor toevoegen</button></div>
        {sponsors.length === 0 ? <div className="empty-state"><strong>Nog geen sponsors toegevoegd</strong><span>Voeg eerst een sponsor toe en koppel die aan een pakket.</span></div> : <div className="sponsor-management-grid">{sponsors.map(sponsor => {
          const sponsoredPlayers = players.filter(player => player.sponsor_id === sponsor.id && player.registration_status === "confirmed");
          const full = sponsoredPlayers.length >= Number(sponsor.effective_player_limit);
          return <article className={`sponsor-management-card ${sponsor.is_active ? "" : "inactive"}`} key={sponsor.id}>
            <div className="sponsor-card-head"><div className="sponsor-logo">{sponsor.logo_url ? <img src={sponsor.logo_url} alt={`${sponsor.name} logo`} /> : sponsor.name.split(" ").map(part => part[0]).slice(0, 2).join("")}</div><div><span className={sponsor.is_active ? "status paid" : "status pending"}>{sponsor.is_active ? sponsor.tier_name : "Inactief"}</span><h3>{sponsor.name}</h3><small>{money(Number(sponsor.package_cost_cents))} · eenmalig</small>{sponsor.website_url && <a href={sponsor.website_url} target="_blank" rel="noreferrer">Website openen ↗</a>}</div><button className="secondary sponsor-edit" onClick={() => controller.setEditingSponsor(sponsor)}>Wijzigen</button></div>
            {(sponsor.contact_email || sponsor.contact_phone) && <div className="sponsor-contact"><strong>Contact</strong>{sponsor.contact_email && <a href={`mailto:${sponsor.contact_email}`}>{sponsor.contact_email}</a>}{sponsor.contact_phone && <a href={`tel:${sponsor.contact_phone}`}>{sponsor.contact_phone}</a>}</div>}
            <div className="sponsor-player-head"><strong>Spelers uit sponsorpakket</strong><span className={full ? "full" : ""}>{sponsoredPlayers.length} / {sponsor.effective_player_limit}</span></div>
            {sponsor.player_limit_override !== null && <small className="sponsor-override">Override actief · pakketstandaard {sponsor.package_included_players}</small>}
            {sponsoredPlayers.length === 0 ? <p className="sponsor-empty">Nog geen spelers gekoppeld.</p> : <ul className="sponsor-player-list">{sponsoredPlayers.map(player => <li key={player.id}><span>{player.player_number ?? "–"}</span><div><strong>{player.name}</strong><small>{player.email}</small></div><b>Betaald</b></li>)}</ul>}
            <button className="secondary sponsor-add-player" onClick={() => controller.setPlayerSponsor(sponsor)} disabled={!sponsor.is_active || full}>{full ? "Spelerslimiet bereikt" : "＋ Speler toevoegen"}</button>
          </article>;
        })}</div>}
      </section>}
    </section>
    {controller.packageModal && <SponsorPackageModal user={user} sponsorPackage={editingPackage ?? undefined} close={() => controller.setPackageModal(null)} saved={reloadSponsors} />}
    {controller.sponsorModal && <SponsorModal user={user} tiers={tiers} close={() => controller.setSponsorModal(false)} saved={reloadSponsors} />}
    {controller.editingSponsor && <SponsorModal user={user} tiers={tiers} sponsor={controller.editingSponsor} close={() => controller.setEditingSponsor(null)} saved={reloadSponsors} />}
    {controller.playerSponsor && <ManualPlayerModal user={user} sponsors={sponsors} initialSponsorId={String(controller.playerSponsor.id)} close={() => controller.setPlayerSponsor(null)} saved={controller.playerSaved} />}
  </>;
}
