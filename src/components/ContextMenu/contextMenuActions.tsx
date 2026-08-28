/**
 * contextMenuActions.tsx — Context Detection and Action Resolver for Vectoris Context Menu.
 */

import React from "react";
import type { ContextMenuItem, ContextMenuTarget, ContextTargetType } from "./types";

/**
 * Detects the contextual target under the cursor.
 */
export function detectContextTarget(event: MouseEvent): ContextMenuTarget {
  const element = event.target as HTMLElement;
  const selection = window.getSelection();
  const selectedText = selection ? selection.toString().trim() : "";

  // 1. Text input / Textarea / ContentEditable
  const isInput =
    element.tagName === "INPUT" ||
    element.tagName === "TEXTAREA" ||
    element.isContentEditable;

  if (isInput) {
    const inputElement = element as HTMLInputElement | HTMLTextAreaElement;
    let inputSelectedText = "";
    try {
      if (typeof inputElement.selectionStart === "number" && typeof inputElement.selectionEnd === "number") {
        inputSelectedText = inputElement.value.substring(
          inputElement.selectionStart,
          inputElement.selectionEnd
        );
      }
    } catch {
      // Ignore if element type doesn't support selection range
    }

    return {
      type: "input",
      element,
      inputElement,
      selectedText: inputSelectedText || selectedText,
    };
  }

  // 2. Custom contextual elements with data-context-type
  const contextualEl = element.closest<HTMLElement>("[data-context-type]");
  if (contextualEl) {
    const contextType = (contextualEl.dataset.contextType || "general") as ContextTargetType;
    const dataset = { ...contextualEl.dataset };
    return {
      type: contextType,
      element: contextualEl,
      selectedText,
      data: dataset as Record<string, string>,
    };
  }

  // 3. Link elements
  const linkEl = element.closest<HTMLAnchorElement>("a[href]");
  if (linkEl) {
    return {
      type: "link",
      element: linkEl,
      linkUrl: linkEl.href,
      linkText: linkEl.textContent?.trim() || linkEl.href,
      selectedText,
    };
  }

  // 4. Selected text across standard body content
  if (selectedText.length > 0) {
    return {
      type: "selection",
      element,
      selectedText,
    };
  }

  // 5. General workstation background
  return {
    type: "general",
    element,
  };
}

/**
 * Builds the array of menu items based on the detected target context.
 */
