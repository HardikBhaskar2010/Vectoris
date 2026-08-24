/**
 * BlueprintViewport — Demo SVG preview panel.
 *
 * CONTRACT (strictly enforced):
 * This component renders a STATIC VISUAL DEMO of what a parsed drawing
 * might look like. It is NOT connected to any real project drawing data.
 * It is NOT a second instance of the Drawing Viewer.
 *
 * Per DASHBOARD.md §30: "The live blueprint viewport on Dashboard is a
 * navigation shortcut to the active project's Takeoff Workspace — it is
 * not a second instance of the Drawing Viewer. It functions as a 'pinned
 * active project' preview."
 *
 * The component makes this obvious through:
 * - A "DEMO PREVIEW" label visible in the UI
 * - aria-label that says "Visual preview — open workspace for live drawing"
 * - No props accepting real project data (those will come when backend exists)
 *
 * When real data is available, replace this component with a thumbnail
 * rendered from the Drawing Viewer — do NOT retrofit this SVG.
 */

import { useEffect, useRef } from "react";

export function BlueprintViewport() {
  const pulseRef = useRef<SVGPolylineElement>(null);

  // Pulse glow animation on the active cable tray — CSS handles it,
  // but we pause it when prefers-reduced-motion is set.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const el = pulseRef.current;
    if (!el) return;
    const apply = (reduced: boolean) => {
      el.style.animationPlayState = reduced ? "paused" : "running";
    };
    apply(mq.matches);
    const handler = (e: MediaQueryListEvent) => apply(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <div
      className="blueprint-vp"
      aria-label="Visual preview of active project drawing — open workspace for live drawing"
    >
      {/* Viewport header */}
      <div className="blueprint-vp__header">
        <div className="blueprint-vp__header-left">
          <span className="blueprint-vp__live-dot" aria-hidden="true" />
          <div>
            <div className="blueprint-vp__sheet-title">
              ABC Data Center — E-104 Cable Tray &amp; Feeder Layout
              <span className="blueprint-vp__sheet-badge">Active Sheet</span>
            </div>
            <div className="blueprint-vp__sheet-meta">
              Scale: 1:100 Metric&ensp;|&ensp;Layer: ELEC-TRAY-FEEDER&ensp;|&ensp;142 Components Detected
            </div>
          </div>
        </div>
        <a href="/workspace" className="blueprint-vp__cta">
          Open in Drawing Workspace
          <IconArrowOut aria-hidden="true" />
        </a>
      </div>

      {/* SVG Demo Canvas */}
      <div className="blueprint-vp__canvas" aria-hidden="true" role="img" aria-label="Demo CAD drawing preview">
        {/* DEMO label — always visible, cannot be mistaken for real data */}
        <span className="blueprint-vp__demo-label">VISUAL PREVIEW</span>

        <svg
          viewBox="0 0 800 340"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="blueprint-vp__svg"
        >
          {/* Structural wireframe — muted base geometry */}
          <g opacity="0.25" stroke="#6b7280" strokeWidth="0.8">
            <polygon points="80,240 360,330 720,190 440,80" />
            <line x1="80" y1="240" x2="80" y2="120" />
            <line x1="440" y1="80" x2="440" y2="10" />
            <line x1="720" y1="190" x2="720" y2="70" />
            <line x1="200" y1="200" x2="200" y2="120" />
            <line x1="560" y1="160" x2="560" y2="80" />
          </g>

          {/* Cable Tray Polyline — active measurement run, pulse-glow */}
          <polyline
            ref={pulseRef}
            points="200,220 340,278 600,162 460,102 200,220"
            stroke="var(--color-racing-red, #dd0200)"
            strokeWidth="3"
            strokeDasharray="8 4"
            className="blueprint-vp__active-run"
          />

          {/* Detected LED Troffers — bounding boxes (cyan) */}
          <polygon points="260,162 292,177 282,190 250,175" stroke="#00b4d8" strokeWidth="1.6" fill="rgba(0,180,216,0.18)" />
          <polygon points="322,132 354,147 344,160 312,145" stroke="#00b4d8" strokeWidth="1.6" fill="rgba(0,180,216,0.18)" />
          <polygon points="448,172 480,187 470,200 438,185" stroke="#00b4d8" strokeWidth="1.6" fill="rgba(0,180,216,0.18)" />
          <polygon points="510,142 542,157 532,170 500,155" stroke="#00b4d8" strokeWidth="1.6" fill="rgba(0,180,216,0.18)" />

          {/* Flagged component — needs review (red) */}
          <polygon points="382,200 414,215 404,228 372,213" stroke="#f87171" strokeWidth="1.8" fill="rgba(248,113,113,0.25)" />
          <text x="388" y="210" fill="#f87171" fontSize="8" fontFamily="monospace" fontWeight="600">!</text>

          {/* Dimension tag */}
          <rect x="240" y="248" width="68" height="16" rx="3" fill="#0d0d0f" stroke="#f87171" strokeWidth="1" />
          <text x="246" y="259" fill="#fca5a5" fontSize="9.5" fontFamily="monospace" fontWeight="700">127.4 m</text>

          {/* Feeder routing line */}
          <polyline points="420,240 420,300 600,300 600,190" stroke="#6b7280" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.5" />
        </svg>

        {/* Floating HUD overlay */}
        <div className="blueprint-vp__hud">
          <span className="blueprint-vp__hud-item blueprint-vp__hud-item--green">47 Fixtures</span>
          <span className="blueprint-vp__hud-sep" aria-hidden="true">·</span>
          <span className="blueprint-vp__hud-item blueprint-vp__hud-item--red">127.4 m Tray</span>
          <span className="blueprint-vp__hud-sep" aria-hidden="true">·</span>
          <span className="blueprint-vp__hud-item blueprint-vp__hud-item--cyan">6 Feeders</span>
        </div>
      </div>
    </div>
  );
}

function IconArrowOut() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M5 2H2a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M8 2h3v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11 2L6 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}
