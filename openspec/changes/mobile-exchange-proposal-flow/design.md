## Context

La capacidad `cambiador-cambio` ya cubre la entrada por QR, la validacion de token y la creacion o reanudacion de sesion en `/cambio/[token]`. Lo que falta ahora es la experiencia principal del cambiador: recorrer rapidamente los cromos que el coleccionista quiere recibir, entender que pide por cada uno, elegir tambien que repetidos reales quiere recibir a cambio y enviar una propuesta desde un movil en un contexto de uso breve, ruidoso y con usuarios primerizos.

El cambio cruza UI publica, estado de sesion, reglas de intercambio y persistencia de propuestas. Ademas, la negociacion se modela por cromo individual, con bloques independientes que pueden cumplir una regla o abrir una contraoferta. El sistema actual de reglas ya expone configuracion global y overrides por cromo; esta propuesta asume esa prioridad, pero deja fuera la futura expansion del admin para reglas exactas mas avanzadas.

## Goals / Non-Goals

**Goals:**
- Definir un wizard mobile de 3 pasos, corto y legible, para usuarios que abren la app por primera vez desde un QR.
- Modelar la propuesta como una coleccion de bloques independientes por cromo solicitado por el coleccionista.
- Modelar lo que el cambiador quiere recibir como una lista global independiente de repetidos reales del coleccionista.
- Mostrar la regla aplicable despues de seleccionar un cromo, priorizando override por cromo sobre regla general, etiquetando la procedencia de la regla y expresando cada opcion como alternativa `OR`.
- Permitir dos caminos por bloque: cumplir la regla de forma abstracta o proponer una contraoferta explicita de forma inline.
- Limitar el detalle por numero exacto de cromo al caso de contraoferta, manteniendo el flujo base mas rapido y simple.
- Enviar la propuesta con estado pendiente y mostrar un detalle posterior de lo enviado.

**Non-Goals:**
- Diseñar el panel admin para crear nuevas reglas exactas por numero; eso queda para `admin-specific-sticker-exchange-rules`.
- Implementar matching automatico, aceptacion final del admin o cierre de transaccion.
- Permitir propuestas agrupadas de varios cromos como una sola bolsa de intercambio; cada bloque se negocia por separado.
- Exigir inventario completo del cambiador antes de armar la propuesta.

## Decisions

### 1) Wizard de 3 pasos en vez de una pantalla unica o de 4 pasos
- **Decision:** implementar un flujo guiado de 3 pasos con progreso visible y acciones primarias claras.
- **Rationale:** el contexto de uso es movil, rapido y muchas veces en via publica. Separar seleccion/contraofertas inline, repetidos deseados y resumen reduce carga cognitiva. Consolidar el editor de contraofertas en el primer paso (inline/colapsable) simplifica el proceso de 4 a 3 pasos, reduciendo la fatiga del usuario y contextualizando la excepcion de inmediato.
- **Alternatives considered:**
  - Flujo de 4 pasos con paso exclusivo para contraofertas: descartada por fragmentar demasiado el camino y cansar al usuario con demasiadas transiciones de pantalla.
  - Pantalla unica con bloques expandibles: descartada por mezclar demasiadas decisiones a la vez y dificultar la lectura de overrides y contraofertas.

### 2) La unidad de negociacion es un bloque por cromo solicitado
- **Decision:** cada cromo que el coleccionista quiere recibir y que el cambiador selecciona genera un bloque independiente en la propuesta.
- **Rationale:** refleja la logica acordada por el producto, permite overrides por cromo y hace natural la contraoferta inline por bloque.
- **Alternatives considered:**
  - Propuesta agregada total: descartada porque diluye la regla aplicable por cromo y complica explicar excepciones.

### 3) El flujo empieza por lo que recibe el coleccionista
- **Decision:** el primer paso muestra los cromos que el coleccionista quiere recibir; el resumen final prioriza visualmente esa misma cara del intercambio.
- **Rationale:** el producto quiere incentivar el cambio y reducir ambiguedad. Empezar por "que necesita el coleccionista" ayuda al cambiador a actuar sobre una necesidad concreta y mantiene consistencia con el resumen final.
- **Alternatives considered:**
  - Empezar por lo que el cambiador quiere recibir: descartado porque desplaza el foco del intercambio y vuelve menos clara la lectura de reglas por cromo.

