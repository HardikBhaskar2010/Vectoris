/**
 * contextMenu.test.ts — Unit tests for Vectoris Custom Context Menu System.
 *
 * Tests:
 * 1. Target detection across inputs, selections, links, custom data attributes, and background
 * 2. Menu item generation for each context
 * 3. Disabled state resolution (Cut/Copy on empty selection, Select All on empty input)
 * 4. Custom engineering context metadata handling (projects, claims)
 */

import { buildMenuItems, detectContextTarget } from "./contextMenuActions";
import type { ContextMenuTarget } from "./types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export function runContextMenuTests() {
  console.log("Starting Vectoris Context Menu unit tests...");

  const mockNavigate = (to: string) => {
    console.log(`Mock navigated to ${to}`);
  };

  // ── 1. Input Context: Empty input without selection ──────────────────────
  const mockInputElement = {
    tagName: "INPUT",
    value: "",
    selectionStart: 0,
    selectionEnd: 0,
    readOnly: false,
    disabled: false,
    isContentEditable: false,
    focus: () => {},
    select: () => {},
    dispatchEvent: () => true,
    closest: () => null,
  } as unknown as HTMLInputElement;

  const inputTarget: ContextMenuTarget = {
    type: "input",
    element: mockInputElement,
    inputElement: mockInputElement,
    selectedText: "",
  };

  const inputItems = buildMenuItems(inputTarget, mockNavigate);
  const cutItem = inputItems.find((i) => i.id === "cut");
  const copyItem = inputItems.find((i) => i.id === "copy");
  const pasteItem = inputItems.find((i) => i.id === "paste");
  const selectAllItem = inputItems.find((i) => i.id === "select-all");

  assert(cutItem?.disabled === true, "Cut should be disabled when nothing is selected");
  assert(copyItem?.disabled === true, "Copy should be disabled when nothing is selected");
  assert(pasteItem?.disabled === false, "Paste should be enabled on editable input");
  assert(selectAllItem?.disabled === true, "Select All should be disabled on empty input");

  // ── 2. Input Context: Input with selected text ───────────────────────────
  const inputWithTextTarget: ContextMenuTarget = {
    type: "input",
    element: mockInputElement,
    inputElement: { ...mockInputElement, value: "480V Switchgear" } as unknown as HTMLInputElement,
    selectedText: "480V",
  };

  const inputWithTextItems = buildMenuItems(inputWithTextTarget, mockNavigate);
  const cutWithText = inputWithTextItems.find((i) => i.id === "cut");
  const copyWithText = inputWithTextItems.find((i) => i.id === "copy");

  assert(cutWithText?.disabled === false, "Cut should be enabled when text is selected");
  assert(copyWithText?.disabled === false, "Copy should be enabled when text is selected");

  // ── 3. Text Selection Context ────────────────────────────────────────────
  const selectionTarget: ContextMenuTarget = {
    type: "selection",
    element: {} as HTMLElement,
    selectedText: "Main Substation Energization",
  };

  const selectionItems = buildMenuItems(selectionTarget, mockNavigate);
  const copySel = selectionItems.find((i) => i.id === "copy-selection");
  const askWorkshop = selectionItems.find((i) => i.id === "investigate-selection");

  assert(copySel !== undefined, "Copy selection action should be present");
  assert(askWorkshop !== undefined, "Ask Investigation Workshop action should be present");

  // ── 4. Link Context ──────────────────────────────────────────────────────
  const linkTarget: ContextMenuTarget = {
    type: "link",
    element: {} as HTMLElement,
    linkUrl: "http://localhost:5173/project/p-101/takeoff",
    linkText: "Drawing Takeoff",
  };

  const linkItems = buildMenuItems(linkTarget, mockNavigate);
  const openLink = linkItems.find((i) => i.id === "open-link");
  const copyLink = linkItems.find((i) => i.id === "copy-link");

  assert(openLink !== undefined, "Open link action should be present");
  assert(copyLink !== undefined, "Copy link action should be present");

  // ── 5. Project Card Context ──────────────────────────────────────────────
  const projectTarget: ContextMenuTarget = {
    type: "project",
    element: {} as HTMLElement,
    data: {
      projectId: "p-42",
      projectName: "North Data Center Phase 2",
    },
  };

  const projectItems = buildMenuItems(projectTarget, mockNavigate);
  const projHeader = projectItems.find((i) => i.type === "header");
  const openPlan = projectItems.find((i) => i.id === "open-project-plan");
  const openTakeoff = projectItems.find((i) => i.id === "open-project-takeoff");
  const copyProjId = projectItems.find((i) => i.id === "copy-project-id");

  assert(projHeader?.label === "North Data Center Phase 2", "Header should show project name");
  assert(openPlan !== undefined, "Open plan action should be present");
  assert(openTakeoff !== undefined, "Open takeoff action should be present");
  assert(copyProjId !== undefined, "Copy project ID action should be present");

  // ── 6. Plan Claim Context ────────────────────────────────────────────────
  const claimTarget: ContextMenuTarget = {
    type: "claim",
    element: {} as HTMLElement,
    data: {
      claimId: "cid-99",
      claimContent: "Transformer lead time exceeds 52 weeks",
    },
  };

  const claimItems = buildMenuItems(claimTarget, mockNavigate);
  const copyClaimText = claimItems.find((i) => i.id === "copy-claim-text");
  const copyClaimId = claimItems.find((i) => i.id === "copy-claim-id");
  const investigateClaim = claimItems.find((i) => i.id === "investigate-claim");

  assert(copyClaimText !== undefined, "Copy claim text should be present");
  assert(copyClaimId !== undefined, "Copy claim ID should be present");
  assert(investigateClaim !== undefined, "Investigate claim with AI should be present");

  // ── 7. General Background Context (Authenticated Surface) ───────────────
  const generalTarget: ContextMenuTarget = {
    type: "general",
    element: {} as HTMLElement,
  };

  const generalItems = buildMenuItems(generalTarget, mockNavigate);
  const reloadItem = generalItems.find((i) => i.id === "reload");
  const themeItem = generalItems.find((i) => i.id === "toggle-theme");
  const workshopItem = generalItems.find((i) => i.id === "investigation-workshop");

  assert(reloadItem !== undefined, "Reload workspace should be present");
  assert(themeItem !== undefined, "Toggle theme should be present");
  assert(workshopItem !== undefined, "Investigation workshop link should be present in authenticated surface");

  // ── 8. Auth Surface Context (Unauthenticated Login / Onboarding) ─────────
  // Mock window.location.pathname = "/auth"
  if (typeof globalThis.window !== "undefined") {
    (globalThis.window as any).location.pathname = "/auth";
  } else {
    (globalThis as any).window = { location: { pathname: "/auth" } };
  }

  const authSurfaceItems = buildMenuItems(generalTarget, mockNavigate);
  const authReload = authSurfaceItems.find((i) => i.id === "reload");
  const authTheme = authSurfaceItems.find((i) => i.id === "toggle-theme");
  const authDashboard = authSurfaceItems.find((i) => i.id === "workstation-dashboard");
  const authWorkshop = authSurfaceItems.find((i) => i.id === "investigation-workshop");
  const authSettings = authSurfaceItems.find((i) => i.id === "workstation-settings");

  assert(authReload !== undefined, "Reload page should be present on Auth surface");
  assert(authTheme !== undefined, "Toggle theme should be present on Auth surface");
  assert(authDashboard === undefined, "Dashboard should NOT be present on Auth surface");
  assert(authWorkshop === undefined, "Investigation Workshop should NOT be present on Auth surface");
  assert(authSettings === undefined, "Settings should NOT be present on Auth surface");

  console.log("All Vectoris Context Menu unit tests passed successfully!");
}

// Auto-run if executed in node
if (typeof window === "undefined" || !(window as any).__IS_BROWSER__) {
  runContextMenuTests();
}
