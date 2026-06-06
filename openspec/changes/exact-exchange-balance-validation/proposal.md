## Why

El flujo publico de propuesta todavia permite enviar intercambios cuyo balance global no cierra de forma exacta entre lo que recibe el coleccionista y lo que pide el cambiador. Ademas, el admin puede guardar reglas `OR` incoherentes cuando `Cualquiera` queda por debajo de la opcion especifica mas alta, lo que vuelve ambiguo el calculo de capacidad del bloque y confunde al cambiador en el resumen final.

## What Changes

- Validar en el flujo publico que una propuesta solo pueda enviarse cuando la cantidad total de repetidos pedidos por el cambiador sea exactamente igual a las unidades habilitadas por todos los bloques seleccionados.
- Calcular las unidades habilitadas de un bloque en `Aceptar la regla` usando la capacidad coherente de la regla aplicable del admin, sin pedir al cambiador que elija manualmente una rama `OR`.
- Calcular las unidades habilitadas de un bloque en `Proponer otra opcion` como la suma explicita de cantidades por tipo mas `1` por cada cromo exacto opcional agregado.
- Bloquear el envio en el paso 3 cuando el balance no cierre y mostrar guidance distinta para `faltan` o `sobran` unidades.
- Reordenar el paso 3 para priorizar primero el balance, despues las acciones correctivas, luego los repetidos pedidos y por ultimo el detalle de bloques ofrecidos.
- Permitir editar una oferta desde el paso 3 con un drawer mobile en vez de rebotar al paso 1, incluyendo cambio entre `Aceptar la regla` y `Proponer otra opcion` dentro del mismo drawer.
- Impedir en admin que una regla abstracta se guarde con `ANY` por debajo de la cantidad maxima configurada en `PLAYER`, `BADGE`, `TEAM_PHOTO` o `SPECIAL`.
- Mostrar mensajes de validacion claros en `/admin/intercambio` cuando una regla `OR` sea incoherente con la semantica de `Cualquiera`.

## Capabilities

### New Capabilities

### Modified Capabilities
- `cambiador-propuesta-cambio`: el resumen y envio de la propuesta pasan a requerir balance global exacto, con capacidad automatica para bloques `fulfill` y suma explicita para bloques `counteroffer`.
- `admin-specific-sticker-exchange-rules`: las reglas abstractas del admin pasan a exigir que `ANY` sea igual o mayor que la opcion especifica mas alta antes de poder guardarse.

## Impact

- Flujo publico en `src/app/cambio/[token]`: resumen del paso 3, bloqueo de envio, mensajes de guidance, drawer de edicion de oferta y calculo de unidades habilitadas por bloque.
- Modelo compartido en `src/lib/cambio-proposal.ts`: nuevas utilidades para calcular capacidad de reglas `OR`, capacidad explicita de contraofertas y balance global exacto.
- Configuracion de intercambio en admin: validacion estructural adicional sobre `ExchangeRuleSchema`, guardado server-side y formularios en `/admin/intercambio`.
- Tests de reglas y propuestas: cobertura nueva para reglas admin incoherentes, balance exacto, fulfill con capacidad automatica y contraofertas acumulativas.
- Specs OpenSpec afectadas: `cambiador-propuesta-cambio`, `admin-specific-sticker-exchange-rules`.
