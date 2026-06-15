# Capa Interna de IA y Ollama

La capa interna de IA de `solguard-backend` está implementada en Node/Express y actúa como una API privada para conversación con modelos locales. Su principal objetivo es encapsular la integración con Ollama y evitar que el servidor Rust tenga que conocer detalles de transporte, formato de mensajes o políticas de prompt.

## API interna

La aplicación interna expone tres endpoints: `GET /internal/health`, `GET /internal/info` y `POST /internal/search`. Todos requieren autenticación por `x-internal-api-key` o, alternativamente, por `Authorization: Bearer <token>`.

`/internal/health` ofrece una señal mínima de vida del proceso Node. `/internal/info` expone versión, modelo activo y capacidades declaradas. `/internal/search` es el endpoint operativo real: recibe una consulta, un modo y un contexto opcional, construye mensajes de chat y los envía al cliente configurado.

## Construcción del prompt

La aplicación interna no recibe prompts libres ya listos para enviar. Recibe una intención de búsqueda y un contexto opcional. A partir de eso construye una secuencia de mensajes con un `system` fijo y un `user` derivado del modo de operación.

El prompt de sistema impone varias restricciones: ser conciso, no inventar datos de base de conocimiento cuando no hay contexto, tratar los agregados exactos como autoritativos y no inferir totales a partir de muestras de findings o chunks recuperados. Estas reglas son importantes porque reflejan el principio de subordinación del modelo respecto a la evidencia estructurada.

El prompt de usuario cambia según el modo:

- En `general`, el servicio responde como asistente local normal.
- En `knowledge`, debe apoyarse en el contexto de la base de conocimiento cuando exista, especialmente para preguntas de conteo o ranking.
- En `hybrid`, usa el contexto como conocimiento previo de auditoría y después razona sobre la petición del usuario.

## Integración con Ollama

La implementación concreta está en `node/services/ollama.ts`. El servicio llama a `POST /api/chat` del host configurado de Ollama, con `stream: false` y una configuración conservadora: temperatura cero, `top_p` y `top_k` fijados, semilla fija y un máximo de tokens de salida acotado.

Esta elección no es cosmética. Busca reproducibilidad local y minimizar variabilidad en respuestas que después pueden influir en hipótesis de auditoría. No garantiza determinismo absoluto del sistema completo, pero sí reduce el ruido del componente generativo.

## Validación de entrada y errores

La aplicación interna valida que exista `query`, que el modo sea soportado y que la respuesta del modelo no venga vacía. Si la validación falla, devuelve un `400`. Si el problema ocurre al comunicarse con Ollama o al resolver el backend del modelo, devuelve un `502`.

Desde el punto de vista arquitectónico, esto convierte al servicio interno en una fachada estricta y no en un simple proxy transparente hacia Ollama.

## Configuración y arranque

La capa interna lee su configuración desde entorno, valida puertos, timeout, versión, token y modelo, y se inicia con `startInternalServer()`. Durante el arranque global del backend, `node/start.ts` la levanta primero y luego arranca Rust en un proceso hijo.

Esto permite que cuando Rust intente hablar con `/internal/health`, `/internal/info` o `/internal/search`, el servicio Node ya exista y comparta el mismo universo de configuración.

## Papel dentro del sistema

La IA interna no decide la arquitectura del análisis ni resuelve por sí sola el problema de auditoría. Su papel es actuar como motor de razonamiento asistivo dentro de un pipeline gobernado por evidencias deterministas y recuperación estructurada. Esa subordinación es una propiedad de diseño relevante: el modelo está integrado como herramienta, no como árbitro principal del backend.
