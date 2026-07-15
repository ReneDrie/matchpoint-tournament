"use client";

import type { StaffUser } from "../shared/types";
import { DrawSlotModal } from "./DrawSlotModal";
import { useDraw } from "./Draw.hooks";

export function Draw({ tournamentId, user }: { tournamentId: number; user: StaffUser }) {
  const draw = useDraw({ tournamentId, user });
  if (draw.loading) return <section className="panel full"><div className="empty-state">Loting laden…</div></section>;
  if (!draw.data) return <section className="panel full"><div className="empty-state"><strong>Loting niet beschikbaar</strong><span>{draw.error}</span></div></section>;
  const { data } = draw;
  const matches = Array.from({ length: Math.ceil(draw.visibleSlots.length / 2) }, (_, index) => ({ one: draw.visibleSlots[index * 2], two: draw.visibleSlots[index * 2 + 1] }));

  return <div className="draw-page">
    <section className="panel draw-heading"><div><div className="draw-title-line"><p>RONDE 1 · HANDMATIGE INDELING</p><span className={`status ${data.draw.status === "published" ? "paid" : "pending"}`}>{data.draw.status === "published" ? "Gepubliceerd" : "Concept"}</span></div><h2>{data.draw.bracket_size} posities</h2><small>Klik op een beschikbare speler om die op de eerstvolgende lege positie te zetten, of open een positie om expliciet een speler of bye te kiezen.</small></div><div className="draw-heading-actions"><span className={`draw-save-indicator ${draw.saving ? "saving" : draw.saved ? "saved" : ""}`}>{draw.saving ? "Concept opslaan…" : draw.saved ? "✓ Concept opgeslagen" : "Automatisch opslaan actief"}</span><button className="secondary" onClick={draw.fillEmptyWithByes} disabled={draw.emptyCount === 0 || draw.saving}>Resterende als bye</button><button className="primary" onClick={draw.publish} disabled={draw.emptyCount > 0 || draw.saving}>{data.draw.status === "published" ? "Opnieuw publiceren" : "Loting publiceren"}</button></div></section>
    {draw.error && <p className="settings-message error">{draw.error}</p>}
    {draw.message && <p className="settings-message success">{draw.message}</p>}
    <section className="draw-stats"><div><strong>{draw.assignedCount}</strong><span>spelers geplaatst</span></div><div><strong>{draw.byeCount}</strong><span>byes geplaatst</span></div><div className={draw.emptyCount ? "warning" : "complete"}><strong>{draw.emptyCount}</strong><span>lege posities</span></div><div><strong>{data.slots.length / 2}</strong><span>wedstrijden ronde 1</span></div></section>
    <div className="draw-workspace">
      <aside className="panel draw-player-pool"><div className="draw-pool-heading"><div><p>BESCHIKBARE SPELERS</p><h3>{Math.max(0, data.players.length - draw.assignedCount)} nog te plaatsen</h3></div></div><div className="search">⌕ <input value={draw.playerSearch} onChange={event => draw.setPlayerSearch(event.target.value)} placeholder="Zoek deelnemer" /></div><div className="draw-pool-list">{draw.filteredPlayers.length === 0 ? <div className="draw-no-results">Geen beschikbare spelers.</div> : draw.filteredPlayers.map(player => <button key={player.id} onClick={() => draw.assignFirstEmpty(player)}><span>{player.name.split(" ").map(part => part[0]).slice(0, 2).join("")}</span><div><strong>{player.name}</strong><small>{player.email}{player.sponsor_name ? ` · ${player.sponsor_name}` : ""}</small></div><b>＋</b></button>)}</div></aside>
      <section className="panel draw-bracket"><div className="draw-bracket-toolbar"><div><p>POSITIEBLOKKEN</p><h3>Posities {draw.block * 32 + 1}–{Math.min((draw.block + 1) * 32, data.slots.length)}</h3></div><button className="draw-clear" onClick={draw.clearDraw} disabled={draw.assignedCount === 0 && draw.byeCount === 0}>Loting leegmaken</button></div><div className="draw-block-tabs">{Array.from({ length: draw.blocks }, (_, index) => <button key={index} className={draw.block === index ? "active" : ""} onClick={() => draw.setBlock(index)}>{index * 32 + 1}–{Math.min((index + 1) * 32, data.slots.length)}</button>)}</div><div className="draw-match-grid">{matches.map(({ one, two }) => <article className="draw-match-card" key={one.position}><header><span>Wedstrijd {Math.floor((one.position - 1) / 2) + 1}</span><small>Ronde 1</small></header><DrawSlotButton slot={one} open={() => draw.openSlot(one.position)} /><div className="draw-versus">VS</div>{two && <DrawSlotButton slot={two} open={() => draw.openSlot(two.position)} />}</article>)}</div></section>
    </div>
    {draw.activeSlot && <DrawSlotModal slot={draw.activeSlot} players={data.players} assignedIds={draw.assignedIds} search={draw.pickerSearch} setSearch={draw.setPickerSearch} selectPlayer={player => draw.updateSlot(draw.activeSlot!.position, { player })} selectBye={() => draw.updateSlot(draw.activeSlot!.position, { isBye: true })} clear={() => draw.updateSlot(draw.activeSlot!.position, {})} close={draw.closePicker} />}
  </div>;
}

function DrawSlotButton({ slot, open }: { slot: { position: number; player_id: number | null; is_bye: boolean; player: { name: string; email: string; sponsor_name: string | null } | null }; open: () => void }) {
  return <button className={`draw-slot ${slot.player_id ? "filled" : slot.is_bye ? "bye" : "empty"}`} onClick={open}><span className="draw-position">{slot.position}</span>{slot.player ? <div><strong>{slot.player.name}</strong><small>{slot.player.sponsor_name ?? slot.player.email}</small></div> : slot.is_bye ? <div><strong>BYE</strong><small>Vrijstelling</small></div> : <div><strong>Lege positie</strong><small>Kies speler of bye</small></div>}<b>›</b></button>;
}
