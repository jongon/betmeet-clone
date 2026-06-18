# Unit 43 — Web Push: Onboarding step + dispatch en sync admin · Functional Design

> Refine post-construcción (2026-06-18). Cierra dos gaps operativos en Unit 10 (Web Push): onboarding y dispatch. **No reinicia** Units 1–42. Sin schema, migraciones, rutas nuevas, VAPID keys ni tipos de `NotificationEventType`.

## 1. Alcance y trazabilidad

| Historia | FR-REFINE | Naturaleza | Resultado |
|----------|-----------|------------|-----------|
| US-43.1 | 43.1 | gap UX | Paso "Notificaciones" en onboarding entre reglas y passkey, skippable, 5 tipos activados por defecto |
| US-43.2 | 43.2 | gap funcional | `dispatchPendingNotifications()` al final de `triggerSync()`, best-effort |

## 2. Problema

Dos gaps entre diseño y código de Unit 10:

1. **FR-REFINE-43.1**: El usuario solo puede activar web push desde `/settings/profile` (`NotificationSettingsPanel`). No hay prompt durante el onboarding, que es el momento ideal para pedir permiso (el usuario está configurando su cuenta). El diseño de Unit 1 original ya preveía un paso de notificaciones en el onboarding (WF-13), pero Unit 10 no lo implementó.

2. **FR-REFINE-43.2**: `triggerSync()` (`src/features/admin/actions/trigger-sync.ts:1`) ejecuta `scoreFinishedUnscoredMatches()`, que internamente llama `emitMatchNotificationEvents()` (vía `scoreSweeper` → `scoreMatch` → ranking-events). Esto **encola** eventos `NotificationEvent` con status `PENDING`. Sin embargo, nadie invoca `dispatchPendingNotifications()` → los eventos quedan PENDING indefinidamente. Las notificaciones nunca llegan al usuario.

## 3. Decisión de diseño

Ambos gaps se cierran con cambios mínimos y aditivos:

- **FR-REFINE-43.1**: Nuevo componente `NotificationStep` insertado en la secuencia del onboarding. Reutiliza la lógica de activación push de `NotificationSettingsPanel` (Service Worker, `PushManager.subscribe`, `savePushSubscription`). Skips a passkey si el usuario omite o si el navegador no soporta push.
- **FR-REFINE-43.2**: Una línea `try/catch` al final de `triggerSync()` que llama `dispatchPendingNotifications()`. Sin cambio de signature ni retorno. Best-effort: si falla, el sync/scoring ya se completó exitosamente.

## 4. Contratos

### 4.1 NotificationStep

```ts
interface NotificationStepProps {
  onComplete: () => void;  // → setStep("passkey")
  onSkip: () => void;      // → setStep("passkey")
}
```

**Estados del componente** (derivados del entorno del navegador, no props):

| Estado | Condición | UI |
|--------|-----------|----|
| `unsupported` | `!("serviceWorker" in navigator && "PushManager" in window)` | Mensaje: navegador no soporta push. Botón "Continuar" (→ `onComplete`). |
| `missingVapid` | `!NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Mensaje: configuración faltante. Botón "Continuar" (→ `onComplete`). |
| `denied` | Permiso `Notification.permission === "denied"` | Mensaje: permiso denegado. Botón "Continuar" (→ `onComplete`). |
| `ready` | Permiso `default` o `granted` sin suscripción activa | Botón "Activar notificaciones" + "Omitir". Al activar: pide permiso → registra SW → subscribe → `savePushSubscription`. |
| `activated` | Suscripción creada exitosamente | Check verde + mensaje de éxito. Botón "Continuar" (→ `onComplete`). |

**Reglas de negocio**:
- BR-43.1.1: El paso es **skippable** — tanto "Omitir" como "Continuar" avanzan a passkey. Igual que `RulesStep`.
- BR-43.1.2: Al activar, las 5 preferencias (`matchStarted`, `matchFinished`, `goalScored`, `poolInvite`, `globalRankImproved`) se inicializan como `true` vía `updateNotificationPreferences()` (mismo server action que `NotificationSettingsPanel`).
- BR-43.1.3: No se persiste "notifications step completed". Si el usuario omite, puede activar push después desde `/settings/profile`.
- BR-43.1.4: `registerPasskey()` no se toca. El paso de notificaciones es independiente del de passkey.

### 4.2 Integración en onboarding-client.tsx

El tipo `Step` se extiende:

```ts
type Step = "nickname" | "avatar" | "rules" | "notifications" | "passkey";

const STEP_ORDER: Step[] = ["nickname", "avatar", "rules", "notifications", "passkey"];
```

Bloque render:

```tsx
{step === "rules" && (
  <RulesStep onComplete={() => setStep("notifications")} onSkip={() => setStep("notifications")} />
)}

