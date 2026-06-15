# Arquitectura General

La arquitectura de `solguard-backend` está dividida en dos planos: un plano externo de API pública implementado en Rust y un plano interno de IA implementado en TypeScript. Ambos procesos se ejecutan localmente y cooperan en una topología sencilla, pero suficientemente expresiva para separar responsabilidades sensibles.

## Topología de servicios

El servicio externo es un servidor HTTP con Axum. Su punto de entrada es `src/main.rs`, donde se inicializa la configuración, se construye un `InternalClient` para hablar con el servicio interno y se monta el `Router` con middlewares de trazas y CORS. Este servicio escucha en `127.0.0.1` sobre el puerto configurado como `EXTERNAL_PORT`.

El servicio interno se construye en `node/app.ts` como una aplicación Express. Su responsabilidad es exponer una API privada para salud, metadatos del motor de IA y consultas de búsqueda asistida por modelo. Este proceso escucha en `127.0.0.1` sobre `INTERNAL_PORT`.

El arranque coordinado se hace desde `node/start.ts`. Esa capa arranca primero el servidor interno y después lanza el binario Rust mediante `cargo run --bin solguard-backend`, inyectando las variables de entorno necesarias para que ambos lados compartan la misma configuración base.

## División por capas

La capa Rust se organiza en `config`, `routes`, `controllers`, `middlewares` y `services`. Es una separación clásica, pero aquí tiene una utilidad concreta. `config` centraliza la resolución de variables de entorno y rutas del sistema. `routes` declara la superficie HTTP externa. `controllers` implementa el contrato de entrada y salida de cada endpoint. `services` agrupa la lógica operativa: proyectos, conocimiento, ingesta, cliente interno y motor de análisis.

La capa TypeScript se divide en `interfaces`, `utils`, `services` y `tests`. `interfaces` define contratos internos de configuración y búsqueda. `utils/env.ts` carga y valida variables de entorno. `services/ollama.ts` abstrae la comunicación con Ollama. `app.ts` monta la API privada y transforma consultas del backend Rust en mensajes de chat concretos.

## Flujo entre procesos

La interacción entre ambos procesos siempre nace en Rust. Un endpoint externo, como `/search` o una fase del pipeline de análisis, prepara un contexto y llama al `InternalClient`. Ese cliente firma la petición con la clave interna, la envía al endpoint `/internal/search` y recibe una respuesta estructurada que incluye modo, texto de respuesta, modelo usado y una marca de si se utilizó contexto.

Esto significa que Node no conoce las rutas públicas ni la semántica completa del sistema. Solo conoce su API interna, el modelo configurado y el mensaje que se le pide resolver. La inteligencia de composición del contexto permanece en Rust.

## Dependencias de infraestructura

La arquitectura asume varias dependencias locales. Necesita una base SQLite perteneciente a `solguard-database`, un conector Node compilado para insertar payloads en esa base, los binarios o repositorios locales de `solguard-map`, `solguard-trace` y `solguard-diff`, y un runtime de Ollama accesible por HTTP en la máquina local.

Estas dependencias no se registran como microservicios distribuidos. El backend las trata como herramientas o recursos de trabajo locales, lo que simplifica el despliegue inicial pero aumenta la importancia de la configuración correcta del entorno.

## Principio de diseño dominante

El principio dominante en esta arquitectura es la separación entre ejecución determinista y razonamiento asistido por modelo. Todo lo que pueda resolverse con estado explícito, herramientas reproducibles o consultas estructuradas se mantiene del lado Rust. Todo lo relacionado con conversación con modelos se encapsula en la capa interna. Esa frontera reduce el acoplamiento y deja más claro qué partes del sistema son auditables por invariantes técnicas y cuáles son meramente asistivas.
