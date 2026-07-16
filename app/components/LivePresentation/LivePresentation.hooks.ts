"use client";

import { useEffect, useState } from "react";
import { API_URL } from "../shared/config";
import type { LivePresentationData, PresentationSlide } from "../shared/types";

const fallbackSlide: PresentationSlide = {
  id: 0,
  type: "upcoming_matches",
  title: "Komende wedstrijden",
  content_json: null,
  image_path: null,
  image_url: null,
  sponsor_id: null,
  sponsor_name: null,
  sponsor_logo_path: null,
  duration_seconds: 10,
  sort_order: 0,
  is_active: true,
};

export function useLivePresentation() {
  const [data, setData] = useState<LivePresentationData | null>(null);
  const [index, setIndex] = useState(0);
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const slides = data?.slides.length ? data.slides : [fallbackSlide];
  const current = slides[index % slides.length];

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const response = await fetch(`${API_URL}/api/public/live`, { cache: "no-store" });
        if (!response.ok) throw new Error();
        const result = await response.json();
        if (active) {
          setData(result);
          setOffline(false);
        }
      } catch {
        if (active) setOffline(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    void refresh();
    const interval = window.setInterval(refresh, 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setIndex((value) => (value + 1) % slides.length),
      current.duration_seconds * 1000,
    );
    return () => window.clearTimeout(timer);
  }, [current.duration_seconds, slides.length]);

  useEffect(() => {
    function key(event: KeyboardEvent) {
      if (event.key === "ArrowRight" || event.key === " ") setIndex((value) => (value + 1) % slides.length);
      if (event.key === "ArrowLeft") setIndex((value) => (value - 1 + slides.length) % slides.length);
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [slides.length]);

  return {
    data,
    current,
    index: index % slides.length,
    count: slides.length,
    offline,
    loading,
    next: () => setIndex((value) => (value + 1) % slides.length),
  };
}
