# admin-sesiones Specification

## Purpose
TBD - created by archiving change admin-home-sesiones-cambio. Update Purpose after archive.
## Requirements
### Requirement: Listar sesiones de cambio en /admin
El sistema SHALL renderizar en la ruta `/admin` una lista de "sesiones de cambio" obtenidas desde el repositorio de sesiones. Cada fila SHALL mostrar como mínimo: nombre del cambiador, cantidad de cromos ofrecidos, cantidad de cromos solicitados, fecha y hora de creación, y un indicador de estado (badge "Abierta" o "Cerrada"). La página SHALL excluir del listado principal cualquier sesión con `archivedAt` no nulo y SHALL usar los tokens semánticos del design system para la diferenciación visual: las filas abiertas con tinte de verde semántico derivado de `chart-4` (`bg-chart-4/8 border-chart-4/35`) y las cerradas con tinte neutro (`bg-muted text-muted-foreground`); el badge "Abierta" SHALL usar el mismo tratamiento verde suave (`bg-chart-4/20 text-foreground`) y el badge "Cerrada" SHALL usar tokens muted. Cada fila SHALL ofrecer además una acción visible `Ver detalle` para abrir la ruta `/admin/sesiones/[id]` sin quitar las acciones rápidas existentes de aceptar o rechazar cuando la sesión siga abierta. La fecha y hora SHALL formatearse con `Intl.DateTimeFormat('es', { dateStyle: 'short', timeStyle: 'short' })` para que sea legible en light y dark mode.

#### Scenario: Admin ve múltiples sesiones no archivadas
- **WHEN** el admin autenticado navega a `/admin` y el repositorio contiene sesiones abiertas, cerradas no archivadas y archivadas
- **THEN** la página renderiza solo las abiertas y cerradas no archivadas, dejando las archivadas fuera del listado principal

#### Scenario: No hay sesiones visibles en el inbox
- **WHEN** el admin autenticado navega a `/admin` y todas las sesiones existentes están archivadas, o el repositorio está vacío
- **THEN** la página muestra un empty state con un mensaje descriptivo y NO renderiza la barra de filtros ni la lista

#### Scenario: Las sesiones se diferencian visualmente
- **WHEN** la lista se renderiza con al menos una sesión abierta y una cerrada no archivada
- **THEN** las filas abiertas tienen fondo y borde con tinte verde semántico, mientras que las cerradas tienen fondo muted y texto muted-foreground, distinguiéndolas a simple vista

#### Scenario: Ver detalle desde la fila
- **WHEN** el admin revisa una fila en `/admin`
- **THEN** la fila muestra una acción `Ver detalle` que abre `/admin/sesiones/[id]` sin eliminar las acciones rápidas ya existentes

### Requirement: Aceptar sesión con confirmación
El sistema SHALL permitir aceptar una sesión abierta mediante un botón con icono de check (✓) presente solo en filas con `status: "open"`. Al hacer clic en el botón de aceptar, el sistema SHALL abrir un `Dialog` con un mensaje de confirmación que mencione el nombre del cambiador y pida confirmar o cancelar. Al confirmar, el sistema SHALL invocar la Server Action `acceptSession(id)` solo si la sesión sigue `open`, existe `proposal` y `proposal.status === "pending"`.

Si la propuesta pendiente sigue siendo válida contra los inventarios actuales del admin, el sistema SHALL aplicar el intercambio aceptado antes de cerrar la sesión: SHALL desmarcar de faltantes los `requestedStickerCode` de `proposal.blocks`, SHALL descontar del inventario de repetidos los `requestedRepeateds`, y luego SHALL cambiar el `status` de la sesión a `"closed"`. Si el usuario cancela el dialog, el sistema SHALL no invocar la Server Action y SHALL cerrar el dialog sin cambios.

Si al confirmar la propuesta ya no es aceptable porque alguno de los cromos solicitados ya no está marcado como faltante o porque los repetidos actuales no alcanzan para cubrir `requestedRepeateds`, el sistema SHALL rechazar la aceptación, SHALL cerrar la sesión igualmente y SHALL dejar intactos los inventarios.

#### Scenario: Admin acepta una sesión abierta con propuesta vigente
- **WHEN** el admin hace clic en el botón ✓ de una sesión abierta con `proposal.status: "pending"`, confirma el dialog y el inventario actual sigue siendo compatible con esa propuesta
- **THEN** el sistema consume el intercambio en faltantes y repetidos, cambia el `status` de esa sesión a `closed`, la lista se re-renderiza, y la sesión aceptada aparece en el grupo de cerradas

#### Scenario: Admin cancela el dialog de aceptar
- **WHEN** el admin abre el dialog de aceptar y hace clic en "Cancelar"
- **THEN** el dialog se cierra, la Server Action no se invoca, y la sesión permanece abierta

