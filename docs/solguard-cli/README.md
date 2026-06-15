# Solguard CLI

`solguard-cli` es el cliente de escritorio de Solguard. Hoy su alcance es deliberadamente pequeño: funciona como una consola visual construida con React y Tauri que envía comandos al `solguard-backend` y muestra la respuesta dentro de una interfaz local tipo terminal.

## Papel dentro del stack

El CLI no audita protocolos por sí mismo, no parsea reportes, no consulta SQLite directamente y no se comunica con Ollama. Toda la lógica real vive fuera del cliente. Su responsabilidad es actuar como capa de interacción para el usuario, manteniendo una experiencia simple sobre la API local del backend.

En la práctica, el CLI es la puerta de entrada operativa al sistema. El usuario escribe comandos como `info`, `projects`, `search`, `ingest` o `analyze`, y la aplicación traduce esos comandos en peticiones HTTP contra `http://127.0.0.1:5000` por defecto.

## Arquitectura actual

La aplicación tiene tres piezas principales:

- una interfaz React en `src/`, que implementa la terminal visual;
- un empaquetado de escritorio con Tauri en `src-tauri/`;
- una conexión HTTP sencilla con el backend, sin capa compleja de estado ni comandos nativos relevantes por ahora.

El frontend principal vive en [App.tsx](C:/Users/Roger Gómez Martínez/Documents/GitHub/solguard-cli/src/App.tsx). Ahí se mantiene el historial de líneas de consola, el proyecto seleccionado, el estado de ejecución y el parser básico de comandos. Cada comando reconocido termina llamando a un endpoint del backend con `fetch`.

La parte Tauri está todavía muy ligera. El código Rust nativo no contiene lógica de producto real en este momento; la aplicación usa Tauri sobre todo como contenedor de escritorio para la UI web.

## Comandos expuestos

El cliente actual reconoce una superficie pequeña y directa:

- `help`
- `install`
- `info`
- `init <program-name> [description]`
- `projects`
- `project <program-name>`
- `search "<query>"`
- `ingest <file-or-folder>`
- `analyze <git-url|local-folder|zip>`
- `exit`

Todos estos comandos son interfaz de usuario. La ejecución efectiva pertenece al backend. El CLI no implementa por sí solo lógica de búsqueda, ingesta o análisis.

## Estado actual del proyecto

El estado actual del CLI es el de un cliente mínimo, pero funcional, orientado a flujo local. Tiene una estética de terminal, persiste el proyecto seleccionado en `localStorage` y renderiza respuestas del backend como texto plano o JSON serializado.

Todavía no hay una capa avanzada de widgets, seguimiento granular de progreso, tablas ricas o integración profunda con capacidades nativas de Tauri. Incluso hay componentes y plugins aún vacíos, como `progressbar.tsx` o `inputDetector.ts`, lo que confirma que el proyecto está en una fase temprana y que su foco actual es validar el flujo básico cliente-backend.

## Resumen técnico

`solguard-cli` debe entenderse como la cara local del sistema, no como su cerebro. Su valor está en ofrecer una interfaz cómoda y de escritorio para operar `solguard-backend` sin obligar al usuario a trabajar directamente con peticiones HTTP o scripts sueltos. En su estado actual, es un frontend terminalizado, sencillo y correctamente acotado en responsabilidades.
