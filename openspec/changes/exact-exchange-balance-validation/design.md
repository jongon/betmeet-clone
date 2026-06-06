## Context

La capacidad `cambiador-propuesta-cambio` ya cubre un wizard publico de 3 pasos con contraofertas, repetidos solicitados y envio final, pero hoy no impone un cierre exacto entre las unidades que el cambiador pide al coleccionista y las unidades habilitadas por los bloques que ofrece. En paralelo, la capacidad `admin-specific-sticker-exchange-rules` ya trata los settings abstractos del admin como reglas `OR`, pero todavia no evita configuraciones incoherentes donde `ANY` queda por debajo de la opcion especifica mas alta.

Este cambio cruza dos superficies: admin y flujo publico. En admin necesitamos una validacion estructural compartida entre schemas, server actions y formularios. En el flujo publico necesitamos un motor de capacidad global que convierta reglas `fulfill` y contraofertas `counteroffer` en unidades comparables antes de permitir el envio. La UX fina del paso 3 todavia se quiere explorar despues, asi que este cambio debe dejar una base funcional y clara sin cerrar todos los detalles visuales del editor inline final.

## Goals / Non-Goals

**Goals:**
- Definir una validacion unica para reglas abstractas del admin donde `ANY` nunca pueda ser menor que el maximo de `PLAYER`, `BADGE`, `TEAM_PHOTO` y `SPECIAL`.
- Calcular de forma determinista las unidades habilitadas por una propuesta publica para compararlas con los repetidos pedidos.
- Hacer que el paso 3 solo permita enviar cuando el balance global cierre exacto.
- Mantener la semantica actual: reglas del admin como `OR`, contraofertas del cambiador como suma acumulativa.
- Dar guidance suficiente en el paso 3 para reducir repetidos o editar ofertas sin definir todavia la UX definitiva de exploracion detallada.

**Non-Goals:**
- Rediseñar por completo la pantalla del paso 3 o cerrar su layout final mobile.
- Cambiar la semantica publica del copy de reglas `OR` mostrado en el paso 1.
- Introducir una asignacion bloque-a-bloque de repetidos pedidos; el balance sigue siendo global.
- Cambiar la persistencia base de sesiones o el modelo de reglas exactas del admin mas alla de la nueva validacion estructural.

## Decisions

### 1) `ANY` valida la coherencia de una regla abstracta del admin
- **Decision:** una regla abstracta solo se podra guardar si `ANY` es mayor o igual que la cantidad maxima configurada en `PLAYER`, `BADGE`, `TEAM_PHOTO` o `SPECIAL`. Si todas las opciones especificas estan en `0`, `ANY` puede quedar en `0`.
- **Rationale:** como `ANY` representa cumplir la regla con cualquier tipo de cromo, no puede exigir menos unidades que una rama especifica mas cara. Esta validacion elimina configuraciones `OR` incoherentes antes de que lleguen al flujo publico.
- **Alternatives considered:**
  - Permitir reglas incoherentes y resolverlas en el flujo publico: descartada porque desplaza un error de modelado admin a una experiencia publica confusa.
  - Forzar que `ANY` siempre sea igual a todos los demas tipos: descartada porque impediria reglas validas donde `BADGE` o `SPECIAL` tengan cantidades mas bajas que `PLAYER`.

### 2) La capacidad de un bloque `fulfill` sale de la regla aplicada, no de una rama elegida por el cambiador
- **Decision:** cuando el bloque esta en `Aceptar la regla`, el sistema calcula automaticamente sus unidades habilitadas tomando la cantidad maxima positiva entre las opciones abstractas activas de la regla aplicable.
- **Rationale:** el producto no quiere pedir al cambiador que elija una rama `OR` para el balance. Con la nueva restriccion de admin sobre `ANY`, la maxima cantidad positiva representa la capacidad coherente del bloque sin abrir una decision adicional en el flujo publico.
- **Alternatives considered:**
  - Obligar al cambiador a elegir una rama `OR`: descartada para no sobrecargar el paso 3.
  - Usar la rama minima: descartada porque subestima la capacidad configurada del bloque y rompe ejemplos validos como `2 jugadores o 1 badge o 2 cualquiera`.

### 3) La capacidad de un bloque `counteroffer` reemplaza la regla base y siempre suma
- **Decision:** en `Proponer otra opcion`, las cantidades por tipo sustituyen la regla base abstracta y el bloque habilita la suma de todas esas cantidades mas `1` por cada `exactStickerCode`.
- **Rationale:** refleja literalmente la intencion del cambiador: `1 jugador + POR-15` significa que espera ambos componentes, no una alternativa entre ellos.
- **Alternatives considered:**
  - Sumar la regla base encima de la contraoferta: descartada porque la contraoferta debe redefinir el bloque.
  - Tratar los exactos como una satisfaccion unica del bloque: descartada porque contradice ejemplos como `quiero un jugador y ademas POR-15`.

