## Context

La capacidad `cambiador-cambio` ya cubre la entrada por QR, la validacion de token y la creacion o reanudacion de sesion en `/cambio/[token]`. Lo que falta ahora es la experiencia principal del cambiador: recorrer rapidamente los cromos que el coleccionista quiere recibir, entender que pide por cada uno, elegir tambien que repetidos reales quiere recibir a cambio y enviar una propuesta desde un movil en un contexto de uso breve, ruidoso y con usuarios primerizos.

El cambio cruza UI publica, estado de sesion, reglas de intercambio y persistencia de propuestas. Ademas, la negociacion se modela por cromo individual, con bloques independientes que pueden cumplir una regla o abrir una contraoferta. El sistema actual de reglas ya expone configuracion global y overrides por cromo; esta propuesta asume esa prioridad, pero deja fuera la futura expansion del admin para reglas exactas mas avanzadas.

## Goals / Non-Goals

**Goals:**
- Definir un wizard mobile de 4 pasos, corto y legible, para usuarios que abren la app por primera vez desde un QR.
- Modelar la propuesta como una coleccion de bloques independientes por cromo solicitado por el coleccionista.
- Modelar lo que el cambiador quiere recibir como una lista global independiente de repetidos reales del coleccionista.
- Mostrar la regla aplicable despues de seleccionar un cromo, priorizando override por cromo sobre regla general, etiquetando la procedencia de la regla y expresando cada opcion como alternativa `OR`.
- Permitir dos caminos por bloque: cumplir la regla de forma abstracta o proponer una contraoferta explicita.
- Limitar el detalle por numero exacto de cromo al caso de contraoferta, manteniendo el flujo base mas rapido y simple.
- Enviar la propuesta con estado pendiente y mostrar un detalle posterior de lo enviado.

**Non-Goals:**
- Diseñar el panel admin para crear nuevas reglas exactas por numero; eso queda para `admin-specific-sticker-exchange-rules`.
- Implementar matching automatico, aceptacion final del admin o cierre de transaccion.
- Permitir propuestas agrupadas de varios cromos como una sola bolsa de intercambio; cada bloque se negocia por separado.
- Exigir inventario completo del cambiador antes de armar la propuesta.

## Decisions

### 1) Wizard de 4 pasos en vez de una pantalla unica
- **Decision:** implementar un flujo guiado de 4 pasos con progreso visible y acciones primarias claras.
- **Rationale:** el contexto de uso es movil, rapido y muchas veces en via publica. Separar seleccion, decision mas repetidos deseados, ajuste de contraofertas y resumen reduce carga cognitiva sin obligar al usuario a pasar por un paso exclusivo para decidir por bloque.
- **Alternatives considered:**
  - Pantalla unica con bloques expandibles: descartada por mezclar demasiadas decisiones a la vez y dificultar la lectura de overrides y contraofertas.

### 2) La unidad de negociacion es un bloque por cromo solicitado
- **Decision:** cada cromo que el coleccionista quiere recibir y que el cambiador selecciona genera un bloque independiente en la propuesta.
- **Rationale:** refleja la logica acordada por el producto, permite overrides por cromo y hace natural la contraoferta individual.
- **Alternatives considered:**
  - Propuesta agregada total: descartada porque diluye la regla aplicable por cromo y complica explicar excepciones.

### 3) El flujo empieza por lo que recibe el coleccionista
- **Decision:** el primer paso muestra los cromos que el coleccionista quiere recibir; el resumen final prioriza visualmente esa misma cara del intercambio.
- **Rationale:** el producto quiere incentivar el cambio y reducir ambiguedad. Empezar por "que necesita el admin" ayuda al cambiador a actuar sobre una necesidad concreta y mantiene consistencia con el resumen final.
- **Alternatives considered:**
  - Empezar por lo que el cambiador quiere recibir: descartado porque desplaza el foco del intercambio y vuelve menos clara la lectura de reglas por cromo.

### 4) Cumplimiento abstracto por defecto; detalle exacto solo en contraoferta
- **Decision:** si el cambiador elige `Aceptar la regla`, la propuesta se guarda de forma abstracta aceptando una de las opciones permitidas por esa regla. Solo si elige `Propone otra opcion` puede proponer cantidad, tipo o uno o mas cromos exactos.
- **Rationale:** reduce friccion en el caso comun y reserva el detalle explicito para los casos donde realmente hace falta negociar una excepcion.
- **Alternatives considered:**
  - Permitir detalle exacto tambien al cumplir regla: descartado por aumentar la complejidad del flujo base sin necesidad funcional inmediata.

