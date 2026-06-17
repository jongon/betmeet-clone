# Unit 40 Functional Design — Contraste del selector de sync en `/admin` dark mode

**Stage**: Functional Design (light) — refine post-construcción  
**Scope**: UI-only bug fix  
**Affected artifact/code**: `TriggerSyncControls` (`/admin`)  
**No reinicia**: Units 1–39

---

## 1. Trazabilidad

| Requisito | Historia | Descripción |
|-----------|----------|-------------|
| FR-REFINE-40.1 | US-40.1 | Opciones del selector de scope de sync legibles en dark mode |
| FR-REFINE-40.2 | US-40.1 | Comportamiento de sync intacto |

---

## 2. Problema

En `/admin`, el control de tipo de sincronización es un `<select>` nativo con `bg-transparent`. En modo oscuro, al abrir el menú, algunos navegadores pintan las opciones no seleccionadas con un color de texto/fondo que queda demasiado cerca del fondo del select. El resultado es que `FIXTURES`, `LIVE_STATUS`, `RESULTS` o `FULL` pueden quedar visualmente camuflados.

---

## 3. Diseño

### 3.1 `TriggerSyncControls`

Aplicar estilos explícitos al `<select data-testid="admin-sync-scope">`:

- `bg-background` y `text-foreground` para el control cerrado.
- `color-scheme` compatible con light/dark para que el navegador pinte el popup nativo con el esquema correcto.
- `bg-background text-foreground` en cada `<option>` para reforzar contraste cuando el browser respeta estilos de option.

### 3.2 Comportamiento preservado

No cambia:

- `SCOPES = ["FIXTURES", "LIVE_STATUS", "RESULTS", "FULL"]`.
- Scope inicial `RESULTS`.
- `onChange` y tipo `(typeof SCOPES)[number]`.
- `triggerSync(scope)`.
- Estados pending/error y `data-testid` existentes.

---

## 4. NFR / Security Baseline

- NFR Requirements/Design: SKIP formal. Es un ajuste visual de contraste, sin nueva carga, datos ni infraestructura.
- Security Baseline: intacto. No cambia autorización, `requireAdmin()`, server actions, inputs persistidos ni superficies de ataque.

---

## 5. Verificación

### 5.1 Automática

```bash
pnpm exec tsc --noEmit
pnpm exec biome check src/features/admin/components/trigger-sync-controls.tsx
pnpm exec eslint src/features/admin/components/trigger-sync-controls.tsx
```

### 5.2 Visual

1. Iniciar sesión como admin.
2. Activar modo oscuro.
3. Abrir `/admin`.
4. Abrir el selector de tipo de sincronización.
5. Confirmar que todas las opciones (`FIXTURES`, `LIVE_STATUS`, `RESULTS`, `FULL`) son legibles y que el botón de sync mantiene su comportamiento.

---

## 6. Archivos afectados

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `src/features/admin/components/trigger-sync-controls.tsx` | Código UI | Estilos explícitos de contraste para `select`/`option` |
| `aidlc-docs/inception/requirements/requirements.md` | Docs | Épica 40 + FR-REFINE-40.1…40.2 |
| `aidlc-docs/inception/user-stories/stories.md` | Docs | Épica 40 + US-40.1 |
| `aidlc-docs/inception/application-design/unit-of-work.md` | Docs | Unit 40 + secuencia #26 |
| `aidlc-docs/construction/unit-7-admin-observability/functional-design/frontend-components.md` | Docs | Nota dependiente en `TriggerSyncControls` |
| `aidlc-docs/aidlc-state.md` | Docs | Estado Unit 40 |
| `aidlc-docs/audit.md` | Docs | Entrada del cambio |