{step === "notifications" && (
  <NotificationStep onComplete={() => setStep("passkey")} onSkip={() => setStep("passkey")} />
)}
```

Ajuste: `RulesStep.onComplete` cambia de `setStep("passkey")` a `setStep("notifications")`.

### 4.3 Integración en onboarding-progress-indicator.tsx

```tsx
const STEPS = [
  { labelKey: "stepNickname", key: "nickname" },
  { labelKey: "stepAvatar", key: "avatar" },
  { labelKey: "stepRules", key: "rules" },
  { labelKey: "stepNotifications", key: "notifications" },  // ← nuevo
  { labelKey: "stepPasskey", key: "passkey" },
] as const;
```

El tipo `StepKey` se infiere automáticamente de `STEPS`. `OnboardingProgressIndicatorProps.currentStep: StepKey` acepta `"notifications"` sin cambios adicionales.

### 4.4 Integración en trigger-sync.ts

Al final del action, después de `revalidateResultViews()`:

```ts
import { dispatchPendingNotifications } from "@/features/notifications/services/dispatcher";

// ... existing sync + scoring + revalidation ...

try {
  await dispatchPendingNotifications();
} catch {
  // best-effort: sync/scoring ya se completó exitosamente
}
```

Reglas:
- BR-43.2.1: El dispatch ocurre **después** de `revalidateResultViews()`, no antes.
- BR-43.2.2: Si `dispatchPendingNotifications()` lanza, el error **no** se propaga al caller ni al `FormState`.
- BR-43.2.3: Si el sync/scoring falla antes (catch existente), no se llega al dispatch.
- BR-43.2.4: Sin cambio de signature, tipo de retorno ni `FormState`.

### 4.5 i18n — 7 claves nuevas bajo `onboarding.notifications*`

| Key | ES | EN |
|-----|----|----|
| `notificationsTitle` | Activar notificaciones | Enable notifications |
| `notificationsDescription` | Recibe alertas de partidos, goles y más. | Get alerts for matches, goals, and more. |
| `notificationsEnable` | Activar notificaciones | Enable notifications |
| `notificationsSkip` | Omitir | Skip |
| `notificationsActivated` | Notificaciones activadas | Notifications enabled |
| `notificationsUnsupported` | Tu navegador no soporta notificaciones push. | Your browser doesn't support push notifications. |
| `notificationsMissingVapid` | Falta configurar las claves de notificación. | Notification keys are not configured. |
| `stepNotifications` | Notificaciones | Notifications |

Nota: `notificationsSkip` es distinto de `common.skipForNow` (usado por RulesStep/PasskeyStep) porque la semántica es "Omitir" (skip this step), no "Saltar por ahora" (defer to later). `notificationsUnsupported` y `notificationsMissingVapid` son copias de las claves `notifications.unsupported`/`notifications.missingVapid` existentes, pero dentro del namespace `onboarding` para que el `NotificationStep` dependa solo del diccionario `onboarding` (sin importar también `notifications`). Alternativa aceptable en Code Generation: importar ambos namespaces si el componente cliente puede acceder a ambos.

## 5. Componentes y archivos

### FR-REFINE-43.1: Onboarding step

| Archivo | Cambio |
|---------|--------|
| `src/features/profile/components/notification-step.tsx` | **NUEVO**. Client component. Props: `onComplete`, `onSkip`. Estados: unsupported/missingVapid/denied → mensaje + "Continuar"; ready → botones "Activar"/"Omitir" + lógica push (permission → SW register → subscribe → savePushSubscription + updateNotificationPreferences); activated → check verde + "Continuar". Reutiliza `urlBase64ToUint8Array`, `savePushSubscription`, `updateNotificationPreferences`, `createClient`. |
| `src/app/onboarding/profile/onboarding-client.tsx` | Añadir `"notifications"` a `Step` union y `STEP_ORDER`. Importar `NotificationStep`. Añadir bloque render. Ajustar `RulesStep.onComplete` → `setStep("notifications")`. |
| `src/features/profile/components/onboarding-progress-indicator.tsx` | Añadir `{ labelKey: "stepNotifications", key: "notifications" }` a `STEPS` entre `stepRules` y `stepPasskey`. |
| `src/i18n/dictionaries/es.ts` | Añadir 7 claves bajo `onboarding.notifications*` (lista en §4.5). |
| `src/i18n/dictionaries/en.ts` | Añadir 7 equivalentes bajo `onboarding.notifications*`. |

### FR-REFINE-43.2: Dispatch en sync

| Archivo | Cambio |
|---------|--------|
| `src/features/admin/actions/trigger-sync.ts` | Importar `dispatchPendingNotifications`; añadir `try { await dispatchPendingNotifications(); } catch { /* best-effort */ }` tras `revalidateResultViews()`. |

## 6. Seguridad y NFR

| Área | Decisión |
|------|----------|
| Seguridad | Sin nuevos datos sensibles. `dispatchPendingNotifications()` ya valida preferencias por usuario. El gate admin de `triggerSync` (`getAdminUserId()`) sigue intacto. SECURITY-08 (authorization): N/A. SECURITY-05 (input validation): N/A — el paso de notificaciones usa `savePushSubscription`/`updateNotificationPreferences` que ya validan. SECURITY-12 (payload privacy): N/A — payloads existentes sin cambios. |
| Performance | `dispatchPendingNotifications()` es best-effort y no bloquea el sync. Sin nuevos queries en el onboarding. `enablePush()` del `NotificationStep` es async client-side, no afecta SSR. |
| i18n | 7 claves nuevas ES+EN. `NotificationStep` consume `onboarding` dictionary (+ `notifications` si se opta por importar ambos). |
| Browser compat | `NotificationStep` verifica `"serviceWorker" in navigator && "PushManager" in window` como `NotificationSettingsPanel`. Fallback a `unsupported` con botón "Continuar". |
| Sin dependencias nuevas | `web-push` ya existe en package.json. Sin npm install. |

## 7. Security Baseline Compliance

| Regla | Aplica | Dictamen |
|-------|--------|----------|
| SECURITY-03 (sensitive data) | No | N/A |
| SECURITY-04 (XSS) | No | N/A |
| SECURITY-05 (input validation) | Sí | Compliant — `savePushSubscription` y `updateNotificationPreferences` ya validan con zod schemas |
| SECURITY-06 (rate limiting) | No | N/A |
| SECURITY-07 (logging) | No | N/A |
| SECURITY-08 (authorization) | Sí | Compliant — gate admin de `triggerSync` intacto; onboarding usa sesión activa |
| SECURITY-09 (dependency) | No | N/A |
| SECURITY-10 (secrets) | No | N/A |
| SECURITY-11 (crypto) | No | N/A |
| SECURITY-12 (payload privacy) | Sí | Compliant — payloads de push ya son mínimos y no exponen datos privados |
| SECURITY-13 (session) | No | N/A |
| SECURITY-14 (CORS/CSP) | No | N/A |

## 8. Verificación esperada

### Tests (Vitest + React Testing Library, jsdom)

1. **NotificationStep**:
   - Render con `NEXT_PUBLIC_VAPID_PUBLIC_KEY` presente: muestra botón "Activar notificaciones" y botón "Omitir".
   - Render sin `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: muestra mensaje de configuración faltante + botón "Continuar" que llama `onComplete`.
   - Mock `"PushManager" in window === false`: muestra mensaje de no soportado + "Continuar" → `onComplete`.
   - Mock `Notification.permission === "denied"`: muestra mensaje de permiso denegado + "Continuar" → `onComplete`.
   - Click en "Omitir" → llama `onSkip`.
   - Click en "Activar" con permiso concedido: registra SW, subscribe, guarda.

