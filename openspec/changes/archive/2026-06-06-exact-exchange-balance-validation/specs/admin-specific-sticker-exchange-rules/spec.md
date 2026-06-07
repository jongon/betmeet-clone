## ADDED Requirements

### Requirement: Mensaje visible para reglas abstractas incoherentes
El sistema SHALL mostrar en `/admin/intercambio` un mensaje de validacion claro cuando el admin intente guardar una regla abstracta cuyo valor de `ANY` sea menor que la cantidad maxima configurada en `PLAYER`, `BADGE`, `TEAM_PHOTO` o `SPECIAL`.

#### Scenario: Error visible al guardar una regla incoherente
- **WHEN** el admin intenta guardar `PLAYER: 3`, `BADGE: 1`, `TEAM_PHOTO: 0`, `SPECIAL: 0`, `ANY: 2`
- **THEN** la interfaz no persiste el cambio y muestra que `Cualquiera` debe ser igual o mayor que la opcion especifica mas alta

## MODIFIED Requirements

### Requirement: Override por cromo con componente abstracto
El sistema SHALL permitir que el admin defina un componente abstracto opcional por cromo en `/admin/intercambio`, expresado como un `ExchangeRule` con cantidades por cada `OfferType`. Cuando el componente abstracto esta activo con al menos un `OfferType` mayor a `0`, SHALL tener prioridad sobre la regla general. Cuando todos los `OfferType` del componente abstracto son `0`, el sistema SHALL tratar el componente abstracto como desactivado y SHALL aplicar la regla general o el componente exacto si existe. Si `ANY` es mayor que `0` o si existe cualquier cantidad positiva en un tipo especifico, el sistema SHALL rechazar el guardado cuando `ANY` sea menor que la cantidad maxima entre `PLAYER`, `BADGE`, `TEAM_PHOTO` y `SPECIAL`.

#### Scenario: Componente abstracto interpretado como alternativas
- **WHEN** el admin activa varios `OfferType` dentro del mismo componente abstracto
- **THEN** el sistema trata cada `OfferType` activo como una opcion alternativa `OR` y no como un requisito acumulativo `AND`

#### Scenario: Cromo con solo componente abstracto activo
- **WHEN** el admin guarda un override para `ARG-14` con componente abstracto `{ PLAYER: 2, ANY: 2 }` y sin componente exacto
- **THEN** el sistema persiste el override y al servir la regla para `ARG-14` se devuelve la composicion con un unico componente abstracto

#### Scenario: Cromo con componente abstracto en 0 y componente exacto activo
- **WHEN** el admin guarda un override para `ARG-14` con componente abstracto en `0` y componente exacto `POR-15`
- **THEN** el sistema trata el componente abstracto como desactivado y conserva el componente exacto, devolviendo la composicion con un unico componente exacto

#### Scenario: Cromo con componente abstracto activo y exact desactivado
- **WHEN** el admin guarda un override para `ARG-14` con componente abstracto `{ PLAYER: 2, ANY: 2 }` y sin componente exacto
- **THEN** el sistema trata ese cromo como `Regla especial por tipo` y aplica solo la regla abstracta

#### Scenario: Regla abstracta incoherente por ANY menor al maximo especifico
- **WHEN** el admin intenta guardar un override para `ARG-14` con componente abstracto `{ PLAYER: 3, BADGE: 1, TEAM_PHOTO: 0, SPECIAL: 0, ANY: 2 }`
- **THEN** el sistema rechaza el guardado y devuelve un error indicando que `ANY` debe ser igual o mayor que la opcion especifica mas alta
