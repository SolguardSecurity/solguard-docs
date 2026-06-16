# Solguard Trace

`solguard-trace` es la herramienta de trazado funcional y semántico de Solguard. Su binario se publica como `rbm-trace`, y su responsabilidad es profundizar sobre funciones o superficies ya identificadas, produciendo trazas, relaciones guardia-estado-efecto, candidatos de invariantes y preguntas de revisión.

Mientras `solguard-map` modela el repositorio a nivel estructural, `solguard-trace` intenta responder qué ocurre dentro de un target crítico y qué cadenas de estado o de ejecución merecen inspección manual.

## Propósito técnico

La herramienta no prueba vulnerabilidades. Lo que hace es transformar una función o un conjunto priorizado de targets en un informe de trazado orientado a auditoría. Este informe intenta exponer cómo se encadenan llamadas, qué estados se leen o escriben, qué guards existen, qué efectos externos aparecen, qué métricas se calculan y dónde pueden existir desalineaciones entre validación, estado y efecto.

En otras palabras, `solguard-trace` es una herramienta de profundización determinista que prepara el terreno para revisión humana o para razonamiento posterior en el backend.

## Dos modos operativos

La CLI soporta dos modos distintos. El primero es el modo de objetivo único, activado con `--target`, pensado principalmente para trazado profundo de funciones Solidity. El segundo es el modo batch, activado con `--from-map` y `--top` o `--levels`, que construye un paquete de revisión a partir del `audit_map.json` generado por `solguard-map`.

Esta diferencia es importante. En modo de objetivo único, el sistema trabaja con una semántica más próxima al AST de Solidity. En modo batch, la herramienta mezcla el contexto del mapa, extractos de código y heurísticas por lenguaje para cubrir también Vyper, Rust, Go, Node.js/TypeScript y C/C++.

## Flujo principal

El punto de entrada en `src/main.rs` primero valida la CLI, después carga los archivos Solidity del proyecto mediante `project::load_solidity_files`, parsea el proyecto y, a partir de ahí, bifurca entre batch y objetivo único.

En objetivo único, llama a `trace::build_trace` con el target, el contexto opcional del mapa y la profundidad máxima de expansión. En batch, llama a `batch::build_trace_batch`, que selecciona un conjunto diverso de targets prioritarios desde `audit_map.json` y genera un paquete completo de informes y un índice agregado.

El hecho de que el cargador base lea primero archivos Solidity no significa que la herramienta solo sirva para Solidity. Significa que su raíz histórica está en ese lenguaje y que la extensión multi-lenguaje batch se construye reutilizando el contexto exportado por `solguard-map`.

## Arquitectura interna

`cli` define el contrato de entrada. `project` resuelve la carga local de fuentes Solidity y filtra ruido como tests, mocks y artefactos. `solidity` se encarga del parseo profundo específico. `trace` construye el informe individual. `batch` arma el paquete multi-target. `semantics` clasifica y eleva señales del código a conceptos de auditoría. `ir` define el modelo de datos y `output` serializa informes individuales o por lote.

El módulo `ir` es especialmente importante porque define el lenguaje interno de la herramienta. En lugar de devolver texto libre, construye estructuras como `TraceReport`, `TraceNode`, `StateAccess`, `GuardInfo`, `MetricInfo`, `ExternalEffect`, `SemanticFlow`, `LimitControl`, `MismatchFinding` y `AiTraceBrief`.

## Modelo de trazado

El informe principal se articula alrededor de `TraceReport`. Ese objeto contiene:

- metadatos del análisis y del target,
- contexto opcional de `rbm-map`,
- un briefing resumido para revisión o para consumo posterior por IA,
- el árbol de llamadas o `call_trace`,
- caminos ensamblados,
- lecturas y escrituras de estado,
- guards,
- métricas,
- efectos externos,
- flujos semánticos,
- controles de límite,
- mismatches candidatos,
- invariantes candidatos,
- pistas de PoC,
- y limitaciones declaradas.

Este esquema deja claro que `solguard-trace` no es un tracer de ejecución en tiempo real. Es un generador de modelos semánticos a partir de código fuente y metadatos previos.

## Qué intenta detectar

La herramienta busca especialmente fronteras entre guardias y efectos, estados mutables usados por rutas críticas, contextos cacheados o temporales que pueden desviarse del estado actual, enlaces de firma, prueba, ruta y dominio, claves parciales de replay o deduplicación, candidatos de mismatch contable y ausencia o debilidad de límites, caps o rate limits.

