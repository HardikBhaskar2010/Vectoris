type BrandMarkProps = {
  size?: "sm" | "md";
  /** Override wordmark visibility for icon-only contexts */
  iconOnly?: boolean;
};

export function BrandMark({ size = "md", iconOnly = false }: BrandMarkProps) {
  const dim = size === "sm" ? 28 : 36;

  return (
    <a className={`brand-mark brand-mark--${size}`} href="/" aria-label="Vectoris home">
      {/* Inline SVG — scales perfectly at any resolution, no network request */}
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
        role="img"
        style={{ flexShrink: 0 }}
      >
        {/* Squircle badge */}
        <rect width="40" height="40" rx="10" fill="#55100D" />
        {/* V mark — Racing Red, two strokes converging to apex */}
        <path
          d="M9 10 L20 30 L31 10"
          stroke="#DD0200"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Precision node dot at apex */}
        <circle cx="20" cy="30" r="2.5" fill="#FFFFFF" />
      </svg>

      {!iconOnly && <span>Vectoris</span>}
    </a>
  );
}
