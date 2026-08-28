/**
 * VectorisContextMenu.tsx — Custom Desktop-Native Right-Click Context Menu.
 *
 * Replaces generic Chromium/WebView browser context menu with accessible,
 * context-aware engineering workstation menus.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "../../router";
import { buildMenuItems, detectContextTarget } from "./contextMenuActions";
import type { ContextMenuItem, ContextMenuPosition, ContextMenuTarget } from "./types";

interface ContextMenuContextValue {
  openContextMenu: (position: ContextMenuPosition, customItems?: ContextMenuItem[]) => void;
  closeContextMenu: () => void;
}

const ContextMenuContext = createContext<ContextMenuContextValue | null>(null);

export function useContextMenu(): ContextMenuContextValue {
  const ctx = useContext(ContextMenuContext);
  if (!ctx) {
    throw new Error("useContextMenu must be used within ContextMenuProvider");
  }
  return ctx;
}

export function ContextMenuProvider({ children }: { children: ReactNode }) {
  const { navigate, currentPath } = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<ContextMenuPosition>({ x: 0, y: 0 });
  const [adjustedPos, setAdjustedPos] = useState<ContextMenuPosition>({ x: 0, y: 0 });
  const [items, setItems] = useState<ContextMenuItem[]>([]);
  const [target, setTarget] = useState<ContextMenuTarget | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const menuRef = useRef<HTMLDivElement>(null);
  const originalFocusedElRef = useRef<HTMLElement | null>(null);

  const closeContextMenu = useCallback(() => {
    setIsOpen(false);
    setFocusedIndex(-1);
    // Restore focus to previous element if needed
    if (originalFocusedElRef.current && typeof originalFocusedElRef.current.focus === "function") {
      try {
        originalFocusedElRef.current.focus();
      } catch {
        // Ignore focus restore failure
      }
    }
  }, []);

  const openContextMenu = useCallback((pos: ContextMenuPosition, customItems?: ContextMenuItem[]) => {
    setPosition(pos);
    setAdjustedPos(pos);
    setFocusedIndex(-1);
    if (customItems) {
      setItems(customItems);
    }
    setIsOpen(true);
  }, []);

  // ── Global Context Menu Interceptor ──────────────────────────────────────
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // Prevent generic browser context menu
      e.preventDefault();

      originalFocusedElRef.current = document.activeElement as HTMLElement | null;

      // Detect contextual target
      const detectedTarget = detectContextTarget(e);
      setTarget(detectedTarget);

      // If user right-clicked inside an input/textarea, focus it so text editing operations work seamlessly
      if (detectedTarget.type === "input" && detectedTarget.inputElement) {
        try {
          detectedTarget.inputElement.focus();
        } catch {
          // Ignore
        }
      }

      const contextualItems = buildMenuItems(detectedTarget, navigate, currentPath);
      setItems(contextualItems);
      setPosition({ x: e.clientX, y: e.clientY });
      setAdjustedPos({ x: e.clientX, y: e.clientY });
      setFocusedIndex(-1);
      setIsOpen(true);
    };

    window.addEventListener("contextmenu", handleContextMenu, { capture: true });

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu, { capture: true });
    };
  }, [navigate, currentPath]);

  // ── Viewport Clamping & Edge Detection ───────────────────────────────────
  useLayoutEffect(() => {
    if (!isOpen || !menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const padding = 8;

    let newX = position.x;
    let newY = position.y;

    // Right boundary
    if (newX + rect.width > window.innerWidth - padding) {
      newX = Math.max(padding, window.innerWidth - rect.width - padding);
    }

    // Bottom boundary
    if (newY + rect.height > window.innerHeight - padding) {
      newY = Math.max(padding, window.innerHeight - rect.height - padding);
    }

    // Left boundary
    if (newX < padding) newX = padding;

    // Top boundary
    if (newY < padding) newY = padding;

    setAdjustedPos({ x: newX, y: newY });
  }, [isOpen, position, items]);

  // ── Dismissal Listeners ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeContextMenu();
      }
    };

    const handleScroll = (e: Event) => {
      // Don't close if scrolling inside the menu itself
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      closeContextMenu();
    };

    const handleWindowBlur = () => {
      closeContextMenu();
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", closeContextMenu);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", closeContextMenu);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [isOpen, closeContextMenu]);

  // ── Keyboard Navigation Inside Menu ──────────────────────────────────────
  const actionableItems = items.filter((item) => item.type !== "separator" && item.type !== "header");

  const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isOpen || actionableItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => {
        let next = prev + 1;
        while (next < actionableItems.length && actionableItems[next].disabled) {
          next++;
        }
        return next >= actionableItems.length ? 0 : next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => {
        let prevIdx = prev - 1;
        while (prevIdx >= 0 && actionableItems[prevIdx].disabled) {
          prevIdx--;
        }
        return prevIdx < 0 ? actionableItems.length - 1 : prevIdx;
      });
    } else if (e.key === "Home") {
      e.preventDefault();
      const firstEnabled = actionableItems.findIndex((i) => !i.disabled);
      if (firstEnabled !== -1) setFocusedIndex(firstEnabled);
    } else if (e.key === "End") {
      e.preventDefault();
      for (let i = actionableItems.length - 1; i >= 0; i--) {
        if (!actionableItems[i].disabled) {
          setFocusedIndex(i);
          break;
        }
      }
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < actionableItems.length) {
        const item = actionableItems[focusedIndex];
        if (!item.disabled && item.onClick && target) {
          closeContextMenu();
          void item.onClick(target);
        }
      }
    }
  };

  const handleItemClick = (item: ContextMenuItem) => {
    if (item.disabled || !item.onClick || !target) return;
    closeContextMenu();
    void item.onClick(target);
  };

  return (
    <ContextMenuContext.Provider value={{ openContextMenu, closeContextMenu }}>
      {children}

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              className="context-menu"
              style={{
                top: `${adjustedPos.y}px`,
                left: `${adjustedPos.x}px`,
              }}
              role="menu"
              aria-label="Application context actions"
              tabIndex={0}
              onKeyDown={handleMenuKeyDown}
            >
              {items.map((item, idx) => {
                if (item.type === "separator") {
                  return (
                    <div
                      key={item.id || `sep-${idx}`}
                      className="context-menu__separator"
                      role="separator"
                    />
                  );
                }

                if (item.type === "header") {
                  return (
                    <div
                      key={item.id || `head-${idx}`}
                      className="context-menu__header"
                      role="none"
                    >
                      {item.label}
                    </div>
                  );
                }

                const actionableIdx = actionableItems.indexOf(item);
                const isFocused = actionableIdx === focusedIndex;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`context-menu__item ${isFocused ? "is-focused" : ""} ${
                      item.danger ? "context-menu__item--danger" : ""
                    }`}
                    role="menuitem"
                    aria-disabled={item.disabled}
                    disabled={item.disabled}
                    onClick={() => handleItemClick(item)}
                    onMouseEnter={() => setFocusedIndex(actionableIdx)}
                  >
                    <span className="context-menu__item-main">
                      {item.icon ? <span className="context-menu__icon">{item.icon}</span> : null}
                      <span className="context-menu__label">{item.label}</span>
                    </span>

                    {item.shortcut ? (
                      <span className="context-menu__shortcut" aria-hidden="true">
                        {item.shortcut}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>,
            document.body
          )
        : null}
    </ContextMenuContext.Provider>
  );
}
