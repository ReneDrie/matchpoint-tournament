"use client";

import type { Court, StaffUser } from "../shared/types";
import { useCourtEditor } from "./Settings.hooks";

export function CourtRow({
  court,
  user,
  saved,
  onError,
}: {
  court: Court;
  user: StaffUser;
  saved: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const editor = useCourtEditor({ court, user, saved, onError });
  return (
    <div
      className={`court-setting-row ${editor.isActive ? "" : "inactive"} ${editor.busy ? "saving" : editor.justSaved ? "saved" : ""}`}
      aria-busy={editor.busy}
    >
      <span className="court-order">{court.sort_order}</span>
      <label>
        Baannaam
        <input
          value={editor.name}
          onChange={(event) => editor.updateName(event.target.value)}
          onBlur={() => void editor.save()}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
      </label>
      <label>
        Ondergrond (optioneel)
        <input
          value={editor.surface}
          onChange={(event) => editor.updateSurface(event.target.value)}
          onBlur={() => void editor.save()}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          placeholder="Bijv. gravel"
        />
      </label>
      <label className="court-active">
        <input
          type="checkbox"
          checked={editor.isActive}
          onChange={(event) => {
            const value = event.target.checked;
            editor.updateIsActive(value);
            void editor.save({ isActive: value });
          }}
        />{" "}
        Actief
      </label>
      <div className="court-actions">
        <span className="sr-only" aria-live="polite">
          {editor.busy ? "Opslaan" : editor.justSaved ? "Automatisch opgeslagen" : ""}
        </span>
        <button className="secondary" type="button" onClick={editor.remove} disabled={editor.busy}>
          Verwijderen
        </button>
      </div>
    </div>
  );
}
