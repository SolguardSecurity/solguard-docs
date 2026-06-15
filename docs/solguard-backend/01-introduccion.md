# Introducción

`solguard-backend` es el backend operativo de Solguard. Su función no es almacenar conocimiento por sí mismo ni actuar como interfaz gráfica, sino coordinar el trabajo entre la API pública, la capa de conocimiento, las herramientas deterministas de análisis y la IA local que asiste en la generación de hipótesis de auditoría.

Desde el punto de vista de producto, este repositorio es el punto de entrada técnico del sistema. Expone la API que consume `solguard-cli`, crea y gestiona workspaces locales de auditoría, procesa documentación de entrada, consulta la base de conocimiento histórica y ejecuta pipelines de análisis sobre objetivos Web3.

## Alcance del backend

La responsabilidad del backend está claramente delimitada. Debe exponer la API consumida por el cliente, inicializar proyectos de auditoría locales, consultar `solguard-database` como fuente de conocimiento, ejecutar herramientas como `solguard-map`, `solguard-trace` y `solguard-diff`, y coordinar la IA local mediante un servicio interno dedicado.

El backend no pretende reemplazar a `solguard-database`, ni debe mezclar lógica de interfaz de usuario, ni asumir tareas que ya estén mejor resueltas en otros componentes del ecosistema. La idea estructural es que funcione como capa de orquestación y no como un monolito que absorbe todo el sistema.

## Dirección técnica

La implementación actual sigue un modelo híbrido Rust + TypeScript. Rust concentra la API externa, la carga de configuración, el sistema de rutas, la lógica de controladores, la integración con la base de conocimiento, la ingesta y la orquestación de herramientas de auditoría. TypeScript, ejecutado sobre Node y arrancado con Bun, concentra la capa interna para IA local, en particular la integración con Ollama y la construcción del canal privado que recibe consultas desde Rust.

Este reparto no es accesorio. Define una frontera operativa clara: Rust resuelve la superficie pública y la ejecución determinista del backend, mientras que TypeScript encapsula la dependencia del modelo local y la abstracción de chat.

## Modelo de operación

El backend levanta dos procesos locales coordinados. El primero es el servidor externo escrito en Rust con Axum, que expone la API principal en `127.0.0.1` y sirve como entrada oficial del sistema. El segundo es un servicio Node/Express también local, no expuesto públicamente, que ofrece una API interna usada por Rust para resolver búsquedas, razonamiento con contexto y futuras capacidades relacionadas con modelos.

La comunicación entre ambas capas no es abierta. Rust accede al servicio interno exclusivamente a través de `127.0.0.1` y exige autenticación por clave compartida mediante la cabecera `x-internal-api-key`. Ese detalle convierte al servicio interno en una dependencia privada del backend y no en una API de usuario final.

## Papel dentro del flujo de auditoría

Cuando el sistema opera en modo de análisis, el backend deja de ser una simple API de utilidades y pasa a convertirse en un orquestador de evidencias. Primero resuelve el objetivo de análisis, después ejecuta herramientas deterministas sobre el código fuente, posteriormente consulta la base de conocimiento con términos derivados de ese mismo análisis y, por último, usa la IA local para producir hipótesis y material auxiliar de validación.

Ese orden es importante. En la arquitectura actual, la IA no actúa como fuente primaria de verdad. La evidencia determinista y la base de conocimiento estructurada aparecen antes, y la capa de modelo se usa como asistente para expandir, contrastar o redactar material de trabajo a partir de esas entradas.
