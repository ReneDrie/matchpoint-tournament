"use client";

import { useEffect, useRef } from "react";

const openModals: symbol[] = [];

export function useModalDismiss(close: () => void) {
  const closeRef = useRef(close);

  useEffect(() => {
    closeRef.current = close;
  }, [close]);

  useEffect(() => {
    const modalId = Symbol("modal");
    openModals.push(modalId);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || openModals.at(-1) !== modalId) return;
      event.preventDefault();
      closeRef.current();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      const index = openModals.indexOf(modalId);
      if (index >= 0) openModals.splice(index, 1);
    };
  }, []);
}
