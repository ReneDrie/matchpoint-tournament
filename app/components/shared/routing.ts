import type { View } from "./types";

export const viewRoutes: Record<View, string> = {
  overview: "/beheer",
  players: "/beheer/deelnemers",
  draw: "/beheer/loting",
  matches: "/beheer/wedstrijden",
  schedule: "/beheer/planning",
  sponsors: "/beheer/sponsors",
  communications: "/beheer/email",
  presentation: "/beheer/presentatie",
  settings: "/beheer/instellingen",
  registration: "/",
};

const frontendBasePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

export const routeHref = (path: string) => `${frontendBasePath}${path === "/" ? "" : path}` || "/";

export function viewFromPath(pathname: string): View {
  const withoutBase = frontendBasePath && pathname.startsWith(frontendBasePath)
    ? pathname.slice(frontendBasePath.length) || "/"
    : pathname;
  if (withoutBase === "/" || withoutBase === "/inschrijven") return "registration";
  return (Object.entries(viewRoutes).find(([, path]) => path === withoutBase)?.[0] as View | undefined) ?? "overview";
}