En el caso multi-lenguaje, parte de esta detección es genérica y depende del texto y del contexto del mapa. En Solidity, la profundidad semántica es mayor porque la herramienta puede apoyarse más en la estructura sintáctica del código fuente.

## Consumo de rutas cross-component

Desde `trace.v0.8`, `solguard-trace` consume las colecciones `cross_component_links` y `cross_component_paths` emitidas por `solguard-map`. La herramienta no duplica parsers para esta capa: trata el mapa como fuente de verdad estructural y traduce las rutas `resolved` en `assembled_paths`.

Las relaciones `partial` y `unresolved` se mantienen como evidencia y preguntas de revisión. No se incorporan como llamadas confirmadas ni como paths fuertes. Esto permite revisar eventos, RPC, queues, base de datos y configuración entre componentes sin convertir señales incompletas en comportamiento probado.

## Contexto semantico v0.9

Desde `trace.v0.9`, `solguard-trace` consume la capa `audit_map.v0.9` sin crear parsers propios. MAP sigue siendo la fuente de verdad para `semantic_contexts`, `context_couplings`, `identity_schemas` y `atomicity_boundaries`; TRACE evalua esos datos contra el target y los convierte en checks estructurados.

El informe JSON anade:

- `semantic_context_flows`, para relaciones como cache/persistent o guard/effect con temporalidad simbolica.
- `identity_completeness`, para dedupe/cache/context keys con campos observados, esperados y faltantes.
- `atomicity_checks`, para garantias de rollback/transaction/queue ack/compensacion.
- `semantic_findings`, con causa diferenciada: `missing_identity_field`, `stale_context_candidate`, `cache_persistent_divergence`, `rollback_gap` u `ordering_gap`.

Solo las relaciones `resolved` deben tratarse como evidencia fuerte. Las relaciones `partial` o `unresolved` se conservan como preguntas de revision y no se introducen como llamadas confirmadas en `call_trace`.

### Hardening v0.9.1

El hardening v0.9.1 mantiene `schema_version: "trace.v0.9"` y anade `tool_version`, `hardening_revision`, `input_capabilities`, `consumed_capabilities` y `output_capabilities`. Esto permite distinguir que ofrecio MAP, que uso TRACE y que produjo finalmente el informe.

`semantic_findings` deja de ser una lista plana de sospechas. Cada finding incluye `status`, `semantic_rule_id`, `rule_version`, `fingerprint`, superficies separadas (`root_cause_surface`, `trigger_surface`, `impact_surface`), `evidence_chain`, evidencia de soporte, evidencia contradictoria, `missing_evidence` y confidence objects. TRACE puede emitir `signal`, `candidate`, `supported` o `review_required`; `validated` y `refuted` quedan reservados para `solguard-validate`.

La promocion es conservadora: un finding `supported` requiere fuente primaria no heuristica, cadena causal suficiente y pasos resueltos. Evidencia heuristic-only solo puede producir `signal` o `review_required`, y relaciones `partial` o `unresolved` bajan confianza o fuerzan revision en vez de convertirse en llamadas confirmadas.

## Batch mode como paquete de revisión

El modo batch no es solo un bucle sobre targets. La propia CLI aclara que `--top` representa un presupuesto de trazado y no un recorte bruto. El objetivo es mantener diversidad por lenguaje y componente, evitando que un único clúster de alta señal expulse superficies relevantes de otras capas del sistema, como relayers TypeScript, consenso Go o ejecución C++.

Esta decisión de diseño es muy importante para auditorías de infraestructura o repositorios mixtos. `solguard-trace` no quiere limitarse a seguir el score máximo global; quiere producir un pack de revisión equilibrado.

## Artefactos de salida

En modo individual, escribe `trace.md`, `trace.json` y `summary.txt`. En batch, genera `index.md`, `index.json`, `summary.txt` y una carpeta `traces/` con los informes individuales numerados. Esto permite que el backend o un auditor humano trabajen sobre un índice general y, al mismo tiempo, puedan bajar a informes detallados por target.

El `index.json` del batch es particularmente relevante porque resume cuántos targets fueron trazados, cuántos flujos semánticos o mismatches se detectaron y qué objetivos quedaron marcados como revisión de alta prioridad.

## Posición dentro del ecosistema

`solguard-trace` se coloca entre el mapa estructural y la orquestación final del backend. Parte del contexto ya detectado por `solguard-map`, añade profundidad sobre targets concretos y devuelve un informe más cercano a invariantes, guards y efectos. Es, en esencia, la fase determinista que traduce superficie crítica en narrativa técnica de revisión.
