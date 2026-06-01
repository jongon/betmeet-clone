## ADDED Requirements

### Requirement: Theme tokens con identidad del Mundial 2026
El design system SHALL definir un conjunto de tokens semánticos de color mapeados a las variables de shadcn/ui en `src/app/globals.css`, usando la paleta oficial del aplicativo: azul FIFA `#1A3C5E` como `--primary`, rojo de marca `#E63946` como token dedicado `--brand` (`--accent` se reserva como superficie sutil para hovers de menús), crema `#F5F5F0` como `--background` en light mode, y un rojo de error `#DC2626` como `--destructive` (separado del rojo de marca). Los tokens MUST expresarse en oklch y cubrir todas las variables requeridas por shadcn (`--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring` y sus `*-foreground`).

#### Scenario: Tokens disponibles en light mode
- **WHEN** la aplicación se renderiza con el tema claro
- **THEN** `--background` resuelve al crema de marca, `--primary` al azul FIFA, y todos los componentes shadcn consumen estos tokens sin colores hardcodeados

#### Scenario: Contraste accesible
- **WHEN** se coloca texto `*-foreground` sobre su superficie correspondiente (p. ej. `primary-foreground` sobre `primary`)
- **THEN** el par de colores cumple un contraste mínimo AA (≥ 4.5:1 para texto normal)

### Requirement: Soporte de light y dark mode con toggle
El design system SHALL soportar light y dark mode mediante `next-themes` con estrategia basada en clase (`.dark`). El layout raíz MUST envolver la app en un `ThemeProvider` con `attribute="class"`, `defaultTheme="system"` y `suppressHydrationWarning` en `<html>`. SHALL existir un componente `ThemeToggle` que permita alternar entre claro, oscuro y sistema sin recargar la página y sin parpadeo (flash) en la carga inicial.

#### Scenario: Alternar tema
- **WHEN** el usuario activa el `ThemeToggle` para cambiar a dark mode
- **THEN** la clase `dark` se aplica al elemento `<html>` y todos los tokens cambian a sus valores de dark mode de forma inmediata

#### Scenario: Preferencia del sistema por defecto
- **WHEN** un usuario nuevo abre la app sin preferencia guardada
- **THEN** el tema sigue la preferencia del sistema operativo

#### Scenario: Sin flash en la carga
- **WHEN** se recarga una página con dark mode seleccionado
- **THEN** la página se pinta directamente en dark sin un destello previo de light mode

### Requirement: Identidad tipográfica geométrica
El design system SHALL definir una pareja tipográfica de dirección geométrica moderna: **Sora** para titulares y **Inter** para cuerpo, cargadas con `next/font/google` y expuestas como variables CSS (`--font-display`, `--font-sans`) mapeadas en el `@theme` de Tailwind. La escala tipográfica y el espaciado MUST aplicarse de forma consistente en los componentes.

#### Scenario: Fuentes aplicadas
- **WHEN** se renderiza un titular y un párrafo de cuerpo
- **THEN** el titular usa la fuente display y el cuerpo usa Inter, ambas vía variables de tema

### Requirement: Librería de componentes base shadcn/ui
El design system SHALL inicializar shadcn/ui sobre Tailwind v4 y proveer el helper `cn` en `src/lib/utils.ts`. MUST instalarse un set base de componentes que cubra los usos del aplicativo: button, card, input, label, badge, tabs, dialog, dropdown-menu, switch, separator, avatar, tooltip y sonner. Todos los componentes MUST consumir los tokens semánticos del tema (no colores literales).

#### Scenario: Componente respeta el tema
- **WHEN** se renderiza un `Button` variante `default` en light y luego en dark
- **THEN** su color de fondo deriva de `--primary` en ambos temas, cambiando con el modo activo

### Requirement: Página de revisión visual /design-system
El design system SHALL incluir una ruta `/design-system` (App Router, `src/app/design-system/page.tsx`) que renderice, para revisión visual: la paleta de colores con sus tokens, la escala tipográfica, y cada componente base en sus variantes y estados principales. La página MUST incluir el `ThemeToggle` para revisar light y dark mode en vivo.

#### Scenario: Revisión de componentes
- **WHEN** un revisor navega a `/design-system`
- **THEN** ve todos los componentes base renderizados con sus variantes, la paleta y la tipografía

#### Scenario: Revisión de ambos temas
- **WHEN** el revisor usa el `ThemeToggle` en `/design-system`
- **THEN** toda la página conmuta entre light y dark mode mostrando los tokens en cada modo
