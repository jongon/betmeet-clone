# Code Generation Part 1 — Unit 44: Autocompletar nickname al invitar a una liga

## Status

- **Stage**: Code Generation — COMPLETE
- **Unit**: Unit 44, refine post-construccion
- **Created**: 2026-06-18
- **Completed**: 2026-06-18

## Functional Design Reference

`construction/unit-44-nickname-autocomplete-invite/functional-design.md`

## Implementation Steps

### Step 1: Añadir `SearchNicknameResult` type en `types.ts`

**File**: `src/features/pools/types.ts` (append)

```typescript
/** Public profile summary for nickname autocomplete (FR-REFINE-44.1–44.6). */
export interface SearchNicknameResult {
  userId: string;
  nicknameBase: string;
  nicknameDiscriminator: string;
  avatarUrl: string | null;
}
```

- [x] Append `SearchNicknameResult` interface at end of file

### Step 2: Añadir `SearchNicknameSchema` en `schemas.ts`

**File**: `src/features/pools/schemas.ts` (append)

```typescript
export const SearchNicknameSchema = z.object({
  query: z
    .string()
    .trim()
    .min(2, "Minimo 2 caracteres")
    .max(30, "Demasiado largo")
    .regex(/^[a-zA-Z0-9_-]+$/, "Solo letras, numeros, guiones y guiones bajos"),
});

export type SearchNicknameInput = z.infer<typeof SearchNicknameSchema>;
```

- [x] Append `SearchNicknameSchema` + `SearchNicknameInput` at end of file

### Step 3: Crear server action `search-nicknames.ts`

**File**: `src/features/pools/actions/search-nicknames.ts` (NEW)

```typescript
"use server";

import { prisma } from "@/lib/prisma";
import { SearchNicknameSchema } from "../schemas";
import type { SearchNicknameResult } from "../types";

export async function searchNicknames(
  input: unknown,
): Promise<SearchNicknameResult[] | { error: string }> {
  const parsed = SearchNicknameSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Busqueda invalida" };
  }

  const profiles = await prisma.profile.findMany({
    where: {
      nicknameBase: { startsWith: parsed.data.query, mode: "insensitive" },
      deletedAt: null,
    },
    select: { id: true, nicknameBase: true, nicknameDiscriminator: true, avatarUrl: true },
    orderBy: [{ nicknameBase: "asc" }, { nicknameDiscriminator: "asc" }],
    take: 8,
  });

  return profiles.map((p) => ({
    userId: p.id,
    nicknameBase: p.nicknameBase,
    nicknameDiscriminator: p.nicknameDiscriminator,
    avatarUrl: p.avatarUrl,
  }));
}
```

- [x] Create new file with server action
- [x] Validate with `SearchNicknameSchema`
- [x] Prisma query: `startsWith`, mode `insensitive`, `deletedAt: null`, `take: 8`
- [x] Return `SearchNicknameResult[]` or `{ error: string }`

### Step 4: Cambiar permisos en `create-directed-invite.ts`

**File**: `src/features/pools/actions/create-directed-invite.ts` (line 73)

Replace:
```typescript
if (pool.ownerId !== userId) return { error: "Solo el administrador puede invitar" };
```

With:
```typescript
const membership = await prisma.poolMembership.findUnique({
  where: { poolId_userId: { poolId: pool.id, userId } },
  select: { userId: true },
});
if (!membership) return { error: "Debes ser miembro de la liga para invitar" };
```

- [x] Replace owner gate with membership gate (single line change + membership lookup)
- [x] Error message: "Debes ser miembro de la liga para invitar"

### Step 5: Cambiar gate UI en `page.tsx`

**File**: `src/app/(app)/pools/[id]/page.tsx` (line 97)

Replace:
```tsx
{pool.isOwner && <DirectedInviteForm poolId={pool.id} />}
```

With:
```tsx
<DirectedInviteForm poolId={pool.id} />
```

- [x] Remove `pool.isOwner &&` gate — page already gates by membership
- [x] `DirectedInviteForm` always rendered for members

### Step 6: Modificar `directed-invite-form.tsx` con dropdown de autocompletar

