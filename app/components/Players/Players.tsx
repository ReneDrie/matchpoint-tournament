"use client";

import type { Player, Sponsor, StaffUser } from "../shared/types";
import { ManualPlayerModal } from "./ManualPlayerModal";
import { PlayerTable } from "./PlayerTable";
import { usePlayers } from "./Players.hooks";

export function Players({ user, rows, sponsors, loading, reload }: { user: StaffUser; rows: Player[]; sponsors: Sponsor[]; loading: boolean; reload: () => Promise<void> }) {
  const controller = usePlayers({ user, rows, reload });
  return <><section className="panel full"><div className="toolbar"><div className="search">⌕ <input value={controller.search} onChange={event => controller.setSearch(event.target.value)} placeholder="Zoek op naam, e-mail of bondsnummer" /></div><select value={controller.status} onChange={event => controller.setStatus(event.target.value)}><option value="all">Alle betaalstatussen</option><option value="confirmed">Betaald</option><option value="payment_pending">Betaling open</option><option value="cancelled">Geannuleerd</option><option value="refunded">Terugbetaald</option></select>{user.role === "administrator" && <button className="secondary" onClick={controller.exportCsv}>⇩ Exporteer CSV</button>}</div><div className="table-heading"><div><p>{rows.length} VAN 256 PLEKKEN</p><h2>Alle deelnemers</h2></div>{user.role === "administrator" && <button className="primary" onClick={() => controller.setManualOpen(true)}>＋ Handmatig toevoegen</button>}</div>{controller.error && <p className="inline-error">{controller.error}</p>}{loading ? <div className="empty-state">Deelnemers laden…</div> : <PlayerTable rows={controller.filtered} onCheckIn={controller.checkIn} onEdit={user.role === "administrator" ? controller.edit : undefined} />}<div className="pagination"><span>{controller.filtered.length} deelnemers zichtbaar</span></div></section>{controller.manualOpen && <ManualPlayerModal user={user} sponsors={sponsors} close={() => controller.setManualOpen(false)} saved={reload} />}{controller.editingPlayer && <ManualPlayerModal user={user} sponsors={sponsors} player={controller.editingPlayer} close={() => controller.setEditingPlayer(null)} saved={reload} />}</>;
}
