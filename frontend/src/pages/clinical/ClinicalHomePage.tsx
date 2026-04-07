import { useAccount } from '../../context/AccountContext'

function readinessLabel(readiness: 'ready' | 'not_ready'): string {
  return readiness === 'ready' ? 'Ready' : 'Not ready'
}

export function ClinicalHomePage() {
  const { account } = useAccount()
  const cp = account.clinicalProgress

  if (cp == null) {
    return (
      <main className="portal-page">
        <p
          style={{
            margin: 0,
            fontSize: 'var(--portal-body-font-size)',
            lineHeight: 'var(--portal-body-line-height)',
            color: 'var(--portal-text-muted)',
          }}
        >
          Clinical progress for your program appears here when available from your student record.
        </p>
      </main>
    )
  }

  const pct =
    cp.requiredHours > 0
      ? Math.min(100, Math.round((cp.completedHours / cp.requiredHours) * 100))
      : cp.completedHours > 0
        ? 100
        : 0

  return (
    <main className="portal-page">
      <h2 className="portal-section-heading">Clinical progress</h2>
      <p className="portal-page-lede">
        Summary from your completed clinical courses and program hour requirements.
      </p>

      <section className="portal-card portal-academics-progress-card" aria-labelledby="clinical-progress-heading">
        <h3 id="clinical-progress-heading" className="portal-section-heading">
          Tracker
        </h3>
        <div className="portal-grid-4">
          <div>
            <p className="portal-card-label">Level</p>
            <p className="portal-card-value">{cp.level}</p>
          </div>
          <div>
            <p className="portal-card-label">Completed hours</p>
            <p className="portal-card-value">{cp.completedHours} hrs</p>
          </div>
          <div>
            <p className="portal-card-label">Required hours</p>
            <p className="portal-card-value">{cp.requiredHours} hrs</p>
          </div>
          <div>
            <p className="portal-card-label">Readiness</p>
            <p className="portal-card-value">{readinessLabel(cp.readiness)}</p>
          </div>
        </div>
        <div
          className="portal-academics-progress-track"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Clinical hours progress"
        >
          <div className="portal-academics-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="portal-academics-progress-caption portal-inline-note portal-inline-note--flush">
          {cp.completedHours} of {cp.requiredHours} required hours logged in clinical records.
        </p>
      </section>

      <section className="portal-module-panel" aria-labelledby="clinical-courses-heading">
        <h3 id="clinical-courses-heading" className="portal-module-panel-heading">
          Completed courses
        </h3>
        {cp.completedCourses.length === 0 ? (
          <p className="portal-inline-note portal-inline-note--flush">No clinical course rows on file yet.</p>
        ) : (
          <ul className="portal-module-list">
            {cp.completedCourses.map((code) => (
              <li key={code} className="portal-module-list-item">
                <span className="portal-module-list-label">{code}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="portal-module-panel" aria-labelledby="clinical-missing-heading">
        <h3 id="clinical-missing-heading" className="portal-module-panel-heading">
          Missing or next steps
        </h3>
        {cp.missing.length === 0 ? (
          <p className="portal-inline-note portal-inline-note--flush">No open items listed.</p>
        ) : (
          <ul className="portal-module-list">
            {cp.missing.map((item) => (
              <li key={item} className="portal-module-list-item">
                <span className="portal-module-list-label">{item}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