### 4) El paso 3 valida balance exacto global antes de enviar
- **Decision:** el resumen final compara `requestedRepeateds` contra la suma de unidades habilitadas por todos los bloques y bloquea el envio si ambos totales no coinciden exactamente.
- **Rationale:** el producto quiere evitar propuestas abiertas o ambiguas para el cambiador. Exigir igualdad exacta deja claro cuantas unidades faltan o sobran antes de enviar.
- **Alternatives considered:**
  - Permitir `pedido <= oferta`: descartada porque seguiria dejando propuestas confusas donde sobran unidades.
  - Validar por bloque: descartada porque el producto definio que el trato es global.

### 5) Paso 3 prioriza balance y correccion guiada
- **Decision:** el paso 3 mostrara primero un bloque de balance global, luego guidance contextual (`faltan` o `sobran` unidades), despues acciones correctivas rapidas, la lista editable de repetidos pedidos por el cambiador y por ultimo el detalle de bloques ofrecidos.
- **Rationale:** el usuario llega al ultimo paso queriendo saber si ya puede enviar. Poner el balance arriba reduce tiempo de comprension y deja claro de inmediato si debe ajustar algo.
- **Alternatives considered:**
  - Mantener primero el detalle de lo que recibe el coleccionista: descartada porque obliga al usuario a leer demasiado antes de saber si su propuesta cierra.

### 6) Los repetidos pedidos se corrigen inline; la oferta se corrige en drawer
- **Decision:** el paso 3 permitira ajustar inline solo `requestedRepeateds` y movera la edicion de cada bloque ofrecido a un drawer mobile. El drawer permitira cambiar entre `Aceptar la regla` y `Proponer otra opcion`, editar la contraoferta completa y mostrar en vivo cuantas unidades habilita el bloque. Si el usuario vuelve de `counteroffer` a `fulfill` y ya tenia datos cargados, la UI pedira una confirmacion ligera antes de descartarlos.
- **Rationale:** los repetidos pedidos son la correccion mas frecuente y mas barata cognitivamente, por eso conviene mantenerlos inline. La oferta por bloque requiere mas campos y, si se deja inline, satura demasiado la pantalla mobile. El drawer preserva contexto sin obligar a rebotar al paso 1.
- **Alternatives considered:**
  - Rebotar al paso 1 para editar la oferta: descartada porque rompe el contexto del balance.
  - Editar toda la oferta inline en paso 3: descartada por sobrecarga visual.

## Risks / Trade-offs

- **[Riesgo] La capacidad maxima de una regla `fulfill` puede no coincidir con la intuicion inmediata del usuario si ve varias ramas `OR`** -> **Mitigacion:** mantener la validacion admin coherente y mostrar en paso 3 el total habilitado con copy explicito de balance.
- **[Riesgo] El paso 3 puede quedar a medio camino entre resumen y editor** -> **Mitigacion:** dejar inline solo lo que recibe el cambiador y mover la oferta por bloque a un drawer acotado con CTA principal unico `Guardar cambios`.
- **[Trade-off] Compartir la validacion de `ANY` en schemas endurece reglas existentes al guardar** -> **Mitigacion:** tratar la inconsistencia como error de configuracion explicito en admin y cubrirla con tests de migracion/logica.
- **[Riesgo] Los usuarios con borradores viejos pueden encontrarse con propuestas que antes enviaban y ahora quedan bloqueadas** -> **Mitigacion:** recalcular el balance al rehidratar y mostrar guidance antes del envio en vez de fallar silenciosamente al final.

## Migration Plan

1. Agregar la validacion estructural de reglas abstractas en el dominio de `exchange-settings` y reutilizarla en settings globales y overrides.
2. Introducir utilidades compartidas para calcular unidades habilitadas en `fulfill`, `counteroffer` y balance global exacto.
3. Conectar esas utilidades al wizard publico y a la server action de envio para bloquear propuestas desbalanceadas tanto en cliente como en servidor.
4. Ajustar el paso 3 para mostrar balance primero, guidance contextual, correccion inline de repetidos y edicion de oferta en drawer.
5. Cubrir reglas admin incoherentes, balance exacto y rehidratacion de borradores con tests. El rollback consiste en volver a la validacion anterior del admin y al envio sin balance exacto.

## Open Questions

- Queda por decidir en una exploracion posterior si el drawer usa confirmacion inline, modal secundaria o sheet de confirmacion al descartar una contraoferta existente.
