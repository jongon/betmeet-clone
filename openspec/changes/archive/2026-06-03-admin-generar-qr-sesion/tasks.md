## 1. Dependencia y configuración

- [ ] 1.1 Instalar `qrcode` y `@types/qrcode` vía `pnpm add`
- [ ] 1.2 Añadir `NEXT_PUBLIC_APP_URL` a `.env.example`
- [ ] 1.3 Añadir `data/qr-tokens.json` a `.gitignore`

## 2. Types, schemas y seeds

- [ ] 2.1 Crear `src/lib/qr.ts` con tipos `Token`, `TokenStatus`, schema Zod `TokenSchema` y `TokensArraySchema`
- [ ] 2.2 Crear `data/qr-tokens.seed.json` con `[]`
- [ ] 2.3 Reemplazar `data/sessions.seed.json` con `[]` (start fresh)
- [ ] 2.4 Añadir `token: z.string().min(1)` al `SessionSchema` en `src/lib/sessions.ts`

## 3. Repositorio de tokens

- [ ] 3.1 Crear `src/lib/qr-store.ts` con funciones async `getActiveToken(email)`, `generateToken(email)`, `getToken(token)`, `revokeToken(token)` usando `node:fs/promises`
- [ ] 3.2 Implementar auto-seed desde `qr-tokens.seed.json` en el primer acceso
- [ ] 3.3 Validar el JSON leído con el schema Zod y lanzar error explícito si está corrupto
- [ ] 3.4 `generateToken` revoca el token activo previo del mismo email antes de crear el nuevo

## 4. Server Actions

- [ ] 4.1 Crear `src/app/admin/qr-actions.ts` con `'use server'` exportando `generateQr()` y `revokeQr(token)`
- [ ] 4.2 `generateQr` lee el email del admin desde Supabase, llama al repo, genera el data URL del QR con `QRCode.toDataURL`, y retorna `{ token, dataUrl, url, createdAt }` + `revalidatePath('/admin')`
- [ ] 4.3 `revokeQr` valida el token con Zod, llama al repo, y `revalidatePath('/admin')`

## 5. Componentes de cliente

- [ ] 5.1 Crear `src/components/admin/qr-dialog.tsx` (Client) reusable que renderiza el Dialog con: imagen QR 256px, input readonly con URL, botón "Copiar URL" (con `navigator.clipboard` + fallback), timestamp formateado, botón "Cerrar"
- [ ] 5.2 Crear `src/components/admin/generate-qr-button.tsx` (Client) que invoca `generateQr()` con `useTransition`, abre el `QrDialog` con el resultado
- [ ] 5.3 Crear `src/components/admin/view-session-qr-button.tsx` (Client) que abre el `QrDialog` con el token + createdAt de la sesi\u00f3n (lookup client-side vía prop)

## 6. Integración en /admin

- [ ] 6.1 Modificar `src/app/admin/page.tsx` para añadir el `<GenerateQrButton />` en el header (misma fila flex que título, badge, SignOutButton)
- [ ] 6.2 Modificar `src/components/admin/session-row.tsx` para añadir el `<ViewSessionQrButton />` cuando `status === "open" && token`

## 7. Verificación

- [ ] 7.1 Correr `pnpm lint` y resolver issues
- [ ] 7.2 Correr `pnpm build` y confirmar que el build pasa sin errores de TypeScript
- [ ] 7.3 Correr `pnpm biome check src/` y resolver issues de formato
- [ ] 7.4 QA manual: loguearse, ver botón "Generar QR", generar, copiar URL, ver el QR, ver el Dialog se cierra sin revocar; verificar que la lista de sesiones (vacía) muestra empty state correctamente
