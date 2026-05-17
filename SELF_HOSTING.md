# Self-Hosting ProofFlow

If you want to run your own ProofFlow instance rather than using the hosted app.

## 1. Create a GitHub App

Go to [github.com/settings/apps/new](https://github.com/settings/apps/new) and create a new app with:

**Permissions:**
| Permission | Level |
|---|---|
| Issues | Read & write |
| Pull requests | Read & write |
| Checks | Read & write |
| Contents | Read & write |
| Metadata | Read-only |

**Webhook events to subscribe:**
- `issues`
- `issue_comment`
- `pull_request`
- `check_run`
- `installation`

Set the Webhook URL to your deployment URL (e.g. `https://your-app.fly.dev/`). Generate and save a Webhook Secret. Download the private key (`.pem` file).

## 2. Deploy to Fly.io

```sh
git clone https://github.com/CoreyThuro/proofflow
cd proofflow

fly launch --name proofflow
fly postgres create --name proofflow-db
fly postgres attach --app proofflow proofflow-db

fly secrets set APP_ID=<your-app-id>
fly secrets set PRIVATE_KEY="$(cat proofflow.pem)"
fly secrets set WEBHOOK_SECRET=<your-webhook-secret>
fly secrets set ANTHROPIC_API_KEY=<your-anthropic-key>

# Optional: Aristotle for autonomous proof generation
fly secrets set ARISTOTLE_API_KEY=<your-aristotle-key>

fly deploy
```

Migrations run automatically on deploy.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `APP_ID` | Yes | GitHub App ID |
| `PRIVATE_KEY` | Yes | Full PEM contents of the private key |
| `WEBHOOK_SECRET` | Yes | Webhook secret from App settings |
| `DATABASE_URL` | Yes | PostgreSQL connection string (set automatically by `fly postgres attach`) |
| `ANTHROPIC_API_KEY` | Yes | Claude API key (fallback prover when Aristotle is not configured) |
| `ARISTOTLE_API_KEY` | No | Aristotle API key for autonomous proof generation |

## Local development

```sh
cp .env.example .env
# Fill in APP_ID, PRIVATE_KEY, WEBHOOK_SECRET, DATABASE_URL, ANTHROPIC_API_KEY

npm install
npm run migrate
npm run dev
```

Use [smee.io](https://smee.io) to forward GitHub webhooks to localhost.
