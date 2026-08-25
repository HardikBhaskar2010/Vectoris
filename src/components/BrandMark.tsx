import { Link } from "../router";

type BrandMarkProps = {
  size?: "sm" | "md" | "lg";
  /** Override wordmark visibility for icon-only contexts */
  iconOnly?: boolean;
};

/**
 * BrandMark — Vectoris Official Brand Mark.
 *
 * Design: Concept 3 Nested Chevron V
 * - Bold outer geometric chevron in Racing Red gradient (#FF3B30 → #DD0200)
 * - Nested inner precision chevron core in deep garnet (#E00300 → #8A0100)
 * - Deep rosewood squircle container (#2A0806 → #120302) with illuminated rim
 * - 100% scalable SVG vector geometry optimized for both Dark and Light themes
 */
export function BrandMark({ size = "md", iconOnly = false }: BrandMarkProps) {
  const dim = size === "sm" ? 28 : size === "lg" ? 44 : 36;

  return (
    <Link className={`brand-mark brand-mark--${size}`} to="/dashboard" aria-label="Vectoris dashboard">
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        role="img"
        className="brand-mark__icon"
        style={{ flexShrink: 0 }}
      >
        <defs>
          {/* Badge Background Gradient */}
          <linearGradient id="v-badge-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2E0A08" />
            <stop offset="50%" stopColor="#1C0504" />
            <stop offset="100%" stopColor="#0F0202" />
          </linearGradient>

          {/* Badge Outer Rim Border Gradient */}
          <linearGradient id="v-badge-border" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF4D42" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#8A100B" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#DD0200" stopOpacity="0.55" />
          </linearGradient>

          {/* Outer Chevron Red Gradient */}
          <linearGradient id="v-outer-v" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FF4136" />
            <stop offset="50%" stopColor="#EE0300" />
            <stop offset="100%" stopColor="#C40200" />
          </linearGradient>

          {/* Inner Nested Chevron Gradient */}
          <linearGradient id="v-inner-v" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FF5C52" />
            <stop offset="100%" stopColor="#9E0200" />
          </linearGradient>

          {/* Subtle Outer Drop Glow */}
          <filter id="v-chevron-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#DD0200" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Squircle Badge Container */}
        <rect
          x="1"
          y="1"
          width="38"
          height="38"
          rx="10"
          fill="url(#v-badge-bg)"
          stroke="url(#v-badge-border)"
          strokeWidth="1.2"
        />

        {/* ── Concept 3: Clean Nested Chevron V ────────────────── */}
        <g id="vectoris-nested-chevron" filter="url(#v-chevron-glow)">
          {/* Outer Bold Chevron */}
          <path
            d="M6 9.5 L20 33 L34 9.5 L27.5 13.5 L20 23.5 L12.5 13.5 Z"
            fill="url(#v-outer-v)"
          />

          {/* Inner Nested Chevron */}
          <path
            d="M15 15.5 L20 22 L25 15.5 L20 18.5 Z"
            fill="url(#v-inner-v)"
          />

          {/* Top Wing Facet Hairlines */}
          <path
            d="M6 9.5 L12.5 13.5 M34 9.5 L27.5 13.5"
            stroke="rgba(255, 255, 255, 0.4)"
            strokeWidth="0.75"
            strokeLinecap="round"
          />
        </g>
      </svg>

      {!iconOnly && <span className="brand-mark__text">Vectoris</span>}
    </Link>
  );
}
