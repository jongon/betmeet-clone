## MODIFIED Requirements

### Requirement: Aceptar sesión con confirmación
El sistema SHALL permitir aceptar una sesión abierta mediante un botón con icono de check (✓) presente solo en filas con `status: "open"`. Al hacer clic en el botón de aceptar, el sistema SHALL abrir un `Dialog` con un mensaje de confirmación que mencione el nombre del cambiador y pida confirmar o cancelar. Al confirmar, el sistema SHALL invocar una operación de aceptación que solo procede si la sesión sigue `open`, existe `proposal` y `proposal.status === "pending"`.

Si la propuesta pendiente sigue siendo válida contra los inventarios actuales del admin, el sistema SHALL aplicar el intercambio aceptado antes de cerrar la sesión: SHALL desmarcar de faltantes los `requestedStickerCode` de `proposal.blocks`, SHALL descontar del inventario de repetidos los `requestedRepeateds`, y luego SHALL cambiar el `status` de la sesión a `closed`. Si el usuario cancela el dialog, el sistema SHALL no invocar la operación y SHALL cerrar el dialog sin cambios.

Si al confirmar la propuesta ya no es aceptable porque alguno de los cromos solicitados ya no está marcado como faltante o porque los repetidos actuales no alcanzan para cubrir `requestedRepeateds`, el sistema SHALL rechazar la aceptación, SHALL cerrar la sesión igualmente y SHALL dejar intactos los inventarios.

#### Scenario: Admin acepta una sesión abierta con propuesta vigente
- **WHEN** el admin hace clic en el botón ✓ de una sesión abierta con `proposal.status: "pending"`, confirma el dialog y el inventario actual sigue siendo compatible con esa propuesta
- **THEN** el sistema consume el intercambio en faltantes y repetidos, cambia el `status` de esa sesión a `closed`, y la sesión aceptada aparece en el grupo de cerradas

#### Scenario: Admin intenta aceptar una sesión desfasada por faltantes
- **WHEN** el admin confirma la aceptación de una sesión pendiente y uno de los `requestedStickerCode` ya no está marcado como faltante
- **THEN** el sistema rechaza la aceptación, cierra la sesión, y no modifica ni faltantes ni repetidos

#### Scenario: Admin intenta aceptar una sesión desfasada por repetidos
- **WHEN** el admin confirma la aceptación de una sesión pendiente y el inventario actual ya no alcanza para cubrir alguno de los `requestedRepeateds`
- **THEN** el sistema rechaza la aceptación, cierra la sesión, y no modifica ni faltantes ni repetidos

#### Scenario: Admin intenta aceptar una sesión sin propuesta pendiente
- **WHEN** la operación de aceptar recibe una sesión abierta sin `proposal` o con un `proposal.status` distinto de `pending`
- **THEN** el sistema no aplica inventario, no descuenta dos veces y trata la operación como no-op defensivo o rechazo explícito según el punto de entrada

### Requirement: Sesión cerrada es definitiva
El sistema SHALL garantizar que una sesión con `status: "closed"` no pueda transicionar de vuelta a `open`. Si una Server Action (`acceptSession` o `rejectSession`) recibe un `id` de una sesión que ya está `closed`, el sistema SHALL tratarlo como un no-op y SHALL no modificar el repositorio ni volver a descontar inventario. El botón ✓ y el botón ✗ SHALL renderizarse únicamente en filas con `status: "open"`. Una sesión cerrada SHALL poder archivarse como acción separada de organización, sin cambiar su `status`.

#### Scenario: Acción repetida sobre sesión cerrada
- **WHEN** la operación de aceptar o rechazar recibe el `id` de una sesión con `status: "closed"`
- **THEN** el sistema no modifica el estado de la sesión, no vuelve a consumir inventarios y la lista permanece sin cambios

### Requirement: Actualización sin recarga tras acciones
El sistema SHALL actualizar la lista de sesiones en pantalla sin requerir un reload completo del navegador después de que el admin acepte o rechace una sesión. La implementación SHALL usar Server Actions que muten el repositorio y SHALL invocar `revalidatePath('/admin')` para que el Server Component se re-renderice con datos frescos. Cuando la aceptación consuma inventario o cierre una sesión por inconsistencia, la implementación SHALL además revalidar las superficies de inventario relevantes para reflejar el estado final sin recarga completa.

#### Scenario: Inventarios reflejan una aceptación válida
- **WHEN** el admin acepta una sesión pendiente vigente y la Server Action retorna
- **THEN** `/admin/cromos` y `/admin/cromos/faltantes` muestran los inventarios actualizados sin requerir recarga manual

### Requirement: Repositorio de sesiones abstracto y swappable
El sistema SHALL exponer un módulo `src/lib/sessions-store.ts` que provea funciones asíncronas para leer sesiones y mutar su estado. La operación semántica de aceptar una sesión pendiente SHALL validar el estado actual de la propuesta y coordinar el consumo de inventario antes de cerrar la sesión. Si la propuesta ya no es aplicable, la operación SHALL cerrar la sesión sin consumir inventario. La operación SHALL ser idempotente para sesiones ya cerradas.

#### Scenario: Accept modifica archivo e inventario solo cuando procede
- **WHEN** el admin acepta una sesión con propuesta pendiente todavía vigente
- **THEN** la operación actualiza el `status` a `closed` y además coordina el consumo de faltantes y repetidos

#### Scenario: Accept cierra sin consumir por inventario desfasado
- **WHEN** el admin acepta una sesión con propuesta pendiente que ya no puede cumplirse con el inventario actual
- **THEN** la operación deja intactos faltantes y repetidos, pero persiste la sesión como `closed`
