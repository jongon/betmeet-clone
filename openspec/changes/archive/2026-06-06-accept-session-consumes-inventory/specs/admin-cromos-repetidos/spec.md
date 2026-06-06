## MODIFIED Requirements

### Requirement: Persistencia de inventario por admin
El sistema SHALL permitir que una aceptación válida de sesión descuente cantidades arbitrarias del inventario global de repetidos del admin, incluso cuando la propuesta mezcle cromos de varios grupos. La operación SHALL eliminar del record sparse las cantidades que lleguen a `0`, SHALL rechazar cantidades negativas, y SHALL no persistir cambios si alguna resta requerida supera el stock actual.

#### Scenario: Descuento válido sobre varios grupos
- **WHEN** una propuesta aceptada pide `ARG-7 x1` y `POR-15 x2` y ambas cantidades existen en el inventario actual
- **THEN** el sistema persiste el inventario con esas cantidades descontadas, aunque pertenezcan a grupos distintos

#### Scenario: Descuento que agota un cromo
- **WHEN** una propuesta aceptada pide exactamente la última copia disponible de un cromo repetido
- **THEN** el sistema descuenta la cantidad y elimina ese código del record sparse persistido

#### Scenario: Repetidos insuficientes al aceptar
- **WHEN** una propuesta pendiente pide una cantidad mayor a la disponible en algún cromo repetido al momento de aceptar
- **THEN** el sistema rechaza la aceptación, cierra la sesión y no persiste cambios en repetidos