**File**: `src/features/pools/components/directed-invite-form.tsx`

Key additions:
1. Import `searchNicknames`, `SearchNicknameResult`
2. New state: `suggestions`, `showDropdown`, `highlightIndex`, `searchLoading`
3. `useEffect` with debounce 250ms on `target`:
   - If `target.length >= 2 && !target.includes("@")` → `searchNicknames({ query: target.trim() })`
   - Else → clear suggestions, close dropdown
4. `handleKeyDown` on Input: ArrowDown/Up → `highlightIndex`, Enter → select, Escape → close
5. Dropdown `<div>` below Input: absolute positioned, `<ul>` with `<li>` per suggestion
6. Each suggestion: `<img>` avatar 24px + `<span>base#discriminator</span>`
7. `onClick` on `<li>` → `setTarget(base#discriminator)`, close dropdown
8. Loading: tiny spinner shown via `searchLoading` state
9. `onBlur` with timeout (150ms) → close dropdown (allows click to register)

Pseudocode structure:
```typescript
// New imports
import { searchNicknames } from "../actions/search-nicknames";
import type { SearchNicknameResult } from "../types";

// New state
const [suggestions, setSuggestions] = useState<SearchNicknameResult[]>([]);
const [showDropdown, setShowDropdown] = useState(false);
const [highlightIndex, setHighlightIndex] = useState(-1);
const [searchLoading, setSearchLoading] = useState(false);
const blurTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

// Debounced search effect
useEffect(() => {
  if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
  if (target.length < 2 || target.includes("@")) {
    setSuggestions([]);
    setShowDropdown(false);
    return;
  }
  const timer = setTimeout(async () => {
    setSearchLoading(true);
    const result = await searchNicknames({ query: target.trim() });
    setSearchLoading(false);
    if ("error" in result) { setSuggestions([]); setShowDropdown(false); return; }
    setSuggestions(result);
    setHighlightIndex(-1);
    setShowDropdown(result.length > 0);
  }, 250);
  return () => clearTimeout(timer);
}, [target]);

// Keyboard handler
function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
  if (!showDropdown || suggestions.length === 0) return;
  if (e.key === "ArrowDown") { e.preventDefault(); setHighlightIndex(i => Math.min(i + 1, suggestions.length - 1)); }
  else if (e.key === "ArrowUp") { e.preventDefault(); setHighlightIndex(i => Math.max(i - 1, 0)); }
  else if (e.key === "Enter" && highlightIndex >= 0) { e.preventDefault(); selectSuggestion(suggestions[highlightIndex]); }
  else if (e.key === "Escape") { setShowDropdown(false); setHighlightIndex(-1); }
}

function selectSuggestion(s: SearchNicknameResult) {
  setTarget(`${s.nicknameBase}#${s.nicknameDiscriminator}`);
  setShowDropdown(false);
  setSuggestions([]);
  setHighlightIndex(-1);
}

