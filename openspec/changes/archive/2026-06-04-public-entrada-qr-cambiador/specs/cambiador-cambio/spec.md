## ADDED Requirements

### Requirement: Entrada pública por token QR en /cambio/[token]
El sistema SHALL exponer la ruta pública `/cambio/[token]` para usuarios cambiadores sin autenticación admin. La ruta SHALL validar el formato del token con el patrón `^qr_[0-9a-f]{32}$` y consultar su estado en el repositorio de tokens antes de resolver o crear sesiones.

#### Scenario: Token válido y activo
- **WHEN** el cambiador navega a `/cambio/{token}` con un token válido y no revocado
- **THEN** la pantalla de entrada continúa con la resolución automática de sesión

#### Scenario: Token con formato inválido
- **WHEN** el cambiador navega a `/cambio/{token}` y el token no cumple el formato esperado
- **THEN** el sistema muestra error de QR inválido y no permite crear ni reanudar sesión

#### Scenario: Token inexistente o revocado
- **WHEN** el cambiador navega a `/cambio/{token}` y el token no existe o está revocado
- **THEN** el sistema muestra error de QR expirado/no disponible y no permite continuar

### Requirement: Resolución automática al entrar por QR
Al cargar `/cambio/[token]`, el sistema SHALL ejecutar automáticamente una resolución inicial para el cambiador actual y ese token con dos únicos resultados: (a) reanudar una sesión abierta existente o (b) mostrar formulario de nombre para crear sesión.

#### Scenario: Existe sesión abierta previa para el cambiador y token
- **WHEN** el sistema encuentra una sesión abierta asociada al mismo cambiador y al mismo token
- **THEN** entra directamente a esa sesión sin mostrar el formulario de nombre

#### Scenario: No existe sesión previa para el cambiador y token
- **WHEN** el sistema no encuentra una sesión asociada al cambiador y al token
- **THEN** muestra el formulario para crear sesión solicitando nombre

#### Scenario: Existe sesión previa cerrada para el cambiador y token
- **WHEN** el sistema encuentra una sesión cerrada asociada al cambiador y al token
- **THEN** muestra un estado de error y no crea ni reabre sesión

### Requirement: Creación de sesión desde formulario de nombre
Si no existe sesión previa abierta, el sistema SHALL mostrar un formulario con campo `nombre` y acción principal `Aceptar`. El formulario SHALL permitir envío por tecla Enter y por click en el botón Aceptar. Al enviar un nombre válido, el sistema SHALL crear una sesión abierta asociada al token y entrar inmediatamente a la sesión creada.

#### Scenario: Creación con Enter
- **WHEN** el cambiador escribe un nombre válido y presiona Enter
- **THEN** el sistema crea la sesión abierta y entra a la sesión creada

#### Scenario: Creación con botón Aceptar
- **WHEN** el cambiador escribe un nombre válido y hace click en Aceptar
- **THEN** el sistema crea la sesión abierta y entra a la sesión creada

### Requirement: Validación de nombre del cambiador
El sistema SHALL validar en servidor el campo `nombre` con las reglas: requerido, `trim`, longitud mínima 2 y máxima 40 caracteres. Si la validación falla, SHALL mostrar error en formulario y SHALL no crear sesión.

#### Scenario: Nombre vacío o solo espacios
- **WHEN** el cambiador envía el formulario con nombre vacío o solo espacios
- **THEN** el sistema muestra error de validación y no crea sesión

#### Scenario: Nombre válido con espacios laterales
- **WHEN** el cambiador envía `"  Carlos  "`
- **THEN** el sistema normaliza a `"Carlos"` y crea sesión correctamente

### Requirement: Identidad persistente del cambiador con cookie httpOnly
El sistema SHALL persistir una identidad estable del cambiador mediante cookie `httpOnly` para permitir reconocimiento en visitas futuras al mismo navegador. Esa identidad SHALL usarse para la resolución automática de sesión por token en `/cambio/[token]`.

#### Scenario: Reingreso en el mismo navegador
- **WHEN** el cambiador vuelve a abrir `/cambio/{token}` en el mismo navegador
- **THEN** el sistema usa la identidad persistida para buscar y reanudar su sesión abierta si existe

### Requirement: Estados de carga y manejo de errores transitorios
Durante la resolución inicial y la creación de sesión, el sistema SHALL mostrar estado de carga y bloquear envíos duplicados. Ante errores transitorios de red o servidor, SHALL mostrar mensaje de error y permitir reintento sin perder el nombre escrito.

#### Scenario: Doble envío rápido del formulario
- **WHEN** el cambiador pulsa Enter varias veces mientras la creación está en curso
- **THEN** el sistema procesa un único intento de creación

#### Scenario: Error temporal al crear sesión
- **WHEN** ocurre un error transitorio durante la creación de sesión
- **THEN** la UI muestra error recuperable y permite reintentar conservando el valor del nombre
