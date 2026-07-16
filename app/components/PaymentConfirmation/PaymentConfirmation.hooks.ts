"use client";

import { useEffect, useState } from "react";
import { API_URL } from "../shared/config";

type PaymentResult = {
  status: string;
  registration_status: string;
  player_name: string;
  tournament_name: string;
  amount: string;
};

export function usePaymentConfirmation(token: string) {
  const [payment, setPayment] = useState<PaymentResult | null>(null);
  const [error, setError] = useState(token ? "" : "De betaallink ontbreekt.");
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      const response = await fetch(`${API_URL}/api/payments/status?token=${encodeURIComponent(token)}`);
      const result = await response.json();
      if (!active) return;
      if (!response.ok) return setError(result.error ?? "De betaalstatus kon niet worden opgehaald.");
      setPayment(result.payment);
      if (["open", "pending"].includes(result.payment.status)) timer = setTimeout(load, 3000);
    };
    if (token) void load();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [token]);
  return { payment, error };
}
