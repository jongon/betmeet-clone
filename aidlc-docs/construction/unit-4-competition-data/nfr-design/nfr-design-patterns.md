# Unit 4: Competition Data and API Sync — NFR Design Patterns

> Traduce los NFR de Unit 4 en patrones concretos. Respuestas NFR Design: Q1=A, Q2=A, Q3=A, Q4=A, Q5=A, Q6=A, Q7=A, Q8=A, Q9=A, Q10=A.

---

## Pattern 1: State/Window-Aware Fixture Cache (Performance / Scalability) — Q1=A

**Problema**: `/matches` debe cargar rápido, pero el fixture cambia con distinta frecuencia según el estado del partido.

**Patrón**: cache segmentado por estado/ventana.

| Tipo de dato | Estrategia |
|---|---|
| Fixture futuro `SCHEDULED` | `revalidate` corto, 5–15 min |
| Match-day / `LIVE` / `LOCKED` | `no-store` o revalidate 30–60s |
| `FINISHED` histórico | revalidate más largo tras finalización |
| Flags/local metadata | cache del navegador/CDN por asset estático |

**Propiedades**:
- Evita pegar a DB en cada vista para datos que no cambian minuto a minuto.
- Preserva freshness razonable durante partidos.
- Para MVP pequeño no requiere read models/materialized views.

---

## Pattern 2: Server-Side Fixture Freshness Service (Reliability / UX) — Q2=A

**Problema**: si API-Football falla, el fixture debe seguir visible pero indicando que puede estar desactualizado.

**Patrón**: servicio servidor `fixtureFreshness` que calcula freshness a partir de `ProviderSyncLog`.

**Contrato**:
```ts
interface FixtureFreshness {
  isStale: boolean;
  lastSyncedAt: string | null;
  reason: "NO_SUCCESSFUL_SYNC" | "LIVE_WINDOW_MISSED" | "RATE_LIMITED" | null;
}
```

**Lógica**:
- Buscar último `ProviderSyncLog.SUCCESS` por `scope` relevante (`LIVE_STATUS`, `RESULTS`, `FIXTURES`).
- Comparar contra ventana esperada: 1–5 min live, diaria para fixture futuro.
- Devolver una señal simple para UI y futuro dashboard admin.

**Propiedades**:
- La UI no lee logs directamente ni duplica reglas.
- Testeable con logs mockeados.
- Sirve a usuarios y Unit 7 admin.

---

## Pattern 3: Database-Backed Sync Lock (Reliability / Concurrency) — Q3=A

**Problema**: dos crons/manual sync podrían escribir el mismo scope a la vez y causar carreras o duplicados.

**Patrón**: lock lógico en DB por `provider + scope + windowKey`.

**Lógica**:
```text
startSync(scope, windowKey):
  insert sync run STARTED with unique(provider, scope, windowKey) if no active unexpired run
  if conflict active -> skip/no-op
  if expired -> mark stale/failed and start new run
```

**Propiedades**:
- Funciona entre múltiples Edge Functions/instancias.
- No depende de memoria local.
- Permite auditoría del run activo/fallido.

---

## Pattern 4: Bounded Retry with Exponential Backoff (Resilience / Provider Quota) — Q4=A

**Problema**: API-Football puede fallar transitoriamente o rate-limitear.

**Patrón**: pocos retries por run con backoff exponencial y respeto de rate-limit.

**Reglas**:
- Retry solo errores transitorios de red/5xx.
- Si provider responde rate-limit, registrar `RATE_LIMITED` y no insistir agresivamente.
- Nunca reintentar indefinidamente.

**Propiedades**:
- Reduce fallos por glitches.
- Protege cuota/costos.
- Mantiene logs claros por run.

---

## Pattern 5: Fetch → Normalize → Validate → Upsert Pipeline (Maintainability / Integrity) — Q5=A

**Problema**: mezclar payload provider y writes de dominio acopla la app a API-Football.

**Patrón**: pipeline explícito.

```text
API-Football fetch
  -> normalize to provider-neutral DTOs
  -> validate DTO shape/domain invariants
  -> idempotent upsert through domain service
```

**Propiedades**:
- Adapter no escribe directamente a Prisma.
- Validación centralizada antes de persistir.
- Facilita tests y swap de provider.

---

## Pattern 6: MVP Alert Signals via DB + Structured Logs (Observability) — Q6=A

**Problema**: MVP pequeño necesita señales operativas sin integrar un sistema de alertas pesado todavía.

**Patrón**: `ProviderSyncLog` como fuente de verdad + logs estructurados en fallos críticos.

**Señales mínimas**:
- 3 fallos consecutivos.
- Rate-limit sostenido.
- Ventana live sin sync exitosa.
- API key faltante/auth failure.

**Propiedades**:
- Unit 7 puede construir dashboard sobre los mismos logs.
- `console.error(JSON.stringify(...))` permite captura por Vercel/Supabase logs.

---

## Pattern 7: Post-Sync Revalidation with TTL Fallback (Performance / Freshness) — Q7=A

**Problema**: tras sync exitosa, el cache de fixture no debe quedarse stale innecesariamente.

**Patrón**: diseñar para `revalidateTag('fixture:{competition}')` / `revalidatePath('/matches')` cuando el sync corra en entorno Next; si corre en Edge Function externa, usar TTL corto como fallback.

**Propiedades**:
- Compatible con Next App Router.
- No obliga a acoplar Supabase Edge Function a APIs internas si no conviene.
- TTL corto garantiza recuperación incluso sin invalidación explícita.

---

## Pattern 8: Flag Asset Validation Script (Reliability / Build Safety) — Q8=A

**Problema**: un equipo puede referenciar `flagKey` sin SVG local existente.

**Patrón**: script/check que compara seed de equipos contra `public/flags/{flagKey}.svg`.

**Propiedades**:
- Detecta faltantes antes del deploy.
- UI mantiene fallback a FIFA code si algo falla.
- Evita hotlinking runtime.

---

## Pattern 9: Protected Manual/System Sync Trigger (Security) — Q9=A

**Problema**: un trigger manual/dev para sync no puede quedar público.

**Patrón**: server-only trigger protegido por admin verificado o secreto de sistema/cron.

**Reglas**:
- Nunca público ni protegido por URL obscura.
- Rate-limit por scope.
- No expone API key ni payloads.
- Produce `ProviderSyncLog` igual que un cron.

---

## Pattern 10: Injectable Provider Interface + Test Fixtures (Testability) — Q10=A

**Problema**: CI/tests no deben depender de API-Football real.

**Patrón**: interfaz provider inyectable y fixtures JSON/TS de prueba.

**Tests objetivo**:
- Status mapping.
- Normalización fixture/team/result.
- Idempotent upsert.
- Manual override preservation.
- First-kickoff lookup.
- Freshness/stale calculation.

---

## Summary

| # | Pattern | Category |
|---|---|---|
| 1 | State/window-aware fixture cache | Performance |
| 2 | Server-side fixture freshness service | Reliability/UX |
| 3 | Database-backed sync lock | Concurrency |
| 4 | Bounded retry/backoff | Resilience |
| 5 | Fetch-normalize-validate-upsert | Integrity |
| 6 | DB + structured logs alert signals | Observability |
| 7 | Post-sync revalidation + TTL fallback | Freshness |
| 8 | Flag asset validation script | Build safety |
| 9 | Protected sync trigger | Security |
| 10 | Injectable provider + test fixtures | Testability |
