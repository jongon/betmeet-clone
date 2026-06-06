## Why

La entrada por QR ya define como un cambiador crea o reanuda una sesion, pero aun no existe el flujo principal para proponer un intercambio desde el movil. Necesitamos una experiencia guiada, rapida y comprensible para usuarios primerizos en calle o plaza, donde cada cromo se negocia con sus reglas, overrides y contraofertas sin perder claridad.

## What Changes

- Crear un flujo mobile-first de 4 pasos para que el cambiador arme una propuesta de intercambio despues de entrar a su sesion.
- Mostrar primero los cromos que el coleccionista quiere recibir y permitir al cambiador seleccionar solo unidades individuales que puede ofrecer.
- Agregar un paso nuevo para que el cambiador elija, desde los repetidos reales del coleccionista, que cromos quiere recibir y en que cantidad, con limite por inventario disponible.
- Mostrar la regla aplicable por cada cromo seleccionado, priorizando override por cromo sobre regla general y expresandola con copy natural como `Se cambia por 2 cromos de jugador` o `Se cambia por 1 badge o por POR-15`.
- Expresar cada regla abstracta como un conjunto de opciones alternativas `OR`, no como requisitos acumulativos.
- Permitir que el cambiador decida por cada cromo si cumple la regla o si envia una contraoferta.
- Modelar el cumplimiento normal de reglas de forma abstracta por tipo de cromo; permitir detalle explicito por numero exacto solo cuando el cambiador hace una contraoferta.
- Permitir contraofertas por cromo independiente que puedan cambiar cantidad, tipo o uno o mas cromos exactos, con nota opcional solo para esas excepciones.
- Sincronizar automaticamente los cromos exactos opcionales validos con el paso 2, marcandolos como repetidos solicitados no editables mientras sigan referenciados por una contraoferta activa.
- Impedir que un mismo cromo exacto opcional se repita en mas de una contraoferta activa dentro de la misma propuesta.
- Mostrar un resumen final que priorice visualmente lo que recibe el coleccionista, etiquete `Acepta la regla` o `Propone otra opción`, y envie la propuesta en estado `Pendiente de aprobacion`.
- Mostrar una vista detallada de la propuesta enviada para que el cambiador revise exactamente que mando.

## Capabilities

### New Capabilities
- `cambiador-propuesta-cambio`: Wizard mobile de 4 pasos para seleccionar cromos solicitados por el coleccionista viendo la regla en la misma pantalla, combinar en el paso 2 lo que el cambiador quiere recibir desde repetidos reales con la decision entre cumplir o contraofertar por bloque, completar contraofertas y enviar la propuesta para aprobacion.

### Modified Capabilities

## Impact

- Frontend publico en App Router: nuevas pantallas o estados dentro del flujo de `src/app/cambio/[token]` para el wizard, resumen y detalle posterior al envio.
- Modelo de sesion publica del cambiador: la sesion deja de ser solo una entrada nominal y pasa a contener una propuesta estructurada por cromo.
- Capa de reglas de intercambio: el flujo publico debe consumir reglas generales y overrides por cromo, mostrando prioridad y etiquetas visibles.
- Persistencia de propuestas: se necesitara almacenar bloques independientes por cromo, una lista global de repetidos solicitados por el cambiador, elecciones de cumplimiento o contraoferta, notas opcionales de excepcion y estado `pending`.
- Paso 2 del wizard: necesitara distinguir repetidos elegidos manualmente de repetidos bloqueados por una contraoferta activa del paso 1.
- Specs OpenSpec afectadas: nueva capability `cambiador-propuesta-cambio`.