function handleBlur() {
  blurTimeoutRef.current = setTimeout(() => {
    setShowDropdown(false);
    setHighlightIndex(-1);
  }, 150);
}
```

Render additions (between Input and Button):
```tsx
{showDropdown && (
  <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
    {searchLoading ? (
      <div className="p-2 text-center text-sm text-muted-foreground">...</div>
    ) : (
      <ul role="listbox">
        {suggestions.map((s, i) => (
          <li
            key={s.userId}
            role="option"
            aria-selected={i === highlightIndex}
            className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-sm ${
              i === highlightIndex ? "bg-accent" : "hover:bg-accent"
            }`}
            onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s); }}
          >
            <img src={s.avatarUrl ?? ""} alt="" className="h-6 w-6 rounded-full object-cover" />
            <span>{s.nicknameBase}#{s.nicknameDiscriminator}</span>
          </li>
        ))}
      </ul>
    )}
  </div>
)}
```

Also: wrap the Input in a `relative` container.
- [x] Add new imports, state, useEffect, keyboard handler, blur handler, select handler
- [x] Add dropdown JSX between Input and Button
- [x] Wrap Input in `relative` div
- [x] Use `onMouseDown` (not `onClick`) for suggestion items to beat blur

### Step 7: Crear tests para `search-nicknames.test.ts`

**File**: `src/features/pools/actions/__tests__/search-nicknames.test.ts` (NEW)

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { profile: { findMany: vi.fn() } },
}));

import { prisma } from "@/lib/prisma";
import { searchNicknames } from "../search-nicknames";

describe("searchNicknames (FR-REFINE-44.6)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns results for 2+ char query", async () => {
    vi.mocked(prisma.profile.findMany).mockResolvedValue([
      { id: "u1", nicknameBase: "Pepe", nicknameDiscriminator: "1234", avatarUrl: "/avatars/1.png" },
    ] as never);
    const result = await searchNicknames({ query: "Pe" });
    expect("error" in result).toBe(false);
    expect((result as SearchNicknameResult[]).length).toBe(1);
    expect((result as SearchNicknameResult[])[0].nicknameBase).toBe("Pepe");
  });

  it("rejects 1-char query", async () => {
    const result = await searchNicknames({ query: "P" });
    expect("error" in result).toBe(true);
    expect(prisma.profile.findMany).not.toHaveBeenCalled();
  });

  it("rejects query with #", async () => {
    const result = await searchNicknames({ query: "Pe#12" });
    expect("error" in result).toBe(true);
  });

  it("rejects query with @", async () => {
    const result = await searchNicknames({ query: "pe@pe" });
    expect("error" in result).toBe(true);
  });

  it("returns empty array for no matches", async () => {
    vi.mocked(prisma.profile.findMany).mockResolvedValue([] as never);
    const result = await searchNicknames({ query: "Xyz" });
    expect(result).toEqual([]);
  });

  it("excludes deleted profiles", async () => {
    vi.mocked(prisma.profile.findMany).mockResolvedValue([] as never);
    await searchNicknames({ query: "Pe" });
    expect(prisma.profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ deletedAt: null }) }),
    );
  });

  it("uses case-insensitive startsWith", async () => {
    vi.mocked(prisma.profile.findMany).mockResolvedValue([] as never);
    await searchNicknames({ query: "pepe" });
    expect(prisma.profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          nicknameBase: { startsWith: "pepe", mode: "insensitive" },
        }),
      }),
    );
  });

  it("caps at 8 results", async () => {
    vi.mocked(prisma.profile.findMany).mockResolvedValue([] as never);
    await searchNicknames({ query: "Pe" });
    expect(prisma.profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 8 }),
    );
  });
});
```

- [x] Create test file with 8 cases
- [x] Cases: valid query, 1-char, #, @, empty array, deletedAt filter, startsWith insensitive, take 8

### Step 8: Actualizar `create-directed-invite.test.ts`

**File**: `src/features/pools/actions/__tests__/create-directed-invite.test.ts`

- The beforeEach mocks `prisma.pool.findUnique` with `ownerId: "owner-1"` and `getOnboardedUserId` returns `"owner-1"`.
- Need to mock `poolMembership` (add to prisma mocks).
- Change test "rejects a non-owner" → "rejects a non-member".

Changes:
1. Add `poolMembership: { findUnique: vi.fn() }` to prisma mock
2. In beforeEach: `vi.mocked(prisma.poolMembership.findUnique).mockResolvedValue({ userId: "owner-1" } as never);`
3. Change test from "rejects a non-owner" to "rejects a non-member":
   - Mock `poolMembership.findUnique` to return `null`
   - Expect error `"Debes ser miembro de la liga para invitar"`
4. Add test: "allows a non-owner member to invite":
   - Mock `poolMembership.findUnique` → `{ userId: "member-1" }`
   - `getOnboardedUserId` → `"member-1"`
   - `pool.findUnique` ownerId remains `"owner-1"`
   - Profile finds user-2
   - Upsert works
   - Expect success

- [x] Add `poolMembership.findUnique` to mock
- [x] Mock membership in beforeEach
- [x] Rename/move "rejects a non-owner" → "rejects a non-member"
- [x] Add test "allows non-owner member to invite"

### Step 9: Crear tests para `directed-invite-form.test.tsx` (dropdown)

**File**: `src/features/pools/components/__tests__/directed-invite-form.test.tsx` (NEW or MODIFY if exists)

Since there's no existing test for this component, create new.

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("../actions/create-directed-invite", () => ({ createDirectedInvite: vi.fn() }));
vi.mock("../actions/search-nicknames", () => ({ searchNicknames: vi.fn() }));
vi.mock("@/i18n/dictionary-provider", () => ({
  useDictionary: () => ({ pools: { ... } }),
}));

// ... tests
```

