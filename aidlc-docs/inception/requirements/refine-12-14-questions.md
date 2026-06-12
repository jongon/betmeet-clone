# Refine Units 12-14 — Preguntas de Aclaración de Requerimientos

Responde cada pregunta escribiendo la letra elegida después de la etiqueta `[Answer]:`. Si ninguna de las opciones aplica, elige `X) Otra` y describe tu preferencia después de `[Answer]:`.

## Pregunta 1
¿Dónde debería poder el usuario reenviar la confirmación de correo?

A) En `/verify-email`, con un campo de email para usuarios sin sesión iniciada
B) En `/verify-email`, solo para el email usado en el último intento de registro
C) En `/verify-email` y en `/sign-in`, con un campo de email
X) Otra (describe tu preferencia después de `[Answer]:` abajo)

[Answer]: Quiero que cuando el usuario inicie sesión con su correo no confirmado ahí mismo le pida cambiar su correo o reenviar el correo de confirmación. Considera que tienes que cambiar el correo del usuarios cuando eso ocurra

## Pregunta 2
¿Cómo debería protegerse el reenvío de correo de confirmación contra abuso?

A) Cooldown simple del lado del servidor por email, por ejemplo un reenvío cada 60 segundos
B) Solo los límites por defecto de Supabase, sin cooldown adicional a nivel de app
C) Cooldown del lado del servidor más un mensaje de éxito genérico que no revele si el email existe
X) Otra (describe tu preferencia después de `[Answer]:` abajo)

[Answer]: A, Si escribe el mismo correo de antes envía el mensaje de confirmación igual.

## Pregunta 3
¿Debería el usuario poder cambiar su nickname después del onboarding?

A) Sí, cambios ilimitados desde los ajustes de Perfil
B) Sí, pero con límite de frecuencia o restringido para evitar abuso
C) No, el nickname queda solo en onboarding; Perfil debe explicarlo claramente
X) Otra (describe tu preferencia después de `[Answer]:` abajo)

[Answer]: B

## Pregunta 4
Cuando cambia un nickname, ¿cómo debería comportarse el discriminador?

A) Reasignar automáticamente un nuevo discriminador para la nueva base de nickname
B) Mantener el discriminador existente cuando sea posible, reasignar solo en caso de conflicto
C) Dejar que el usuario previsualice la disponibilidad antes de guardar
X) Otra (describe tu preferencia después de `[Answer]:` abajo)

[Answer]: A

## Pregunta 5
¿Dónde debería vivir el cambio de email en la UI?

A) Ajustes de Perfil, porque el email es parte de la identidad
B) Ajustes de Seguridad, porque cambiar el email es una operación de seguridad de la cuenta
C) Tanto Perfil como Seguridad pueden enlazar al mismo formulario de cambio de email
X) Otra (describe tu preferencia después de `[Answer]:` abajo)

[Answer]: A

## Pregunta 6
¿Qué debería pasar después de que un usuario sin autenticar abre un enlace de invitación e inicia sesión o se registra?

A) Unirse automáticamente a la liga justo después de autenticarse y redirigir a la página de la liga
B) Volver a la página de confirmación de invitación, y luego dejar que el usuario haga clic en unirse
C) Si se requiere onboarding, completarlo primero, luego unirse automáticamente y redirigir a la página de la liga
D) Si se requiere onboarding, completarlo primero, luego volver a la confirmación de invitación
X) Otra (describe tu preferencia después de `[Answer]:` abajo)

[Answer]: D

## Pregunta 7
Para los enlaces de invitación, ¿debería la app preservar el destino original a través de todos los métodos de autenticación?

A) Sí, login con email/contraseña, registro con email/contraseña, confirmación de email, Google OAuth y onboarding
B) Sí, pero solo login y Google OAuth; la confirmación de email puede aterrizar en `/matches`
C) No, el usuario puede volver manualmente al enlace de invitación después de autenticarse
X) Otra (describe tu preferencia después de `[Answer]:` abajo)

