// The SkinScout mark: an open facial-contour crescent (deep berry) cradling
// a serum droplet (dusty rose) — abstract enough to read at 24px, distinct
// from a medical cross, a lotus/spa glyph, or any clinical iconography.
// Colors are the fixed brand palette, not the shifting `--forest`/
// `--burgundy` theme tokens, so the mark stays stable across future re-themes.
export default function SkinScoutLogo({ size = 34, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="SkinScout"
    >
      <path
        d="M14 8 C26 8, 30 14, 30 20 C30 26, 26 32, 14 32"
        stroke="#5A1F35"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M17 12 C20 17, 22.5 20.5, 22.5 24 C22.5 27.6, 20.1 30, 17 30 C13.9 30, 11.5 27.6, 11.5 24 C11.5 20.5, 14 17, 17 12 Z"
        fill="#C96A84"
      />
    </svg>
  );
}
