/* eslint-disable @next/next/no-img-element */
import { Brand } from "../Brand/Brand";
import { roundLabel } from "../Matches/Matches.hooks";
import type { LiveMatch, LivePresentationData, PresentationSlide } from "../shared/types";

function MatchRows({ matches }: { matches: LiveMatch[] }) {
  return <div className="live-match-list">{matches.map((match, index) => { const announce = index === 0 || matches[index - 1].round_number !== match.round_number; return <div key={match.id}>{announce && <p>START RONDE {match.round_number}</p>}<article><span><strong>{match.scheduled_at?.slice(11, 16) ?? "--:--"}</strong><small>{match.court ?? "Baan volgt"}</small></span><div><b>{match.player_one ?? "Nog niet bekend"}</b><i>tegen</i><b>{match.player_two ?? "Nog niet bekend"}</b></div></article></div>; })}</div>;
}

export function SlideCanvas({ slide, live, preview = false }: { slide: PresentationSlide; live: LivePresentationData | null; preview?: boolean }) {
  const type = slide.type;
  const featured = live?.featured_round;
  return <div className={`slide-canvas slide-${type} ${preview ? "preview" : ""}`}>
    {type === "image" && slide.image_url ? <img src={slide.image_url} alt={slide.title ?? "Presentatieafbeelding"} /> : <>
      <header><Brand /></header>
      <main>
        {type === "custom" && <div className="slide-message"><p>{slide.content_json?.subtitle ?? "MATCHPOINT TOURNAMENT"}</p><h1>{slide.title}</h1>{slide.content_json?.body && <span>{slide.content_json.body}</span>}</div>}
        {type === "sponsor" && <div className="slide-sponsor-content"><p>MEDE MOGELIJK GEMAAKT DOOR</p>{slide.sponsor_logo_url ? <img src={slide.sponsor_logo_url} alt={slide.sponsor_name ?? "Sponsor"} /> : <strong>{slide.sponsor_name ?? "Sponsor"}</strong>}<span>Bedankt voor jullie support</span></div>}
        {type === "upcoming_matches" && <div className="slide-matches"><p>KOMENDE WEDSTRIJDEN</p><h1>Wie speelt er zo?</h1><MatchRows matches={live?.upcoming_matches ?? []} /></div>}
        {type === "round_announcement" && <div className="slide-round"><p>HET TOERNOOI GAAT DOOR</p><span>RONDE</span><strong>{slide.content_json?.round_number ?? "–"}</strong><h1>{slide.title || `Start ronde ${slide.content_json?.round_number ?? ""}`}</h1></div>}
        {type === "featured_round" && <div className="slide-matches featured"><p>{featured ? roundLabel(featured.round_number, featured.round_count).toUpperCase() : "UITGELICHTE RONDE"}</p><h1>{slide.title || (featured ? roundLabel(featured.round_number, featured.round_count) : "Binnenkort bekend")}</h1><MatchRows matches={featured?.matches ?? []} /></div>}
      </main>
    </>}
  </div>;
}
