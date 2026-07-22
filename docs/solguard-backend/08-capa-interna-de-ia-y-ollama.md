# 08. Capa Interna de IA y Ollama

La capa interna vive en `node/` y se arranca con `bun start`. Su responsabilidad
es aislar las llamadas al modelo local y dar al proceso Rust un contrato pequeno
y autenticado. Backend aloja este adaptador; los servicios del pipeline core
deciden cuando consumirlo y como registrar el resultado.

## Endpoints internos

Base:

```text
http://127.0.0.1:{INTERNAL_PORT}
```

Rutas:

- `GET /internal/health`
- `GET /internal/info`
- `POST /internal/search`

Todas requieren token por uno de estos headers:

```text
x-internal-api-key: <INTERNAL_API_KEY>
Authorization: Bearer <INTERNAL_API_KEY>
```

El servidor usa `express.json({ limit: "1mb" })` y desactiva `x-powered-by`.

## `/internal/health`

Respuesta:

```json
{
  "status": "ok",
  "service": "solguard-internal-node",
  "version": "..."
}
```

## `/internal/info`

Respuesta:

```json
{
  "service": "solguard-internal-node",
  "version": "...",
  "model": "...",
  "capabilities": [
    "ollama-chat",
    "search-general",
    "search-knowledge",
    "search-hybrid"
  ]
}
```

## `/internal/search`

Body interno:

```json
{
  "query": "texto",
  "mode": "hybrid",
  "context": "opcional"
}
```

`query` es obligatorio. `mode` acepta:

- `general`
- `knowledge`
- `hybrid`

Si `mode` falta, se usa `hybrid`.

Respuesta:

```json
{
  "mode": "hybrid",
  "answer": "...",
  "model": "...",
  "usedContext": true
}
```

## Prompt base

El prompt de sistema fija estas reglas:

- actuar como asistente local de auditoria Web3;
- responder de forma concreta y basada en evidencia;
- no inventar hechos de base de datos si no hay contexto;
- tratar conteos agregados exactos como autoritativos;
- no inferir totales desde muestras recuperadas.

El modo anade instrucciones:

- `general`: respuesta normal sin contexto obligatorio.
- `knowledge`: usar contexto SolGuard si existe; conteos y rankings vienen de
  tablas agregadas.
- `hybrid`: usar conocimiento como prior y razonar sobre la peticion.

## Ollama

`OllamaService` llama:

```text
POST {OLLAMA_HOST}/api/chat
```

Payload relevante:

```json
{
  "stream": false,
  "options": {
    "temperature": 0,
    "top_p": 1,
    "top_k": 1,
    "seed": 0,
    "num_ctx": 32768,
    "num_predict": 900
  }
}
```

`num_ctx` no se hereda implicitamente del daemon: procede de
`OLLAMA_NUM_CTX` y se incluye en cada request. Su default es `32768`; solo se
aceptan enteros decimales canonicos entre `1` y `1048576`, con una segunda
validacion en el constructor de `OllamaService`. El release actual exige
exactamente `32768`. El rango es un limite de configuracion del adaptador y no
afirma que todos los modelos soporten cualquier valor del rango.

El resto de opciones busca salidas reproducibles y acotadas. Si Ollama devuelve
HTTP no exitoso, el error incluye status y un excerpt compacto. Si la respuesta
viene vacia, la capa interna falla explicitamente.

## Carga de entorno

`node/utils/env.ts` carga archivos `.env` segun modo sin sobrescribir variables
ya presentes.

Desarrollo:

```text
.env.development
.env.develpment
.env
```

Produccion o test:

```text
.env.production / .env.test
.env
```

Esta carga es una comodidad del host local. En una ejecucion gestionada,
`INTERNAL_API_KEY` y `EXTERNAL_API_KEY` proceden de la autoridad efimera de
Deploy y no deben persistirse en `.env`, runtime config, receipts o logs.

Variables leidas:

- `INTERNAL_PORT`
- `EXTERNAL_PORT`
- `INTERNAL_API_KEY`
- `OLLAMA_HOST`
- `OLLAMA_MODEL`
- `OLLAMA_NUM_CTX`
- `OLLAMA_TIMEOUT_MS`
- `VERSION`

En una ejecucion gestionada, Deploy sella tambien `OLLAMA_VULKAN=true`,
`OLLAMA_CONTEXT_LENGTH=32768`, `OLLAMA_NOPRUNE=true` y
`OLLAMA_NUM_PARALLEL=1`. Arranca siempre un daemon dedicado ligado al prebuild
receipt en `http://127.0.0.1:11435`; un listener previo en ese endpoint es un
fallo, no un fallback. Estas variables gobiernan el daemon y no sustituyen
`options.num_ctx`: Backend continua enviando el contexto exacto por request.
El preflight exige contexto `32768` y offload completo en `/api/ps`. Tanto el
preflight como la telemetria son controles operacionales externos al servicio
Node; no convierten texto de modelo en evidencia de un finding.

## Errores

La capa interna responde:

- `401` si falta o no coincide el token.
- `400` si falta `query` o el modo no es soportado.
- `502` para fallos de Ollama u otros errores upstream.

## Limites de responsabilidad

El servicio Node no valida findings, no lee proyectos y no decide severidad. Su
salida es texto de modelo para busqueda o asistencia. La autoridad de analisis
permanece en los artefactos deterministas del pipeline Rust, especialmente
`validation_results.json`.
