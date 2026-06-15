# Solguard Backend

Documentación técnica del backend de Solguard. Esta sección describe la arquitectura híbrida Rust + TypeScript, la API pública consumida por `solguard-cli`, la API interna para IA local, el flujo de ingesta documental y la orquestación completa del pipeline de análisis.

## Índice

1. [Introducción](./01-introduccion.md)
2. [Arquitectura General](./02-arquitectura-general.md)
3. [Configuración y Comandos](./03-configuracion-y-comandos.md)
4. [API Externa y Rutas HTTP](./04-api-externa-y-rutas-http.md)
5. [Servicios Rust y Responsabilidades](./05-servicios-rust-y-responsabilidades.md)
6. [Conocimiento, Base de Datos e Ingesta](./06-conocimiento-base-de-datos-e-ingesta.md)
7. [Motor de Análisis y Orquestación](./07-motor-de-analisis-y-orquestacion.md)
8. [Capa Interna de IA y Ollama](./08-capa-interna-de-ia-y-ollama.md)
