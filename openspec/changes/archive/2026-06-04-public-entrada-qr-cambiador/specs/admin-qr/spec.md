## MODIFIED Requirements

### Requirement: Mostrar QR y URL en el Dialog
El sistema SHALL renderizar dentro del Dialog de "Generar QR" los siguientes elementos: (1) la imagen del QR en formato PNG de 256x256 px generada server-side vía `QRCode.toDataURL(url)`, (2) un input readonly con la URL completa en formato `{NEXT_PUBLIC_APP_URL}/cambio/{token}`, (3) un botón "Copiar URL" que invoca `navigator.clipboard.writeText(url)` con fallback a `document.execCommand("copy")` en contextos no seguros, (4) el timestamp de creación del token formateado con `Intl.DateTimeFormat("es", { dateStyle: "short", timeStyle: "short" })`, (5) un botón "Cerrar" que cierra el Dialog. La URL SHALL usar `process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"` como base y SHALL abrir un flujo público de resolución de sesión del cambiador que, al entrar, reanuda una sesión abierta existente o muestra formulario de nombre para crear sesión.

#### Scenario: Dialog muestra QR + URL tras generación
- **WHEN** `generateQr` retorna un token nuevo
- **THEN** el Dialog muestra: imagen QR de 256px, input readonly con la URL completa, botón "Copiar URL", timestamp formateado en es-ES, y botón "Cerrar"

#### Scenario: Copiar URL al portapapeles
- **WHEN** el admin hace clic en "Copiar URL" en el Dialog
- **THEN** la URL se copia al portapapeles del navegador (vía `navigator.clipboard.writeText` o fallback) y el botón muestra brevemente un estado de confirmación "Copiado"

#### Scenario: URL usa NEXT_PUBLIC_APP_URL
- **WHEN** `NEXT_PUBLIC_APP_URL=https://stickerstrade.com` está definida en el entorno
- **THEN** la URL del QR es `https://stickerstrade.com/cambio/{token}`

#### Scenario: Fallback cuando NEXT_PUBLIC_APP_URL no está definida
- **WHEN** la variable de entorno `NEXT_PUBLIC_APP_URL` no está definida
- **THEN** la URL del QR usa `http://localhost:3000/cambio/{token}` como fallback

#### Scenario: Cerrar el Dialog
- **WHEN** el admin hace clic en el botón "Cerrar" del Dialog
- **THEN** el Dialog se cierra, el token creado permanece activo (no se revoca por cerrar)

#### Scenario: Cambiador con sesión abierta entra por la URL del QR
- **WHEN** un cambiador abre `/cambio/{token}` con identidad previa y una sesión abierta para ese token
- **THEN** el flujo público lo reanuda automáticamente en su sesión abierta

#### Scenario: Cambiador sin sesión previa entra por la URL del QR
- **WHEN** un cambiador abre `/cambio/{token}` sin sesión previa para ese token
- **THEN** el flujo público muestra formulario para ingresar nombre y crear sesión

#### Scenario: Cambiador con sesión cerrada entra por la URL del QR
- **WHEN** un cambiador abre `/cambio/{token}` con una sesión previa cerrada para ese token
- **THEN** el flujo público muestra un error y no crea ni reabre sesión
