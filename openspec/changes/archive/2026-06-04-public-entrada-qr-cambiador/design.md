## Context

Actualmente los QR de admin ya apuntan a `/cambio/{token}`, pero la aplicación no implementa esa ruta ni la decisión inicial de ingreso del cambiador. El cambio cruza UI pública, Server Actions y reglas de sesión porque requiere: validar token, identificar cambiador de forma estable sin auth, decidir entre reanudar o crear, y manejar explícitamente tokens/sesiones no válidos.

Este flujo impacta capacidades existentes (`admin-qr`) y añade una nueva (`cambiador-cambio`) con efectos en modelo y repositorio de sesiones.

## Goals / Non-Goals

**Goals:**
- Implementar la entrada pública en `/cambio/[token]` con validación de token y estados de error claros.
- Resolver automáticamente al entrar: reanudar sesión abierta existente o mostrar formulario de creación.
- Persistir identidad del cambiador en cookie `httpOnly` para reingresos en el mismo navegador.
- Permitir crear sesión por nombre con Enter o botón Aceptar y validación server-side (2-40 chars + trim).
- Bloquear explícitamente el caso de sesión previa cerrada para el mismo token (mostrar error, no crear ni reabrir).

**Non-Goals:**
- Implementar la experiencia completa de intercambio (oferta de cromos, matching, aceptación final).
- Introducir autenticación de cambiador (cuentas, login social, etc.).
- Cambiar el formato de token QR o el flujo de generación en `/admin`.

## Decisions

### 1) Ruta pública definitiva: `/cambio/[token]`
- **Decision:** usar App Router en `src/app/cambio/[token]/page.tsx`.
- **Rationale:** mantiene compatibilidad con QRs emitidos y evita migración de URLs.
- **Alternatives considered:**
  - `/public/cambio/[token]`: descartada por incompatibilidad con QR actual y fricción de transición.

### 2) Identidad de cambiador con cookie `httpOnly`
- **Decision:** generar/persistir `cambiadorId` en cookie `httpOnly` y usarlo en server para resolver sesión.
- **Rationale:** mejora robustez frente a manipulación cliente, permite SSR limpio y evita dependencia de JS para identidad básica.
- **Alternatives considered:**
  - `localStorage`: más simple pero menos confiable y no accesible en server sin puente cliente.
  - cookie legible por JS: innecesaria para este flujo y con peor postura de seguridad.

### 3) Resolución inicial en servidor
- **Decision:** al cargar la ruta, ejecutar en server la secuencia: validar token -> resolver `cambiadorId` -> buscar sesión por (`token`, `cambiadorId`) -> decidir UI/redirect.
- **Rationale:** reduce parpadeos de estado en cliente y centraliza reglas de negocio.
- **Alternatives considered:**
  - Resolver en cliente con fetch posterior: más estados intermedios y mayor complejidad de sincronización.

### 4) Política para sesión previa cerrada: error terminal del flujo
- **Decision:** si existe sesión cerrada para (`token`, `cambiadorId`), mostrar error y no crear ni reabrir.
- **Rationale:** refleja regla de negocio definida y evita ambiguedad de reapertura.
- **Alternatives considered:**
  - reabrir sesión cerrada: descartado por riesgo de inconsistencias de auditoría/estado.
  - crear nueva automáticamente: descartado porque ignora la existencia explícita de cierre previo.

### 5) Creación de sesión con validación server-side
- **Decision:** Server Action para crear sesión, con Zod (`trim`, min 2, max 40), control de submit único y retorno de errores recuperables.
- **Rationale:** mantiene paridad con convenciones del proyecto (Server Actions + validación en servidor) y minimiza duplicidad.
- **Alternatives considered:**
  - validación solo en cliente: insuficiente para garantizar integridad.

## Risks / Trade-offs

- **[Riesgo] Cookie bloqueada o limpiada por el navegador** -> **Mitigación:** regenerar `cambiadorId` y tratar como usuario nuevo; UX de formulario debe cubrir ese caso.
- **[Riesgo] Condición de carrera por doble submit** -> **Mitigación:** botón/input deshabilitados en pending + idempotencia server-side por (`token`, `cambiadorId`) cuando aplique.
- **[Trade-off] Error terminal para sesión cerrada puede frustrar al usuario** -> **Mitigación:** mensaje claro con CTA para reescanear un QR vigente o contactar al coleccionista.
- **[Riesgo] Ruta pública fuera de middleware auth** -> **Mitigación:** validación estricta de token y de operaciones permitidas; no exponer datos sensibles del admin.

## Migration Plan

1. Añadir nueva ruta `src/app/cambio/[token]/page.tsx` y sus componentes de estado (loading/error/form).
2. Extender capa de sesiones para buscar por (`token`, `cambiadorId`) y crear sesión con identidad persistente.
3. Implementar emisión/lectura de cookie `httpOnly` del cambiador en el flujo público.
4. Conectar Server Action de creación y navegación a sesión resultante.
5. Agregar tests de ruta pública y reglas de decisión (abierta, inexistente, cerrada, token inválido/revocado).
6. Desplegar sin migración destructiva; rollback consiste en revertir ruta/acciones nuevas y mantener QR sin entrada pública funcional.

## Open Questions

- Definir copy final de mensajes de error para: token inválido, token revocado y sesión cerrada.
- Confirmar si la sesión reanudada redirige a una subruta específica futura (por ejemplo `/cambio/[token]/sesion/[id]`) o si permanece en la misma pantalla con estado activo.
- Decidir política de expiración de la cookie `cambiadorId` (duración y renovación).