export function buildMenuItems(
  target: ContextMenuTarget,
  navigate: (to: string) => void,
  currentPath?: string
): ContextMenuItem[] {
  const isMac =
    typeof navigator !== "undefined" &&
    navigator.userAgent.toLowerCase().includes("mac");
  const ctrlKey = isMac ? "⌘" : "Ctrl+";

  const isAuthSurface =
    Boolean(target.element?.closest?.(".auth-shell")) ||
    Boolean(target.element?.closest?.(".onboarding-shell")) ||
    (typeof document !== "undefined" && Boolean(document.querySelector(".auth-shell, .onboarding-shell"))) ||
    currentPath === "/" ||
    currentPath?.startsWith("/auth") ||
    currentPath?.startsWith("/onboarding") ||
    (typeof window !== "undefined" &&
      (window.location.pathname === "/" ||
        window.location.pathname.startsWith("/auth") ||
        window.location.pathname.startsWith("/onboarding") ||
        window.location.hash.startsWith("#/auth") ||
        window.location.hash.startsWith("#/onboarding")));

  // ── 1. INPUT / TEXTAREA CONTEXT ──────────────────────────────────────────
  if (target.type === "input" && target.inputElement) {
    const input = target.inputElement;
    const isReadOnly = input.readOnly || input.disabled;
    const hasSelection = Boolean(target.selectedText && target.selectedText.length > 0);
    const hasContent = Boolean(input.value && input.value.length > 0);

    const handleCut = async () => {
      if (isReadOnly) return;
      if (hasSelection && target.selectedText) {
        try {
          await navigator.clipboard.writeText(target.selectedText);
        } catch {
          document.execCommand("copy");
        }
        const start = input.selectionStart ?? 0;
        const end = input.selectionEnd ?? input.value.length;
        const val = input.value;
        const newVal = val.substring(0, start) + val.substring(end);
        input.value = newVal;
        input.setSelectionRange(start, start);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    };

    const handleCopy = async () => {
      if (hasSelection && target.selectedText) {
        try {
          await navigator.clipboard.writeText(target.selectedText);
        } catch {
          document.execCommand("copy");
        }
      }
    };

    const handlePaste = async () => {
      if (isReadOnly) return;
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          const start = input.selectionStart ?? input.value.length;
          const end = input.selectionEnd ?? input.value.length;
          const val = input.value;
          const newVal = val.substring(0, start) + text + val.substring(end);
          input.value = newVal;
          input.setSelectionRange(start + text.length, start + text.length);
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
      } catch {
        // Fallback
        input.focus();
        document.execCommand("paste");
      }
    };

    const handleSelectAll = () => {
      input.select();
    };

    const handleClear = () => {
      if (isReadOnly) return;
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    };

    return [
      {
        id: "cut",
        label: "Cut",
        icon: (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="5" cy="5" r="2.5" />
            <circle cx="5" cy="11" r="2.5" />
            <path d="M7 6.5l7 7M7 9.5l7-7" strokeLinecap="round" />
          </svg>
        ),
        shortcut: `${ctrlKey}X`,
        disabled: isReadOnly || !hasSelection,
        onClick: handleCut,
      },
      {
        id: "copy",
        label: "Copy",
        icon: (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="5" y="5" width="8" height="8" rx="1.5" />
            <path d="M3 11V3a1.5 1.5 0 011.5-1.5H11" strokeLinecap="round" />
          </svg>
        ),
        shortcut: `${ctrlKey}C`,
        disabled: !hasSelection,
        onClick: handleCopy,
      },
      {
        id: "paste",
        label: "Paste",
        icon: (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M5.5 3h5a1 1 0 011 1v1h-7V4a1 1 0 011-1z" fill="currentColor" opacity="0.3" />
            <rect x="3" y="4" width="10" height="10" rx="1.5" />
            <path d="M6 2h4" strokeLinecap="round" />
          </svg>
        ),
        shortcut: `${ctrlKey}V`,
        disabled: isReadOnly,
        onClick: handlePaste,
      },
      { id: "sep-1", type: "separator" },
      {
        id: "select-all",
        label: "Select All",
        icon: (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 3h10v10H3z" strokeDasharray="2 2" />
          </svg>
        ),
        shortcut: `${ctrlKey}A`,
        disabled: !hasContent,
        onClick: handleSelectAll,
      },
      {
        id: "clear",
        label: "Clear Field",
        icon: (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 4L4 12M4 4l8 8" strokeLinecap="round" />
          </svg>
        ),
        disabled: isReadOnly || !hasContent,
        onClick: handleClear,
      },
    ];
  }

  // ── 2. TEXT SELECTION CONTEXT ─────────────────────────────────────────────
  if (target.type === "selection" && target.selectedText) {
    const text = target.selectedText;

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        document.execCommand("copy");
      }
    };

    const handleInvestigate = () => {
      // Store prompt context in sessionStorage for Investigation Workshop
      try {
        window.sessionStorage.setItem("vectoris.investigation.prefill", text);
      } catch {
        // Ignore storage errors
      }
      navigate("/sessions");
    };

    const selectionItems: ContextMenuItem[] = [
      {
        id: "copy-selection",
        label: "Copy Selection",
        icon: (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="5" y="5" width="8" height="8" rx="1.5" />
            <path d="M3 11V3a1.5 1.5 0 011.5-1.5H11" strokeLinecap="round" />
          </svg>
        ),
        shortcut: `${ctrlKey}C`,
        onClick: handleCopy,
      },
    ];

    if (!isAuthSurface) {
      selectionItems.push({
        id: "investigate-selection",
        label: "Ask Investigation Workshop",
        icon: (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13z" />
            <path d="M6 10c0-1.1.9-2 2-2s2 .9 2 2" strokeLinecap="round" />
            <circle cx="8" cy="5.5" r="1" fill="currentColor" />
          </svg>
        ),
        onClick: handleInvestigate,
      });
    }

    selectionItems.push(
      { id: "sep-sel", type: "separator" },
      {
        id: "select-all",
        label: "Select All",
        shortcut: `${ctrlKey}A`,
        onClick: () => {
          window.getSelection()?.selectAllChildren(document.body);
        },
      }
    );

    return selectionItems;
  }

  // ── 3. LINK CONTEXT ───────────────────────────────────────────────────────
  if (target.type === "link" && target.linkUrl) {
    const url = target.linkUrl;

    const handleOpenLink = () => {
      try {
        const parsed = new URL(url);
        if (parsed.origin === window.location.origin) {
          navigate(parsed.pathname + parsed.search + parsed.hash);
          return;
        }
      } catch {
        // Ignore URL parse error
      }
      window.open(url, "_blank");
    };

    const handleCopyLink = async () => {
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // Fallback
      }
    };

    return [
      {
        id: "open-link",
        label: "Open Link",
        icon: (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 3h7v7M13 3L7 9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 9v4H3V6h4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
        onClick: handleOpenLink,
      },
      {
        id: "copy-link",
        label: "Copy Link Address",
        icon: (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6.5 9.5a3.5 3.5 0 005 0l2-2a3.5 3.5 0 00-5-5l-1 1" strokeLinecap="round" />
            <path d="M9.5 6.5a3.5 3.5 0 00-5 0l-2 2a3.5 3.5 0 005 5l1-1" strokeLinecap="round" />
          </svg>
        ),
        onClick: handleCopyLink,
      },
    ];
  }

  // ── 4. PROJECT CARD CONTEXT ───────────────────────────────────────────────
  if (target.type === "project" && target.data) {
    const projectId = target.data.projectId || target.data.contextId || "";
    const projectName = target.data.projectName || target.data.contextTitle || "Project";

    return [
      {
        id: "header-project",
        type: "header",
        label: projectName,
      },
      {
        id: "open-project-overview",
        label: "Open Overview",
        icon: (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="2" width="12" height="12" rx="2" />
            <path d="M6 2v12M2 6h12" />
          </svg>
        ),
        onClick: () => navigate(`/project/${projectId}`),
      },
      {
        id: "open-project-plan",
        label: "Open Project Plan",
        icon: (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 4h10M3 8h10M3 12h6" strokeLinecap="round" />
          </svg>
        ),
        onClick: () => navigate(`/project/${projectId}/plan`),
      },
      {
        id: "open-project-takeoff",
        label: "Open Drawing Takeoff",
        icon: (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 13.5l11.5-11.5M6 13.5l7.5-7.5M2 9.5l7.5-7.5" strokeLinecap="round" />
          </svg>
        ),
        onClick: () => navigate(`/project/${projectId}/takeoff`),
      },
      {
        id: "open-project-docs",
        label: "View Documents",
        icon: (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 2h7l4 4v8H3V2z" />
            <path d="M10 2v4h4" />
          </svg>
        ),
        onClick: () => navigate(`/project/${projectId}/documents`),
      },
      { id: "sep-proj", type: "separator" },
      {
        id: "copy-project-id",
        label: "Copy Project ID",
        icon: (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="5" y="5" width="8" height="8" rx="1.5" />
            <path d="M3 11V3a1.5 1.5 0 011.5-1.5H11" strokeLinecap="round" />
          </svg>
        ),
        onClick: async () => {
          try {
            await navigator.clipboard.writeText(projectId);
          } catch {
            // Ignore
          }
        },
      },
    ];
  }

  // ── 5. PLAN CLAIM CONTEXT ─────────────────────────────────────────────────
  if (target.type === "claim" && target.data) {
    const claimId = target.data.claimId || target.data.contextId || "";
    const claimContent = target.data.claimContent || target.data.contextTitle || "";

    return [
      {
        id: "copy-claim-text",
        label: "Copy Claim Text",
        icon: (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="5" y="5" width="8" height="8" rx="1.5" />
            <path d="M3 11V3a1.5 1.5 0 011.5-1.5H11" strokeLinecap="round" />
          </svg>
        ),
        onClick: async () => {
          try {
            await navigator.clipboard.writeText(claimContent);
          } catch {
            // Ignore
          }
        },
      },
      {
        id: "copy-claim-id",
        label: "Copy Claim ID",
        onClick: async () => {
          try {
            await navigator.clipboard.writeText(claimId);
          } catch {
            // Ignore
          }
        },
      },
      { id: "sep-claim", type: "separator" },
      {
        id: "investigate-claim",
        label: "Investigate Claim with AI",
        icon: (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13z" />
            <path d="M6 10c0-1.1.9-2 2-2s2 .9 2 2" strokeLinecap="round" />
            <circle cx="8" cy="5.5" r="1" fill="currentColor" />
          </svg>
        ),
        onClick: () => {
          try {
            window.sessionStorage.setItem(
              "vectoris.investigation.prefill",
              `Explain evidence and decisions for claim: ${claimContent} (ID: ${claimId})`
            );
          } catch {
            // Ignore
          }
          navigate("/sessions");
        },
      },
    ];
  }

  // ── 6. GENERAL WORKSTATION BACKGROUND CONTEXT ─────────────────────────────
  const canGoBack =
    typeof window !== "undefined" &&
    Boolean(window.history && typeof window.history.length === "number" && window.history.length > 1);

  const handleToggleTheme = () => {
    const docTheme = document.documentElement.getAttribute("data-theme");
    const next = docTheme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try {
      window.localStorage.setItem("vectoris.themePreference", next);
      window.dispatchEvent(new Event("themechange"));
    } catch {
      // Ignore
    }
  };

  const handleCopyRoute = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // Ignore
    }
  };

  // If on Auth / Onboarding surface, only expose relevant non-authenticated actions
  if (isAuthSurface) {
    return [
      {
        id: "reload",
        label: "Reload Page",
        icon: (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M13.5 8A5.5 5.5 0 118 2.5c2.3 0 4.3 1.4 5.1 3.5M13.5 2.5V6H10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
        shortcut: `${ctrlKey}R`,
        onClick: () => window.location.reload(),
      },
      { id: "sep-auth-1", type: "separator" },
      {
        id: "toggle-theme",
        label: "Toggle Dark / Light Mode",
        icon: (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="8" cy="8" r="3.5" />
            <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" strokeLinecap="round" />
          </svg>
        ),
        onClick: handleToggleTheme,
      },
    ];
  }

  // Standard Authenticated Workstation Menu
  return [
    {
      id: "back",
      label: "Back",
      icon: (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      shortcut: "Alt+←",
      disabled: !canGoBack,
      onClick: () => window.history.back(),
    },
    {
      id: "forward",
      label: "Forward",
      icon: (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      shortcut: "Alt+→",
      disabled: true,
      onClick: () => window.history.forward(),
    },
    {
      id: "reload",
      label: "Reload Workspace",
      icon: (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M13.5 8A5.5 5.5 0 118 2.5c2.3 0 4.3 1.4 5.1 3.5M13.5 2.5V6H10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      shortcut: `${ctrlKey}R`,
      onClick: () => window.location.reload(),
    },
    { id: "sep-gen-1", type: "separator" },
    {
      id: "investigation-workshop",
      label: "AI Investigation Workshop",
      icon: (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13z" />
          <path d="M6 10c0-1.1.9-2 2-2s2 .9 2 2" strokeLinecap="round" />
          <circle cx="8" cy="5.5" r="1" fill="currentColor" />
        </svg>
      ),
      onClick: () => navigate("/sessions"),
    },
    {
      id: "workstation-dashboard",
      label: "Workstation Dashboard",
      icon: (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="2" width="5" height="5" rx="1" />
          <rect x="9" y="2" width="5" height="5" rx="1" />
          <rect x="2" y="9" width="5" height="5" rx="1" />
          <rect x="9" y="9" width="5" height="5" rx="1" />
        </svg>
      ),
      onClick: () => navigate("/dashboard"),
    },
    {
      id: "workstation-settings",
      label: "Settings",
      icon: (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="8" r="2.5" />
          <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" strokeLinecap="round" />
        </svg>
      ),
      onClick: () => navigate("/settings"),
    },
    { id: "sep-gen-2", type: "separator" },
    {
      id: "copy-route",
      label: "Copy Workstation URL",
      icon: (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="5" y="5" width="8" height="8" rx="1.5" />
          <path d="M3 11V3a1.5 1.5 0 011.5-1.5H11" strokeLinecap="round" />
        </svg>
      ),
      onClick: handleCopyRoute,
    },
    {
      id: "toggle-theme",
      label: "Toggle Dark / Light Mode",
      icon: (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="8" r="3.5" />
          <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" strokeLinecap="round" />
        </svg>
      ),
      onClick: handleToggleTheme,
    },
  ];
}
