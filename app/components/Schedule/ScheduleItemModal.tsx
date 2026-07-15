"use client";

import { useState } from "react";
import { useModalDismiss } from "../Modal/Modal.hooks";
import type { Court, ScheduleItem } from "../shared/types";
import { toInputDate } from "./Schedule.hooks";

export function ScheduleItemModal({ item, courts, defaultStart, busy, close, save, remove }: { item?: ScheduleItem; courts: Court[]; defaultStart: string; busy: boolean; close: () => void; save: (payload: Record<string, unknown>) => void; remove?: () => void }) {
  useModalDismiss(close);
  const [title, setTitle] = useState(item?.title ?? "");
  const [type, setType] = useState(item?.item_type ?? "custom");
  const [startsAt, setStartsAt] = useState(toInputDate(item?.starts_at ?? defaultStart));
  const [duration, setDuration] = useState(item?.duration_minutes ?? 5);
  const [wide, setWide] = useState(item?.is_tournament_wide ?? true);
  const [courtId, setCourtId] = useState(String(item?.court_id ?? courts.find(court => Boolean(court.is_active))?.id ?? ""));
  return <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}><form className="modal-card" role="dialog" aria-modal="true" aria-labelledby="item-title" onSubmit={event => { event.preventDefault(); save({ title, item_type: type, starts_at: startsAt, duration_minutes: duration, is_tournament_wide: wide, court_id: wide ? null : Number(courtId) }); }}><div className="modal-header"><div><p>PROGRAMMAONDERDEEL</p><h2 id="item-title">{item ? "Onderdeel wijzigen" : "Onderdeel toevoegen"}</h2></div><button type="button" className="modal-close" onClick={close} aria-label="Sluiten">×</button></div><div className="modal-grid"><label className="modal-wide">Titel<input autoFocus required value={title} onChange={event => setTitle(event.target.value)} placeholder="Bijvoorbeeld prijsuitreiking" /></label><label>Type<select value={type} onChange={event => setType(event.target.value as ScheduleItem["item_type"])}><option value="custom">Overig</option><option value="break">Pauze</option><option value="ceremony">Ceremonie</option><option value="maintenance">Baanonderhoud</option></select></label><label>Starttijd<input type="datetime-local" required value={startsAt} onChange={event => setStartsAt(event.target.value)} /></label><label>Duur in minuten<input type="number" min="1" max="240" required value={duration} onChange={event => setDuration(Number(event.target.value))} /></label><label>Locatie<select value={wide ? "wide" : courtId} onChange={event => { setWide(event.target.value === "wide"); if (event.target.value !== "wide") setCourtId(event.target.value); }}><option value="wide">Toernooibreed</option>{courts.filter(court => Boolean(court.is_active)).map(court => <option key={court.id} value={court.id}>{court.name}</option>)}</select></label></div><div className="modal-actions">{remove && <button type="button" className="danger-action" onClick={remove}>Verwijderen</button>}<button type="button" className="secondary" onClick={close}>Annuleren</button><button className="primary" disabled={busy || !title}>{busy ? "Opslaan…" : "Opslaan"}</button></div></form></div>;
}
