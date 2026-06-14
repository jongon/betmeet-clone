# Unit 18 — Copy del CTA Principal del Landing · Functional Design

> Refine post-construccion (2026-06-14). **No reinicia** Units 1-17; ajusta copy de
> un flujo existente del landing. Cubre FR-REFINE-18.1 y la **Epica 17**.

## 1. Alcance y trazabilidad

| Historia | FR-REFINE | Naturaleza | Resultado |
|----------|-----------|------------|-----------|
| US-17.1 | 18.1 | copy landing | CTA principal dice "Entra a Jugar" |

## 2. Decision de diseno

El boton principal del landing que decia "Crea mi Liga" debe decir exactamente
**"Entra a Jugar"**. El cambio busca una accion mas amplia y directa: entrar a la
experiencia de juego, sin sugerir que el primer paso obligatorio sea crear una liga.

El destino y comportamiento del CTA no cambian. Si el usuario no tiene sesion, sigue
iniciando el flujo de registro/login definido por el landing. Si la sesion ya existe,
se conserva la logica session-aware de Unit 15.

## 3. Contratos modificados

| Elemento | Tipo | Cambio |
|----------|------|--------|
| `page.tsx` landing / i18n | mod | Copy del CTA principal: "Entra a Jugar" |
| `screen-contracts.md` | doc | Main CTA del landing actualizado |
| Unit 15 functional design | doc | Nota de dependencia del landing |

## 4. NFR / Infra

- Sin cambios de seguridad, performance, schema, migraciones, servicios ni rutas.
- Mantener accesibilidad existente del boton: texto visible, foco y contraste no se
  modifican por este refine.

## 5. Verificacion esperada

- Buscar que no queden referencias documentales vigentes a "Crea mi Liga" como CTA
  principal del landing.
- Validar que el copy final especificado sea "Entra a Jugar".

## 6. Epica 17 — Historias de usuario

- **US-17.1**: Como visitante quiero que el CTA principal del landing diga "Entra a
  Jugar", para entender que la accion me lleva a participar en la experiencia.
