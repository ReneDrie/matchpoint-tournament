"use client";

import { useState } from "react";
import { useModalDismiss } from "../Modal/Modal.hooks";
import type { PresentationSlide, Sponsor } from "../shared/types";

export function SlideEditorModal({
  slide,
  sponsors,
  defaultDuration,
  busy,
  close,
  save,
  upload,
}: {
  slide?: PresentationSlide;
  sponsors: Sponsor[];
  defaultDuration: number;
  busy: boolean;
  close: () => void;
  save: (payload: Record<string, unknown>) => void;
  upload: (file: File, title: string, duration: number) => void;
}) {
  useModalDismiss(close);
  const [type, setType] = useState<PresentationSlide["type"]>(slide?.type ?? "custom");
  const [title, setTitle] = useState(slide?.title ?? "");
  const [subtitle, setSubtitle] = useState(slide?.content_json?.subtitle ?? "");
  const [body, setBody] = useState(slide?.content_json?.body ?? "");
  const [round, setRound] = useState(slide?.content_json?.round_number ?? 1);
  const [sponsorId, setSponsorId] = useState(String(slide?.sponsor_id ?? sponsors[0]?.id ?? ""));
  const [duration, setDuration] = useState(slide?.duration_seconds ?? defaultDuration);
  const [active, setActive] = useState(slide?.is_active ?? true);
  const [file, setFile] = useState<File | null>(null);
  const image = type === "image";
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <form
        className="modal-card slide-editor-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="slide-editor-title"
        onSubmit={(event) => {
          event.preventDefault();
          if (image && file) upload(file, title, duration);
          else
            save({
              type,
              title,
              subtitle,
              body,
              round_number: round,
              sponsor_id: Number(sponsorId),
              duration_seconds: duration,
              is_active: active,
            });
        }}
      >
        <div className="modal-header">
          <div>
            <p>AFSPEELLIJST</p>
            <h2 id="slide-editor-title">{slide ? "Slide wijzigen" : "Slide toevoegen"}</h2>
          </div>
          <button type="button" className="modal-close" onClick={close} aria-label="Sluiten">
            ×
          </button>
        </div>
        <div className="modal-grid">
          <label>
            Type
            <select
              disabled={Boolean(slide)}
              value={type}
              onChange={(event) => setType(event.target.value as PresentationSlide["type"])}
            >
              <option value="custom">Eigen tekst</option>
              <option value="image">Fullscreen afbeelding</option>
              <option value="sponsor">Sponsor uitlichten</option>
              <option value="upcoming_matches">Komende wedstrijden</option>
              <option value="round_announcement">Start ronde</option>
              <option value="featured_round">Uitgelichte ronde</option>
            </select>
          </label>
          <label>
            Duur
            <input
              type="number"
              min="3"
              max="300"
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
            />
            <small>seconden</small>
          </label>
          {image ? (
            <>
              <label className="modal-wide">
                Titel (intern)
                <input value={title} onChange={(event) => setTitle(event.target.value)} />
              </label>
              <label className="modal-wide slide-file">
                Afbeelding
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required={!slide}
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
                <small>JPG, PNG of WebP · maximaal 10 MB · volledig zichtbaar met contain</small>
              </label>
            </>
          ) : type === "sponsor" ? (
            <label className="modal-wide">
              Sponsor
              <select required value={sponsorId} onChange={(event) => setSponsorId(event.target.value)}>
                {sponsors
                  .filter((sponsor) => Boolean(sponsor.is_active))
                  .map((sponsor) => (
                    <option key={sponsor.id} value={sponsor.id}>
                      {sponsor.name} · {sponsor.tier_name}
                    </option>
                  ))}
              </select>
            </label>
          ) : type === "custom" ? (
            <>
              <label className="modal-wide">
                Titel
                <input autoFocus required value={title} onChange={(event) => setTitle(event.target.value)} />
              </label>
              <label className="modal-wide">
                Boventitel
                <input
                  value={subtitle}
                  onChange={(event) => setSubtitle(event.target.value)}
                  placeholder="Bijvoorbeeld Welkom"
                />
              </label>
              <label className="modal-wide">
                Tekst
                <textarea value={body} onChange={(event) => setBody(event.target.value)} />
              </label>
            </>
          ) : type === "round_announcement" ? (
            <>
              <label>
                Rondenummer
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={round}
                  onChange={(event) => setRound(Number(event.target.value))}
                />
              </label>
              <label>
                Titel (optioneel)
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={`Start ronde ${round}`}
                />
              </label>
            </>
          ) : (
            <label className="modal-wide">
              Titel (optioneel)
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
          )}{" "}
          {!image && (
            <label className="modal-wide slide-active">
              <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /> Slide is
              actief in de openbare presentatie
            </label>
          )}
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={close}>
            Annuleren
          </button>
          <button
            className="primary"
            disabled={busy || (image && !file && !slide) || (type === "sponsor" && !sponsorId)}
          >
            {busy ? "Opslaan…" : image ? "Afbeelding uploaden" : "Slide opslaan"}
          </button>
        </div>
      </form>
    </div>
  );
}
