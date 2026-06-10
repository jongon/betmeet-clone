/**
 * Spanish dictionary — single active locale in v1.
 * The shape of this object is the source of truth for the `Dictionary` type
 * (see ../types.ts), giving compile-time safety to every copy key (BR-2.28).
 */
export const es = {
  common: {
    appName: "Quiniela 2026",
    signIn: "Iniciar sesión",
    continue: "Continuar",
    skipForNow: "Saltar por ahora",
  },
  theme: {
    label: "Tema",
    light: "Claro",
    dark: "Oscuro",
    system: "Sistema",
    toggle: "Cambiar tema",
  },
  landing: {
    heroTitle: "Predice el Mundial 2026 con tus amigos",
    heroSubtitle:
      "Crea tu quiniela, pronostica los partidos y compite por el primer lugar de tu pool.",
    primaryCta: "Crear mi quiniela",
    explorePools: "Explorar pools públicos",
    poolsTitle: "Pools públicos",
    poolsEmpty: "Pools públicos próximamente.",
    poolsError: "",
    scoringTeaserTitle: "Cómo se puntúa",
  },
  scoring: {
    exact: "Marcador exacto",
    exactPoints: "5 puntos",
    result: "Resultado (ganador o empate)",
    resultPoints: "2 puntos",
    partial: "Aciertas los goles de un equipo",
    partialPoints: "1 punto",
    miss: "Fallas todo",
    missPoints: "0 puntos",
    penaltyBonus: "Bonus por acertar el ganador de penales",
    penaltyBonusPoints: "+1 punto",
  },
  calculator: {
    title: "Calculadora de puntos",
    description: "Introduce una predicción y un resultado para ver cuántos puntos ganarías.",
    prediction: "Tu predicción",
    actual: "Resultado real",
    home: "Local",
    away: "Visitante",
    knockout: "Fase eliminatoria (permite penales)",
    penaltyWinner: "¿Quién gana en penales?",
    total: "Puntos obtenidos",
    fallbackTitle: "Tabla de puntuación",
    fallbackNote: "La calculadora no está disponible ahora, pero estas son las reglas.",
  },
  breakdown: {
    exact: "Acertaste el marcador exacto.",
    result: "Acertaste el resultado, pero no el marcador exacto.",
    partial: "Acertaste los goles de un equipo, pero no el resultado.",
    miss: "No acertaste el marcador ni el resultado.",
    penaltyApplied: "Además acertaste el ganador de penales (+1).",
    base: "Puntos base",
    penalty: "Bonus de penales",
    total: "Total",
  },
  rules: {
    centerTitle: "Centro de reglas",
    centerSubtitle: "Todo lo que necesitas saber para jugar.",
    makePredictions: "Hacer predicciones",
    demoTitle: "Ejemplos",
  },
  onboarding: {
    rulesStepTitle: "Aprende a jugar",
    rulesStepDescription:
      "Así se reparten los puntos. Puedes consultar las reglas completas cuando quieras.",
    rulesStepLink: "Ver el centro de reglas",
    stepRules: "Reglas",
  },
  cues: {
    nicknameDiscriminator:
      "Si tu nickname ya existe, le añadimos un número único (como en Discord).",
    rankingPoolOnly: "El ranking es por pool, no global. Compites contra tu grupo.",
    scoringHint: "Los puntos dependen de qué tan cerca esté tu predicción del marcador real.",
    matchLockCountdown: "Puedes editar tu predicción hasta el inicio del partido.",
  },
} as const;

export type EsDictionary = typeof es;
