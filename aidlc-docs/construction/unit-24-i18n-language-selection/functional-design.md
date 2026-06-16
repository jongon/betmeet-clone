# Unit 24 — Internacionalización y selector de idioma

> Refine post-construcción (2026-06-15). Aditivo y transversal; no reinicia Units
> 1–23. Resuelve la mezcla actual de copy en español/inglés y activa soporte
> bilingüe `es`/`en` sin cambiar las URLs existentes.

## 1. Trazabilidad

| Artefacto | Referencia |
|---|---|
| Requisito | `FR-I18N-24.1` … `FR-I18N-24.9` |
| Historias | `US-23.1` … `US-23.4` |
| Dependencias | Unit 2 i18n (`BR-2.28`, `BR-2.29`), Unit 11 `UserMenu`, Unit 12/15 Perfil, Content Collections MDX |
| Decisión transversal | `CF-11` — i18n bilingüe sin prefijo de locale |
| No reinicia | Units 1–23 aprobadas/verificadas permanecen intactas |

## 2. Decisiones aprobadas

| Tema | Decisión |
|---|---|
| Idiomas | `es` default + `en` opcional |
| Routing | Sin prefijo `[locale]`; no `/es/*` ni `/en/*` |
| Persistencia | Cookie `locale` + `profiles.locale` |
| Selector | `UserMenu` + `Settings/Profile` |
| MDX | Traducir Centro de Reglas a `content/rules/en/*.mdx` |
| Préstamos | Mantener `email`, `passkey`, `nickname`, `Google`, `WebAuthn`, `TOTP`, `push`/`web push` |
| Glosario español | Mantener CF-5: `Pool` visible = Liga; `Pick` = Predicción; `Kickoff` = Inicio del partido; `Invite` = Invitación; `Ranking` permitido |

## 3. Estado actual / causa raíz

La infraestructura i18n fue creada en Unit 2 como Opción A: diccionario tipado sin
prefijo de locale en URL. Sin embargo, solo existe `es` y múltiples units posteriores
introdujeron copy hardcoded en componentes, Server Actions, páginas, metadata y
contenido.

Hallazgo de alcance:
- Auth, onboarding y settings tienen muchas cadenas en inglés hardcoded.
- Pools, predictions, admin, competition y notifications tienen muchas cadenas en
  español hardcoded.
- `getDictionary()` existe, pero el patrón dominante es importar `es` directamente.
- El Centro de Reglas tiene MDX en español (`content/rules/es/*.mdx`) y debe tener
  equivalentes en inglés.

## 4. Contrato funcional

### 4.1 Locale activo

Orden de resolución recomendado:
1. Cookie `locale`, si existe y es `es | en`.
2. `profiles.locale`, si hay sesión y el perfil tiene valor válido.
3. `Accept-Language`, solo como fallback inicial para usuarios sin preferencia.
4. `DEFAULT_LOCALE = "es"`.

La preferencia explícita del usuario siempre domina `Accept-Language`.

### 4.2 Persistencia

Modelo:

```text
profiles.locale String @default("es")
```

Restricciones:
- Valores válidos: `es`, `en`.
- Default: `es`.
- La migración debe backfillear perfiles existentes con `es`.
- La validación server-side debe rechazar valores fuera de `SUPPORTED_LOCALES`.

### 4.3 Selector de idioma

Componentes:
- `LanguageToggle` o equivalente compartido.
- Montaje en `UserMenu` para acceso rápido.
- Sección `Idioma` / `Language` en `Settings/Profile`.

Comportamiento:
- Cambiar idioma llama a una Server Action (`setLocale` o equivalente).
- La action escribe cookie `locale` y, si hay sesión, `profiles.locale`.
- La UI refresca la ruta actual sin redirect a otra URL.
- El selector tiene label accesible y estado seleccionado.

### 4.4 Diccionarios

Archivos:

```text
src/i18n/
├── config.ts              # SUPPORTED_LOCALES = ["es", "en"]
├── get-dictionary.ts      # resuelve por Locale
├── types.ts               # Dictionary = typeof es
└── dictionaries/
    ├── es.ts              # fuente de forma/tipo
    └── en.ts              # satisface la misma forma
```

Secciones mínimas del diccionario:
- `common`, `theme`, `brand`, `language`, `nav`, `userMenu`.
- `auth`: sign-in, sign-up, forgot/reset password, verify email, Google, passkey,
  MFA, delete account, link errors, change email.
- `profile` / `settings`: perfil, avatar, nickname, seguridad, idioma.
- `onboarding`: steps de nickname, avatar, reglas, passkey y progreso.
- `landing`, `rules`, `scoring`, `calculator`, `breakdown`, `cues`.
- `pools`: create, directory, invite/share, join, member list, actions, cards.
- `predictions`: form, status, eligibility, result comparison, penalty selector.
- `competition`: match card, status badges, team placeholders, fixture stale banner.
- `rankings`: global/pool leaderboard labels y empty states.
- `notifications`: preferences, browser support, device list, errors.
- `admin`: dashboard, sync, force result, revert override, tables.
- `pages`: headings/metadata de `matches`, `rankings`, `pools`, `admin`, `auth`.

