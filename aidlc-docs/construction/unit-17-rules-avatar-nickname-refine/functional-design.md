# Unit 17 — Reglas, Avatar Upload y Nickname Consistency · Functional Design

> Refine post-construccion (2026-06-14). **No reinicia** Units 1-16; corrige
> comportamiento y copy de flujos existentes. Cubre FR-REFINE-17.1 ... 17.4 y la
> **Epica 16** (US-16.1 ... US-16.4).

## 1. Alcance y trazabilidad

| Historia | FR-REFINE | Naturaleza | Resultado |
|----------|-----------|------------|-----------|
| US-16.1 | 17.1 | coherencia reglas/rankings | Reglas explican ranking por liga y ranking global |
| US-16.2 | 17.2 | bug perfil/avatar | Upload usa path unico para evitar colision de signed URL |
| US-16.3 | 17.3 | corrige 16.5 x 12.5 | Cooldown aplica tras consumir una oportunidad de gracia post-onboarding |
| US-16.4 | 17.4 | endurece identidad | Nickname case-insensitive en disponibilidad, asignacion y busqueda |

## 2. Decisiones de diseno

### Reglas y rankings (US-16.1 / FR-REFINE-17.1)

El copy anterior "El ranking es por liga, no global. Compites contra tu grupo."
es incorrecto porque el producto tiene **ranking por liga** y **ranking global**
(Unit 6 + Unit 14). La seccion de reglas debe decir explicitamente: "Hay ranking
por liga y ranking global: compites contra tu liga y tambien contra todos los
usuarios." Esto reemplaza cualquier copy residual de "solo liga".

### Upload de avatar custom (US-16.2 / FR-REFINE-17.2)

El flujo de upload creaba siempre la misma ruta:
`custom/{userId}/avatar.{ext}`. En Supabase Storage, `createSignedUploadUrl` falla
si el objeto ya existe o si hay una colision/estado previo en esa ruta; el usuario
solo veia "Failed to create upload URL". Como el usuario esta en devcontainer
apuntando a Supabase real y confirma que puede ser colision de path, el diseno
cambia a **path unico por intento**:

`custom/{userId}/{crypto.randomUUID()}.{ext}`

El cleanup de avatar anterior sigue en `setAvatarFromUpload` (borra el objeto custom
previo si existe), pero la creacion de URL ya no depende de sobrescribir el mismo
path. El error externo sigue siendo generico para no filtrar detalles internos;
en servidor se registra la causa con informacion no sensible.

### Cooldown de nickname (US-16.3 / FR-REFINE-17.3)

La regla correcta es: el cooldown de 30 dias aplica **despues de consumir una
oportunidad de gracia post-onboarding**, no despues de la primera asignacion. El
usuario crea la cuenta, asigna un nickname durante onboarding y todavia conserva
un cambio libre para corregirlo sin esperar 30 dias. La secuencia normativa es:

1. Nickname #1: asignacion inicial durante onboarding; nunca bloquea por cooldown.
2. Nickname #2: primer cambio posterior al onboarding; se permite como gracia.
3. Nickname #3 o posteriores: si `nicknameUpdatedAt` esta dentro de 30 dias desde el
   ultimo cambio permitido, devuelve `rate_limited`.

Por tanto `setNickname` no puede basarse solo en "ya habia `nicknameBase`" ni solo
en `nicknameUpdatedAt`: necesita conocer si la gracia post-onboarding ya fue
consumida. La implementacion agrega `profiles.nickname_change_count`:

- `0`: sin nickname asignado.
- `1`: nickname inicial asignado (incluye backfill de perfiles existentes con
  nickname); conserva la gracia.
- `2`: gracia consumida; a partir de aqui aplica cooldown de 30 dias para intentos
  posteriores.
- `>2`: cambios posteriores permitidos tras cooldown vencido.

Esto conserva la correccion de Unit 16: durante onboarding el cooldown no aplica,
pero ademas cubre el caso principal pedido por UX: corregir una vez el nickname
despues de completar onboarding sin esperar 30 dias.

### Nickname case-insensitive (US-16.4 / FR-REFINE-17.4)

El nickname no distingue mayusculas/minusculas. La disponibilidad, asignacion de
discriminador y busqueda por nickname deben tratar `Pepe` y `pepe` como la misma
base. La busqueda de invitacion dirigida ya usa `mode: "insensitive"`; se refuerza
el mismo comportamiento en:

- `checkNicknameAvailability`: cuenta perfiles con `nicknameBase` case-insensitive.
- `assignDiscriminator`: al probar un discriminator, busca cualquier perfil con la
  misma base case-insensitive y el mismo discriminator; asi bloquea `Pepe#1234` vs
  `pepe#1234`.
- `setNickname`: conserva el display casing que escribe el usuario, pero la
  asignacion evita colisiones case-insensitive.

## 3. Contratos modificados

| Elemento | Tipo | Cambio |
|----------|------|--------|
| `rules/page.tsx` / i18n | mod | Copy: ranking por liga y global |
| `create-avatar-upload-url.ts` | mod | Path unico por upload + log de error server-side |
| `set-nickname.ts` | mod | Cooldown solo tras consumir la gracia post-onboarding |
| `prisma/schema.prisma` | mod | `Profile.nicknameChangeCount` (`nickname_change_count`) |
| `prisma/migrations/20260614123000_nickname_grace_count` | new | Columna + backfill conservador |
| `check-nickname-availability.ts` | mod | Conteo case-insensitive |
| `services/nickname.ts` | mod | Colision de base+discriminator case-insensitive |

## 4. Estados, seguridad y UX

- Errores al usuario siguen siendo genericos en Storage para evitar filtrar detalles
  de Supabase/RLS/bucket.
- Logs server-side deben evitar PII sensible; se permite registrar `error.message`
  de Supabase y el contexto del bucket/path sin tokens.
- El casing elegido por el usuario se mantiene como display (`NicknameBase`), pero
  la unicidad logica se evalua sin case-sensitivity.
- La oportunidad de gracia de nickname es una regla de producto observable; no debe
  depender de heuristicas fragiles como "hay nickname previo" si eso bloquea el
  primer cambio post-onboarding.
- Backfill conservador: perfiles existentes con `nickname_base` se inicializan en
  `nickname_change_count = 1`, preservando una gracia aunque no se pueda reconstruir
  historial anterior.

## 5. Verificacion esperada

- Tests unitarios para path unico de upload y error estable.
- Tests de nickname para asignacion inicial sin rate limit, primer cambio
  post-onboarding sin rate limit, intento posterior dentro de 30 dias con
  `rate_limited`, disponibilidad case-insensitive y colision case-insensitive de
  discriminator.
- `pnpm exec tsc --noEmit`, `pnpm check`, `pnpm lint`, `pnpm test`.
- Verificacion implementada en esta iteracion: `pnpm prisma:generate`,
  `pnpm exec tsc --noEmit`, `pnpm check`, `pnpm lint`, `pnpm test` (179/179).

## 6. Epica 16 — Historias de usuario

- **US-16.1**: Como usuario quiero que las reglas expliquen que compito en ranking
  de mi liga y ranking global, para no recibir informacion contradictoria.
- **US-16.2**: Como usuario quiero poder subir una imagen de avatar aunque ya haya
  subido una antes, sin que falle la creacion de URL por colision.
- **US-16.3**: Como usuario quiero tener una oportunidad de gracia para corregir mi
  nickname despues del onboarding, antes de que aplique el limite de 30 dias.
- **US-16.4**: Como usuario quiero que `Pepe#1234` y `pepe#1234` se traten como el
  mismo nickname, incluyendo disponibilidad y busquedas.
