# Unit 1: Foundation — NFR Requirements Plan

## Unit
**Foundation: Auth, Profile, Nickname, Avatar**

## Plan Checklist
- [x] Collect and analyze answers to clarification questions below
- [x] Generate `aidlc-docs/construction/unit-1-foundation/nfr-requirements/nfr-requirements.md`
- [x] Generate `aidlc-docs/construction/unit-1-foundation/nfr-requirements/tech-stack-decisions.md`

---

## Clarification Questions

Please answer each question by filling in the letter after the `[Answer]:` tag.
If none of the options match, choose the last option (X) and describe your preference.

---

### Question 1
What is the expected number of registered users at the time of the World Cup 2026 launch?

A) Small scale — up to 500 users (friends, family, a closed community)
B) Medium scale — up to 5,000 users (social media promotion, open public launch)
C) Large scale — up to 50,000+ users (broad marketing campaign, influencer traffic)
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Question 2
Should the application enforce rate limiting on sign-in attempts to protect against brute-force attacks?

A) Yes — lock the account after 5 failed attempts for 15 minutes (via Supabase Auth configuration)
B) Yes — but only add a CAPTCHA / delay after repeated failures without hard lockout
C) No explicit limit beyond what Supabase Auth applies by default
X) Other (please describe after [Answer]: tag below)

[Answer]: C

---

### Question 3
How long should an authenticated session last before the user is required to sign in again?

A) Short — 1 hour access token with auto-refresh; user re-authenticates if inactive for 7 days
B) Medium — 8 hours access token with auto-refresh; user re-authenticates if inactive for 30 days
C) Long — keep the session alive as long as the user is active; only expire after 90 days of inactivity
X) Other (please describe after [Answer]: tag below)

[Answer]: A y debe existir la opción de "Recordarme" para extender la sesión a 30 días

---

### Question 4
What accessibility level should the auth and onboarding UI meet?

A) WCAG 2.1 Level AA — full compliance required (keyboard navigation, screen reader support, color contrast)
B) Basic accessibility — color contrast and keyboard navigation for forms, but no strict WCAG audit
C) No specific accessibility requirement for v1
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Question 5
When a user uploads a custom avatar, should old uploaded files be kept or deleted?

A) Keep all uploads — each upload is stored permanently; the user can revert to a previous custom photo later
B) Replace — only the latest custom upload is kept; previous files are deleted from Supabase Storage when replaced
C) Keep last 3 — retain the 3 most recent custom uploads, delete older ones
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Question 6
How long should the email verification link and password reset link remain valid?

A) Short — 1 hour for both (more secure)
B) Medium — 24 hours for verification, 1 hour for password reset
C) Long — 72 hours for both (more user-friendly for users who don't check email often)
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Question 7
Should the application show real-time feedback while the user types their nickname (availability check as you type)?

A) Yes — check availability after a short debounce (500ms) and show "available" / "taken" feedback inline
B) No — only check on form submission; show error then if the discriminator collides after retries
C) Show suggestions only — no live availability check, but refresh nickname suggestions on demand
X) Other (please describe after [Answer]: tag below)

[Answer]: A
