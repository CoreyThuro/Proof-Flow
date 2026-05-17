# ProofFlow — Setup Guide

## GitHub App Registration

Register a new GitHub App at https://github.com/settings/apps/new (personal) or
https://github.com/organizations/YOUR_ORG/settings/apps/new (org-level).

See https://probot.github.io/docs/development/ for the full registration walkthrough.

### Required Permissions

| Permission | Access |
|---|---|
| Issues | Read & write |
| Pull requests | Read & write |
| Checks | Read & write |
| Contents | Read-only |
| Metadata | Read-only (mandatory) |

### Webhook Events to Subscribe

Check all of the following in the "Subscribe to events" section:

- `issues`
- `issue_comment`
- `pull_request`
- `push`
- `installation`

Set the Webhook URL to your deployed app's URL (e.g. `https://proofflow.fly.dev/`).

Generate a Webhook Secret and copy it — you will need it as `WEBHOOK_SECRET`.

### Required Environment Variables

| Variable | Description |
|---|---|
| `APP_ID` | Numeric App ID shown on the GitHub App settings page |
| `PRIVATE_KEY` | Contents of the `.pem` file downloaded from the App settings (include the full PEM including headers) |
| `WEBHOOK_SECRET` | Secret you entered in the Webhook Secret field during registration |
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://user:pass@host:5432/proofflow` |

For local development, copy `.env.example` to `.env` and fill in real values.
Probot reads `.env` automatically via dotenv.

---

## Database Setup

ProofFlow uses PostgreSQL managed via `node-pg-migrate`.

### Provision (Fly.io)

```sh
fly postgres create --name proofflow-db
fly postgres attach --app proofflow proofflow-db
# Fly sets DATABASE_URL automatically in the app's secrets
```

### Run migrations

```sh
npm run migrate
```

This runs all pending migrations in `src/db/migrations/` in order.

---

## Local Development

```sh
cp .env.example .env
# Fill in APP_ID, PRIVATE_KEY, WEBHOOK_SECRET, DATABASE_URL

npm install
npm run migrate   # Apply DB schema
npm run dev       # Start with nodemon + smee.io proxy
```

Use [smee.io](https://smee.io) or [ngrok](https://ngrok.com) to forward GitHub webhooks to localhost.

---

## Deployment (Fly.io)

```sh
fly launch --name proofflow   # First time only
fly secrets set APP_ID=...
fly secrets set PRIVATE_KEY="$(cat proofflow.pem)"
fly secrets set WEBHOOK_SECRET=...
fly deploy
```
