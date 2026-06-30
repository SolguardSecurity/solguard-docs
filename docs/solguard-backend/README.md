# SolGuard Backend

Esta carpeta documenta el backend actual de SolGuard. La fuente de verdad para
estos contratos es el repositorio `solguard-backend`; esta documentacion describe
el comportamiento que existe en codigo, no una arquitectura deseada.

El backend es el orquestador local de analisis: expone una API HTTP en Rust,
levanta un servicio interno en Node para llamadas al modelo local, coordina las
herramientas de analisis, consulta la base de conocimiento y escribe todos los
artefactos de cada proyecto en el workspace local de SolGuard.

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

## Estado funcional actual

- API externa local en `127.0.0.1:{EXTERNAL_PORT}` con Axum.
- Servicio interno local en `127.0.0.1:{INTERNAL_PORT}` con Express.
- Busqueda `general`, `knowledge` e `hybrid` contra Ollama y la base SQLite.
- Ingesta de informes hacia `solguard-database`.
- Gestion de proyectos en `SOLGUARD_PROJECTS_DIR`.
- Analisis completo por fases: `map`, `diff`, `trace`, `discover`,
  `economic`, `invariant`, `candidates`, `validate`,
  `historical-enrichment`, `impact`, `poc-plan` y `report`.
- Contrato autoritativo de veredictos en
  `tool-outputs/validate/validation_results.json`.
- Separacion explicita entre findings soportados, cola de revision, leads
  revisables y no-findings.

## Contratos que no deben romperse

- Un candidato no es un finding hasta que VALIDATE lo clasifica como
  `supported_finding`.
- `validation_results.json` es la autoridad de veredictos. Las fases posteriores
  no pueden modificarlo.
- La evidencia historica de la base de conocimiento no se usa antes de validar;
  se recupera despues de tener veredictos deterministas.
- Los estados `degraded`, `fallback`, `completed_with_errors` y `skipped` quedan
  registrados en `tool-outputs/pipeline.json` y en cada `phase.json`.
- Los artefactos anteriores se preservan cuando una fase escribe su propio
  resultado.

## Donde mirar al depurar

- `tool-outputs/pipeline.json`: orden, estado, duracion, inputs y outputs de
  cada fase.
- `analysis_log.md`: log humano de la ejecucion.
- `analysis_funnel.json`: resumen de cobertura, senales, candidatos, rechazos y
  veredictos.
- `tool-outputs/candidates/candidate_lifecycle.json`: trazabilidad desde senal
  fuente hasta candidato canonico y veredicto.
- `tool-outputs/candidates/rejected_candidates.json`: rechazos de admision,
  binding o canonicalizacion.
- `tool-outputs/validate/validation_results.json`: decision final por candidato.

## Cobertura de esta documentacion

Esta documentacion cubre el backend a nivel de arquitectura, operacion,
contratos HTTP, servicios internos, pipeline, artefactos, IA local, conocimiento,
validacion y depuracion. No documenta cada seed/familia de bug linea por linea;
esas familias cambian demasiado rapido y su fuente de verdad debe seguir siendo
el codigo bajo `src/services/analyzer/seeds/`.
