"use client";

import { SlideCanvas } from "../Presentation/SlideCanvas";
import { useLivePresentation } from "./LivePresentation.hooks";

export function LivePresentation() {
  const presentation = useLivePresentation();
  if (presentation.loading && !presentation.data) return <main className="live-presentation loading"><div><strong>Matchpoint Tournament</strong><span>Live presentatie laden…</span></div></main>;
  return <main className="live-presentation" onClick={presentation.next}>
    <SlideCanvas slide={presentation.current} live={presentation.data} />
    <div className="live-controls"><button className="fullscreen-trigger" onClick={event => { event.stopPropagation(); void document.documentElement.requestFullscreen?.(); }}>⛶ Volledig scherm</button></div>
  </main>;
}
