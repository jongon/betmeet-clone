# Unit 3: Pools and Membership — Functional Design Plan

## Unit
**Pools and Membership** — crear pools (público/privado), unirse (directorio / invitación), expulsar miembros, con congelamiento al iniciar el Mundial.

## Stories
- **US-4.1** Creación de Pool (nombre, tipo público/privado, capacidad ≤100, creador = admin, link/código de invitación).
- **US-4.2** Unirse a un Pool (directorio público con búsqueda; privados por código/link; multi-pool; respeta capacidad).
- **US-4.3** Expulsar Miembros (solo admin; solo **antes** del primer partido del Mundial — luego las listas se congelan).

## Dependencias
- **Unit 1 (Profile)**: identidad del usuario (nickname, avatar) para mostrar miembros.
- **Unit 4 (Competition Data)**: timestamp de inicio del **primer partido** del Mundial (define el congelamiento). Unit 4 se construye **después** → dependencia hacia adelante a resolver (Q6).
- **Provee a Unit 2 (landing)**: datos para la interfaz `PoolPreviewItem` ya definida (`src/features/pools/types.ts`).
- **Provee a Unit 6 (Rankings)**: membresía de pool para construir leaderboards.

## Plan Checklist
- [x] Collect and analyze answers to clarification questions below
- [x] Resolve any ambiguous answers with follow-up questions (F1/F2/F3 respondidas)
- [x] Generate `domain-entities.md`, `business-logic-model.md`, `business-rules.md`, `frontend-components.md`

---

## Clarification Questions

Responde cada pregunta poniendo la letra después de `[Answer]:`. Si ninguna encaja, elige la última (X) y describe. Cada pregunta marca una opción **(recomendado)**.

---

### Question 1 — Mecanismo de invitación (US-4.1)
¿Cómo se invita a un pool privado (y se comparte un público)?

A) **Token único = código + link** — cada pool genera un token corto (p. ej. 8 caracteres); sirve como código para pegar y como link `/pools/join/{token}`. (recomendado)
B) Solo **link** con token (sin código legible).
C) Código numérico corto separado del link.
X) Otro

[Answer]: Voy con la opción A, considerar que se puede copiar el link al portapapeles o compartir el código a través de whatsapp

---

### Question 2 — Límites de capacidad (US-4.1)
La capacidad es "hasta 100". ¿Qué rango permitimos al crear?

A) **Mínimo 2, máximo 100**, configurable por el creador; sin default forzado (sugerencia 20). (recomendado)
B) Valores fijos a elegir (10 / 25 / 50 / 100).
C) Siempre 100 (no configurable en v1).
X) Otro

[Answer]: A, Minimo 2, Máximo 100, pero el creador del Pool puede elegir entre 2 a 100

---

### Question 3 — Nombre del pool: ¿único?
¿El nombre del pool debe ser único globalmente?

A) **No único** — varios pools pueden llamarse igual; se distinguen por id y por admin (el directorio muestra el nombre del admin/owner). (recomendado)
B) Único global (rechaza nombres repetidos).
C) Único solo entre pools públicos.
X) Otro

[Answer]: C

---

### Question 4 — Directorio público: búsqueda y filtros (US-4.2)
¿Cómo se descubren los pools públicos?

A) **Búsqueda por nombre (texto) + filtro "con cupo disponible"**, orden por más recientes/populares. (recomendado)
B) Solo búsqueda por nombre.
C) Listado completo paginado sin búsqueda.
X) Otro

[Answer]: A

---

### Question 5 — Rol de administrador del pool
¿Cómo se gestiona el admin del pool en v1?

A) **Creador = único admin, no transferible**; el admin no puede "abandonar" (debe eliminar el pool si quiere salir). (recomendado)
B) Admin transferible a otro miembro.
C) Múltiples admins (co-admins).
X) Otro

[Answer]: A

---

### Question 6 — Origen del "inicio del primer partido" (US-4.3) ⚠️ dependencia hacia Unit 4
La expulsión (y el congelamiento de listas) depende del kickoff del primer partido del Mundial, dato propio de Competition Data (Unit 4, aún no construido). ¿Cómo lo resolvemos ahora?

A) **Definir una interfaz/servicio `getCompetitionLockTime()`** que Unit 4 implementará; en v1 de Unit 3 se respalda con un valor de configuración/seed (env `WORLD_CUP_KICKOFF` o fila de config) para no bloquear el desarrollo. (recomendado)
B) Constante de configuración fija ahora; cablear a Unit 4 más tarde.
C) Crear ya una tabla `Competition` mínima con el kickoff (adelanta parte de Unit 4).
X) Otro

