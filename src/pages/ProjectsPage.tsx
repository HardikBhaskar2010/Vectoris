/**
 * ProjectsPage — Full-feature Engineering Projects Library.
 *
 * SPEC (docs/06_PAGES/PROJECTS.md):
 *   Plugs into AppShell as /projects.
 *   States: loading (skeleton), empty (empty state), error (retry), data (populated).
 *   State override: ?state=loading|empty|error for QA.
 *   Filters: status (all/processing/review/completed), sector dropdown, search.
 *   Views: grid (3-col) / list (table).
 *   Create Project: modal overlay (CREATE_PROJECT.md — Name + Description only).
 *
 * Motion (per skills read):
 *   - Grid entrance: stagger 40ms per card, opacity + translateY(8px) → 0, ease-out.
 *   - Cards: t-tilt 3D hover with glare (see ProjectCard.tsx).
 *   - Modal: t-modal scale 0.96→1 open, 1→0.96 close (see CreateProjectModal.tsx).
 *   - Skeleton: t-skel pulse → cross-fade reveal (transitions-dev 14-skeleton-reveal).
 *   - Filter tab indicator: sliding pill (transitions-dev 16-tabs-sliding).
 *   - prefers-reduced-motion honored throughout.
 *
 * Motion personality: Corporate — smooth confident, 0% overshoot (DESIGN.md).
 */

import { useState, useMemo } from "react";
import { AppShell } from "../components/AppShell";
import { ProjectCard } from "../components/ProjectCard";
import { CreateProjectModal } from "../components/CreateProjectModal";
import type { ProjectItem, ProjectStatus } from "../components/ProjectCard";

// ── Demo Data ─────────────────────────────────────────────────────────────────
const DEMO_PROJECTS: ProjectItem[] = [
  {
    id: "p1",
    name: "ABC Data Center",
    client: "Equinix · Phase 2",
    sector: "data-center",
    discipline: "ELEC-HV",
    status: "processing",
    sheets: 142,
    sheetType: "DWG",
    progress: 45,
    updatedAt: "2h ago",
    members: [
      { name: "Hardik Bhaskar", initials: "HB", avatarColor: "#2d4a6e" },
      { name: "Rina Mehta",     initials: "RM", avatarColor: "#3d5a3e" },
      { name: "Zaid Siddiqui",  initials: "ZS", avatarColor: "#5a3d3d" },
    ],
    description: "High-density server room electrical takeoff — cable tray and feeder layouts.",
  },
  {
    id: "p2",
    name: "Omega Plant Expansion",
    client: "Tesla · Austin TX",
    sector: "industrial",
    discipline: "MECH-HVAC",
    status: "completed",
    sheets: 308,
    sheetType: "DWG",
    progress: 100,
    updatedAt: "1d ago",
    members: [
      { name: "Arjun Nair",    initials: "AN", avatarColor: "#3d4a5d" },
      { name: "Priya Sharma",  initials: "PS", avatarColor: "#4d3d5a" },
    ],
    description: "Full HVAC and mechanical scope for new production wing.",
  },
  {
    id: "p3",
    name: "Sunrise Medical Tower",
    client: "HCA Healthcare · Phoenix",
    sector: "healthcare",
    discipline: "PLUMB",
    status: "review",
    sheets: 76,
    sheetType: "PDF",
    progress: 78,
    updatedAt: "4h ago",
    members: [
      { name: "Chen Wei",      initials: "CW", avatarColor: "#3a5a3a" },
      { name: "Laila Hassan",  initials: "LH", avatarColor: "#5a4a2d" },
      { name: "Omar Patel",    initials: "OP", avatarColor: "#2d3a5a" },
      { name: "Nadia Kovacs",  initials: "NK", avatarColor: "#5a2d4a" },
    ],
    description: "Plumbing riser diagrams and fixture schedule extraction.",
  },
  {
    id: "p4",
    name: "Central Park Tower",
    client: "Brookfield Properties",
    sector: "commercial",
    discipline: "FIRE",
    status: "processing",
    sheets: 54,
    sheetType: "DWG",
    progress: 22,
    updatedAt: "30m ago",
    members: [
      { name: "Evan Torres",   initials: "ET", avatarColor: "#4a3d2d" },
    ],
    description: "Fire protection sprinkler layout and alarm panel drawings.",
  },
  {
    id: "p5",
    name: "I-35 Interchange Upgrade",
    client: "TxDOT · Austin",
    sector: "infrastructure",
    discipline: "CIVIL",
    status: "verified",
    sheets: 421,
    sheetType: "DWG",
    progress: 100,
    updatedAt: "3d ago",
    members: [
      { name: "Sasha Kim",     initials: "SK", avatarColor: "#2d5a4a" },
      { name: "Marcus Hill",   initials: "MH", avatarColor: "#4a2d5a" },
    ],
    description: "Bridge structural and drainage drawings, full scope.",
  },
  {
    id: "p6",
    name: "GreenLeaf Warehouse",
    client: "Amazon Logistics · Dallas",
    sector: "industrial",
    discipline: "ELEC-LV",
    status: "review",
    sheets: 198,
    sheetType: "BIM",
    progress: 61,
    updatedAt: "6h ago",
    members: [
      { name: "Fatima Al-Rashid", initials: "FA", avatarColor: "#3d4a2d" },
      { name: "Leo Nakamura",     initials: "LN", avatarColor: "#2d3a4a" },
      { name: "Beatrice Santos",  initials: "BS", avatarColor: "#4a2d3a" },
    ],
    description: "Low-voltage distribution and lighting design for 400,000 sq ft facility.",
  },
];