2. **Onboarding integration** (`onboarding-client`):
   - `STEP_ORDER` contiene `"notifications"` entre `"rules"` y `"passkey"`.
   - En step `"rules"`, `RulesStep.onComplete` → `setStep("notifications")`.
   - En step `"notifications"`, `NotificationStep.onComplete` / `onSkip` → `setStep("passkey")`.

3. **Progress indicator**:
   - `STEPS` contiene `stepNotifications` entre `stepRules` y `stepPasskey`.

4. **triggerSync**:
   - `dispatchPendingNotifications` es llamado tras sync+scoring exitoso.
   - Si `dispatchPendingNotifications` lanza, el error no se propaga (el action retorna `{ success: true }`).
   - Si sync/scoring falla, no se llama al dispatcher.

### Verificación de calidad

- `pnpm exec tsc --noEmit` → 0 errores.
- Biome sobre archivos tocados → limpio.
- ESLint sobre archivos tocados → 0 warnings/errors.
- Vitest enfocado; full suite si imports compartidos lo requieren.
- `pnpm build` → OK.

## 9. Fuera de alcance

- Nuevos tipos de `NotificationEventType`.
- Cambiar `NotificationSettingsPanel` o `/settings/profile`.
- Cambiar `emitMatchNotificationEvents`, `dispatchPendingNotifications`, `queueNotificationEvent` internamente.
- Añadir preferencia persistida de "notifications step completed".
- Dispatch automático en `scoreFinishedUnscoredMatches()` (el sweeper corre dentro de sync y fuera de él; solo se añade al sync admin manual).
- Migraciones, schema, rutas, env vars, VAPID keys, auth.