[Answer]: A

---

### Question 7 — Abandonar un pool voluntariamente
¿Un miembro (no admin) puede salirse de un pool?

A) **Sí, antes del congelamiento**; después del primer partido las listas se congelan (no join, no leave, no kick). (recomendado)
B) Sí, en cualquier momento.
C) No, una vez dentro no se puede salir.
X) Otro

[Answer]: A, pero un miembro puede ser capaz de archivar el pool.

---

### Question 8 — Eliminar un pool
¿El admin puede eliminar su pool?

A) **Sí, antes del congelamiento**; después no (el pool queda activo para el torneo). (recomendado)
B) Sí, en cualquier momento (incluso durante el torneo).
C) No se puede eliminar en v1.
X) Otro

[Answer]: A

---

### Question 9 — Impacto de la eliminación de cuenta (Unit 1)
Si un usuario borra su cuenta (flujo de Unit 1), ¿qué pasa con sus pools/membresías?

A) **Miembro borrado → se elimina su membresía. Admin borrado → se eliminan los pools que creó** (y sus membresías). (recomendado)
B) Admin borrado → el pool se transfiere al miembro más antiguo.
C) Bloquear el borrado de cuenta mientras el usuario sea admin de algún pool.
X) Otro

[Answer]: Solo se permite transferir el ownership del pool solo cuando el se desea eliminar su cuenta. De lo contrario no puede. El pool tiene que quedar vivo hasta el final del torneo.

---

### Question 10 — Pantallas (frontend) de Unit 3
¿Confirmas este set de pantallas/flujos?

A) **Crear pool (form), Directorio público (búsqueda), Detalle de pool (lista de miembros + acción expulsar para admin), Unirse por código/link.** Se cablea el `PoolPreview` de la landing (Unit 2) a datos reales. (recomendado)
B) Igual que A, pero sin detalle de miembros en v1 (solo crear/unirse/listar).
C) Otro alcance (describe).
X) Otro

[Answer]: A

---

## Notas
- Tras las respuestas generaré `domain-entities.md` (Pool, PoolMembership), `business-logic-model.md`, `business-rules.md` (BR-3.x) y `frontend-components.md`.
- Unit 3 **sí** introduce tablas/migraciones nuevas (a diferencia de Unit 2).

---

## Follow-up Questions (resolver ambigüedades antes de generar)

> Tus respuestas a Q7 y Q9 abren detalles que necesito fijar. Responde después de cada `[Answer]:`.

### Follow-up F1 — ¿Qué significa "archivar el pool"? (de Q7)
Dijiste que un miembro "puede ser capaz de archivar el pool". ¿Qué alcance tiene?

A) **Archivo personal (por miembro)** — el pool se oculta de *mi* lista activa sin afectar a los demás ni a mi membresía; puedo desarchivarlo. Disponible en cualquier momento (incluso tras el congelamiento). Sirve para "limpiar" pools terminados sin salir. (recomendado)
B) **Archivar para todos** — el admin (no un miembro cualquiera) archiva el pool entero (lo cierra a nuevas acciones) para todos.
C) Es lo mismo que "abandonar" (salir del pool); no es un estado aparte.
X) Otro (describe)

[Answer]: A

---

### Follow-up F2 — Al eliminar la cuenta del admin, ¿quién recibe el ownership? (de Q9)
La transferencia forzada de ownership al borrar la cuenta del admin: ¿cómo se elige al nuevo dueño?

A) **El admin elige** a quién transferir entre los miembros como paso obligatorio del borrado de cuenta. (recomendado)
B) **Automático**: al miembro más antiguo del pool.
C) Automático: al miembro con más puntos (si aplica).
X) Otro

[Answer]: A, pero debe ver el orden del más antiguo al mas nuevo.

---

### Follow-up F3 — Admin borra su cuenta y es el ÚNICO miembro del pool
Si el pool no tiene otros miembros a quien transferir, ¿qué pasa al borrar la cuenta?

A) **Se elimina el pool** (no hay a quién transferir; al ser unipersonal no rompe la regla de "mantener vivo para los participantes"). (recomendado)
B) Se bloquea el borrado de cuenta hasta que el pool tenga otro miembro o sea eliminado por el admin.
C) El pool queda "huérfano" sin admin hasta el fin del torneo.
X) Otro

[Answer]: A
