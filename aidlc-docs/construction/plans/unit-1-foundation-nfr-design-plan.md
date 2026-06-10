# Unit 1: Foundation — NFR Design Plan

## Unit
**Foundation: Auth, Profile, Nickname, Avatar**

## Plan Checklist
- [x] Collect and analyze answers to clarification questions below
- [x] Generate `aidlc-docs/construction/unit-1-foundation/nfr-design/nfr-design-patterns.md`
- [x] Generate `aidlc-docs/construction/unit-1-foundation/nfr-design/logical-components.md`

---

## Clarification Questions

Please answer each question by filling in the letter after the `[Answer]:` tag.
If none of the options match, choose the last option (X) and describe your preference.

---

### Question 1 — Security: Content Security Policy
The app uses Google OAuth (external redirect) and Supabase Storage (external URLs for avatars). Both require specific Content Security Policy (CSP) directives. How strict should the CSP be?

A) Strict — allowlist only the exact Supabase project domain and `accounts.google.com`; block all other external sources
B) Moderate — allowlist Supabase, Google, and Vercel CDN domains; report violations but don't block in v1 (report-only mode during launch)
C) Deferred — skip custom CSP configuration for v1; rely on Next.js default security headers only
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Question 2 — Resilience: Session Refresh Failure
If the Supabase Auth session refresh fails (e.g., network timeout, token revoked), how should the app behave?

A) Silent redirect — immediately redirect to `/auth/sign-in` with no message; the sign-in form alone communicates the need to re-authenticate
B) Toast + redirect — show a brief toast notification ("Your session expired") and then redirect to `/auth/sign-in` after 2 seconds
C) Inline banner — show a persistent banner at the top of the current page ("Session expired — please sign in again") with a sign-in button; do not auto-redirect
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Question 3 — Performance: Default Avatar Set Caching
The default avatar set is loaded from Supabase Storage at startup. What caching strategy should be used?

A) Next.js `unstable_cache` with a 24-hour revalidation — fetched once per deployment and refreshed daily; seed changes take effect within 24 hours
B) Module-level singleton — loaded once when the server process starts; only refreshed on redeploy (acceptable because the avatar set changes very rarely)
C) No cache — fetch from Supabase Storage on every request that needs the avatar list (acceptable given small payload and small scale)
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Question 4 — Security/Observability: Auth Event Logging
Which auth events should be written to structured logs for security visibility?

A) Minimal — only failed sign-in attempts and account deletions
B) Standard — failed sign-ins, successful sign-ins, sign-outs, email verification, password resets, account deletions
C) Comprehensive — all of the above plus: Google OAuth completions, account linking events, MFA enrollment/removal, passkey registration/removal, email changes, and admin seed executions
X) Other (please describe after [Answer]: tag below)

[Answer]: A
