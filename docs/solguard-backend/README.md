# SolGuard Backend

`solguard-backend` es la frontera HTTP local de SolGuard. Recibe requests,
valida DTOs y parametros de transporte, invoca `solguard-core` y devuelve la
respuesta publica. El pipeline, sus herramientas y toda la logica pesada viven
en [SolGuard Pipeline Core](../solguard-core/README.md).

La migracion de propiedad no cambia las rutas HTTP ni el request de `/analyze`,
y conserva los contratos `pipeline.v0.10`, `filter.v0.1` y `exploit.v0.2`.
Core anade de forma backward-compatible rutas `candidate_value` dentro de
`AnalyzeOutputs`; backend las transporta sin interpretarlas.

Para un target ZIP, el DTO acepta el handoff cerrado
`solguard-source-authority-handoff.v1` y devuelve el receipt de Core junto a
`outputs.source_authority_json`. Backend no lo calcula ni lo valida
semanticamente: conserva ademas el `AnalysisResponseLease` no serializado hasta
terminar la respuesta, para que otro request del mismo proyecto no pueda
resetear sus fuentes u outputs durante la serializacion.

## Alcance real

El backend posee:

- servidor Axum, rutas, controllers y DTOs HTTP;
- validacion de requests y traduccion de errores;
- bootstrap de proceso y adaptadores locales para Node/Ollama;
- construccion de dependencias e invocacion de la API Rust del core;
- transporte de progreso y respuestas al cliente.

El backend no posee:

- orden ni decisiones de fases;
- ejecucion directa de herramientas de analisis;
- seeds, candidatos, binding o canonicalizacion;
- reconciliacion FILTER ni admision EXPLOIT;
- journals, impacto, planes de PoC o reportes tecnicos.

## Indice

1. [Introduccion](01-introduccion.md)
2. [Arquitectura general](02-arquitectura-general.md)
3. [Configuracion y comandos](03-configuracion-y-comandos.md)
4. [API externa y rutas HTTP](04-api-externa-y-rutas-http.md)
5. [Servicios Rust y responsabilidades](05-servicios-rust-y-responsabilidades.md)
6. [Conocimiento, base de datos e ingesta](06-conocimiento-base-de-datos-e-ingesta.md)
7. [Motor de analisis y orquestacion](07-motor-de-analisis-y-orquestacion.md)
8. [Capa interna de IA y Ollama](08-capa-interna-de-ia-y-ollama.md)
9. [Artefactos y contratos de salida](09-artefactos-y-contratos-de-salida.md)
10. [Depuracion y estados degradados](10-depuracion-y-estados-degradados.md)

## Modelo de confianza preservado

Una senal o candidato no es un finding. VALIDATE sigue siendo la autoridad para
`supported`, `refuted` e `inconclusive`; FILTER decide admision de forma
independiente y fail-closed; EXPLOIT solo recibe candidatos admitidos. El
backend transporta esas salidas sin reinterpretarlas.

La separacion arquitectonica no demuestra mejoras de recall o rendimiento. Es
una reasignacion de responsabilidades que debe conservar equivalencia funcional.
