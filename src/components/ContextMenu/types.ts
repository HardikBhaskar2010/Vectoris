/**
 * types.ts — Vectoris Custom Context Menu Type Definitions.
 */

import type { ReactNode } from "react";

export type MenuItemType = "action" | "separator" | "header";

export type ContextTargetType =
  | "input"
  | "selection"
  | "link"
  | "project"
  | "claim"
  | "document"
  | "takeoff"
  | "general";

export interface ContextMenuTarget {
  type: ContextTargetType;
  element: HTMLElement;
  inputElement?: HTMLInputElement | HTMLTextAreaElement;
  selectedText?: string;
  linkUrl?: string;
  linkText?: string;
  data?: Record<string, string>;
}

export interface ContextMenuItem {
  id: string;
  label?: string;
  icon?: ReactNode;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  type?: MenuItemType;
  onClick?: (target: ContextMenuTarget) => void | Promise<void>;
}

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface ContextMenuState {
  isOpen: boolean;
  position: ContextMenuPosition;
  items: ContextMenuItem[];
  target: ContextMenuTarget | null;
}
