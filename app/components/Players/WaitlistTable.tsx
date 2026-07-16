import type { WaitlistEntry } from "../shared/types";

const labels = {
  waiting: "Wachtend",
  invited: "Uitgenodigd",
  registered: "Ingeschreven",
  expired: "Verlopen",
  removed: "Verwijderd",
};

export function WaitlistTable({
  entries,
  loading,
  invite,
  remove,
}: {
  entries: WaitlistEntry[];
  loading: boolean;
  invite: (entry: WaitlistEntry) => void;
  remove: (entry: WaitlistEntry) => void;
}) {
  if (loading) return <div className="empty-state">Wachtlijst laden…</div>;
  const visible = entries.filter((entry) => entry.status !== "removed");
  if (visible.length === 0)
    return (
      <div className="empty-state">
        <strong>De wachtlijst is leeg</strong>
        <span>Nieuwe aanmeldingen verschijnen hier zodra het toernooi vol is.</span>
      </div>
    );
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Positie</th>
            <th>Geïnteresseerde</th>
            <th>Status</th>
            <th>Uitnodiging</th>
            <th>Acties</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((entry) => (
            <tr key={entry.id}>
              <td>
                <strong>#{entry.position}</strong>
              </td>
              <td>
                <div className="person">
                  <span>
                    {entry.name
                      .split(" ")
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <div>
                    <strong>{entry.name}</strong>
                    <small>{entry.email}</small>
                  </div>
                </div>
              </td>
              <td>
                <span className={`status ${entry.status === "registered" ? "paid" : "pending"}`}>
                  {labels[entry.status]}
                </span>
              </td>
              <td>
                {entry.invitation_expires_at ? (
                  <small>
                    Geldig tot{" "}
                    {new Date(entry.invitation_expires_at.replace(" ", "T")).toLocaleString("nl-NL", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </small>
                ) : (
                  "–"
                )}
              </td>
              <td>
                <div className="row-actions">
                  {(entry.status === "waiting" || entry.status === "expired" || entry.status === "invited") && (
                    <button className="primary compact-action" onClick={() => invite(entry)}>
                      {entry.status === "invited" ? "Opnieuw sturen" : "Uitnodigen"}
                    </button>
                  )}
                  {entry.status !== "registered" && (
                    <button className="secondary compact-action" onClick={() => remove(entry)}>
                      Verwijderen
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
