"use client";

import type { Court, StaffUser } from "../shared/types";
import { useCourtEditor } from "./Settings.hooks";

export function CourtRow({ court, user, saved, onError }: { court: Court; user: StaffUser; saved: () => Promise<void>; onError: (message: string) => void }) {
  const editor = useCourtEditor({ court, user, saved, onError });
  return <div className={`court-setting-row ${editor.isActive ? "" : "inactive"}`}>
    <span className="court-order">{court.sort_order}</span>
    <label>Baannaam<input value={editor.name} onChange={event => editor.setName(event.target.value)} /></label>
    <label>Ondergrond (optioneel)<input value={editor.surface} onChange={event => editor.setSurface(event.target.value)} placeholder="Bijv. gravel" /></label>
    <label className="court-active"><input type="checkbox" checked={editor.isActive} onChange={event => editor.setIsActive(event.target.checked)} /> Actief</label>
    <div className="court-actions"><button className="secondary" type="button" onClick={editor.remove} disabled={editor.busy}>Verwijderen</button><button className="primary" type="button" onClick={editor.save} disabled={!editor.name.trim() || editor.busy}>{editor.busy ? "Opslaan…" : "Opslaan"}</button></div>
  </div>;
}
