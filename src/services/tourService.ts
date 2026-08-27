/**
 * tourService.ts — Vectoris Guided Product Tour Service.
 *
 * Implements locked specifications:
 * - Driver.js encapsulation boundary
 * - First-run aware & dismissible
 * - Restartable from Settings / Help
 * - Respects prefers-reduced-motion
 * - Non-blocking overlay with Vectoris design tokens
 * - Step sequence covering actual, real application surfaces
 */

import { driver, type Driver, type DriveStep } from "driver.js";
import "../styles/driver-theme.css";

const TOUR_STORAGE_KEY = "vectoris.tour_status";

export type TourStatus = "completed" | "skipped" | "pending";

class TourService {
  private activeDriver: Driver | null = null;

  /**
   * Check if the tour has already been completed or skipped.
   */
  public isTourCompleted(): boolean {
    try {
      const status = window.localStorage.getItem(TOUR_STORAGE_KEY);
      return status === "completed" || status === "skipped";
    } catch {
      return false;
    }
  }

  /**
   * Mark tour as completed.
   */
  public markTourCompleted(): void {
    try {
      window.localStorage.setItem(TOUR_STORAGE_KEY, "completed");
    } catch (err) {
      console.warn("Failed to persist tour completed status:", err);
    }
  }

  /**
   * Mark tour as skipped.
   */
  public markTourSkipped(): void {
    try {
      window.localStorage.setItem(TOUR_STORAGE_KEY, "skipped");
    } catch (err) {
      console.warn("Failed to persist tour skipped status:", err);
    }
  }

  /**
   * Reset tour status to allow restarting.
   */
  public resetTour(): void {
    try {
      window.localStorage.removeItem(TOUR_STORAGE_KEY);
    } catch (err) {
      console.warn("Failed to reset tour status:", err);
    }
  }

  /**
   * Canonical steps grounded in actual existing UI surfaces.
   */
  private getTourSteps(): DriveStep[] {
    return [
      {
        element: '[data-tour="workspace-header"]',
        popover: {
          title: "1. Workspace & Organization Context",
          description:
            "Vectoris groups all drawings, AI takeoff models, and collaboration under an active multi-tenant workspace. Switch organizations or manage team seats here.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: '[data-tour="nav-projects"]',
        popover: {
          title: "2. Projects — The Working Context",
          description:
            "Every engineering package (e.g. GB 300, Emerson PAC) lives in a project. This is the central hub for drawings, single-line diagrams, and takeoff data.",
          side: "right",
          align: "start",
        },
      },
      {
        element: '[data-tour="nav-sessions"]',
        popover: {
          title: "3. Investigation Workshop",
          description:
            "Investigate project questions with evidence-based reasoning, blueprint citations, and vector geometry grounding. Never a generic chatbot.",
          side: "right",
          align: "start",
        },
      },
      {
        element: '[data-tour="dashboard-takeoff"]',
        popover: {
          title: "4. Drawing Takeoff & Proposal Stream",
          description:
            "Review vector coordinate detections, verify quantities, and approve or reject AI-proposals before exporting to the final BOQ ledger.",
          side: "top",
          align: "center",
        },
      },
      {
        element: '[data-tour="nav-settings"]',
        popover: {
          title: "5. Workstation Diagnostics & Preferences",
          description:
            "Tune on-device perception threads, model cache memory, inspect tenant isolation, and restart this guided tour whenever needed.",
          side: "right",
          align: "end",
        },
      },
    ];
  }

  /**
   * Starts the guided product tour.
   * @param force If true, starts tour even if previously completed/skipped.
   */
  public startTour(force = false): void {
    if (!force && this.isTourCompleted()) {
      return;
    }

    // Check prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // Filter steps to only those elements currently present in the DOM
    const rawSteps = this.getTourSteps();
    const validSteps = rawSteps.filter((step) => {
      if (typeof step.element === "string") {
        return document.querySelector(step.element) !== null;
      }
      return true;
    });

    if (validSteps.length === 0) {
      console.info("Vectoris Tour: No target DOM elements found for tour.");
      return;
    }

    try {
      this.activeDriver = driver({
        showProgress: true,
        animate: !prefersReducedMotion,
        popoverClass: "vectoris-driver-popover",
        nextBtnText: "Next →",
        prevBtnText: "← Back",
        doneBtnText: "Finish Tour",
        showButtons: ["next", "previous", "close"],
        steps: validSteps,
        onDestroyStarted: () => {
          this.markTourCompleted();
          this.activeDriver?.destroy();
          this.activeDriver = null;
        },
        onDestroyed: () => {
          this.activeDriver = null;
        },
      });

      this.activeDriver.drive();
    } catch (err) {
      console.warn("Vectoris Tour failed to launch:", err);
    }
  }

  /**
   * Destroys active tour if currently running.
   */
  public stopTour(): void {
    if (this.activeDriver) {
      this.activeDriver.destroy();
      this.activeDriver = null;
    }
  }
}

export const tourService = new TourService();