Regla: no introducir nuevos strings de cara al usuario fuera del diccionario, salvo
datos dinámicos de dominio (nombres de equipos, nombres de ligas, emails de usuario,
timestamps) y acrónimos/términos técnicos aprobados.

### 4.5 Patrón Server/Client Components

Patrón recomendado:
- Server Components resuelven `locale` y `dictionary`.
- Client Components reciben solo la rama necesaria del diccionario como prop, o usan
  un `DictionaryProvider` si reduce prop drilling sin añadir complejidad excesiva.
- Evitar importar `es` directamente en componentes; eso impediría el cambio runtime.
- Server Actions que devuelven mensajes de dominio deben recibir/resolver `locale`
  y usar mensajes localizados cuando el error es visible al usuario.

### 4.6 MDX Rules Center

Estructura:

```text
content/rules/
├── es/
│   ├── scoring.mdx
│   ├── penalties.mdx
│   ├── match-locks.mdx
│   ├── ties.mdx
│   ├── pools.mdx
│   └── scoring-teaser.mdx
└── en/
    ├── scoring.mdx
    ├── penalties.mdx
    ├── match-locks.mdx
    ├── ties.mdx
    ├── pools.mdx
    └── scoring-teaser.mdx
```

Reglas:
- Mantener frontmatter compatible entre idiomas (`audience`, `section`, `order`,
  `title`).
- El loader de reglas filtra por locale activo.
- `/rules` no cambia de path; renderiza contenido según locale.
- El build de content-collections debe validar ambos idiomas.

## 5. Pantallas y estados afectados

| Área | Cambio esperado |
|---|---|
| Landing / Auth | Títulos, forms, botones OAuth/passkey, MFA y errores en idioma activo |
| Onboarding | Pasos nickname/avatar/rules/passkey localizados |
| App Shell | `LanguageToggle` en `UserMenu`; nav ya no importa `es` directo |
| Settings/Profile | Sección de idioma persistente + copy de perfil localizable |
| Pools | Formularios, tarjetas, invitaciones, acciones y directorio localizados |
| Predictions / Matches | Estados, elegibilidad, labels, `aria-label` y resultados localizados |
| Rules Center | UI + MDX en español/inglés |
| Rankings | Ranking global y por liga localizados |
| Notifications | Preferencias y dispositivos localizados |
| Admin | Panel, sync, override, tablas y empty states localizados |

## 6. NFR, seguridad e infraestructura

- **Accesibilidad**: el selector de idioma debe tener `aria-label`, foco visible y
  estado actual. Los `aria-label` existentes se localizan.
- **Seguridad**: `locale` es input no confiable; validar contra `SUPPORTED_LOCALES` en
  cookie, action y escritura a BD. No interpolar locale en rutas de archivo sin whitelist.
- **Privacidad**: guardar `profiles.locale` no es dato sensible; no requiere cifrado.
- **Performance**: no añadir round-trips por render. Resolver cookie en SSR; usar el
  perfil ya cargado por layout cuando sea posible. Evitar cargar ambos diccionarios en
  cliente si no hace falta.
- **SEO**: sin hreflang/rutas por idioma en Unit 24. Reabrir si se adopta `[locale]`.

## 7. Plan de archivos (implementación futura)

| Archivo / área | Acción |
|---|---|
| `prisma/schema.prisma` + migración | add `profiles.locale` default `es` |
| `src/i18n/config.ts` | `SUPPORTED_LOCALES=["es","en"]`, helpers de validación |
| `src/i18n/dictionaries/en.ts` | nuevo diccionario completo |
| `src/i18n/dictionaries/es.ts` | completar secciones faltantes y homologar copy |
| `src/i18n/get-dictionary.ts` | resolver `es/en` |
| `src/lib/locale.ts` | helpers cookie/perfil/header |
| `src/features/profile/actions/set-locale.ts` | action de cambio de idioma |
| `src/components/language/language-toggle.tsx` | selector compartido |
| `src/components/layout/user-menu.tsx` | integrar selector |
| `src/features/profile/components/account-settings.tsx` | sección de idioma |
| `src/lib/rules-content.ts` | filtrar MDX por locale |
| `content/rules/en/*.mdx` | traducción de reglas |
| `src/app/**`, `src/features/**`, `src/components/**` | reemplazar hardcoded copy por diccionario |

## 8. Verificación esperada

- TypeScript: `en.ts` satisface la misma forma que `es.ts`.
- Biome/ESLint limpios.
- Tests unitarios para `isSupportedLocale`, resolución cookie/perfil/fallback y action
  `setLocale`.
- Tests de componentes mínimos: selector marca opción activa y llama la action.
- Content Collections build OK con `es` y `en`.
- Smoke manual/Playwright recomendado: `/`, `/sign-in`, `/matches`, `/pools`,
  `/rules`, `/settings/profile`, `/admin` en `es` y `en`.

## 9. Fuera de alcance

- Migrar a URL routing `[locale]`.
- SEO bilingüe avanzado (`hreflang`, sitemap por locale).
- Traducir emails transaccionales hospedados en Supabase de forma dinámica por locale;
  puede tratarse como una unidad posterior si se requiere email bilingüe por usuario.
- Traducción de datos externos del proveedor (football-data.org) si solo entrega nombres en
  un idioma; Unit 24 se limita a copy de UI/contenido propio.
