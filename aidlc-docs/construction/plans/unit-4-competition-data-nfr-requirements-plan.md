# Unit 4: Competition Data and API Sync — NFR Requirements Plan

## Unit
**Competition Data and API Sync** — fixture, equipos, estados/resultados, flags locales, adapter API-Football, sync logs y base de crons.

## Functional Inputs
- Seed local/reconciliable + API-Football sync (Q1=A, Q8=A).
- FIFA trigram como código visible (Q2=A).
- Flags SVG locales en `public/flags/` (Q3=A).
- Modelo extensible multi-competición, UI v1 solo Mundial 2026 (Q4=A).
- Estados simples: `SCHEDULED`, `LOCKED`, `LIVE`, `FINISHED`, `POSTPONED`, `CANCELLED` (Q5=A).
- Sync con dos cadencias: diaria futura + rápida match-day/live cada 1–5 min (Q9=A).
- Manual override queda preparado, implementación admin en Unit 7 (Q10=A).

## Plan Checklist
- [x] Collect and analyze answers to clarification questions below.
- [x] Resolve ambiguous answers with follow-up questions if needed. *(Q1 clarified as MVP pequeño.)*
- [x] Generate `aidlc-docs/construction/unit-4-competition-data/nfr-requirements/nfr-requirements.md`.
- [x] Generate `aidlc-docs/construction/unit-4-competition-data/nfr-requirements/tech-stack-decisions.md`.

---

## Contexto para las preguntas

Unit 4 es el primer unit con **API externa + crons + datos deportivos cambiantes**. Hereda las restricciones generales del proyecto: Next.js 16 App Router, Supabase/PostgreSQL, Prisma, Vercel, Security Baseline activo, validación server-side, RLS y secretos nunca expuestos al cliente.

Los riesgos NFR principales son:
- Límite/rate-limit y disponibilidad de API-Football.
- Staleness de fixture/resultados durante partidos en vivo.
- Idempotencia y consistencia entre seed, provider IDs y overrides futuros.
- Costo de polling/crons en Supabase/Vercel.
- Seguridad de API keys y logs de provider.
- Performance del fixture para usuarios móviles.

---

## Clarification Questions

Responde cada pregunta poniendo la letra después de `[Answer]:`. Si ninguna opción encaja, elige `X` y describe.

---

### Question 1 — Escala esperada de lectura del fixture
¿Qué baseline usamos para dimensionar `/matches`/fixture en MVP?

A) **MVP moderado** — hasta ~1,000 usuarios registrados, ~5,000 vistas/día de fixture en días normales y ~20,000 vistas/día en días de partido. (recomendado)
B) **MVP pequeño** — hasta ~200 usuarios y ~2,000 vistas/día pico.
C) **Lanzamiento alto** — 10,000+ usuarios, 100,000+ vistas/día pico desde el inicio.
X) Otro

[Answer]: B — MVP pequeño (~200 usuarios y ~2,000 vistas/día pico). Nota posterior: "Vamos con MVP pequeño".

---

### Question 2 — Freshness del estado en vivo
Durante partidos en vivo, ¿qué nivel de frescura aceptamos para marcador/estado?

A) **Near-real-time razonable** — staleness máximo objetivo 1–5 minutos; suficiente para quiniela MVP, no apuestas en vivo. (recomendado)
B) Casi tiempo real < 30 segundos.
C) Staleness hasta 15 minutos aceptable.
X) Otro

[Answer]: A

---

### Question 3 — Disponibilidad y degradación si API-Football falla
¿Cómo debe comportarse el sistema si el provider falla o rate-limitea?

A) **Servir último dato bueno + marcar stale** — fixture sigue visible con `lastSyncedAt`/estado stale; logs registran error; no se bloquea lectura. (recomendado)
B) Mostrar error global del fixture si la sync falla.
C) Ocultar marcadores/estados en vivo hasta que vuelva la API.
X) Otro

[Answer]: A, y en el admin debo ser capaz de hacer override si la falla es persistente

---

### Question 4 — Persistencia de payloads de provider
¿Guardamos respuestas crudas de API-Football para debugging/auditoría?

A) **No payload completo por defecto** — guardar solo metadata/logs sanitizados y campos normalizados; payload completo solo temporal/local si se necesita. (recomendado)
B) Guardar payload crudo completo en DB para cada sync.
C) Guardar payload crudo solo cuando la sync falla.
X) Otro

[Answer]: A

---

### Question 5 — Política de secretos API-Football
¿Dónde debe vivir la API key de API-Football?

A) **Solo server-side env/secret manager** — `API_FOOTBALL_KEY` no pública, usada por Server Actions/jobs/Edge Functions; nunca `NEXT_PUBLIC`. (recomendado)
B) Supabase Vault exclusivamente desde el inicio.
C) Variable en DB configurable por admin.
X) Otro

[Answer]: A

---

### Question 6 — Estrategia de cache para lectura de fixture
¿Cómo cacheamos el fixture para usuarios?

A) **DB como fuente + cache corto/revalidable** — queries server-side con cache/revalidate corto para fixture no-live; live/no-store o revalidate muy corto. (recomendado)
B) Sin cache; cada vista pega directo a DB.
C) Cache agresivo por CDN por horas, incluso en días de partido.
X) Otro

[Answer]: A

---

### Question 7 — Objetivos de performance UI fixture
¿Qué objetivos de performance fijamos para `/matches`?

A) **Mobile-first estándar** — LCP < 2.5s, TTFB < 800ms, JS cliente < 150KB gzip; fixture mayormente Server Components. (recomendado)
B) Performance razonable sin umbrales numéricos.
C) Priorizar riqueza interactiva aunque suba bundle/latencia.
X) Otro

[Answer]: A

---

### Question 8 — Retención de logs de sync
¿Cuánto tiempo retenemos `ProviderSyncLog` en MVP?

A) **90 días** — consistente con Security Baseline/logging mínimo; suficiente para diagnóstico de torneo. (recomendado)
B) 30 días.
C) Durante todo el torneo + 1 año.
X) Otro

[Answer]: A

---

### Question 9 — Alertas operativas de sync
¿Qué debe disparar alerta/visibilidad operativa en MVP?

A) **Mínimo útil** — 3 fallos consecutivos, rate-limit sostenido, o no sync exitosa en ventana esperada durante match-day. (recomendado)
B) Solo revisar logs manualmente, sin alertas.
C) Alertas detalladas por cada error individual.
X) Otro

[Answer]: A

---

### Question 10 — Infra de cron preferida para diseñar NFR
La infraestructura exacta se decide en Infrastructure Design, pero NFR necesita una preferencia base. ¿Qué asumimos?

A) **Supabase Edge Functions + scheduled/cron** para sync, con Prisma/DB server-side y logs en Postgres. (recomendado)
B) Vercel Cron hitting Next.js route handlers.
C) Servicio externo tipo Trigger.dev/Inngest desde v1.
X) Otro

[Answer]: A

---

## Expected NFR Outputs
- `nfr-requirements.md`: escala, freshness, disponibilidad, staleness, cache, security, observabilidad, retención, performance, resiliencia.
- `tech-stack-decisions.md`: API-Football adapter, secret handling, sync execution preference, caching primitives, log retention, flag asset handling, testing strategy.