### 4) Cumplimiento abstracto por defecto; detalle exacto solo en contraoferta
- **Decision:** si el cambiador elige `Aceptar la regla`, la propuesta se guarda de forma abstracta aceptando una de las opciones permitidas por esa regla. Solo si elige `Proponer otra opcion` puede proponer cantidad, tipo o uno o mas cromos exactos.
- **Rationale:** reduce friccion en el caso comun y reserva el detalle explicito para los casos donde realmente hace falta negociar una excepcion.
- **Alternatives considered:**
  - Permitir detalle exacto tambien al cumplir regla: descartado por aumentar la complejidad del flujo base sin necesidad funcional inmediata.

### 5) La decision de contraoferta vive en la fila del paso 1
- **Decision:** al seleccionar un cromo en el paso 1, el sistema asume por defecto `Aceptar la regla`. En esa misma fila aparece una sola accion secundaria contextual: `Proponer otra opcion`, que selecciona automaticamente el cromo si hacia falta y abre el panel colapsable para configurar la contraoferta inline. Si el bloque ya esta en contraoferta, la accion pasa a ser `Eliminar propuesta` para volver a `Aceptar la regla`.
- **Rationale:** el usuario entiende esa decision como parte del mismo momento en que evalua si le interesa ofrecer ese cromo. Mantenerla embebida evita navegar a otro paso solo para confirmar el caso por defecto.
- **Alternatives considered:**
  - Pedir la decision en un paso posterior (como en el flujo de 4 pasos): descartado porque separa demasiado la eleccion del cromo de la excepcion sobre su regla.

- **Decision:** al mostrar un cromo en el paso 1 se evalua primero override por cromo y, si no existe, se usa la regla general. La UI publica no expone etiquetas tecnicas como `Intercambio general` o `Intercambio especial`; en su lugar muestra frases naturales como `Se cambia por 2 cromos de jugador` o `Se cambia por 1 badge o por POR-15`. Si la misma cantidad positiva aplica a `badge`, `cromo de jugador`, `foto de equipo` y `cromo especial`, la UI colapsa esas alternativas en `Se cambia por cualquier tipo de cromo` o `Se cambia por N cromos de cualquier tipo`.
- **Rationale:** el usuario necesita entender la condicion del intercambio en el mismo momento en que decide si ese cromo le interesa. El copy directo evita lenguaje interno del sistema, reduce friccion en movil y deja claro que la regla se cumple con una de varias opciones, no con todas a la vez. Colapsar reglas equivalentes evita listar cuatro variantes que en la practica expresan la misma libertad de eleccion.
- **Alternatives considered:**
  - Mostrar etiquetas tecnicas de procedencia: descartado porque ayudan poco a decidir y suenan administrativas para un usuario final.

### 6) Paso 2 solo para lo que quiere recibir el cambiador
- **Decision:** el paso 2 muestra unicamente los repetidos reales del coleccionista para que el cambiador marque pronto que le interesa recibir.
- **Rationale:** al mover y embeber la decision de contraoferta inline en el Paso 1, el segundo paso queda enfocado exclusivamente en la contraparte de valor del cambiador y reduce carga cognitiva.
- **Alternatives considered:**
  - Mantener tambien la decision por bloque en el Paso 2: descartado porque duplicaba control sobre el mismo bloque y hacia mas confuso el flujo.

### 7) No persistencia del buscador entre pasos
- **Decision:** limpiar el filtro de busqueda al cambiar de paso (por ejemplo, al pulsar "Continuar" o "Volver").
- **Rationale:** evita que el usuario se mueva de paso y encuentre la lista de cromos vacia o pesadamente filtrada debido a una busqueda especifica realizada en el paso anterior.

### 7.1) Validacion de existencia para cromos exactos opcionales y limpieza de filtro
- **Decision:** cuando una contraoferta incluya cromos exactos opcionales, el wizard valida antes de avanzar que todos esos codigos existan en los repetidos del coleccionista. Si se detecta un error de validacion, se limpia el buscador para garantizar la visibilidad de la card ofensora y se realiza scroll automatico hacia ella.
- **Rationale:** garantiza que el usuario pueda ver el mensaje de error directamente debajo de la card afectada sin importar si esta habia sido ocultada temporalmente por un termino de busqueda.

### 7.2) Sincronizacion automatica con Paso 2 para cromos exactos opcionales y Toast
- **Decision:** cada `exactStickerCode` valido escrito en una contraoferta se agrega automaticamente a la lista global de repetidos solicitados del Paso 2. Mientras siga referenciado, ese cromo permanece seleccionado, bloqueado contra edicion manual y con una card visualmente diferenciada. Al ocurrir esta adicion automatica, el sistema muestra una notificacion (Toast) de confirmacion al usuario.
- **Rationale:** mantiene la propuesta libre de estados contradictorios e informa de manera transparente al usuario que su eleccion en el Paso 1 ya aseguro el cromo en su lista de interesados para el Paso 2.