### 5) La decision de contraoferta vive en la fila del paso 1
- **Decision:** al seleccionar un cromo en el paso 1, el sistema asume por defecto `Aceptar la regla`. En esa misma fila aparece una sola accion secundaria contextual: `Proponer otra opcion`, que selecciona automaticamente el cromo si hacia falta y lo cambia a contraoferta. Si el bloque ya esta en contraoferta, la accion pasa a ser `Quitar contraoferta`.
- **Rationale:** el usuario entiende esa decision como parte del mismo momento en que evalua si le interesa ofrecer ese cromo. Mantenerla embebida evita navegar a otro paso solo para confirmar el caso por defecto.
- **Alternatives considered:**
  - Pedir la decision en un paso posterior: descartado porque separa demasiado la eleccion del cromo de la excepcion sobre su regla.

- **Decision:** al mostrar un cromo en el paso 1 se evalua primero override por cromo y, si no existe, se usa la regla general. La UI publica no expone etiquetas tecnicas como `Intercambio general` o `Intercambio especial`; en su lugar muestra frases naturales como `Se cambia por 2 cromos de jugador` o `Se cambia por 1 badge o por POR-15`. Si la misma cantidad positiva aplica a `badge`, `cromo de jugador`, `foto de equipo` y `cromo especial`, la UI colapsa esas alternativas en `Se cambia por cualquier tipo de cromo` o `Se cambia por N cromos de cualquier tipo`.
- **Rationale:** el usuario necesita entender la condicion del intercambio en el mismo momento en que decide si ese cromo le interesa. El copy directo evita lenguaje interno del sistema, reduce friccion en movil y deja claro que la regla se cumple con una de varias opciones, no con todas a la vez. Colapsar reglas equivalentes evita listar cuatro variantes que en la practica expresan la misma libertad de eleccion.
- **Alternatives considered:**
  - Mostrar etiquetas tecnicas de procedencia: descartado porque ayudan poco a decidir y suenan administrativas para un usuario final.

### 6) Paso 2 solo para lo que quiere recibir el cambiador
- **Decision:** el paso 2 muestra unicamente los repetidos reales del coleccionista para que el cambiador marque pronto que le interesa recibir.
- **Rationale:** despues de mover la decision de contraoferta al paso 1, el segundo paso queda enfocado en la contraparte de valor del cambiador y reduce carga cognitiva.
- **Alternatives considered:**
  - Mantener tambien la decision por bloque en el paso 2: descartado porque duplicaba control sobre el mismo bloque y hacia mas confuso el flujo.

### 7) Paso 3 para editar solo contraofertas
- **Decision:** el paso 3 no repite la decision binaria; solo edita cantidad, tipo, cromos exactos y nota para los bloques que quedaron en `Proponer otra opcion`.
- **Rationale:** mantiene el flujo rapido para quien acepta la regla y deja la complejidad solo donde hace falta.
- **Alternatives considered:**
  - Editar dentro del mismo paso 2: descartado porque mezclar seleccion de repetidos, decision por bloque y formulario detallado en la misma surface sobrecarga demasiado la pantalla.

### 7.1) Validacion de existencia para cromos exactos opcionales
- **Decision:** cuando una contraoferta incluya cromos exactos opcionales, el wizard valida antes de avanzar al siguiente paso que todos esos codigos existan entre los repetidos del coleccionista. El envio final vuelve a ejecutar la misma validacion server-side.
- **Rationale:** el formato del input no alcanza; el usuario necesita saber antes del resumen si `POR-15` o `ARG-7` no estan disponibles entre los repetidos del coleccionista para negociar.
- **Alternatives considered:**
  - Validar solo al enviar: descartada porque deja avanzar con una propuesta inconsistente y descubre el problema demasiado tarde.
  - Validar mientras el usuario escribe: descartada por ruido excesivo y por acoplar cada tecla a una validacion remota.

### 8) Nota opcional solo para contraofertas
- **Decision:** la nota libre viaja unicamente cuando el bloque esta en modo contraoferta.
- **Rationale:** evita texto innecesario en el camino feliz y preserva un canal humano para explicar excepciones reales.
- **Alternatives considered:**
  - Nota disponible en todo bloque: descartada por ruido adicional y menor consistencia semantica.

