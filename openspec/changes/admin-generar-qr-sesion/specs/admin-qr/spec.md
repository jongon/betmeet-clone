## ADDED Requirements

### Requirement: Botón "Generar QR" en /admin
El sistema SHALL renderizar en la cabecera de `/admin` un botón con la etiqueta "Generar QR" y un icono representativo (por ejemplo `QrCode` de lucide-react), posicionado en la misma fila flex que el título "Sesiones de cambio" y el botón "Cerrar sesión". Al hacer clic, el botón SHALL invocar la Server Action `generateQr` que crea un token único nuevo para el admin autenticado y abre un `Dialog` mostrando el QR y la URL. Mientras la Server Action está en curso, el botón SHALL estar deshabilitado y mostrar un estado pendiente.

#### Scenario: Admin hace clic en "Generar QR"
- **WHEN** el admin autenticado hace clic en el botón "Generar QR" en `/admin`
- **THEN** la Server Action `generateQr` se invoca, un nuevo token se crea, y un Dialog se abre mostrando el QR (imagen PNG 256px) y la URL completa

#### Scenario: Botón deshabilitado durante la generación
- **WHEN** la Server Action `generateQr` está en curso
- **THEN** el botón "Generar QR" está deshabilitado y muestra un indicador de carga

### Requirement: Token único con prefijo qr_
El sistema SHALL generar cada token con el formato `qr_` seguido de 32 caracteres hexadecimales (16 bytes aleatorios) producidos con `crypto.randomBytes(16).toString("hex")`. El token SHALL ser único a través de toda la historia del sistema (no se reutilizan tokens revocados ni IDs anteriores).

#### Scenario: Formato del token generado
- **WHEN** la Server Action `generateQr` crea un token nuevo
- **THEN** el token tiene el formato `qr_` + exactamente 32 caracteres hexadecimales en minúsculas (regex: `^qr_[0-9a-f]{32}$`)

#### Scenario: Entropía del token
- **WHEN** se generan 1000 tokens consecutivos con la Server Action `generateQr`
- **THEN** los 1000 tokens son únicos entre sí (ningún duplicado)

### Requirement: Solo un token activo por admin
El sistema SHALL garantizar que en cualquier momento existe a lo sumo un token sin `revokedAt` para un mismo admin (identificado por `ownerEmail`). Cuando `generateQr` crea un nuevo token, SHALL marcar como `revokedAt = <timestamp actual>` cualquier token previo del mismo admin que esté sin revocar.

#### Scenario: Generar QR cuando ya hay un token activo
- **WHEN** el admin tiene un token activo (sin `revokedAt`) y hace clic en "Generar QR"
- **THEN** el token anterior queda con `revokedAt` igual al timestamp de la nueva generación, y el nuevo token es el único activo

#### Scenario: Generar QR cuando no hay tokens activos
- **WHEN** el admin nunca ha generado un QR (o todos los anteriores están revocados) y hace clic en "Generar QR"
- **THEN** se crea un único token activo con `revokedAt = null` y los demás campos poblados

### Requirement: Mostrar QR y URL en el Dialog
El sistema SHALL renderizar dentro del Dialog de "Generar QR" los siguientes elementos: (1) la imagen del QR en formato PNG de 256x256 px generada server-side vía `QRCode.toDataURL(url)`, (2) un input readonly con la URL completa en formato `{NEXT_PUBLIC_APP_URL}/cambio/{token}`, (3) un botón "Copiar URL" que invoca `navigator.clipboard.writeText(url)` con fallback a `document.execCommand("copy")` en contextos no seguros, (4) el timestamp de creación del token formateado con `Intl.DateTimeFormat("es", { dateStyle: "short", timeStyle: "short" })`, (5) un botón "Cerrar" que cierra el Dialog. La URL SHALL usar `process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"` como base.

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

### Requirement: Sesión abierta con token muestra botón "Ver QR"
El sistema SHALL renderizar en cada fila de `/admin` correspondiente a una sesión con `status: "open"` y `token` no vacío, un tercer botón con icono de ojo (`Eye` de lucide-react) y `aria-label="Ver QR de {cambiadorName}"`. Al hacer clic, SHALL abrir el mismo `QrDialog` mostrando el QR original (mismo token, misma URL) usado para crear esa sesión. El botón "Ver QR" SHALL NO aparecer en filas con `status: "closed"` ni en filas sin token (sesiones legacy del seed inicial).

#### Scenario: Sesión abierta con token muestra "Ver QR"
- **WHEN** la lista incluye una sesión con `status: "open"` y `token` no vacío
- **THEN** la fila renderiza los botones ✓, ✗, y un tercer botón con icono de ojo etiquetado "Ver QR de {nombre}"

#### Scenario: Click en "Ver QR" abre el Dialog con la URL histórica
- **WHEN** el admin hace clic en el botón "Ver QR" de una sesión abierta
- **THEN** el Dialog se abre mostrando el QR, la URL completa `{NEXT_PUBLIC_APP_URL}/cambio/{token}` y el timestamp ORIGINAL de creación de ese token (no el de la sesi\u00f3n)

