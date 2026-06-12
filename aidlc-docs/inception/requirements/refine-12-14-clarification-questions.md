# Refine Units 12-14 — Preguntas de Aclaración

Detecté una ambigüedad que conviene resolver antes de actualizar los requerimientos.

## Ambigüedad 1: Cambiar el email de una cuenta sin confirmar
En la Pregunta 1 respondiste que cuando un usuario inicia sesión con un email no confirmado, la app debería permitirle reenviar la confirmación o cambiar su email. Como el usuario no está confirmado y puede no tener una sesión válida, existen varias opciones de implementación seguras.

## Pregunta 1
¿Cómo debería funcionar el cambio de email para una cuenta sin confirmar?

A) Pedir email actual, contraseña y nuevo email; verificar las credenciales con Supabase, luego actualizar el email del usuario de auth del lado del servidor usando una server action solo-admin y reenviar la confirmación al nuevo email
B) No actualizar el usuario de auth existente; dejar que el usuario reinicie el registro con un email distinto y mostrar una guía clara
C) Permitir el cambio de email solo después de que el usuario confirme el email original e inicie sesión
X) Otra (describe tu preferencia después de `[Answer]:` abajo)

[Answer]: A

## Pregunta 2
Si el email antiguo sin confirmar ya tiene estado de perfil/liga/invitación, ¿debería preservarse ese estado al cambiar de email?

A) Sí, preservar el mismo usuario de auth y perfil siempre que sea posible
B) No, las cuentas sin confirmar pueden abandonarse y reiniciarse con el nuevo email
C) Preservar solo la intención de retorno a la invitación, no el estado de perfil/liga
X) Otra (describe tu preferencia después de `[Answer]:` abajo)

[Answer]: A
