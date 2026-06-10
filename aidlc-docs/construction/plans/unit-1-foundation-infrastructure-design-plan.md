# Unit 1: Foundation — Infrastructure Design Plan

## Unit
**Foundation: Auth, Profile, Nickname, Avatar**

## Plan Checklist
- [x] Collect and analyze answers to clarification questions below
- [x] Generate `aidlc-docs/construction/unit-1-foundation/infrastructure-design/infrastructure-design.md`
- [x] Generate `aidlc-docs/construction/unit-1-foundation/infrastructure-design/deployment-architecture.md`
- [x] Generate `aidlc-docs/construction/shared-infrastructure.md` (shared across all units)

---

## Clarification Questions

Please answer each question by filling in the letter after the `[Answer]:` tag.
If none of the options match, choose the last option (X) and describe your preference.

---

### Question 1 — Deployment Environments
How many deployment environments should be configured in Vercel and Supabase?

A) Two — `development` (local + Vercel Preview) and `production` only
B) Three — `development` (local), `staging` (Vercel Preview branch), and `production`
C) Two, but with separate Supabase projects for staging and production (not just separate env vars)
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Question 2 — Custom Domain
Should a custom domain be configured on Vercel for v1 launch, or use the Vercel default URL?

A) Custom domain from day one — configure DNS before launch (e.g., `quiniela2026.com`)
B) Vercel default URL for now — custom domain can be added later without code changes
C) Custom domain on production only; Vercel default URL is fine for preview/staging
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Question 3 — Supabase Plan
Which Supabase plan will be used for the production project?

A) Free tier — suitable for ~500 users; 500 MB DB, 1 GB Storage, 50 MB file upload limit, no image transforms
B) Pro tier ($25/month) — 8 GB DB, 100 GB Storage, 5 GB file upload, image transform API (needed for avatar thumbnails), daily backups
C) Start with Free, upgrade to Pro before World Cup launch
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Question 4 — Auth Email Provider
Supabase Auth sends verification emails, password reset links, and email change confirmations. Which email provider should be used?

A) Supabase built-in SMTP — zero configuration, 3 emails/hour rate limit (acceptable for ~500 users at launch)
B) Resend (external) — configure a custom SMTP in Supabase Auth; better deliverability, no rate limit, free tier up to 3,000 emails/month
C) Other transactional email service (SendGrid, Postmark, etc.)
X) Other (please describe after [Answer]: tag below)

[Answer]: B y aprovecha de agregar En el docker-compose.yml para usar mailpit en el desarrollo local

---

### Question 5 — Monitoring and Observability
What monitoring setup is needed for v1?

A) Minimal — Vercel dashboard (function logs, deployment status) + Supabase dashboard (DB metrics, Auth logs) only; no external tools
B) Standard — add Vercel Analytics for web vitals and visitor metrics; keep Supabase dashboard for backend
C) Enhanced — Vercel Analytics + an external error tracker (e.g., Sentry free tier) for runtime error capture and alerting
X) Other (please describe after [Answer]: tag below)

[Answer]: A