### 9) Persistencia incremental de borrador por sesion
- **Decision:** el wizard debe guardar el avance por `sessionId`, incluyendo seleccion inicial, modo de cada bloque y detalle de contraofertas, para soportar refresh o reanudacion.
- **Rationale:** el flujo publico ya reusa una sesion abierta por navegador; mantener tambien el borrador evita perder trabajo en un entorno movil inestable.
- **Alternatives considered:**
  - Estado solo en cliente: mas simple, pero fragil ante recargas, cierre accidental o cambio de paso server-side.

### 10) Lo que recibe el cambiador se elige desde repetidos reales y viaja como lista global
- **Decision:** el paso 2 deja al cambiador seleccionar, desde el inventario real de repetidos del coleccionista, los cromos que quiere recibir. Esa seleccion se guarda como una lista global independiente de los bloques por cromo ofrecido.
- **Rationale:** evita atar un cromo repetido solicitado a cada bloque individual, simplifica el resumen y hace visible antes la contraparte de valor que busca el cambiador.
- **Alternatives considered:**
  - Asociar repetidos solicitados bloque por bloque: descartado por aumentar mucho la complejidad del editor, la persistencia y el resumen final.

### 11) Cantidad por repetido limitada por inventario disponible
- **Decision:** al seleccionar un repetido real, la cantidad inicial arranca en `1` y puede subir solo hasta la cantidad disponible en inventario del coleccionista.
- **Rationale:** permite expresar interes real por varias copias sin romper la consistencia con el stock publicado por el admin.
- **Alternatives considered:**
  - Solo una unidad fija por cromo: descartado porque no cubre el caso donde el admin tiene varias copias repetidas disponibles.

## Risks / Trade-offs

- **[Riesgo] El usuario puede percibir demasiados pasos para una accion rapida** -> **Mitigacion:** cada paso debe tener una sola tarea, CTA clara y resumen sticky con progreso de propuesta.
- **[Trade-off] Cumplimiento abstracto reduce precision inmediata del detalle ofrecido** -> **Mitigacion:** el admin vera el detalle final en la transaccion y el flujo conserva la opcion de contraofertar con cromos exactos cuando sea necesario.
- **[Riesgo] Overrides por cromo sin explicacion visual pueden parecer errores** -> **Mitigacion:** usar etiquetas visibles y copy corto que indique si la regla viene de una excepcion especial.
- **[Riesgo] Persistencia incremental aumenta complejidad del modelo de sesion** -> **Mitigacion:** separar el borrador de propuesta en una estructura propia anidada bajo la sesion y validar cada transicion por paso.
- **[Riesgo] Un cromo exacto puede desaparecer del inventario de repetidos entre el borrador y el envio** -> **Mitigacion:** validar al avanzar de paso y revalidar al enviar con mensaje explicito que nombre el codigo bloqueado.
- **[Trade-off] No soportar bolsas agrupadas limita negociaciones complejas** -> **Mitigacion:** priorizar primero el caso sencillo por cromo y dejar agregaciones para una spec futura si el producto lo necesita.

## Migration Plan

1. Extender la sesion publica del cambiador para almacenar borrador de propuesta por cromo y estado final `pending`.
2. Implementar shell del wizard mobile con progreso, resumen sticky y navegacion entre pasos.
3. Conectar el wizard a los datos del coleccionista: cromos que quiere recibir, filtros, reglas globales y overrides por cromo.
4. Implementar decision por bloque (`fulfill` o `counteroffer`) y el editor de contraofertas con nota opcional.
5. Implementar el paso de repetidos solicitados por el cambiador usando el inventario real del coleccionista.
6. Implementar resumen final, envio de propuesta y pantalla detallada posterior al envio.
7. Agregar tests de reglas, pasos, repetidos solicitados y persistencia de borrador. El rollback consiste en volver a dejar la sesion publica en estado de entrada sin wizard.

## Open Questions

- La spec futura `admin-specific-sticker-exchange-rules` definira como se crean overrides mas avanzados por numero exacto desde admin; este flujo debe consumir esa informacion sin redefinirla.
- Queda por definir la forma exacta del detalle que vera el admin al revisar o aceptar una propuesta pendiente.
