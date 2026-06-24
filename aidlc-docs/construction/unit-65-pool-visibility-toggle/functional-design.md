# Functional Design (Light) — Unit 65: Cambiar visibilidad de un pool (público ↔ privado)

## Stage
- **Unit**: 65
- **Stage**: Functional Design (Light)
- **Created**: 2026-06-24
- **Status**: Awaiting explicit approval — plan presentado y aprobado antes de ejecutar (`/aidlc:refine`).

## Contexto

Refine vía `/aidlc:refine` — *"Quiero que el administrador de un pool pueda cambiarlo de público a privado y viceversa"*.

Hoy `Pool.type` (enum `PUBLIC | PRIVATE`, BR-3.1) **solo se define al crear el pool** (US-4.1) y ninguna server action lo modifica después. El administrador (= `Pool.ownerId`, BR-3.5/BR-3.10) ya puede renombrar (Unit 54) y configurar `membersCanInvite` (Unit 45/47), pero no puede cambiar la visibilidad. Esta unit añade esa capacidad reutilizando el patrón de settings existente.

Aditivo sobre **Unit 3** (entidad `Pool`, `type`, directorio, autorización por `ownerId`, índice parcial `pools_public_name_unique` de BR-3.2) y **Unit 54** (panel "Configuración" del dueño). Decisión de UX confirmada con el usuario vía AskUserQuestion: **switch instantáneo** (optimista + toast + rollback), igual que `membersCanInvite`, sin diálogo de confirmación.

## Business Logic Model

```
updatePoolVisibility(input: { poolId, type })             [BL-65.1]
  │
  ├─ getOnboardedUserId() ─ null → "Completa tu perfil…"   (FR-REFINE-16.1)
  ├─ UpdatePoolVisibilitySchema.safeParse ─ fail → error   (SECURITY-01)
  ├─ prisma.pool.findUnique { id, ownerId, name, type }
  │     └─ null → "Liga no encontrada"
  ├─ pool.ownerId !== userId
  │     └─ "Solo el administrador puede cambiar esta configuración"  [BR-65.1]
  ├─ pool.type === input.type → { success, type } (no-op)  [BR-65.4]
  ├─ input.type === "PUBLIC":                               [BR-65.2]
  │     findFirst { type:PUBLIC, name, id≠pool.id }
  │        └─ clash → "Ya existe una liga pública con ese nombre"
  ├─ prisma.pool.update { data:{ type } }  (try/catch → mismo error)  [BR-65.2]
  ├─ logAuthEvent("pool.settings_changed", { userId, poolId, visibility })
  └─ revalidatePath /pools/[id], /pools, /pools/discover   [BR-65.5]
        → { success: true, type }
```

UI (`pool-settings-card-client.tsx`, solo dueño — gate `pool.isOwner` en `/pools/[id]`):

```
Switch "Liga pública"  (checked = visibility === "PUBLIC")
  onCheckedChange(nextPublic):
    optimistic setVisibility(next)
    updatePoolVisibility({ poolId, type: next })
      error → rollback + FormError
      ok    → toast(visibilitySaved)
  visibility === "PRIVATE" → se muestra el switch `membersCanInvite` (Unit 47)
  visibility === "PUBLIC"  → se oculta (los públicos siempre permiten invitar)
```

## Business Rules

| ID | Regla |
|----|-------|
| **BR-65.1** | Solo el dueño del pool (`Pool.ownerId === userId`) puede cambiar la visibilidad; verificado server-side tras onboarding (BR-3.28, SECURITY-08, anti-IDOR). El no-dueño recibe "Solo el administrador puede cambiar esta configuración". |
| **BR-65.2** | Al pasar PRIVATE→PUBLIC el nombre debe ser único entre pools públicos (reusa BR-3.2 / índice parcial `pools_public_name_unique`): pre-check `findFirst` amigable + `try/catch` del `update` como guardia final ante carreras → "Ya existe una liga pública con ese nombre". PUBLIC→PRIVATE no requiere chequeo. |
| **BR-65.3** | El cambio de visibilidad **no** altera membresías, `inviteToken`, capacidad ni `membersCanInvite`. PUBLIC→PRIVATE solo retira el pool del directorio (`listPublicPools` filtra `type:"PUBLIC"`) y hace que `joinPublicPool` lo rechace; se sigue entrando por token. PRIVATE→PUBLIC lo hace descubrible y unible desde el directorio (BR-3.9/BR-3.26). |
| **BR-65.4** | La operación es idempotente: si el `type` destino ya coincide con el actual, no hay `update` ni log y se devuelve `{ success, type }`. |
| **BR-65.5** | Tras el cambio se invalidan `/pools/[id]`, `/pools` y `/pools/discover` (el directorio público cambia). No afecta rankings (no se invalida `RANKINGS_TAG`). |

## Stages
- **Requirements / User Stories**: EXECUTE (Épica 65 / FR-REFINE-65.1, US-65.1).
- **Application Design**: EXECUTE (delta `unit-of-work.md` Unit 65 + #48).
- **Functional Design**: EXECUTE (este documento).
- **Code Generation**: EXECUTE.
- **Build and Test**: EXECUTE.
- **SKIP**: Reverse Engineering, Units Generation, NFR Requirements/Design, Infrastructure (sin schema, migraciones ni rutas nuevas — `Pool.type` ya existe).

## Security Baseline
COMPLIANT — autorización por `ownerId` server-side (SECURITY-08, anti-IDOR); input validado por Zod (`UpdatePoolVisibilitySchema`, SECURITY-01); sin nueva ruta, schema ni migración. El estado optimista del cliente nunca autoriza: la autoridad es 100% server-side.

## Out of scope
- Notificar a los miembros del cambio de visibilidad.
- Regenerar el `inviteToken` al cambiar de visibilidad.
- Cambiar otros campos (capacidad) o resolver colisiones de nombre con un auto-rename.

## Primary Deliverable
Como dueño en `/pools/[id]`, activar/desactivar "Liga pública" cambia la visibilidad al instante: un pool puesto privado desaparece de `/pools/discover` y `joinPublicPool` lo rechaza; un pool puesto público aparece en el directorio (respetando la unicidad de nombre); un no-dueño no ve el control y la action lo rechaza.