### 7.3) Unicidad global de cromos exactos opcionales
- **Decision:** un mismo `exactStickerCode` solo puede aparecer una vez entre todas las contraofertas activas de la propuesta.
- **Rationale:** el producto quiere que `POR-15` se negocie como una pieza unica dentro de la propuesta. Permitir duplicados entre bloques volveria ambigua la expectativa de recepcion y complicaria el resumen final.

### 8) Nota opcional solo para contraofertas
- **Decision:** la nota libre viaja unicamente cuando el bloque esta en modo contraoferta.
- **Rationale:** evita texto innecesario en el camino feliz y preserva un canal humano para explicar excepciones reales.

### 9) Persistencia incremental de borrador por sesion
- **Decision:** el wizard debe guardar el avance por `sessionId`, incluyendo seleccion inicial, modo de cada bloque y detalle de contraofertas, para soportar refresh o reanudacion.
- **Rationale:** el flujo publico ya reusa una sesion abierta por navegador; mantener tambien el borrador evita perder trabajo en un entorno movil inestable.

### 10) Lo que recibe el cambiador se elige desde repetidos reales y viaja como lista global
- **Decision:** el paso 2 deja al cambiador seleccionar, desde el inventario real de repetidos del coleccionista, los cromos que quiere recibir. Esa seleccion se guarda como una lista global independiente de los bloques por cromo ofrecido.
- **Rationale:** evita atar un cromo repetido solicitado a cada bloque individual, simplifica el resumen y hace visible antes la contraparte de valor que busca el cambiador.

### 11) Cantidad por repetido limitada por inventario disponible
- **Decision:** al seleccionar un repetido real, la cantidad inicial arranca en `1` y puede subir solo hasta la cantidad disponible en inventario del coleccionista.
- **Rationale:** permite expresar interes real por varias copias sin romper la consistencia con el stock publicado por el admin.

## Risks / Trade-offs

- **[Riesgo] El usuario puede percibir demasiados pasos para una accion rapida** -> **Mitigacion:** consolidar de 4 a 3 pasos agrupando seleccion y contraofertas inline; cada paso tiene una sola tarea clara y resumen sticky con progreso.
- **[Trade-off] Cumplimiento abstracto reduce precision inmediata del detalle ofrecido** -> **Mitigacion:** el admin vera el detalle final en la transaccion y el flujo conserva la opcion de contraofertar con cromos exactos cuando sea necesario.
- **[Riesgo] Overrides por cromo sin explicacion visual pueden parecer errores** -> **Mitigacion:** usar etiquetas visibles y copy corto que indique si la regla viene de una excepcion especial.
- **[Riesgo] Persistencia incremental aumenta complejidad del modelo de sesion** -> **Mitigacion:** separar el borrador de propuesta en una estructura propia anidada bajo la sesion y validar cada transicion por paso.
- **[Riesgo] Un cromo exacto puede desaparecer del inventario de repetidos entre el borrador y el envio** -> **Mitigacion:** validar al avanzar de paso y revalidar al enviar con mensaje explicito que nombre el codigo bloqueado.
- **[Riesgo] El usuario puede no entender por que un repetido ya aparece marcado y sin poder editarse en el paso 2** -> **Mitigacion:** mostrar una card visualmente diferenciada, un copy informativo explicito y disparar una notificacion (Toast) cuando se configura en el Paso 1.

## Migration Plan

1. Extender la sesion publica del cambiador para almacenar borrador de propuesta por cromo y estado final `pending`.
2. Implementar shell del wizard mobile con progreso, resumen sticky y navegacion de 3 pasos.
3. Conectar el wizard a los datos del coleccionista: cromos que quiere recibir, filtros, reglas globales y overrides por cromo.
4. Implementar decision por bloque (`fulfill` o `counteroffer`) y el editor de contraofertas colapsable inline.
5. Implementar el paso de repetidos solicitados por el cambiador usando el inventario real del coleccionista, incluyendo sincronizacion, bloqueo visual y notificacion de los cromos exactos opcionales referenciados desde contraofertas.
6. Implementar resumen final, envio de propuesta y pantalla detallada posterior al envio.
7. Agregar tests de reglas, pasos, repetidos solicitados y persistencia de borrador. El rollback consiste en volver a dejar la sesion publica en estado de entrada sin wizard.

## Open Questions

- La spec futura `admin-specific-sticker-exchange-rules` definira como se crean overrides mas avanzados por numero exacto desde admin; este flujo debe consumir esa informacion sin redefinirla.
- Queda por definir la forma exacta del detalle que vera el admin al revisar o aceptar una propuesta pendiente.
