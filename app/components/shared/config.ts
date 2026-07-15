export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
export const SHOW_ADMIN_SHORTCUT = process.env.NEXT_PUBLIC_SHOW_ADMIN_SHORTCUT === "true" || (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_SHOW_ADMIN_SHORTCUT !== "false");
