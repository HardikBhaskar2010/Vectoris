/**
 * GlobalCommandSearch.tsx — Lightweight, accessible command and search palette.
 *
 * Real Data:
 * - Queries dataService for Projects, Documents, and Investigations.
 * - Keyboard navigation (ArrowUp, ArrowDown, Enter, Escape).
 * - Global shortcut (⌘K / Ctrl+K).
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, Link } from "../router";
import { dataService } from "../services/dataService";
import type { Project, ProjectDocument, ChatSession } from "../data/types";

interface SearchResultItem {
  id: string;
  category: "project" | "document" | "session";
  categoryLabel: string;
  title: string;
  subtitle: string;
  metaBadge?: string;
  href: string;
}

interface GlobalCommandSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalCommandSearch({ isOpen, onClose }: GlobalCommandSearchProps) {
  const { navigate } = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset query and focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Derive search results reactively from dataService
  const results: SearchResultItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const projects: Project[] = dataService.getProjects();
    const documents: ProjectDocument[] = dataService.getAllDocuments();
    const sessions: ChatSession[] = dataService.getSessions();

    const items: SearchResultItem[] = [];

    // 1. Projects
    for (const p of projects) {
      if (
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q) ||
        p.discipline.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      ) {
        items.push({
          id: `proj-${p.id}`,
          category: "project",
          categoryLabel: "Projects",
          title: p.name,
          subtitle: `${p.client || "Local Client"} · ${p.discipline || "General"} · ${p.sheets || 0} sheets`,
          metaBadge: p.status,
          href: `/project/${p.id}`,
        });
      }
    }

    // 2. Documents
    for (const d of documents) {
      if (
        !q ||
        d.filename.toLowerCase().includes(q) ||
        d.format.toLowerCase().includes(q) ||
        d.upload_status.toLowerCase().includes(q)
      ) {
        const parentProject = projects.find((p) => p.id === d.project_id);
        items.push({
          id: `doc-${d.id}`,
          category: "document",
          categoryLabel: "Documents",
          title: d.filename,
          subtitle: `${parentProject?.name || "Project"} · ${d.format.toUpperCase()} · ${d.size_mb.toFixed(1)} MB`,
          metaBadge: d.upload_status,
          href: `/project/${d.project_id}/documents`,
        });
      }
    }

    // 3. Investigation Workshop
    for (const s of sessions) {
      if (
        !q ||
        s.title.toLowerCase().includes(q) ||
        (s.project_name && s.project_name.toLowerCase().includes(q))
      ) {
        items.push({
          id: `sess-${s.id}`,
          category: "session",
          categoryLabel: "Investigation Workshop",
          title: s.title,
          subtitle: `${s.project_name || "General Scope"} · ${s.message_count} records`,
          href: `/sessions`,
        });
      }
    }

    return items;
  }, [query]);

  // Keep selected index in range
  useEffect(() => {
    if (selectedIndex >= results.length) {
      setSelectedIndex(0);
    }
  }, [results.length, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.querySelector<HTMLElement>(`[data-index="${selectedIndex}"]`);
      selectedEl?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const current = results[selectedIndex];
      if (current) {
        onClose();
        navigate(current.href);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="cmd-palette-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        className="cmd-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Quick Search"
        onKeyDown={handleKeyDown}
      >
        <div className="cmd-palette__header">
          <svg className="cmd-palette__search-icon" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M11.5 11.5L16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            className="cmd-palette__input"
            placeholder="Search projects, blueprints, documents, investigations…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            aria-autocomplete="list"
            aria-controls="cmd-palette-list"
            aria-activedescendant={results[selectedIndex] ? results[selectedIndex].id : undefined}
          />
          <kbd className="cmd-palette__esc-kbd" onClick={onClose} title="Press Escape to close">
            ESC
          </kbd>
        </div>

        <div className="cmd-palette__results" id="cmd-palette-list" ref={listRef} role="listbox">
          {results.length === 0 ? (
            <div className="cmd-palette__empty" role="status">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
              </svg>
              <p>No results found for &ldquo;{query}&rdquo;</p>
              <span>Try searching for project titles, drawing filenames, or sessions.</span>
            </div>
          ) : (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <Link
                  key={item.id}
                  id={item.id}
                  to={item.href}
                  data-index={idx}
                  className={`cmd-palette__item${isSelected ? " cmd-palette__item--selected" : ""}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => onClose()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div className="cmd-palette__item-icon">
                    {item.category === "project" && <IconProjectCategory />}
                    {item.category === "document" && <IconDocumentCategory />}
                    {item.category === "session" && <IconSessionCategory />}
                  </div>

                  <div className="cmd-palette__item-info">
                    <span className="cmd-palette__item-title">{item.title}</span>
                    <span className="cmd-palette__item-sub">{item.subtitle}</span>
                  </div>

                  <div className="cmd-palette__item-meta">
                    <span className="cmd-palette__category-badge">{item.categoryLabel}</span>
                    {item.metaBadge && (
                      <span className={`cmd-palette__status-badge cmd-palette__status-badge--${item.metaBadge}`}>
                        {item.metaBadge}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>

        <div className="cmd-palette__footer">
          <div className="cmd-palette__hints">
            <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
            <span><kbd>↵</kbd> Open</span>
            <span><kbd>ESC</kbd> Close</span>
          </div>
          <span className="cmd-palette__count">
            {results.length} {results.length === 1 ? "result" : "results"}
          </span>
        </div>
      </div>
    </div>
  );
}

function IconProjectCategory() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 4.5A1.5 1.5 0 013.5 3h3l1.5 2H13.5A1.5 1.5 0 0115 6.5v6A1.5 1.5 0 0113.5 14h-10A1.5 1.5 0 012 12.5v-8z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconDocumentCategory() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 2.5A1.5 1.5 0 014.5 1h5l4 4v8.5A1.5 1.5 0 0112 15H4.5A1.5 1.5 0 013 13.5v-11z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 1v4H13" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSessionCategory() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13z" />
      <path d="M6 10c0-1.1.9-2 2-2s2 .9 2 2" strokeLinecap="round" />
      <circle cx="8" cy="5.5" r="1" fill="currentColor" />
    </svg>
  );
}
