/**
 * Link.tsx — Client-side SPA navigation link.
 *
 * Intercepts normal click events, prevents full-page reload,
 * and calls router.navigate() while preserving standard modifier-key behaviors
 * (e.g. Cmd+Click / Ctrl+Click to open in new tab).
 */

import React from "react";
import { useRouter } from "./useRouter";

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  replace?: boolean;
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, replace, onClick, target, children, ...rest },
  ref
) {
  const { navigate } = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Call user's custom onClick first if provided
    if (onClick) {
      onClick(e);
    }

    // If default was already prevented, or it's not a standard left-click, let it be
    if (e.defaultPrevented || e.button !== 0) return;

    // If user held modifier keys (Cmd, Ctrl, Shift, Alt) or target is _blank, let browser open new tab
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || target === "_blank") {
      return;
    }

    // Prevent full browser page reload
    e.preventDefault();
    navigate(to, { replace });
  };

  return (
    <a ref={ref} href={to} target={target} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
});
