# Unit 51 — Cron dedicado de dispatch de Web Push · Functional Design

> Refine post-construcción (2026-06-19). Cierra el último gap operativo para tener Web Push **funcionando de forma autónoma en producción**. **No reinicia** Units 1–50. Sin cambios de schema en tablas de la app, sin rutas nuevas, sin VAPID keys nuevas, sin cambios en el dispatcher ni en los productores de eventos.

## 1. Alcance y trazabilidad

| Historia | FR-REFINE | Naturaleza | Resultado |
|----------|-----------|------------|-----------|
| US-51.1 | 51.1 | gap operativo | Cron `dispatch-notifications` (`* * * * *`) golpea `POST /api/notifications/dispatch`, independiente del cron de sync. |
| US-51.2 | 51.2 | documentación | Runbook §7 ampliado con el cron de dispatch + variables VAPID en Vercel + verificación E2E de Web Push. |

## 2. Problema

Tras Unit 10 (baseline), Unit 43 (onboarding + dispatch en sync admin) y Unit 50 (crons de sync), el código de Web Push está **completo y cableado** de punta a punta: suscripción en navegador → `PushSubscription` → outbox `NotificationEvent` → `dispatchPendingNotifications` (`web-push` + VAPID) → service worker.

El único disparo automático del dispatcher es **best-effort al final de `runScheduledSync`** (Unit 50). Eso acopla la entrega de notificaciones a los tiers del proveedor:

1. **Latencia de `POOL_INVITE`**: las invitaciones se encolan por una acción de usuario en cualquier momento, pero salen sólo en la siguiente corrida de RESULTS (`*/5`) → hasta ~5 min de retraso.
2. **Cobertura fuera de ventana de partido**: el tier en vivo (`LIVE_STATUS`) hace short-circuit (`hasActiveMatchWindow`) cuando no hay partidos en juego/inminentes; sin partidos activos, sólo RESULTS dispara el dispatch.
3. **Acoplamiento a la cuota del proveedor**: cualquier ajuste de cadencia del sync (limitado por las 10 req/min del plan free de football-data.org) arrastra a la entrega de notificaciones, aunque el dispatch **no** consume cuota del proveedor (sólo llama a los push services del navegador).

Además, el gap real para que funcione en **producción (Vercel)** es de configuración, no de código: las extensiones de Supabase, los secretos del Vault y **las variables `VAPID_*` en el entorno de Vercel** (sin ellas, `dispatchPendingNotifications` devuelve `{0,0,0}` en silencio).

## 3. Decisión de diseño

- **DD-51.1**: Cron dedicado `dispatch-notifications` con cadencia `* * * * *` (cada minuto) que hace `net.http_post` a `POST /api/notifications/dispatch`, leyendo `app_base_url` y `sync_trigger_secret` del Vault (mismo patrón y mismo guard `x-sync-secret` que Unit 50). Migración `20260619130000_unit51_cron_dispatch_notifications`, defensiva (no-op sin pg_cron/pg_net) e idempotente (`cron.unschedule` previo).
- **DD-51.2**: Cadencia por minuto es segura: `dispatchPendingNotifications` es idempotente, hace una sola query indexada cuando el outbox está vacío, es no-op si faltan las VAPID y **no consume cuota del proveedor**. El `take=50` por corrida da ~3000 envíos/hora de techo (suficiente para el MVP; punto de tuning futuro).
- **DD-51.3**: El dispatch best-effort dentro de `runScheduledSync` (Unit 50) **se conserva** como camino redundante — no se elimina; las notificaciones de partido siguen saliendo en la misma corrida que las genera, sin esperar al tic del minuto.
- **DD-51.4**: Sin cambios de código de aplicación. La ruta `POST /api/notifications/dispatch` ya existe (Unit 10) y ya está guarded; el middleware ya hace early-return para `/api/*` (BR-50.10).

## 4. Reglas de negocio

- **BR-51.1**: El cron de dispatch usa el **mismo** `sync_trigger_secret` del Vault y el **mismo** `SYNC_TRIGGER_SECRET` de Vercel que el cron de sync. Rotar uno implica rotar el otro.
- **BR-51.2**: Si faltan las `VAPID_*` en Vercel, el dispatch corre pero entrega cero (no lanza). Es un fallo silencioso: la verificación E2E (§5) es obligatoria en cada entorno nuevo.
- **BR-51.3**: La entrega es best-effort e idempotente; un evento se marca `SENT`/`FAILED`/`SKIPPED` una sola vez. Endpoints muertos (404/410) se desactivan (`isActive=false`). No hay reintento por suscripción (limitación conocida heredada de Unit 10).

## 5. Verificación E2E de Web Push (producción)

1. **Vercel env**: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `SYNC_TRIGGER_SECRET` presentes en el entorno de producción.
2. **Supabase**: extensiones `pg_cron`/`pg_net` habilitadas; Vault con `app_base_url` + `sync_trigger_secret`; `prisma migrate deploy` aplicado.
3. `select jobname, schedule, active from cron.job order by jobname;` → **5 jobs** (4 de sync + `dispatch-notifications`).
4. Suscribirse en el navegador (onboarding o `/settings/profile` → "Activar notificaciones"), conceder permiso → fila en `push_subscriptions` con `is_active=true`.
5. Generar un evento (p. ej. invitación dirigida a un pool, o un cambio de estado de partido vía sync) → fila `notification_events` en `PENDING`.
6. Dentro de ~1 min el cron lo drena → `notification_events.status='SENT'`, fila en `notification_deliveries` con `status='SENT'`, y la notificación aparece en el navegador.
7. `curl -X POST -H "x-sync-secret: $SYNC_TRIGGER_SECRET" .../api/notifications/dispatch` → `{ "sent": …, "failed": …, "skipped": … }`.

## 6. Out of scope (limitaciones conocidas, no abordadas aquí)

- Reintento/backoff por suscripción ante fallo transitorio (heredado de Unit 10).
- Copy de notificaciones i18n (hoy hardcodeado en español en los servicios de eventos).
- Service worker avanzado (botones de acción, agrupación, iconos por tipo).
- iOS/Safari: Web Push sólo funciona con la PWA instalada (limitación de plataforma).