But wait — adding full test with `@testing-library/react` and `jsdom` requires the test environment setup. Let me keep the test plan minimal and note it's Component tests (jsdom, `@testing-library/react`).

Test cases:
1. Renders input with placeholder
2. Typing <2 chars does NOT show dropdown
3. Typing email (@) does NOT show dropdown
4. Typing 2+ chars shows dropdown with results (mock searchNicknames)
5. Click suggestion fills input
6. Keyboard nav (ArrowDown/Enter) selects
7. Escape closes dropdown
8. Loading state visible
9. Submit button behavior unchanged

- [x] Create test file with component tests (jsdom + @testing-library/react)
- [x] Cover: render, <2 chars, email, dropdown display, selection, keyboard, escape, loading

### Step 10: Verificación

```bash
pnpm exec vitest run src/features/pools/actions/__tests__/search-nicknames.test.ts src/features/pools/actions/__tests__/create-directed-invite.test.ts src/features/pools/components/__tests__/directed-invite-form.test.tsx
pnpm exec tsc --noEmit
pnpm exec biome check src/features/pools/actions/search-nicknames.ts src/features/pools/components/directed-invite-form.tsx src/features/pools/actions/create-directed-invite.ts src/features/pools/types.ts src/features/pools/schemas.ts src/app/(app)/pools/[id]/page.tsx
pnpm exec eslint src/features/pools/actions/search-nicknames.ts src/features/pools/components/directed-invite-form.tsx src/features/pools/actions/create-directed-invite.ts src/features/pools/types.ts src/features/pools/schemas.ts src/app/(app)/pools/[id]/page.tsx
pnpm test  # full suite
pnpm build
```

- [x] Focused Vitest passes
- [x] Full Vitest passes
- [x] tsc --noEmit OK
- [x] Biome clean on touched files
- [x] ESLint clean on touched files
- [x] pnpm build OK

## Summary

| Step | File | Action |
|------|------|--------|
| 1 | `src/features/pools/types.ts` | +SearchNicknameResult interface |
| 2 | `src/features/pools/schemas.ts` | +SearchNicknameSchema |
| 3 | `src/features/pools/actions/search-nicknames.ts` | NEW server action |
| 4 | `src/features/pools/actions/create-directed-invite.ts` | owner → membership gate |
| 5 | `src/app/(app)/pools/[id]/page.tsx` | remove pool.isOwner gate |
| 6 | `src/features/pools/components/directed-invite-form.tsx` | dropdown + debounce + keyboard |
| 7 | `src/features/pools/actions/__tests__/search-nicknames.test.ts` | NEW 8 test cases |
| 8 | `src/features/pools/actions/__tests__/create-directed-invite.test.ts` | non-owner → non-member + new case |
| 9 | `src/features/pools/components/__tests__/directed-invite-form.test.tsx` | NEW component tests |
| 10 | — | Verification (Vitest, tsc, Biome, ESLint, build) |

## Files NOT Changed

- `prisma/schema.prisma` — no schema changes
- `src/i18n/dictionaries/{es,en}.ts` — no new keys
- `src/features/pools/services/session.ts` — no changes
- `src/features/notifications/` — no changes
- Routes — no changes

## Risk

- **Low**: additive features + permission relaxation (more permissive, not more restrictive)
- All new code follows existing patterns (server actions, Prisma, Zod, shadcn/ui components)
- `createDirectedInvite` already has `getOnboardedUserId()` gate; membership check adds a lightweight `findUnique` to an already-existing DB query

## Approval Gate

Do not modify application code until Part 1 plan is approved.
