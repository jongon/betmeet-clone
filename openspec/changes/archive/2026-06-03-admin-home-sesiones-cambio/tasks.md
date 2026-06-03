## 1. Tipos y datos seed

- [x] 1.1 Crear `src/lib/sessions.ts` con tipos `Session`, `SessionStatus`, y schema Zod que valida la forma de los datos al leer el repositorio
- [x] 1.2 Crear `data/sessions.seed.json` con 3 sesiones de ejemplo (2 abiertas, 1 cerrada) con ids únicos y fechas recientes
- [x] 1.3 Añadir `data/sessions.json` a `.gitignore` (el archivo real es runtime, no committed)

## 2. Repositorio de sesiones

- [x] 2.1 Crear `src/lib/sessions-store.ts` con funciones async `getAllSessions()`, `acceptSession(id)`, `rejectSession(id)` usando `node:fs/promises`
- [x] 2.2 Implementar siembra automática desde `sessions.seed.json` en el primer acceso si `data/sessions.json` no existe
- [x] 2.3 Validar el JSON leído con el schema Zod de `sessions.ts` y lanzar error explícito si está corrupto

## 3. Server Actions

- [x] 3.1 Crear `src/app/admin/actions.ts` con `'use server'` exportando `acceptSession(id: string)` y `rejectSession(id: string)`
- [x] 3.2 Cada action valida el `id` con Zod, llama al repositorio, y luego `revalidatePath('/admin')`

## 4. Server Component /admin

- [x] 4.1 Crear `src/app/admin/page.tsx` como Server Component que llama a `getAllSessions()`, ordena abiertas (createdAt desc) y las cerradas debajo, y pasa los datos a `SessionList`
- [x] 4.2 Renderizar header con título "Sesiones de cambio" usando la fuente display y un conteo de sesiones abiertas
- [x] 4.3 Mostrar empty state si la lista viene vacía del servidor (sin filtros aplicados)

## 5. Componentes de cliente

- [x] 5.1 Crear `src/components/admin/filter-bar.tsx` (Client) con input controlado para el nombre y `Tabs` (Todas / Abiertas / Cerradas) controlado para el estado
- [x] 5.2 Crear `src/components/admin/session-list.tsx` (Client) que recibe la lista inicial del server, mantiene estado de filtros, deriva la lista filtrada, y renderiza filas o empty state
- [x] 5.3 Crear `src/components/admin/session-row.tsx` (Client) que renderiza los datos de la sesión, el badge de estado, y los botones ✓/✗ cuando el estado es open
- [x] 5.4 Crear `src/components/admin/accept-dialog.tsx` con el `Dialog` de shadcn, controlado, que invoca la Server Action `acceptSession` al confirmar
- [x] 5.5 Crear `src/components/admin/empty-state.tsx` con mensaje amigable para cuando no hay sesiones visibles tras filtrar

## 6. Estados de loading y polish

- [x] 6.1 Envolver los botones de acción en `Form` con `useFormStatus` para deshabilitar mientras la Server Action corre
- [x] 6.2 Verificar que todos los colores usen tokens semánticos (sin valores literales) y que la diferenciación visual open/closed se vea bien en light y dark
- [x] 6.3 Verificar que la fecha y hora se rendericen correctamente con `Intl.DateTimeFormat('es', ...)`

## 7. Verificación

- [x] 7.1 Correr `pnpm lint` y resolver cualquier issue
- [x] 7.2 Correr `pnpm build` y confirmar que el build pasa sin errores de TypeScript
- [x] 7.3 QA manual: arrancar `pnpm dev`, autenticarse como admin, verificar que la lista se ve, que los filtros funcionan, que el dialog se abre, que aceptar/rechazar actualiza la lista sin recarga, y que la página es responsive en light y dark
