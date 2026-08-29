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
import { useRouter } from "../router";
import { AppShell } from "../components/AppShell";
import { ProjectCard } from "../components/ProjectCard";
import { CreateProjectModal } from "../components/CreateProjectModal";
import type { ProjectItem, ProjectStatus } from "../components/ProjectCard";

import { useProjects, dataService } from "../services/dataService";
import type { CreateProjectPayload } from "../components/CreateProjectModal";
import { AnimatedZap, AnimatedFolderPlus, AnimatedLayers, AnimatedCheckCircle } from "../components/icons/AnimatedIcons";

type FilterStatus = "all" | "processing" | "review" | "completed";
type ViewMode    = "grid" | "list";
type PageState   = "loading" | "empty" | "data" | "error";

export default function ProjectsPage() {
  const { navigate, searchParams } = useRouter();
  const stateParam = searchParams.get("state");
  const pageState: PageState =
    stateParam === "loading" || stateParam === "empty" || stateParam === "error"
      ? stateParam
      : "data";

  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sector, setSector] = useState("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [isModalOpen, setModalOpen] = useState(false);

  const projectsData = useProjects();
  const projectItems: ProjectItem[] = useMemo(
    () =>
      projectsData.map((p) => ({
        id: p.id,
        name: p.name,
        client: p.client,
        sector: p.sector,
        discipline: p.discipline,
        status: p.status,
        sheets: p.sheets,
        sheetType: p.sheetType,
        progress: p.progress,
        updatedAt: p.updated_at,
        members: p.members,
        description: p.description,
      })),
    [projectsData]
  );

  // Filter logic
  const filtered = useMemo(() => {
    if (pageState !== "data") return [];
    return projectItems.filter((p) => {
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
  }, [pageState, projectItems, filterStatus, sector, search]);

  const isZeroProjects = (pageState === "data" && projectItems.length === 0) || pageState === "empty";
  const clientCount = useMemo(() => new Set(projectItems.map((p) => p.client.split("·")[0].trim())).size, [projectItems]);
  const isFilteredEmpty = !isZeroProjects && pageState === "data" && filtered.length === 0;

  const handleCreateProject = async (payload: CreateProjectPayload) => {
    const fullDescription = [
      payload.description,
      payload.reference ? `Ref: ${payload.reference}` : "",
      payload.location ? `Location: ${payload.location}` : "",
      payload.notes ? `Notes: ${payload.notes}` : "",
    ].filter(Boolean).join("\n");

    try {
      const newProj = await dataService.createProjectAsync({
        name: payload.name,
        description: fullDescription || payload.description,
        client: payload.client,
        sector: payload.sector,
        discipline: payload.discipline,
      });
      setModalOpen(false);
      navigate(`/project/${newProj.id}/documents`);
    } catch (err: any) {
      console.error("Failed to create project:", err);
      alert(err?.message || "Failed to create project. Please check network connection and try again.");
    }
  };

  return (
    <AppShell activePath="/projects">
      <div className="projects-page">
        {/* ── Page Header ─────────────────────────────────────────────── */}
        <div className="projects-page__header">
          <div className="projects-page__header-text">
            <h1 className="projects-page__title">Engineering Projects</h1>
            <p className="projects-page__subtitle">
              {isZeroProjects
                ? "Your projects act as working contexts for engineering drawings, takeoff verification, AI investigation, and execution planning."
                : `${projectItems.length} active project${projectItems.length > 1 ? "s" : ""} across ${clientCount} client${clientCount > 1 ? "s" : ""}`}
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

        {/* ── Toolbar (Only shown when projects exist) ─────────────────── */}
        {!isZeroProjects && pageState === "data" && (
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

        {/* Zero Projects — Intelligent Engineering Workspace Initializer */}
        {isZeroProjects && (
          <div
            className="projects-empty-workspace"
            style={{
              maxWidth: "840px",
              margin: "32px auto",
              padding: "36px 32px",
              background: "var(--app-surface-1, #18191c)",
              border: "1px solid var(--app-border, rgba(255, 255, 255, 0.1))",
              borderRadius: "12px",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.24)",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "28px" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "14px",
                  background: "rgba(59, 130, 246, 0.12)",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#60a5fa",
                  margin: "0 auto 16px auto",
                }}
              >
                <IconBlueprint aria-hidden="true" />
              </div>

              <h2 style={{ fontSize: "1.45rem", fontWeight: 700, color: "var(--app-text-primary, #f8fafc)", margin: "0 0 8px 0" }}>
                Start with an engineering drawing package
              </h2>
              <p style={{ fontSize: "0.95rem", color: "var(--app-text-secondary, #94a3b8)", maxWidth: "560px", margin: "0 auto", lineHeight: "1.55" }}>
                Vectoris organizes your drawing sets into isolated project workspaces for vector decompression, automated component perception, and verified takeoff schedules.
              </p>
            </div>

            {/* 3 Structured Workflow Steps */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "14px",
                marginBottom: "32px",
              }}
            >
              <div
                style={{
                  padding: "16px",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--app-border, rgba(255, 255, 255, 0.07))",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: "rgba(59, 130, 246, 0.2)", color: "#60a5fa", fontSize: "12px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>1</span>
                  <strong style={{ fontSize: "13.5px", color: "var(--app-text-primary, #f8fafc)" }}>Initialize Container</strong>
                </div>
                <p style={{ fontSize: "12.5px", color: "var(--app-text-secondary, #94a3b8)", margin: 0, lineHeight: "1.45" }}>
                  Define project name, client, and engineering discipline (Data Center, Industrial, Commercial).
                </p>
              </div>

              <div
                style={{
                  padding: "16px",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--app-border, rgba(255, 255, 255, 0.07))",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: "rgba(59, 130, 246, 0.2)", color: "#60a5fa", fontSize: "12px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>2</span>
                  <strong style={{ fontSize: "13.5px", color: "var(--app-text-primary, #f8fafc)" }}>Ingest Drawings</strong>
                </div>
                <p style={{ fontSize: "12.5px", color: "var(--app-text-secondary, #94a3b8)", margin: 0, lineHeight: "1.45" }}>
                  Upload multi-page electrical PDFs or AutoCAD DWG/DXF drawings for on-device vector analysis.
                </p>
              </div>

              <div
                style={{
                  padding: "16px",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--app-border, rgba(255, 255, 255, 0.07))",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: "rgba(59, 130, 246, 0.2)", color: "#60a5fa", fontSize: "12px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>3</span>
                  <strong style={{ fontSize: "13.5px", color: "var(--app-text-primary, #f8fafc)" }}>Verify &amp; Plan</strong>
                </div>
                <p style={{ fontSize: "12.5px", color: "var(--app-text-secondary, #94a3b8)", margin: 0, lineHeight: "1.45" }}>
                  Inspect detected symbols on the CAD canvas and compile grounded project execution plans.
                </p>
              </div>
            </div>

            {/* Dual Interactive Actions */}
            <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setModalOpen(true)}
                style={{ padding: "11px 22px", fontSize: "13.5px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "8px" }}
              >
                <IconPlus aria-hidden="true" />
                Create First Project
              </button>

              <button
                type="button"
                className="btn btn--sample-cta"
                onClick={() => {
                  dataService.seedSampleProject();
                }}
                style={{ padding: "11px 22px", fontSize: "13.5px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "8px" }}
              >
                <AnimatedZap size={15} color="var(--app-amber, #f59e0b)" />
                <span>Load Sample Hyperscale Project</span>
              </button>
            </div>
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
        {!isZeroProjects && pageState === "data" && viewMode === "grid" && filtered.length > 0 && (
          <div className="projects-grid" role="list">
            {filtered.map((project, i) => (
              <div key={project.id} role="listitem">
                <ProjectCard
                  project={project}
                  viewMode="grid"
                  staggerIndex={i}
                  onClick={() => {
                    navigate(`/project/${project.id}`);
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Data — List */}
        {!isZeroProjects && pageState === "data" && viewMode === "list" && filtered.length > 0 && (
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
                      navigate(`/project/${project.id}`);
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

function IconBlueprint(props: { className?: string; "aria-hidden"?: boolean | "true" | "false" }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}