#### Scenario: Admin intenta aceptar una sesión desfasada por faltantes
- **WHEN** el admin confirma la aceptación de una sesión pendiente y uno de los `requestedStickerCode` ya no está marcado como faltante
- **THEN** el sistema rechaza la aceptación, cierra la sesión, y no modifica ni faltantes ni repetidos

#### Scenario: Admin intenta aceptar una sesión desfasada por repetidos
- **WHEN** el admin confirma la aceptación de una sesión pendiente y el inventario actual ya no alcanza para cubrir alguno de los `requestedRepeateds`
- **THEN** el sistema rechaza la aceptación, cierra la sesión, y no modifica ni faltantes ni repetidos

#### Scenario: Admin intenta aceptar una sesión sin propuesta pendiente
- **WHEN** la operación de aceptar recibe una sesión abierta sin `proposal` o con un `proposal.status` distinto de `pending`
- **THEN** el sistema no aplica inventario, no descuenta dos veces, deja la sesión abierta y trata la operación como no-op defensivo

#### Scenario: Botón de aceptar no aparece en sesiones cerradas
- **WHEN** la lista incluye sesiones cerradas
- **THEN** las filas de sesiones cerradas NO muestran los botones ✓ ni ✗, sólo el badge "Cerrada"

### Requirement: Rechazar sesión sin confirmación
El sistema SHALL permitir rechazar una sesión abierta mediante un botón con icono de X (✗) presente solo en filas con `status: "open"`. Al hacer clic, el sistema SHALL invocar inmediatamente la Server Action `rejectSession(id)` que cambia el `status` de la sesión a `"closed"` y SHALL llamar a `revalidatePath('/admin')` para re-renderizar la lista. El rechazo SHALL NO mostrar dialog de confirmación.

#### Scenario: Admin rechaza una sesión abierta
- **WHEN** el admin hace clic en el botón ✗ de una sesión abierta
- **THEN** la Server Action cambia el `status` de esa sesión a `closed` y la lista se re-renderiza sin abrir ningún dialog

### Requirement: Sesión cerrada es definitiva
El sistema SHALL garantizar que una sesión con `status: "closed"` no pueda transicionar de vuelta a `open`. Si una Server Action (`acceptSession` o `rejectSession`) recibe un `id` de una sesión que ya está `closed`, el sistema SHALL tratarlo como un no-op y SHALL no modificar el repositorio ni volver a descontar inventario. El botón ✓ y el botón ✗ SHALL renderizarse únicamente en filas con `status: "open"`. Una sesión cerrada SHALL poder archivarse como acción separada de organización, sin cambiar su `status`.

#### Scenario: Acción sobre sesión cerrada
- **WHEN** la Server Action `acceptSession` o `rejectSession` recibe un `id` de una sesión con `status: "closed"`
- **THEN** el sistema no modifica el estado de la sesión, no vuelve a consumir inventarios y la lista permanece sin cambios

#### Scenario: Sesión cerrada puede archivarse sin reabrirse
- **WHEN** el admin archiva una sesión con `status: "closed"`
- **THEN** la sesión conserva `status: "closed"` y además queda marcada como archivada para salir del inbox principal

### Requirement: Filtrar por nombre de cambiador
El sistema SHALL proporcionar un input de texto en la parte superior de la lista que filtre las filas visibles en tiempo real (client-side) según el nombre del cambiador. El filtro SHALL ser case-insensitive y SHALL usar coincidencia por `includes` (substring). El filtro SHALL operar sobre la lista completa ya cargada (no dispara requests al servidor) y SHALL respetar el orden de sort existente.

#### Scenario: Filtrar por nombre con coincidencias
- **WHEN** el admin escribe "carlos" en el input de filtro
- **THEN** la lista muestra solo las sesiones cuyo `cambiadorName` contiene "carlos" (case-insensitive)

#### Scenario: Filtro sin coincidencias
- **WHEN** el admin escribe un texto que no coincide con ningún nombre
- **THEN** la lista muestra el empty state de "sin resultados"

#### Scenario: Limpiar el filtro
- **WHEN** el admin borra el contenido del input
- **THEN** la lista vuelve a mostrar todas las sesiones respetando el orden original

### Requirement: Filtrar por estado de sesión
El sistema SHALL proporcionar un selector tipo Tabs (Todas / Abiertas / Cerradas) en la parte superior de la lista que filtre las filas visibles según el `status` de la sesión. El tab activo SHALL tener un indicador visual. Al cambiar de tab, el sistema SHALL actualizar la lista en el cliente sin hacer requests al servidor. El filtro de estado SHALL componerse con el filtro de nombre (ambos se aplican simultáneamente).

