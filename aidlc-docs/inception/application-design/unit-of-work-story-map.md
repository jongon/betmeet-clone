# Unit of Work Story Map

## Unit 1: Foundation - Auth, Profile, Nickname, Avatar

- US-1.1: Registro y login tradicional
- US-1.2: Autenticación con Google
- US-1.3: Inicio de sesión con Passkeys
- US-1.4: Account Linking
- US-1.5: Configuración de Seguridad y MFA
- US-1.6: Gestión de Avatar
- US-1.7: Nickname Único

## Unit 2: UX Education and Onboarding

- Landing / Public Home screen contract
- Onboarding screen contract
- Rules Center screen contract
- Match Prediction education cues from screen contracts
- Score breakdown education from Leaderboard screen contract

## Unit 3: Pools and Membership

- US-4.1: Creación de Pool
- US-4.2: Unirse a un Pool
- US-4.3: Expulsar Miembros
- Pool Detail screen contract
- Pool Invite / Join screen contract

## Unit 4: Competition Data and API Sync

- US-2.1: Visualización del Fixture
- US-2.2: Estado del Partido
- US-2.3: Desbloqueo de Llaves
- US-6.1: Sincronización con el proveedor de resultados (football-data.org desde Unit 25) (sync foundation only)

## Unit 5: Predictions and Match Locking

- US-3.1: Predecir marcador
- US-3.2: Modificar predicción
- US-3.3: Predicción de Penales
- US-3.4: Visualización de predicciones
- Match Prediction Screen contract

## Unit 6: Scoring and Pool Rankings

- US-5.1: Cálculo de Puntos
- US-5.2: Ranking por Pool
- Leaderboard screen contract
- Score breakdown UX from screen contracts

## Unit 7: Admin and Observability

- US-6.1: Sincronización con el proveedor de resultados (football-data.org desde Unit 25) (admin visibility)
- US-6.2: Forzar Resultado
- Admin Sync Dashboard screen contract
- Public/private pool progress visibility

## Unit 8: Design System and UI Polish

- US-7.1: Identidad visual deportiva
- US-7.2: Cambio de tema claro/oscuro y de personalidad

## Unit 9: Transactional Email

- US-8.1: Envío fiable de correos de auth
- US-8.2: Plantillas de auth con identidad de marca, versionadas en el repo
- US-8.3: Catálogo de notificaciones de negocio (backlog)

## Unit 10: Web Push Notifications

- US-9.1: Activar web push por dispositivo
- US-9.2: Configurar preferencias por tipo de notificación
- US-9.3: Avisos de estado del partido
- US-9.4: Aviso de invitación a liga/pool
- US-9.5: Aviso de subida en ranking global

## Coverage Validation

- All explicit user stories from `stories.md` are mapped.
- Screen contracts from Application Design are mapped to implementation units.
- Admin override is separated from API sync per user answer.
- UX Education is standalone per user answer.
- Units 8–10 are post-construction refine units; Unit 10 is additive and does not reopen approved Units 1–9.
