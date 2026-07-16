/* The supplied SVG stays unoptimized so it can also work in the static TransIP build. */
/* eslint-disable @next/next/no-img-element */
export function Brand() {
  return (
    <div className="brand">
      <img src="/mpt-logo.svg" alt="Matchpoint Tournament" />
    </div>
  );
}