#### Scenario: Filtrar por "Abiertas"
- **WHEN** el admin selecciona el tab "Abiertas"
- **THEN** la lista muestra solo las sesiones con `status: "open"` y oculta las cerradas

#### Scenario: Filtrar por "Cerradas"
- **WHEN** el admin selecciona el tab "Cerradas"
- **THEN** la lista muestra solo las sesiones con `status: "closed"` y oculta las abiertas

#### Scenario: Filtro de estado combinado con filtro de nombre
- **WHEN** el admin tiene "Abiertas" seleccionado y escribe "mar" en el filtro de nombre
- **THEN** la lista muestra solo sesiones abiertas cuyo `cambiadorName` contiene "mar"

### Requirement: Actualización sin recarga tras acciones
El sistema SHALL actualizar la lista de sesiones en pantalla sin requerir un reload completo del navegador después de que el admin acepte o rechace una sesión. La implementación SHALL usar Server Actions que muten el repositorio y SHALL invocar `revalidatePath('/admin')` para que el Server Component se re-renderice con datos frescos. Cuando la aceptación consuma inventario o cierre una sesión por inconsistencia, la implementación SHALL además revalidar `/admin/cromos` y `/admin/cromos/faltantes` para reflejar el estado final sin recarga completa. La lista resultante (incluyendo filtros y sort) SHALL llegar al Client Component a través de props re-frescas.

#### Scenario: Lista actualizada tras aceptar
- **WHEN** el admin acepta una sesión y la Server Action retorna
- **THEN** la fila de esa sesión se mueve al grupo de cerradas sin que el navegador recargue la página

#### Scenario: Lista actualizada tras rechazar
- **WHEN** el admin rechaza una sesión y la Server Action retorna
- **THEN** la fila de esa sesión desaparece del grupo de abiertas y aparece en el de cerradas sin recarga

#### Scenario: Inventarios reflejan una aceptación válida
- **WHEN** el admin acepta una sesión pendiente vigente y la Server Action retorna
- **THEN** `/admin/cromos` y `/admin/cromos/faltantes` muestran los inventarios actualizados sin requerir recarga manual

### Requirement: Repositorio de sesiones abstracto y swappable
El sistema SHALL exponer un módulo `src/lib/sessions-store.ts` que provea funciones asíncronas: `getAllSessions()`, `acceptSession(id: string)`, `rejectSession(id: string)` y una operación de archivado para sesiones cerradas. El módulo SHALL usar internamente un archivo JSON (`data/sessions.json`, gitignored) como backing store. Si el archivo no existe en el primer acceso, el sistema SHALL inicializarlo copiando desde `data/sessions.seed.json` (commited al repo con datos de ejemplo). Las funciones SHALL ser la única vía de acceso a los datos desde la UI y Server Actions; ningún componente SHALL leer el archivo directamente. La forma de los datos SHALL validarse con Zod al leer para defenderse de edición manual corrupta, y el store SHALL normalizar etiquetas legacy conocidas de propuestas persistidas y sesiones sin `archivedAt` para mantener compatibilidad con datos históricos válidos. La operación semántica de aceptar una sesión pendiente SHALL validar el estado actual de la propuesta y coordinar el consumo de inventario antes de cerrar la sesión. Si la propuesta ya no es aplicable, la operación SHALL cerrar la sesión sin consumir inventario. La operación SHALL ser idempotente para sesiones ya cerradas.

#### Scenario: Primera lectura siembra el archivo
- **WHEN** la app arranca y `data/sessions.json` no existe
- **THEN** `getAllSessions()` copia `data/sessions.seed.json` a `data/sessions.json` y retorna su contenido

#### Scenario: Lecturas posteriores leen el archivo existente
- **WHEN** `data/sessions.json` ya existe
- **THEN** `getAllSessions()` lee su contenido sin sobrescribirlo

#### Scenario: Accept modifica archivo e inventario solo cuando procede
- **WHEN** el admin acepta una sesión con propuesta pendiente todavía vigente
- **THEN** la operación actualiza el `status` a `closed` y además coordina el consumo de faltantes y repetidos

#### Scenario: Accept cierra sin consumir por inventario desfasado
- **WHEN** el admin acepta una sesión con propuesta pendiente que ya no puede cumplirse con el inventario actual
- **THEN** la operación deja intactos faltantes y repetidos, pero persiste la sesión como `closed`

#### Scenario: Archivo corrupto
- **WHEN** `data/sessions.json` contiene JSON inválido o datos que no pasan el schema Zod
- **THEN** `getAllSessions()` lanza un error explícito en lugar de retornar datos parciales o silenciar el fallo

