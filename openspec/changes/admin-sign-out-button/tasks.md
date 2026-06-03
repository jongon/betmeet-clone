## 1. Server Action de sign-out

- [x] 1.1 Crear `src/app/admin/auth-actions.ts` con `'use server'` exportando `signOut()` que llama a `supabase.auth.signOut()` vía `createSupabaseServerClient()` y luego `redirect("/admin/login")`

## 2. Componente cliente

- [x] 2.1 Crear `src/components/admin/sign-out-button.tsx` (Client) con un `Button` shadcn, icono `LogOut` de lucide-react, y `useTransition` para deshabilitar el botón y mostrar "Cerrando…" mientras la action corre

## 3. Integración en /admin

- [x] 3.1 Modificar `src/app/admin/page.tsx` para reestructurar el `<header>`: un flex row con el grupo título+badge a la izquierda y `<SignOutButton />` a la derecha; debajo el email del usuario

## 4. Verificación

- [x] 4.1 Correr `pnpm lint` y resolver issues
- [x] 4.2 Correr `pnpm build` y confirmar que pasa sin errores de TypeScript
- [x] 4.3 Correr `pnpm check` (biome) y resolver issues de formato
- [x] 4.4 QA manual: loguearse, ver el botón, hacer clic, confirmar que la sesión se cierra y se redirige a `/admin/login`
