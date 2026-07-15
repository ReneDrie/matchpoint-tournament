"use client";

import { useModalDismiss } from "../Modal/Modal.hooks";
import type { TournamentMatch } from "../shared/types";

export function MatchWinnerModal({ match, winnerId, busy, close, confirm }: { match: TournamentMatch; winnerId: number; busy: boolean; close: () => void; confirm: () => void }) {
  useModalDismiss(close);
  const winnerName = winnerId === match.player_one_id ? match.player_one_name : match.player_two_name;
  const correcting = match.winner_id !== null && match.winner_id !== winnerId;
  return <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}><div className="modal-card match-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="winner-confirm-title"><div className="modal-header"><div><p>{correcting ? "UITSLAG CORRIGEREN" : "WINNAAR BEVESTIGEN"}</p><h2 id="winner-confirm-title">{winnerName} wint de wedstrijd?</h2></div><button type="button" className="modal-close" onClick={close} aria-label="Sluiten">×</button></div><div className="winner-confirm-player"><span>✓</span><div><strong>{winnerName}</strong><small>Wedstrijd {match.bracket_position} · ronde {match.round_number}</small></div></div>{correcting && <p className="winner-warning">De bestaande uitslag wordt gecorrigeerd. Eventuele uitslagen in vervolgrondes die hiervan afhangen worden veilig gewist.</p>}<div className="modal-actions"><button type="button" className="secondary" onClick={close}>Annuleren</button><button type="button" className="primary" onClick={confirm} disabled={busy}>{busy ? "Opslaan…" : correcting ? "Uitslag corrigeren" : "Winnaar bevestigen"}</button></div></div></div>;
}