#### Scenario: Etiquetas legacy y sesiones sin archivedAt
- **WHEN** `data/sessions.json` contiene propuestas persistidas con etiquetas históricas como `Regla general`, `Regla especial` o sesiones anteriores que no incluyen `archivedAt`
- **THEN** `getAllSessions()` normaliza esas etiquetas y completa `archivedAt: null` antes de validar, retornando sesiones compatibles sin error

#### Scenario: Archivar una sesión cerrada
- **WHEN** la operación de archivado recibe el `id` de una sesión con `status: "closed"` y `archivedAt: null`
- **THEN** el repositorio persiste un timestamp en `archivedAt` para esa sesión

#### Scenario: No se archiva una sesión abierta
- **WHEN** la operación de archivado recibe el `id` de una sesión con `status: "open"`
- **THEN** el sistema no archiva la sesión y deja intacto el repositorio

### Requirement: Fila de sesión cerrada puede archivarse
El sistema SHALL renderizar en `/admin` una acción de archivar visible solo en filas de sesiones cerradas no archivadas. Al activarla, el sistema SHALL ejecutar una Server Action que archive la sesión y SHALL refrescar `/admin` para sacar esa fila del inbox principal sin recarga completa.

#### Scenario: Admin archiva una sesión cerrada
- **WHEN** el admin activa la acción de archivar sobre una sesión cerrada no archivada
- **THEN** la sesión desaparece del listado de `/admin` tras la actualización de la ruta

#### Scenario: Sesión abierta no muestra acción de archivar
- **WHEN** la lista incluye una sesión abierta
- **THEN** esa fila no muestra la acción de archivar

### Requirement: Ruta /admin protegida por middleware existente
El sistema SHALL reutilizar el middleware de autenticación definido en la spec `admin-auth` (con `matcher: ['/', '/admin/:path*']`) para proteger la nueva página `/admin`. La nueva página SHALL NO añadir lógica de auth propia; SHALL asumir que cualquier request que llega al Server Component ya pasó la verificación de sesión. Si la sesión no es válida, el middleware existente redirige a `/admin/login` antes de que se ejecute el Server Component.

#### Scenario: Admin autenticado entra a /admin
- **WHEN** el admin con sesión activa navega a `/admin`
- **THEN** la página renderiza la lista de sesiones sin pedir login

#### Scenario: Visitante sin sesión entra a /admin
- **WHEN** un visitante sin cookies de sesión navega a `/admin`
- **THEN** el middleware lo redirige a `/admin/login?next=/admin` antes de que se ejecute el Server Component

### Requirement: El modelo de sesión incluye el token de origen
El sistema SHALL incluir en el schema de `Session` (en `src/lib/sessions.ts`) un campo `token: z.string().min(1)` que referencia el token del QR con el que el cambiador creó la sesi\u00f3n. Una sesi\u00f3n sin token SHALL seguir siendo válida (compatibilidad con datos legacy), pero los componentes que dependen del token SHALL comprobar su presencia antes de renderizar.

#### Scenario: SessionSchema acepta el nuevo campo
- **WHEN** se parsea un objeto sesi\u00f3n que incluye `token: "qr_abc123"`
- **THEN** `SessionSchema.parse(...)` retorna el objeto validado sin error

#### Scenario: SessionSchema rechaza token vacío
- **WHEN** se parsea un objeto sesi\u00f3n con `token: ""`
- **THEN** `SessionSchema.parse(...)` lanza un error de validación Zod

### Requirement: Fila de sesi\u00f3n abierta con token muestra botón "Ver QR"
El sistema SHALL renderizar en cada fila de `/admin` correspondiente a una sesi\u00f3n con `status: "open"` y `token` no vacío, un tercer botón con icono de ojo (lucide-react `Eye`) y `aria-label="Ver QR de {cambiadorName}"`. Al hacer clic, SHALL abrir el `QrDialog` definido en la spec `admin-qr` mostrando el QR original (mismo token, misma URL) usado para crear esa sesi\u00f3n. El botón "Ver QR" SHALL NO aparecer en filas con `status: "closed"` ni en filas sin token.

#### Scenario: Fila abierta con token muestra "Ver QR"
- **WHEN** la lista incluye una sesi\u00f3n con `status: "open"` y `token` no vacío
- **THEN** la fila renderiza los tres botones (✓, ✗, Ver QR) en el grupo de acciones

#### Scenario: Fila cerrada no muestra "Ver QR"
- **WHEN** la lista incluye una sesi\u00f3n con `status: "closed"`
- **THEN** la fila solo muestra el badge "Cerrada" y no muestra ✓, ✗, ni "Ver QR"

#### Scenario: Fila abierta sin token no muestra "Ver QR"
- **WHEN** la lista incluye una sesi\u00f3n con `status: "open"` pero `token` vacío o ausente
- **THEN** la fila renderiza ✓ y ✗ pero NO "Ver QR" (compatibilidad con datos legacy)
