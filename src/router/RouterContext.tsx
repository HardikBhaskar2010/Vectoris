/**
 * RouterContext.tsx — Zero-dependency client-side SPA router for Vectoris.
 *
 * Provides reactive route state, popstate history synchronization,
 * dynamic route parameters (:id), and pushState/replaceState navigation
 * without unmounting the desktop frame or re-parsing bundles.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

export interface NavigateOptions {
  replace?: boolean;
}

export interface RouteParams {
  id?: string;
  [key: string]: string | undefined;
}

export interface RouterContextValue {
  currentPath: string;
  search: string;
  searchParams: URLSearchParams;
  params: RouteParams;
  navigate: (to: string, options?: NavigateOptions) => void;
  replace: (to: string) => void;
  getParam: (paramName: string) => string | null;
}

export const RouterContext = createContext<RouterContextValue | null>(null);

function normalizePath(path: string): string {
  if (!path || path === "") return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

/**
 * Extracts standard dynamic route parameters from the canonical Vectoris route table.
 * Supports:
 *   /project/:id(/...)
 *   /sessions/:id
 */
function extractRouteParams(path: string, searchParams: URLSearchParams): RouteParams {
  const params: RouteParams = {};

  // Check /project/:id pattern
  const projectMatch = path.match(/^\/project\/([^/]+)/);
  if (projectMatch && projectMatch[1]) {
    params.id = decodeURIComponent(projectMatch[1]);
  }

  // Check /sessions/:id pattern
  const sessionMatch = path.match(/^\/sessions\/([^/]+)/);
  if (sessionMatch && sessionMatch[1]) {
    params.id = decodeURIComponent(sessionMatch[1]);
  }

  // Fallback: If id is not in path but provided as ?project=... or ?id=...
  if (!params.id) {
    const queryId = searchParams.get("project") || searchParams.get("id");
    if (queryId) {
      params.id = queryId;
    }
  }

  return params;
}

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [locationState, setLocationState] = useState(() => ({
    pathname: normalizePath(window.location.pathname),
    search: window.location.search,
  }));

  // Synchronize on browser forward/back button (popstate)
  useEffect(() => {
    const handlePopState = () => {
      setLocationState({
        pathname: normalizePath(window.location.pathname),
        search: window.location.search,
      });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((to: string, options?: NavigateOptions) => {
    // Parse target URL/path
    const [targetPath, targetSearch = ""] = to.split("?");
    const cleanPath = normalizePath(targetPath);
    const formattedSearch = targetSearch ? `?${targetSearch}` : "";
    const fullUrl = `${cleanPath}${formattedSearch}`;

    if (options?.replace) {
      window.history.replaceState(null, "", fullUrl);
    } else {
      window.history.pushState(null, "", fullUrl);
    }

    setLocationState({
      pathname: cleanPath,
      search: formattedSearch,
    });

    // Scroll to top on page transition unless it's just a query param tweak
    if (cleanPath !== locationState.pathname) {
      const mainContent = document.querySelector(".desktop-app-body") || window;
      mainContent.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    }
  }, [locationState.pathname]);

  const replace = useCallback((to: string) => {
    navigate(to, { replace: true });
  }, [navigate]);

  const searchParams = useMemo(() => {
    return new URLSearchParams(locationState.search);
  }, [locationState.search]);

  const params = useMemo(() => {
    return extractRouteParams(locationState.pathname, searchParams);
  }, [locationState.pathname, searchParams]);

  const getParam = useCallback((paramName: string): string | null => {
    return searchParams.get(paramName);
  }, [searchParams]);

  const value = useMemo<RouterContextValue>(() => ({
    currentPath: locationState.pathname,
    search: locationState.search,
    searchParams,
    params,
    navigate,
    replace,
    getParam,
  }), [locationState.pathname, locationState.search, searchParams, params, navigate, replace, getParam]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterContextValue {
  const ctx = useContext(RouterContext);
  if (!ctx) {
    throw new Error("useRouter must be used within a RouterProvider");
  }
  return ctx;
}