[Answer]: A

## Pregunta 8
¿Qué quisiste decir con invitar por nickname u otro método?

A) Invitar por nickname y por email
B) Invitar solo por nickname
C) Invitar solo por email
D) Mantener solo enlaces de invitación genéricos por ahora
X) Otra (describe tu preferencia después de `[Answer]:` abajo)

[Answer]: A

## Pregunta 9
¿Qué debería pasar cuando un usuario se une exitosamente a una liga pública?

A) Redirigir directamente a la página de esa liga
B) Permanecer en el directorio de ligas públicas y mostrar un mensaje de éxito
C) Abrir primero una pantalla de confirmación, luego redirigir tras unirse
X) Otra (describe tu preferencia después de `[Answer]:` abajo)

[Answer]: A

## Pregunta 10
¿Qué debería pasar si un usuario intenta unirse a una liga pública a la que ya pertenece?

A) Redirigir a la página de la liga existente en lugar de mostrar un error
B) Mostrar un mensaje informativo y permanecer en el directorio
C) Deshabilitar u ocultar la acción de unirse para ligas donde el usuario ya es miembro
X) Otra (describe tu preferencia después de `[Answer]:` abajo)

[Answer]: B

## Pregunta 11
¿Quién debería aparecer en el ranking global?

A) Todos los usuarios verificados con al menos una predicción puntuada
B) Todos los usuarios que pertenezcan a al menos una liga y tengan puntos
C) Todos los usuarios verificados, incluidos los que tienen cero puntos
D) Solo los usuarios que opten explícitamente por aparecer en el ranking global
X) Otra (describe tu preferencia después de `[Answer]:` abajo)

[Answer]: A

## Pregunta 12
¿Dónde debería ser visible el ranking global?

A) Una nueva ruta `/rankings` enlazada desde el header autenticado
B) Una pestaña bajo `/pools`, más un enlace en el header
C) Solo desde el menú de usuario del header
X) Otra (describe tu preferencia después de `[Answer]:` abajo)

[Answer]: A

## Pregunta 13
Para la calculadora de Reglas, ¿qué entrada de penales debería añadirse?

A) Selectores separados de ganador de penales previsto y ganador de penales real
B) Entradas del marcador de la tanda de penales, por ejemplo 4-3, más ganador
C) Solo selector de ganador de penales real; el ganador previsto se mantiene como el selector actual
X) Otra (describe tu preferencia después de `[Answer]:` abajo)

[Answer]: B, y recuerda que para que pueda poner los resultados de los penalties el partido tiene que estar empatado en los 90 minutos

## Pregunta 14
¿Cómo deberían manejarse los avatares por defecto si la semilla/almacenamiento de avatares falta o no está disponible?

A) Mostrar un estado vacío con una instrucción para admin/dev de ejecutar `seed-avatars`
B) Recurrir a avatares placeholder locales empaquetados en la app
C) Mantener el comportamiento actual, pero mejorar solo los diagnósticos
X) Otra (describe tu preferencia después de `[Answer]:` abajo)

[Answer]: B

## Pregunta 15
¿Dónde deberían aparecer iniciar sesión y crear cuenta en la landing page pública?

A) Un header superior de landing con `Iniciar sesión` y `Crear cuenta`
B) Solo `Iniciar sesión` arriba a la derecha, con `Crear cuenta` como CTA del hero
C) Un header público completo con el mismo estilo del header de la app autenticada
X) Otra (describe tu preferencia después de `[Answer]:` abajo)

[Answer]: A

## Pregunta 16
Cuando un usuario recién registrado todavía no tiene nickname, ¿qué destino debería ganar?

A) Siempre onboarding primero; tras el onboarding, continuar al destino original solicitado si lo hay
B) Destino original solicitado primero; pedir el onboarding después
C) Onboarding solo para usuarios de email/contraseña; los de Google van directo a la app
X) Otra (describe tu preferencia después de `[Answer]:` abajo)

[Answer]: A
