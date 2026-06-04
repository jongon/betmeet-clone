## 1. Ruta pública y resolución inicial

- [x] 1.1 Crear `src/app/cambio/[token]/page.tsx` como entrada pública del cambiador
- [x] 1.2 Validar token `qr_*` en servidor y resolver errores de token inválido/revocado/inexistente
- [x] 1.3 Implementar resolución automática por (`token`, `cambiadorId`) para decidir reanudar sesión o mostrar formulario
- [x] 1.4 Implementar estado explícito de error cuando existe sesión previa cerrada para el mismo (`token`, `cambiadorId`)

## 2. Identidad de cambiador y persistencia de sesión

- [x] 2.1 Implementar emisión/lectura de cookie `httpOnly` para `cambiadorId` en flujo público
- [x] 2.2 Extender repositorio de sesiones con lookup por (`token`, `cambiadorId`) y soporte de reutilización de sesión abierta
- [x] 2.3 Agregar regla de negocio para no reabrir ni recrear sesión cuando existe una sesión cerrada para (`token`, `cambiadorId`)

## 3. Formulario de creación de sesión

- [x] 3.1 Crear formulario de nombre con envío por Enter y botón Aceptar
- [x] 3.2 Implementar Server Action para crear sesión con validación Zod (`trim`, min 2, max 40)
- [x] 3.3 Mostrar errores de validación en UI sin perder el valor ingresado
- [x] 3.4 Bloquear submit duplicado mientras la creación está en curso

## 4. Integración con specs existentes

- [x] 4.1 Alinear copy y comportamiento de `/cambio/[token]` con delta `admin-qr`
- [x] 4.2 Verificar que los QR generados en `/admin` sigan resolviendo al nuevo flujo sin cambios de formato

## 5. Verificación

- [x] 5.1 Cubrir escenarios clave con tests (token inválido/revocado, sesión abierta, sin sesión, sesión cerrada)
- [x] 5.2 Correr `pnpm lint`
- [x] 5.3 Correr `pnpm build`
