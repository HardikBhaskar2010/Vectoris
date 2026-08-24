import { BrandMark } from "../components/BrandMark";
import { SystemNotice } from "../components/SystemNotice";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

const capabilityItems = [
  "PDF and scanned drawing ingestion",
  "Evidence-backed counts and measurements",
  "Human approval before export",
];

export function LandingPage() {
  const isOnline = useOnlineStatus();

  return (
    <main className="landing-shell">
      <div className="landing-shell__background" aria-hidden="true" />

      <section className="landing-panel" aria-labelledby="landing-title">
        <header className="landing-panel__header">
          <BrandMark />
          <span className="local-badge">Local-first desktop shell</span>
        </header>

        {!isOnline ? (
          <SystemNotice
            title="Connection unavailable"
            message="You can open the app shell, but authentication requires a network connection."
          />
        ) : null}

        <div className="landing-hero">
          <p className="landing-hero__eyebrow">Electrical takeoff intelligence</p>
          <h1 id="landing-title">AI proposes. Engineers decide. Vectoris keeps the evidence.</h1>
          <p className="landing-hero__copy">
            Vectoris turns drawing packages into traceable takeoff data for electrical engineering teams,
            with local-first file handling and human approval at every critical step.
          </p>
        </div>

        <div className="landing-actions" aria-label="Authentication actions">
          <a className="button button--primary" href="/auth?mode=signin" aria-label="Sign in to Vectoris">
            Sign in
          </a>
          <a className="button button--secondary" href="/auth?mode=signup" aria-label="Create a Vectoris account">
            Get started
          </a>
        </div>

        <ul className="capability-list" aria-label="Vectoris workflow capabilities">
          {capabilityItems.map((item) => (
            <li key={item}>
              <span aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="landing-workspace-preview" aria-label="Vectoris workflow preview">
        <div className="preview-frame">
          <div className="preview-frame__technical-header">
            <div className="preview-frame__cad-status">
              <span className="preview-frame__dot" aria-hidden="true" />
              <span className="preview-frame__file-label">SHEET_E104_LIGHTING_PLAN.DWG</span>
            </div>
            <span className="preview-frame__scale-tag">SCALE 1/8" = 1'-0" · LAYER 04-ELEC</span>
          </div>

          <div className="preview-grid">
            <div className="drawing-card" aria-hidden="true">
              <div className="drawing-card__sheet">
                <span className="drawing-card__route drawing-card__route--a" />
                <span className="drawing-card__route drawing-card__route--b" />
                <span className="drawing-card__box drawing-card__box--panel">P-02</span>
                <span className="drawing-card__box drawing-card__box--fixture">F-18</span>
              </div>
            </div>

            <div className="review-card">
              <p>Review queue</p>
              <div className="review-row">
                <span>Panelboard P-02</span>
                <strong>Evidence linked</strong>
              </div>
              <div className="review-row">
                <span>Linear conduit run</span>
                <strong>Needs review</strong>
              </div>
              <div className="review-row">
                <span>Fixture group F-18</span>
                <strong>Accepted</strong>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
