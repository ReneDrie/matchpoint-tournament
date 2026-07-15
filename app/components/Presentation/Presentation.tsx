import { Brand } from "../Brand/Brand";

export function Presentation() {
  return <section className="presentation-page"><div className="presentation-control panel"><div><p>PRESENTATIE MODUS</p><h2>Live scherm</h2><span>De openbare live-feed is voorbereid; slidebeheer wordt nog gekoppeld.</span></div><div className="live-pill">VOORBEREID</div></div><div className="screen-preview"><div className="screen-top"><Brand /><span>MATCHPOINT TOURNAMENT</span></div><div className="screen-content"><p>PRESENTATIE</p><h2>Nog geen slides</h2><i>Voeg straks sponsorbeelden en dynamische wedstrijdslides toe.</i></div></div><div className="slide-list panel"><div className="panel-title"><div><p>AFSPEELLIJST</p><h2>Slides en timing</h2></div><button className="primary disabled-action" disabled title="Slidebeheer wordt nog gebouwd">＋ Slide toevoegen</button></div><div className="empty-state"><strong>Afspeellijst is leeg</strong><span>Standaardduur: 10 seconden.</span></div></div></section>;
}
