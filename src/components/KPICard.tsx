/**
 * KPICard — Dashboard metric tile with spring count-up animation.
 *
 * Fix: useInView requires a stable React ref (useRef) attached to a real DOM
 * node. Previous version passed `{ current: computed }` — computed was null at
 * render time so the animation never triggered.
 *
 * Spring pattern: adapted from React Bits CountUp (davidhdev/react-bits).
 * Library styling stripped; Vectoris tokens applied via CSS classes.
 *
 * prefers-reduced-motion: skips animation, shows final value immediately.
 */

import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "motion/react";
import type { ReactNode, CSSProperties } from "react";

export interface KPICardProps {
  label: string;
  value: number;
  suffix?: string;
  separator?: string;
  decimals?: number;
  trend?: string;
  trendType?: "positive" | "neutral" | "warning";
  icon: ReactNode;
  accent?: boolean;
  entryDelay?: number;
  loading?: boolean;
}

export function KPICard({
  label,
  value,
  suffix = "",
  separator = ",",
  decimals = 0,
  trend,
  trendType = "neutral",
  icon,
  accent = false,
  entryDelay = 0,
  loading = false,
}: KPICardProps) {
  // cardRef: attached to the .kpi-card wrapper — this is what useInView watches
  const cardRef = useRef<HTMLDivElement>(null);
  // displayRef: the <span> whose textContent we mutate on spring change
  const displayRef = useRef<HTMLSpanElement>(null);

  const isInView = useInView(cardRef, { once: true, margin: "0px 0px -40px 0px" });

  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { damping: 22, stiffness: 80 });

  useEffect(() => {
    if (!isInView) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      // Show final value immediately
      if (displayRef.current) {
        displayRef.current.textContent = fmt(value, decimals, separator) + suffix;
      }
      return;
    }
    const t = window.setTimeout(() => motionValue.set(value), entryDelay);
    return () => window.clearTimeout(t);
  }, [isInView, motionValue, value, entryDelay, decimals, separator, suffix]);

  useEffect(() => {
    return spring.on("change", (latest) => {
      if (displayRef.current) {
        displayRef.current.textContent = fmt(latest, decimals, separator) + suffix;
      }
    });
  }, [spring, decimals, separator, suffix]);

  if (loading) {
    return (
      <div className="kpi-card kpi-card--loading" aria-hidden="true">
        <div className="kpi-card__body">
          <div className="skeleton skeleton--label" />
          <div className="skeleton skeleton--value" />
          <div className="skeleton skeleton--trend" />
        </div>
        <div className="kpi-card__icon-wrap">
          <div className="skeleton skeleton--icon" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className={`kpi-card${accent ? " kpi-card--accent" : ""}`}
      style={{ "--kpi-delay": `${entryDelay}ms` } as CSSProperties}
    >
      <div className="kpi-card__body">
        <span className="kpi-card__label">{label}</span>
        <span
          ref={displayRef}
          className="kpi-card__value"
          aria-label={`${label}: ${value}${suffix}`}
        >
          {/* Initial display — will be overwritten by spring */}
          0{suffix}
        </span>
        {trend && (
          <span className={`kpi-card__trend kpi-card__trend--${trendType}`}>
            {trend}
          </span>
        )}
      </div>
      <div
        className={`kpi-card__icon-wrap${accent ? " kpi-card__icon-wrap--accent" : ""}`}
        aria-hidden="true"
      >
        {icon}
      </div>
    </div>
  );
}

function fmt(n: number, decimals: number, sep: string): string {
  const fixed = n.toFixed(decimals);
  const [int, dec] = fixed.split(".");
  const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return dec !== undefined ? `${withSep}.${dec}` : withSep;
}
