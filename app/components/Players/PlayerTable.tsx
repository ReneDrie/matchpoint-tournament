import type { Player } from "../shared/types";

export function PlayerTable({
  rows,
  onCheckIn,
  onEdit,
  compact = false,
}: {
  rows: Player[];
  onCheckIn?: (player: Player) => void;
  onEdit?: (player: Player) => void;
  compact?: boolean;
}) {
  const visibleRows = compact ? rows.slice(0, 4) : rows;
  if (visibleRows.length === 0)
    return (
      <div className="empty-state">
        <strong>Nog geen deelnemers</strong>
        <span>Betaalde inschrijvingen verschijnen hier automatisch.</span>
      </div>
    );
  const statusLabel = (status: string) =>
    ({
      confirmed: "Betaald",
      payment_pending: "Betaling open",
      cancelled: "Geannuleerd",
      refunded: "Terugbetaald",
      waitlisted: "Wachtlijst",
    })[status] ?? status;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Deelnemer</th>
            <th>KNLTB / speelsterkte</th>
            <th>Betaalstatus</th>
            <th>Opkomstnummer</th>
            <th>Acties</th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((player) => (
            <tr key={player.id}>
              <td>
                <div className="person">
                  <span>
                    {player.player_number ??
                      player.name
                        .split(" ")
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join("")}
                  </span>
                  <div>
                    <strong>{player.name}</strong>
                    <small>
                      {player.email} · {player.phone}
                      {player.sponsor_name ? ` · Sponsor: ${player.sponsor_name}` : ""}
                    </small>
                  </div>
                </div>
              </td>
              <td>{player.knltb_number || `Enkel ${player.singles_rating} / dubbel ${player.doubles_rating}`}</td>
              <td>
                <span className={`status ${player.registration_status === "confirmed" ? "paid" : "pending"}`}>
                  {statusLabel(player.registration_status)}
                </span>
              </td>
              <td>
                {player.entrance_song_url ? (
                  <a className="song" href={player.entrance_song_url} target="_blank" rel="noreferrer">
                    ♫ {player.entrance_song_query}
                  </a>
                ) : (
                  <span>{player.entrance_song_query}</span>
                )}
              </td>
              <td>
                <div className="row-actions">
                  {onCheckIn && (
                    <button
                      className={player.checked_in_at ? "secondary checkin active" : "secondary checkin"}
                      onClick={() => onCheckIn(player)}
                    >
                      {player.checked_in_at ? "✓ Ingecheckt" : "Inchecken"}
                    </button>
                  )}
                  {onEdit && (
                    <button className="secondary checkin" onClick={() => onEdit(player)}>
                      Wijzigen
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
