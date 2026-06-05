## MODIFIED Requirements

### Requirement: Listar sesiones de cambio en /admin
El sistema SHALL renderizar en la ruta `/admin` una lista de "sesiones de cambio" obtenidas desde el repositorio de sesiones. Cada fila SHALL mostrar como mínimo: nombre del cambiador, cantidad de cromos ofrecidos, cantidad de cromos solicitados, fecha y hora de creación, y un indicador de estado (badge "Abierta" o "Cerrada"). La página SHALL excluir del listado principal cualquier sesión con `archivedAt` no nulo y SHALL usar los tokens semánticos del design system para la diferenciación visual: las filas abiertas con tinte de verde semántico derivado de `chart-4` (`bg-chart-4/8 border-chart-4/35`) y las cerradas con tinte neutro (`bg-muted text-muted-foreground`); el badge "Abierta" SHALL usar el mismo tratamiento verde suave (`bg-chart-4/20 text-foreground`) y el badge "Cerrada" SHALL usar tokens muted. La fecha y hora SHALL formatearse con `Intl.DateTimeFormat('es', { dateStyle: 'short', timeStyle: 'short' })` para que sea legible en light y dark mode.

#### Scenario: Admin ve múltiples sesiones no archivadas
- **WHEN** el admin autenticado navega a `/admin` y el repositorio contiene sesiones abiertas, cerradas no archivadas y archivadas
- **THEN** la página renderiza solo las abiertas y cerradas no archivadas, dejando las archivadas fuera del listado principal

#### Scenario: No hay sesiones visibles en el inbox
- **WHEN** el admin autenticado navega a `/admin` y todas las sesiones existentes están archivadas, o el repositorio está vacío
- **THEN** la página muestra un empty state con un mensaje descriptivo y NO renderiza la barra de filtros ni la lista

#### Scenario: Las sesiones se diferencian visualmente
- **WHEN** la lista se renderiza con al menos una sesión abierta y una cerrada no archivada
- **THEN** las filas abiertas tienen fondo y borde con tinte verde semántico, mientras que las cerradas tienen fondo muted y texto muted-foreground, distinguiéndolas a simple vista

### Requirement: Sesión cerrada es definitiva
El sistema SHALL garantizar que una sesión con `status: "closed"` no pueda transicionar de vuelta a `open`. Si una Server Action (`acceptSession` o `rejectSession`) recibe un `id` de una sesión que ya está `closed`, el sistema SHALL tratarlo como un no-op y SHALL no modificar el repositorio. El botón ✓ y el botón ✗ SHALL renderizarse únicamente en filas con `status: "open"`. Una sesión cerrada SHALL poder archivarse como acción separada de organización, sin cambiar su `status`.

#### Scenario: Acción sobre sesión cerrada
- **WHEN** la Server Action `acceptSession` o `rejectSession` recibe un `id` de una sesión con `status: "closed"`
- **THEN** el sistema no modifica el estado de la sesión y la lista permanece sin cambios

#### Scenario: Sesión cerrada puede archivarse sin reabrirse
- **WHEN** el admin archiva una sesión con `status: "closed"`
- **THEN** la sesión conserva `status: "closed"` y además queda marcada como archivada para salir del inbox principal

### Requirement: Repositorio de sesiones abstracto y swappable
El sistema SHALL exponer un módulo `src/lib/sessions-store.ts` que provea funciones asíncronas: `getAllSessions()`, `acceptSession(id: string)`, `rejectSession(id: string)` y una operación de archivado para sesiones cerradas. El módulo SHALL usar internamente un archivo JSON (`data/sessions.json`, gitignored) como backing store. Si el archivo no existe en el primer acceso, el sistema SHALL inicializarlo copiando desde `data/sessions.seed.json` (commited al repo con datos de ejemplo). Las funciones SHALL ser la única vía de acceso a los datos desde la UI y Server Actions; ningún componente SHALL leer el archivo directamente. La forma de los datos SHALL validarse con Zod al leer para defenderse de edición manual corrupta, y el store SHALL normalizar etiquetas legacy conocidas de propuestas persistidas y sesiones sin `archivedAt` para mantener compatibilidad con datos históricos válidos.

#### Scenario: Primera lectura siembra el archivo
- **WHEN** la app arranca y `data/sessions.json` no existe
- **THEN** `getAllSessions()` copia `data/sessions.seed.json` a `data/sessions.json` y retorna su contenido

#### Scenario: Lecturas posteriores leen el archivo existente
- **WHEN** `data/sessions.json` ya existe
- **THEN** `getAllSessions()` lee su contenido sin sobrescribirlo

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
