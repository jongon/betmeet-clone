## Context

La capacidad `cambiador-cambio` ya cubre la entrada por QR, la validacion de token y la creacion o reanudacion de sesion en `/cambio/[token]`. Lo que falta ahora es la experiencia principal del cambiador: recorrer rapidamente los cromos que el coleccionista quiere recibir, entender que pide por cada uno y enviar una propuesta desde un movil en un contexto de uso breve, ruidoso y con usuarios primerizos.

El cambio cruza UI publica, estado de sesion, reglas de intercambio y persistencia de propuestas. Ademas, la negociacion se modela por cromo individual, con bloques independientes que pueden cumplir una regla o abrir una contraoferta. El sistema actual de reglas ya expone configuracion global y overrides por cromo; esta propuesta asume esa prioridad, pero deja fuera la futura expansion del admin para reglas exactas mas avanzadas.

## Goals / Non-Goals

**Goals:**
- Definir un wizard mobile de 5 pasos, corto y legible, para usuarios que abren la app por primera vez desde un QR.
- Modelar la propuesta como una coleccion de bloques independientes por cromo solicitado por el coleccionista.
- Mostrar la regla aplicable despues de seleccionar un cromo, priorizando override por cromo sobre regla general y etiquetando la procedencia de la regla.
- Permitir dos caminos por bloque: cumplir la regla de forma abstracta o proponer una contraoferta explicita.
- Limitar el detalle por numero exacto de cromo al caso de contraoferta, manteniendo el flujo base mas rapido y simple.
- Enviar la propuesta con estado pendiente y mostrar un detalle posterior de lo enviado.

**Non-Goals:**
- Diseñar el panel admin para crear nuevas reglas exactas por numero; eso queda para `admin-specific-sticker-exchange-rules`.
- Implementar matching automatico, aceptacion final del admin o cierre de transaccion.
- Permitir propuestas agrupadas de varios cromos como una sola bolsa de intercambio; cada bloque se negocia por separado.
- Exigir inventario completo del cambiador antes de armar la propuesta.

## Decisions

### 1) Wizard de 5 pasos en vez de una pantalla unica
- **Decision:** implementar un flujo guiado de 5 pasos con progreso visible y acciones primarias claras.
- **Rationale:** el contexto de uso es movil, rapido y muchas veces en via publica. Separar seleccion, lectura de reglas, decision y resumen reduce carga cognitiva y mejora descubribilidad para usuarios primerizos.
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
- **Decision:** si el cambiador elige `Cumplir regla`, la propuesta se guarda de forma abstracta segun cantidad y tipo requeridos. Solo si elige `Contraoferta` puede proponer cantidad, tipo o uno o mas cromos exactos.
- **Rationale:** reduce friccion en el caso comun y reserva el detalle explicito para los casos donde realmente hace falta negociar una excepcion.
- **Alternatives considered:**
  - Permitir detalle exacto tambien al cumplir regla: descartado por aumentar la complejidad del flujo base sin necesidad funcional inmediata.

### 5) Resolucion de regla por prioridad y etiquetas visibles
- **Decision:** al mostrar la regla de un bloque se evalua primero override por cromo y, si no existe, se usa la regla general. La UI muestra etiquetas explicitas `Regla especial` o `Regla general`.
- **Rationale:** el usuario necesita entender por que un cromo concreto pide algo distinto. La etiqueta visible evita sorpresas y da contexto a la negociacion.
- **Alternatives considered:**
  - Mostrar solo el contenido de la regla sin procedencia: descartado porque oculta la razon de una diferencia entre cromos.

### 6) Paso 3 como decision simple: cumplir o contraofertar
- **Decision:** el paso 3 no edita aun los detalles; solo pide decidir por cada bloque entre `Cumplir regla` y `Proponer contraoferta`.
- **Rationale:** mantiene el flujo rapido para quien acepta la regla y solo abre complejidad en el paso siguiente para los bloques que lo necesitan.
- **Alternatives considered:**
  - Editar directamente en el paso 3: descartado porque mezcla una decision binaria con un formulario detallado.

### 7) Nota opcional solo para contraofertas
- **Decision:** la nota libre viaja unicamente cuando el bloque esta en modo contraoferta.
- **Rationale:** evita texto innecesario en el camino feliz y preserva un canal humano para explicar excepciones reales.
- **Alternatives considered:**
  - Nota disponible en todo bloque: descartada por ruido adicional y menor consistencia semantica.

### 8) Persistencia incremental de borrador por sesion
- **Decision:** el wizard debe guardar el avance por `sessionId`, incluyendo seleccion inicial, modo de cada bloque y detalle de contraofertas, para soportar refresh o reanudacion.
- **Rationale:** el flujo publico ya reusa una sesion abierta por navegador; mantener tambien el borrador evita perder trabajo en un entorno movil inestable.
- **Alternatives considered:**
  - Estado solo en cliente: mas simple, pero fragil ante recargas, cierre accidental o cambio de paso server-side.

## Risks / Trade-offs

- **[Riesgo] El usuario puede percibir demasiados pasos para una accion rapida** -> **Mitigacion:** cada paso debe tener una sola tarea, CTA clara y resumen sticky con progreso de propuesta.
- **[Trade-off] Cumplimiento abstracto reduce precision inmediata del detalle ofrecido** -> **Mitigacion:** el admin vera el detalle final en la transaccion y el flujo conserva la opcion de contraofertar con cromos exactos cuando sea necesario.
- **[Riesgo] Overrides por cromo sin explicacion visual pueden parecer errores** -> **Mitigacion:** usar etiquetas visibles y copy corto que indique si la regla viene de una excepcion especial.
- **[Riesgo] Persistencia incremental aumenta complejidad del modelo de sesion** -> **Mitigacion:** separar el borrador de propuesta en una estructura propia anidada bajo la sesion y validar cada transicion por paso.
- **[Trade-off] No soportar bolsas agrupadas limita negociaciones complejas** -> **Mitigacion:** priorizar primero el caso sencillo por cromo y dejar agregaciones para una spec futura si el producto lo necesita.

## Migration Plan

1. Extender la sesion publica del cambiador para almacenar borrador de propuesta por cromo y estado final `pending`.
2. Implementar shell del wizard mobile con progreso, resumen sticky y navegacion entre pasos.
3. Conectar el wizard a los datos del coleccionista: cromos que quiere recibir, filtros, reglas globales y overrides por cromo.
4. Implementar decision por bloque (`fulfill` o `counteroffer`) y el editor de contraofertas con nota opcional.
5. Implementar resumen final, envio de propuesta y pantalla detallada posterior al envio.
6. Agregar tests de reglas, pasos y persistencia de borrador. El rollback consiste en volver a dejar la sesion publica en estado de entrada sin wizard.

## Open Questions

- La spec futura `admin-specific-sticker-exchange-rules` definira como se crean overrides mas avanzados por numero exacto desde admin; este flujo debe consumir esa informacion sin redefinirla.
- Queda por definir la forma exacta del detalle que vera el admin al revisar o aceptar una propuesta pendiente.
