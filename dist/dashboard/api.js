"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardApiHandler = dashboardApiHandler;
exports.dashboardUiHandler = dashboardUiHandler;
const repos_1 = require("../db/queries/repos");
const dashboardSnapshots_1 = require("../db/queries/dashboardSnapshots");
async function dashboardApiHandler(req, res) {
    const { owner, name } = req.params;
    const repo = await (0, repos_1.getRepoByOwnerAndName)(owner, name);
    if (!repo) {
        res.status(404).json({ error: 'Repo not found' });
        return;
    }
    const snapshot = await (0, dashboardSnapshots_1.getLatestSnapshot)(repo.id);
    if (!snapshot) {
        res.json({
            repo: `${owner}/${name}`,
            rfc_open: 0,
            rfc_approved: 0,
            rfc_abandoned: 0,
            rfc_closed: 0,
            theorems_formalized_with_rfc: 0,
            snapshot_at: null,
        });
        return;
    }
    res.json({
        repo: `${owner}/${name}`,
        rfc_open: snapshot.rfc_open,
        rfc_approved: snapshot.rfc_approved,
        rfc_abandoned: snapshot.rfc_abandoned,
        rfc_closed: snapshot.rfc_closed,
        theorems_formalized_with_rfc: snapshot.theorems_formalized_with_rfc,
        snapshot_at: snapshot.snapshot_at,
    });
}
function dashboardUiHandler(req, res) {
    const { owner, name } = req.params;
    res.setHeader('Content-Type', 'text/html');
    res.send(buildDashboardHtml(owner, name));
}
function buildDashboardHtml(owner, name) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ProofFlow — ${owner}/${name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f6f8fa; color: #24292f; }
    header { background: #24292f; color: #fff; padding: 16px 24px; display: flex; align-items: center; gap: 12px; }
    header h1 { font-size: 18px; font-weight: 600; }
    header span { font-size: 14px; color: #8b949e; }
    main { max-width: 800px; margin: 40px auto; padding: 0 24px; }
    h2 { font-size: 20px; margin-bottom: 24px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 32px; }
    .card { background: #fff; border: 1px solid #d0d7de; border-radius: 6px; padding: 20px; text-align: center; }
    .card .num { font-size: 36px; font-weight: 700; margin-bottom: 4px; }
    .card .label { font-size: 13px; color: #57606a; }
    .open .num { color: #0969da; }
    .approved .num { color: #1a7f37; }
    .abandoned .num { color: #9a6700; }
    .closed .num { color: #6e7781; }
    .formalized .num { color: #8250df; }
    .meta { font-size: 12px; color: #57606a; margin-top: 8px; }
    .error { color: #cf222e; padding: 20px; background: #fff; border: 1px solid #d0d7de; border-radius: 6px; }
  </style>
</head>
<body>
  <header>
    <h1>ProofFlow</h1>
    <span>${owner}/${name}</span>
  </header>
  <main>
    <h2>RFC Lifecycle Metrics</h2>
    <div class="grid" id="grid">Loading…</div>
    <p class="meta" id="meta"></p>
  </main>
  <script>
    fetch('/api/repos/${owner}/${name}/dashboard')
      .then(r => r.json())
      .then(d => {
        if (d.error) {
          document.getElementById('grid').innerHTML = '<div class="error">' + d.error + '</div>';
          return;
        }
        document.getElementById('grid').innerHTML = [
          ['open', d.rfc_open, 'Open'],
          ['approved', d.rfc_approved, 'Approved'],
          ['abandoned', d.rfc_abandoned, 'Abandoned'],
          ['closed', d.rfc_closed, 'Closed'],
          ['formalized', d.theorems_formalized_with_rfc, 'Formalized'],
        ].map(([cls, n, lbl]) =>
          '<div class="card ' + cls + '"><div class="num">' + n + '</div><div class="label">' + lbl + '</div></div>'
        ).join('');
        if (d.snapshot_at) {
          document.getElementById('meta').textContent = 'Last updated: ' + new Date(d.snapshot_at).toLocaleString();
        }
      })
      .catch(() => {
        document.getElementById('grid').innerHTML = '<div class="error">Failed to load dashboard data.</div>';
      });
  </script>
</body>
</html>`;
}
//# sourceMappingURL=api.js.map