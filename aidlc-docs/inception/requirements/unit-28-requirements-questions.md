# Unit 28 — Requirements Clarification Questions
## Conectar sync admin con football-data.org (resultados reales)

Por favor responde cada pregunta colocando la letra elegida después de `[Answer]:`.
Si ninguna opción encaja exactamente, elige la última opción (Other) y describe tu preferencia.

---

## Contexto del gap detectado

**Estado actual**: El `FootballDataProvider` ya está implementado y llama a
`https://api.football-data.org/v4/competitions/WC/matches`. Sin embargo, el
`sync-orchestrator.ts` **solo persiste equipos (teams)**, no los partidos. Cuando
el admin pulsa "Sincronizar", los resultados se obtienen del API pero **nunca se
guardan en la BD**, por lo que el scoring sweeper no puede recalcular puntuaciones.

**Gap a resolver (Unit 28)**:
1. El orquestador debe persistir los `NormalizedMatch` devueltos por el provider.
2. Cada match del API se debe vincular al partido correspondiente en la BD (sembrado
   con `matchNumber` 1–104 y sin `providerMatchId` inicial).

---

## Question 1
¿Cómo debe vincularse un partido del API con el partido existente en la BD?
El API devuelve un `id` único por partido (`providerMatchId`) pero los partidos
sembrados no tienen ese campo aún. Necesitamos una estrategia inicial de enlace.

A) **Por códigos FIFA + fecha**: buscar en la BD el partido cuyo equipo local y
   visitante (tla) y fecha de kickoff (±6 h) coincidan con el API → actualizar y
   guardar el `providerMatchId` para sincronizaciones futuras.
B) **Solo por `providerMatchId`**: si el campo ya está seteado en la BD, actualizar;
   si no está, saltar el partido (requeriría un paso manual previo de inicialización).
C) **Opción A en primera sync, luego B**: en la primera ejecución enlazar por
   códigos FIFA + fecha y persistir el `providerMatchId`; en ejecuciones
   posteriores usar directamente `providerMatchId`.
D) Other (please describe after [Answer]: tag below)

[Answer]: Voy a empezar desde cero esta base de datos. Los partidos no estarán, por cierto solo agrega aquellos que no hayan ocurrido

---

## Question 2
¿Qué campos del partido deben actualizarse durante la sincronización?

A) Solo **status + homeScore + awayScore** (mínimo necesario para resultados
   y recálculo de puntuaciones).
B) **Status, scores y kickoffAt** (útil si la FIFA reprograma partidos).
C) **Todos los campos disponibles**: status, scores, kickoffAt, homeTeamId,
   awayTeamId, homePlaceholder, awayPlaceholder (útil en knockout para actualizar
   "Winner Group A" → equipo real).
D) Other (please describe after [Answer]: tag below)

[Answer]: C

---

## Question 3
¿Qué debe ocurrir cuando el API devuelve un partido que no se puede vincular
a ningún partido en la BD (ej. partido de fase de grupos aún no en el seed,
o mismatch de código FIFA)?

A) **Silenciar y continuar**: loguear un warning en el servidor, no bloquear
   el sync run, no marcar como error.
B) **Contar como advertencia**: el sync run se marca SUCCESS pero incluye un
   campo `itemsSkipped` con el conteo de partidos no enlazados.
C) **Abortar el sync**: si algún partido no se puede vincular, el run falla
   completamente.
D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 4
Después de persistir los resultados, el scoring sweeper
(`scoreFinishedUnscoredMatches`) ya se ejecuta automáticamente al final del
`trigger-sync` (Unit 25). ¿Necesitas algún comportamiento adicional?

A) No, el sweeper automático es suficiente (recalcula todas las predicciones
   de partidos terminados y sin puntaje).
B) Sí, además mostrar en el admin panel el número de partidos actualizados
   y predicciones recalculadas tras cada sync.
C) Sí, enviar un resumen por consola/logs del admin pero no modificar la UI.
D) Other (please describe after [Answer]: tag below)

[Answer]:
