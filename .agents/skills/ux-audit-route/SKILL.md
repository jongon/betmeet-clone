---
name: ux-audit-route
description: Use when reviewing a new route, flow, or feature for UX quality. Audits hierarchy, CTA clarity, copy, states, feedback, and mobile readiness. For new features only unless the user explicitly asks to audit existing UI.
---

# UX Audit Route

Use this skill to review a new feature, route, or flow before or after implementation.

Do not use it as a visual style critique only. Focus on task clarity, decision flow, and friction.

## Audit areas

Review the surface using these lenses:

1. Purpose clarity
2. Primary CTA visibility
3. Competing actions
4. Information hierarchy
5. Empty state usefulness
6. Loading and error handling
7. Success feedback
8. Mobile-first behavior
9. Copy clarity
10. Fit with existing design system patterns

## Output format

Return findings first, ordered by severity.

```md
## Findings

1. [Severity] Problem
- Surface:
- Why it hurts UX:
- Suggested correction:

## Open Questions

- Unknowns that block a stronger recommendation

## Outcome

- Ready
- Ready with minor fixes
- Not ready
```

Severity labels:

- High: likely blocks task completion or causes wrong decisions
- Medium: adds friction or ambiguity
- Low: polish issue with limited behavioral impact

## Rules

1. Findings must be specific to user behavior, not generic design taste.
2. Prefer minimal corrections over broad redesigns.
3. Flag missing non-happy states explicitly.
4. Call out when multiple primary actions compete.
5. Mention mobile impact whenever hierarchy changes across breakpoints.

## Product lens for this repository

Prioritize these questions:

- Can a user understand the exchange opportunity in seconds?
- Is the next action obvious?
- Is the feature usable while standing, on mobile, in a real exchange context?
- Does feedback build trust after a proposal or share action?
