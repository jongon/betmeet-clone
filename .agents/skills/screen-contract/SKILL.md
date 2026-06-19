---
name: screen-contract
description: Use when creating a new feature, route, screen, modal, form, or flow and you need to define the UX before implementing UI. Produces a screen contract focused on primary action, states, and mobile.
---

# Screen Contract

Use this skill only for new features or new flows. Do not apply it retroactively to existing screens unless the user asks for a redesign.

## Purpose

Turn a feature idea, OpenSpec task, route, or user story into a compact UX contract before implementation.

The contract must reduce ambiguity around:

- what the user is trying to do
- what action is primary
- what information is required to decide
- what happens in empty, loading, error, and success states
- what matters first on mobile

## Output format

Return exactly these sections in Spanish unless the user asks otherwise.

```md
## Screen Contract

### Surface
- Route, component, modal, or flow

### User Goal
- What the user wants to achieve

### Entry Context
- Where the user comes from and what they already know

### Primary Action
- Main CTA
- Expected result after interaction

### Secondary Actions
- Supporting actions that must not compete with the main CTA

### Minimum Decision Content
- Information that must be visible before acting

### States
- Empty:
- Loading:
- Error:
- Success:

### Mobile Notes
- First content visible on small screens
- What can be deferred behind interaction

### UX Risks
- Possible confusion, overload, or ambiguity
```

## Rules

1. Prefer one clear primary action.
2. Avoid generic CTAs like "Continuar" if the consequence is not obvious.
3. If the feature adds a list or table, describe 0, 1, and many-item behavior.
4. If the feature includes form input, minimize fields and group related decisions.
5. Preserve existing design system primitives; this skill is about flow and hierarchy first.
6. Optimize for quick understanding on mobile.

## Product lens for this repository

Default to these heuristics unless the user says otherwise:

- fast scanability
- low cognitive load
- trust around sharing and scanning QR codes
- quick exchange decisions in a real-world setting

## If OpenSpec artifacts exist

Map the result back to the change where useful:

- `proposal.md`: journey affected and scope impact
- `design.md`: screen contract and key states
- `tasks.md`: implementation-ready UX tasks
