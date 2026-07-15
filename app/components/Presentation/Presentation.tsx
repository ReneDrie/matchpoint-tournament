"use client";

import { routeHref } from "../shared/routing";
import type { Sponsor, StaffUser } from "../shared/types";
import { SlideCanvas } from "./SlideCanvas";
import { SlideEditorModal } from "./SlideEditorModal";
import { usePresentation } from "./Presentation.hooks";

const labels = { custom: "Eigen tekst", image: "Fullscreen afbeelding", sponsor: "Sponsor", upcoming_matches: "Komende wedstrijden", round_announcement: "Start ronde", featured_round: "Uitgelichte ronde" };

export function Presentation({ tournamentId, user, sponsors, defaultDuration }: { tournamentId: number; user: StaffUser; sponsors: Sponsor[]; defaultDuration: number }) {
  const controller = usePresentation(tournamentId, user);
  if (controller.loading) return <section className="panel full"><div className="empty-state">Presentatie laden…</div></section>;
  const selected = controller.editing !== "new" ? controller.editing : null;
  const previewSlide = controller.slides.find(slide => slide.is_active) ?? controller.slides[0];
  return <>
    <section className="presentation-admin">
      <section className="presentation-control panel">
        <div><p>PRESENTATIEMODUS</p><h2>Live scherm</h2><span>Beheer de afspeellijst en open het openbare scherm op een televisie of beamer.</span></div>
        <div className="presentation-actions"><a className="secondary" href={routeHref("/presentatie")} target="_blank" rel="noreferrer">↗ Open live scherm</a><div className="live-pill">LIVE FEED</div></div>
      </section>
      {controller.error && <p className="inline-error">{controller.error}</p>}
      <div className="presentation-workspace">
        <div className="screen-preview live-preview">{previewSlide ? <SlideCanvas slide={previewSlide} live={controller.live} preview /> : <div className="preview-empty"><strong>Nog geen slides</strong><span>Voeg rechts de eerste slide toe.</span></div>}</div>
        <section className="slide-list panel">
          <div className="panel-title"><div><p>AFSPEELLIJST</p><h2>Slides en timing</h2></div><button className="primary" onClick={() => controller.setEditing("new")}>＋ Slide</button></div>
          {controller.slides.length === 0 ? <div className="empty-state"><strong>Afspeellijst is leeg</strong><span>Standaardduur: {defaultDuration} seconden.</span></div> : <div className="admin-slide-list">{controller.slides.map((slide, index) => <article className={slide.is_active ? "" : "inactive"} key={slide.id}>
            <div className="slide-order"><button disabled={index === 0} onClick={() => controller.move(index, -1)}>↑</button><button disabled={index === controller.slides.length - 1} onClick={() => controller.move(index, 1)}>↓</button></div>
            <button className="slide-main" onClick={() => controller.setEditing(slide)}><span>{slide.type === "image" ? "▣" : slide.type === "sponsor" ? "✦" : "◫"}</span><div><strong>{slide.title || slide.sponsor_name || labels[slide.type]}</strong><small>{labels[slide.type]} · {slide.duration_seconds} sec</small></div></button>
            <button className={`slide-toggle ${slide.is_active ? "active" : ""}`} onClick={() => controller.toggle(slide)} aria-label={slide.is_active ? "Slide uitschakelen" : "Slide inschakelen"}><i /></button>
            <button className="slide-delete" onClick={() => controller.remove(slide)} aria-label="Slide verwijderen">×</button>
          </article>)}</div>}
        </section>
      </div>
    </section>
    {controller.editing && <SlideEditorModal slide={selected ?? undefined} sponsors={sponsors} defaultDuration={defaultDuration} busy={controller.busy} close={() => controller.setEditing(null)} save={controller.save} upload={controller.upload} />}
  </>;
}
