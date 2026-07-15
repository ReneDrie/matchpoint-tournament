"use client";

import { SlideCanvas } from "../Presentation/SlideCanvas";
import { useLivePresentation } from "./LivePresentation.hooks";

export function LivePresentation() {
  const presentation = useLivePresentation();
  if (presentation.loading && !presentation.data) return <main className="live-presentation loading"><div><strong>Matchpoint Tournament</strong><span>Live presentatie laden…</span></div></main>;
  return <main className="live-presentation" onClick={presentation.next}>
    <SlideCanvas slide={presentation.current} live={presentation.data} />
    <div className="live-controls"><button onClick={event => { event.stopPropagation(); void document.documentElement.requestFullscreen?.(); }}>⛶ Volledig scherm</button><span>{presentation.index + 1} / {presentation.count}</span></div>
    <div className={`live-connection ${presentation.offline ? "offline" : ""}`}><i />{presentation.offline ? "Verbinding verbroken · laatste gegevens zichtbaar" : `Live bijgewerkt · ${presentation.data?.refreshed_at ? new Date(presentation.data.refreshed_at).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "–"}`}</div>
  </main>;
}
