## MODIFIED Requirements

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
