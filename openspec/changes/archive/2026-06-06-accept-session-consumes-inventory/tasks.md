## 1. Dominio de aceptacion de sesiones

- [x] 1.1 Diseñar una operación semántica para aceptar una sesión pendiente con `ownerEmail`
- [x] 1.2 Validar que la sesión siga `open` y tenga `proposal.status === pending` antes de consumir inventario
- [x] 1.3 Mantener idempotencia para sesiones ya cerradas y evitar dobles descuentos

## 2. Aplicacion del intercambio sobre inventarios

- [x] 2.1 Reutilizar el consumo de faltantes para completar los `requestedStickerCode` de una propuesta aceptada
- [x] 2.2 Crear el helper de descuento global de repetidos para `requestedRepeateds` mezclando varios grupos cuando haga falta
- [x] 2.3 Rechazar la aceptación y cerrar la sesión cuando falten cromos marcados como faltantes o stock suficiente de repetidos
- [x] 2.4 Asegurar que una aceptación rechazada por inconsistencia no modifique inventarios

## 3. Integración admin

- [x] 3.1 Conectar la Server Action de aceptar con la nueva operación semántica
- [x] 3.2 Revalidar `/admin`, `/admin/sesiones/[id]`, `/admin/cromos` y `/admin/cromos/faltantes` tras la decisión

## 4. Verificación

- [x] 4.1 Cubrir con tests la aceptación válida con consumo de faltantes y repetidos
- [x] 4.2 Cubrir con tests la aceptación rechazada por faltantes desfasados
- [x] 4.3 Cubrir con tests la aceptación rechazada por repetidos insuficientes
- [x] 4.4 Cubrir con tests la idempotencia de sesiones ya cerradas
- [x] 4.5 Correr `pnpm lint`
- [x] 4.6 Correr `pnpm build`