#### Scenario: Sesión cerrada no muestra "Ver QR"
- **WHEN** la lista incluye una sesión con `status: "closed"`
- **THEN** la fila solo muestra el badge "Cerrada" y no muestra los botones ✓, ✗, ni "Ver QR"

#### Scenario: Sesión sin token no muestra "Ver QR"
- **WHEN** la lista incluye una sesión con `token` vacío o ausente
- **THEN** la fila no muestra el botón "Ver QR" (aunque la sesión esté abierta)

### Requirement: Persistencia swappable en JSON file
El sistema SHALL exponer un módulo `src/lib/qr-store.ts` que provea funciones asíncronas: `getActiveToken(ownerEmail)`, `generateToken(ownerEmail)`, `getToken(token)`, `revokeToken(token)`. El módulo SHALL usar internamente un archivo JSON (`data/qr-tokens.json`, gitignored) como backing store. Si el archivo no existe en el primer acceso, el sistema SHALL inicializarlo copiando desde `data/qr-tokens.seed.json` (commited al repo, contenido `[]`). La forma de los datos SHALL validarse con Zod al leer. Las funciones SHALL ser la única vía de acceso a los datos desde la UI y Server Actions; ningún componente SHALL leer el archivo directamente.

#### Scenario: Primera lectura siembra el archivo
- **WHEN** la app arranca y `data/qr-tokens.json` no existe
- **THEN** la primera llamada al repositorio copia `data/qr-tokens.seed.json` a `data/qr-tokens.json` y lo retorna (lista vacía en este caso)

#### Scenario: Lecturas posteriores leen el archivo existente
- **WHEN** `data/qr-tokens.json` ya existe
- **THEN** el repositorio lee su contenido sin sobrescribirlo

#### Scenario: Generate modifica el archivo
- **WHEN** el admin genera un QR
- **THEN** `generateToken(email)` añade el nuevo token a `data/qr-tokens.json` y revoca cualquier token activo previo del mismo email (escribe `revokedAt`)

#### Scenario: Archivo corrupto
- **WHEN** `data/qr-tokens.json` contiene JSON inválido o datos que no pasan el schema Zod
- **THEN** el repositorio lanza un error explícito en lugar de retornar datos parciales o silenciar el fallo

### Requirement: Server Actions generateQr y revokeQr
El sistema SHALL exponer dos Server Actions en `src/app/admin/qr-actions.ts` (con `'use server'`): `generateQr()` y `revokeQr(token)`. `generateQr()` SHALL leer el email del admin desde la sesión de Supabase, llamar al repositorio, retornar `{ token, dataUrl, url, createdAt }`, y SHALL llamar a `revalidatePath('/admin')` para refrescar la vista. `revokeQr(token)` SHALL llamar al repositorio y a `revalidatePath('/admin')`. Las acciones SHALL validar inputs con Zod donde aplique.

#### Scenario: generateQr exitosa
- **WHEN** el admin autenticado invoca `generateQr()`
- **THEN** la acción crea el token, genera el data URL del QR, lo retorna al cliente, y la página `/admin` se re-valida

#### Scenario: generateQr sin sesión
- **WHEN** `generateQr()` se invoca sin un usuario autenticado en Supabase
- **THEN** la acción retorna un error (no escribe al repositorio) y no abre el Dialog

#### Scenario: revokeQr exitosa
- **WHEN** el admin invoca `revokeQr("qr_abc...")` con un token activo existente
- **THEN** el token queda con `revokedAt = <timestamp>` y `/admin` se re-valida

#### Scenario: revokeQr sobre token inexistente
- **WHEN** el admin invoca `revokeQr("qr_inexistente")`
- **THEN** la acción no hace nada (no falla) y la página se re-valida igual

### Requirement: NEXT_PUBLIC_APP_URL configurable
El sistema SHALL leer la variable de entorno `NEXT_PUBLIC_APP_URL` para construir la URL que se codifica en el QR. El sistema SHALL añadir `NEXT_PUBLIC_APP_URL` a `.env.example` con un placeholder o un valor de ejemplo. Si la variable no está definida en runtime, el sistema SHALL usar `http://localhost:3000` como fallback. El archivo `.env` real SHALL permanecer en `.gitignore` (ya cubierto por la spec `admin-auth`).

#### Scenario: Variable definida en producción
- **WHEN** `NEXT_PUBLIC_APP_URL=https://stickerstrade.com` está definida
- **THEN** todos los QRs generados codifican URLs que comienzan con `https://stickerstrade.com/cambio/`

#### Scenario: Variable no definida
- **WHEN** la variable `NEXT_PUBLIC_APP_URL` no está definida
- **THEN** los QRs generados codifican URLs que comienzan con `http://localhost:3000/cambio/` y se loguea una advertencia en consola del servidor
