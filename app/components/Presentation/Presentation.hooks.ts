"use client";

import { useEffect, useState } from "react";
import { API_URL } from "../shared/config";
import type { LivePresentationData, PresentationSlide, StaffUser } from "../shared/types";

export function usePresentation(tournamentId: number, user: StaffUser) {
  const [slides, setSlides] = useState<PresentationSlide[]>([]);
  const [live, setLive] = useState<LivePresentationData | null>(null);
  const [editing, setEditing] = useState<PresentationSlide | "new" | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`${API_URL}/api/admin/tournaments/${tournamentId}/slides`, { credentials: "include" }).then(
        async (response) => {
          const result = await response.json();
          if (!response.ok) throw new Error(result.error);
          return result.slides;
        },
      ),
      fetch(`${API_URL}/api/public/live`).then(async (response) => (response.ok ? await response.json() : null)),
    ])
      .then(([slideRows, liveData]) => {
        if (active) {
          setSlides(slideRows);
          setLive(liveData);
        }
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Presentatie kon niet worden geladen.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tournamentId]);

  async function jsonRequest(path: string, options: RequestInit) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}${path}`, {
        credentials: "include",
        ...options,
        headers: { "Content-Type": "application/json", "X-CSRF-Token": user.csrf_token, ...(options.headers ?? {}) },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Slide kon niet worden opgeslagen.");
      setSlides(result.slides);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Slide kon niet worden opgeslagen.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function save(payload: Record<string, unknown>) {
    const current = editing !== "new" ? editing : null;
    const success = await jsonRequest(
      current ? `/api/admin/slides/${current.id}` : `/api/admin/tournaments/${tournamentId}/slides`,
      { method: current ? "PATCH" : "POST", body: JSON.stringify(payload) },
    );
    if (success) setEditing(null);
  }

  async function upload(file: File, title: string, duration: number) {
    setBusy(true);
    setError("");
    const form = new FormData();
    form.append("image", file);
    form.append("title", title);
    form.append("duration_seconds", String(duration));
    try {
      const response = await fetch(`${API_URL}/api/admin/tournaments/${tournamentId}/slides/upload`, {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRF-Token": user.csrf_token },
        body: form,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Afbeelding kon niet worden geüpload.");
      setSlides(result.slides);
      setEditing(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Afbeelding kon niet worden geüpload.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(slide: PresentationSlide) {
    await jsonRequest(`/api/admin/slides/${slide.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: slide.title,
        subtitle: slide.content_json?.subtitle,
        body: slide.content_json?.body,
        round_number: slide.content_json?.round_number,
        sponsor_id: slide.sponsor_id,
        duration_seconds: slide.duration_seconds,
        is_active: !slide.is_active,
      }),
    });
  }

  async function remove(slide: PresentationSlide) {
    if (!window.confirm(`Slide “${slide.title ?? "zonder titel"}” verwijderen?`)) return;
    await jsonRequest(`/api/admin/slides/${slide.id}`, { method: "DELETE" });
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= slides.length) return;
    const next = [...slides];
    [next[index], next[target]] = [next[target], next[index]];
    setSlides(next);
    await jsonRequest(`/api/admin/tournaments/${tournamentId}/slides/reorder`, {
      method: "POST",
      body: JSON.stringify({ slide_ids: next.map((slide) => slide.id) }),
    });
  }

  return { slides, live, editing, setEditing, loading, busy, error, save, upload, toggle, remove, move };
}
