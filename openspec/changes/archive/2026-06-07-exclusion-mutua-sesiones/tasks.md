## 1. Admin → Changer: cerrar sesión admin en createCambioSessionAction

- [x] 1.1 Importar `createSupabaseServerClient` desde `@/lib/supabase/server` en `src/app/cambio/[token]/actions.ts`
- [x] 1.2 Agregar verificación de sesión admin activa después de validar token y nombre, antes del fork resume/create
- [x] 1.3 Si existe sesión admin, invocar `supabase.auth.signOut()` para cerrarla
- [x] 1.4 Verificar que casos de error (token inválido, revocado, sesión cerrada) NO cierran la sesión admin

## 2. Changer → Admin: limpiar cookies de cambiador en signIn

- [x] 2.1 Importar `cookies` desde `next/headers` en `src/app/admin/login/actions.ts`
- [x] 2.2 Importar `CAMBIADOR_COOKIE` desde `@/lib/cambiador-identity`
- [x] 2.3 Después de login exitoso, iterar `cookieStore.getAll()` y eliminar `cambiador_id` y `cambio_session_*` con `maxAge: 0`

## 3. Verificación

- [x] 3.1 Ejecutar `pnpm lint` y verificar que no hay errores
- [x] 3.2 Ejecutar `pnpm build` y verificar que compila correctamente