type FilterStatus = "all" | "processing" | "review" | "completed";
type ViewMode    = "grid" | "list";
type PageState   = "loading" | "empty" | "data" | "error";

function getPageState(): PageState {
  const p = new URLSearchParams(window.location.search);
  const s = p.get("state");
  if (s === "loading" || s === "empty" || s === "error") return s;
  return "data";
}

export default function ProjectsPage() {
  const [pageState] = useState<PageState>(getPageState);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sector, setSector] = useState("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [isModalOpen, setModalOpen] = useState(false);

  // Filter logic
  const filtered = useMemo(() => {
    if (pageState !== "data") return [];
    return DEMO_PROJECTS.filter((p) => {
      const matchStatus =
        filterStatus === "all" ? true
        : filterStatus === "completed" ? (p.status === "completed" || p.status === "verified")
        : p.status === filterStatus;
      const matchSector = sector === "all" || p.sector === sector;
      const matchSearch = search === "" ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.client.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSector && matchSearch;
    });
  }, [pageState, filterStatus, sector, search]);

  const isFilteredEmpty = pageState === "data" && DEMO_PROJECTS.length > 0 && filtered.length === 0;

  const handleCreateProject = async () => {
    // Demo: close modal after brief simulated delay
    await new Promise<void>((res) => setTimeout(res, 1200));
    setModalOpen(false);
  };

  return (
    <AppShell activePath="/projects">
      <div className="projects-page">
        {/* ── Page Header ─────────────────────────────────────────────── */}
        <div className="projects-page__header">
          <div className="projects-page__header-text">
            <h1 className="projects-page__title">Engineering Projects</h1>
            <p className="projects-page__subtitle">
              {pageState === "data"
                ? `${DEMO_PROJECTS.length} projects across ${new Set(DEMO_PROJECTS.map((p) => p.client.split("·")[0].trim())).size} clients`
                : "Manage, analyze, and track drawing takeoff across all active facilities."}
            </p>
          </div>
          <div className="projects-page__header-actions">
            <button
              type="button"
              className="btn btn--primary"
              id="btn-new-project"
              onClick={() => setModalOpen(true)}
            >
              <IconPlus aria-hidden="true" />
              New Project
            </button>
          </div>
        </div>

        {/* ── Toolbar ──────────────────────────────────────────────────── */}
        {pageState === "data" && (
          <div className="projects-page__toolbar">
            {/* Status filter — sliding pill tabs */}
            <div className="projects-filter-tabs" role="tablist" aria-label="Filter by status">
              {(["all", "processing", "review", "completed"] as FilterStatus[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  role="tab"
                  aria-selected={filterStatus === f}
                  className={`projects-filter-tab${filterStatus === f ? " is-active" : ""}`}
                  onClick={() => setFilterStatus(f)}
                >
                  {f === "all" ? "All Projects"
                   : f === "processing" ? "Processing"
                   : f === "review"     ? "In Review"
                   : "Completed"}
                </button>
              ))}
            </div>

            {/* Right: Sector + Search + View Toggle */}
            <div className="projects-toolbar__right">
              {/* Sector select */}
              <div className="projects-sector-select">
                <select
                  className="projects-select"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  aria-label="Filter by sector"
                >
                  <option value="all">All Sectors</option>
                  <option value="data-center">Data Centers</option>
                  <option value="industrial">Industrial</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="commercial">Commercial</option>
                  <option value="infrastructure">Infrastructure</option>
                </select>
                <IconChevronDown aria-hidden="true" />
              </div>

              {/* Search */}
              <div className="projects-search">
                <IconSearch aria-hidden="true" />
                <input
                  type="search"
                  className="projects-search__input"
                  placeholder="Search projects…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search projects"
                />
              </div>

              {/* View mode toggle */}
              <div className="projects-view-toggle" role="group" aria-label="View mode">
                <button
                  type="button"
                  className={`projects-view-btn${viewMode === "grid" ? " is-active" : ""}`}
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid view"
                  aria-pressed={viewMode === "grid"}
                >
                  <IconGrid aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={`projects-view-btn${viewMode === "list" ? " is-active" : ""}`}
                  onClick={() => setViewMode("list")}
                  aria-label="List view"
                  aria-pressed={viewMode === "list"}
                >
                  <IconList aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Body States ──────────────────────────────────────────────── */}

        {/* Loading — skeleton grid */}
        {pageState === "loading" && (
          <div className="projects-skeleton-grid" aria-busy="true" aria-label="Loading projects">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="t-skel project-card-skeleton">
                <div className="t-skel-skeleton is-pulsing">
                  <div className="skel-card">
                    <div className="skel-row skel-row--header">
                      <div className="skel-circle" />
                      <div className="skel-lines">
                        <div className="skel-line skel-line--lg" />
                        <div className="skel-line skel-line--sm" />
                      </div>
                    </div>
                    <div className="skel-line skel-line--full" style={{ marginTop: "1rem" }} />
                    <div className="skel-bar" />
                    <div className="skel-row skel-row--footer">
                      <div className="skel-avatars">
                        <div className="skel-avatar" />
                        <div className="skel-avatar" />
                      </div>
                      <div className="skel-line skel-line--xs" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty — no projects yet */}
        {pageState === "empty" && (
          <div className="projects-empty-state">
            <div className="projects-empty-state__icon" aria-hidden="true">
              <EmptyProjectsIllustration />
            </div>
            <h2 className="projects-empty-state__heading">No projects yet</h2>
            <p className="projects-empty-state__body">
              Create your first project and bring your engineering data together.
              Add drawings, requirements, takeoffs, BOQs, and supporting documents —
              Vectoris will organize the project context for you.
            </p>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => setModalOpen(true)}
            >
              <IconPlus aria-hidden="true" />
              Create First Project
            </button>
          </div>
        )}

        {/* Error */}
        {pageState === "error" && (
          <div className="projects-error-state">
            <div className="projects-error-state__icon" aria-hidden="true">
              <IconErrorCloud />
            </div>
            <h2 className="projects-error-state__heading">Failed to load projects</h2>
            <p className="projects-error-state__body">
              There was a problem fetching your projects. Check your connection and try again.
            </p>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => window.location.reload()}
            >
              <IconRefresh aria-hidden="true" />
              Retry
            </button>
          </div>
        )}

        {/* Filtered Empty */}
        {isFilteredEmpty && (
          <div className="projects-filter-empty">
            <p className="projects-filter-empty__msg">
              No projects match your current filters.
            </p>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => { setFilterStatus("all"); setSector("all"); setSearch(""); }}
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Data — Grid */}
        {pageState === "data" && viewMode === "grid" && filtered.length > 0 && (
          <div className="projects-grid" role="list">
            {filtered.map((project, i) => (
              <div key={project.id} role="listitem">
                <ProjectCard
                  project={project}
                  viewMode="grid"
                  staggerIndex={i}
                  onClick={() => {
                    window.location.href = `/project?project=${project.id}`;
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Data — List */}
        {pageState === "data" && viewMode === "list" && filtered.length > 0 && (
          <div className="projects-list-wrap">
            <table className="projects-table" aria-label="Projects list">
              <thead>
                <tr className="projects-table__head">
                  <th scope="col">Project</th>
                  <th scope="col">Discipline</th>
                  <th scope="col">Sheets</th>
                  <th scope="col">Status</th>
                  <th scope="col">Progress</th>
                  <th scope="col">Team</th>
                  <th scope="col">Updated</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    viewMode="list"
                    onClick={() => {
                      window.location.href = `/project?project=${project.id}`;
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreateProject}
      />
    </AppShell>
  );
}

// ── Page-level Icons ──────────────────────────────────────────────────────────
function IconPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path d="M7.5 2v11M2 7.5h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}
function IconGrid() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="8.5" y="2" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="2" y="8.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="8.5" y="8.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  );
}
function IconList() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path d="M2 4h11M2 7.5h11M2 11h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}
function IconChevronDown() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M3 5l3.5 3.5L10 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconRefresh() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M1.5 7a5.5 5.5 0 019.5-3.8L12.5 5M12.5 1.5V5H9"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconErrorCloud() {
  return (
    <svg width="56" height="48" viewBox="0 0 56 48" fill="none" aria-hidden="true">
      <path d="M14 36a10 10 0 01-2-19.8A14 14 0 0140 18h2a10 10 0 010 20H14z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M28 24v6M28 33v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function EmptyProjectsIllustration() {
  return (
    <svg width="120" height="96" viewBox="0 0 120 96" fill="none" aria-hidden="true">
      {/* Grid background dots */}
      {[20, 40, 60, 80, 100].map((x) =>
        [16, 32, 48, 64, 80].map((y) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1.2" fill="currentColor" opacity="0.12"/>
        ))
      )}
      {/* Blueprint frame */}
      <rect x="24" y="20" width="72" height="56" rx="4" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.3"/>
      {/* Inner cross */}
      <path d="M60 28v40M44 48h32" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.4"/>
      {/* Center circle — folder/project icon */}
      <circle cx="60" cy="48" r="14" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
      <path d="M54 48h12M60 42v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
    </svg>
  );
}
