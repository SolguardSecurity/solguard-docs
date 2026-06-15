# Motor de Análisis y Orquestación

El motor de análisis es la pieza más compleja de `solguard-backend`. Su implementación está concentrada en `src/services/analyzer/runtime.rs` y representa la transición desde un backend administrativo a un backend de auditoría asistida.

## Entrada del análisis

La operación de análisis recibe dos datos: nombre de proyecto y objetivo. El objetivo puede ser una ruta local, un archivo `.zip` o un repositorio Git remoto. A partir de ahí, el backend resuelve el código fuente real sobre el que trabajará.

Si el objetivo es una carpeta, usa esa carpeta directamente. Si es un ZIP, lo extrae dentro del workspace del proyecto y trata de detectar una raíz única. Si es un repositorio remoto, ejecuta `git clone` dentro de `project/source/repo`. Esta resolución convierte entradas heterogéneas en una misma abstracción operativa: un `source_dir`.

## Preparación del workspace

Antes de ejecutar herramientas, el backend garantiza que exista el proyecto y prepara una estructura persistente con varios subdirectorios: `tool-outputs/map`, `tool-outputs/trace`, `tool-outputs/diff` y `knowledge`. También inicializa `analysis_log.md`, que registra el progreso textual del pipeline.

Este enfoque tiene una consecuencia importante: el análisis no devuelve resultados efímeros en memoria, sino un expediente de auditoría local persistente que puede inspeccionarse y reutilizarse después.

## Guardas de coherencia

El motor contiene una verificación específica para detectar desalineación entre la etiqueta del proyecto y el repositorio resuelto, al menos en la distinción DeFi frente a DTL. Si el proyecto se presenta como DeFi pero el target resuelve a un repositorio DTL, o viceversa, el pipeline marca la ejecución como inválida y genera artefactos explicando la inconsistencia.

Esta guarda no prueba corrección funcional del objetivo, pero evita un error operativo frecuente: correr el análisis de una familia sobre una muestra de otra familia.

## Ejecución de herramientas deterministas

La primera fase sustantiva del pipeline es la ejecución de `solguard-map`, `solguard-trace` y `solguard-diff`. `map` se ejecuta primero porque genera el `audit_map.json` que puede alimentar a `trace`. `trace` depende de ese mapa cuando está disponible. `diff` se ejecuta únicamente si el objetivo resuelto es un repositorio Git, ya que necesita historial de cambios.

Cada herramienta produce un `ToolRun` con nombre, éxito, código de salida y extractos compactados de `stdout` y `stderr`. Estos resultados se almacenan tanto en la respuesta HTTP como en el log persistido.

## Recuperación de conocimiento contextual

Tras ejecutar las herramientas, el backend construye una consulta de recuperación derivada de múltiples fuentes: nombre de proyecto, target original, contenido estructurado de `audit_map.json`, señales de los trazados y pistas de cambios recientes. Esa consulta se usa para pedir a `knowledge` un contexto enriquecido.

La metadata de recuperación se escribe en `knowledge/retrieved_patterns.json`, mientras que el bloque textual se persiste en `knowledge/similar_findings.md`. De este modo, la fase de retrieval deja rastro explícito dentro del expediente del proyecto.

## Generación de hipótesis

Con los outputs deterministas y el contexto de conocimiento listos, el motor genera semillas de hipótesis. Estas semillas son construcciones estructuradas derivadas de evidencia estable en `trace` y `diff`, no ocurrencias libres del modelo.

Después se construye un briefing compartido para el modelo y se llama al servicio interno para producir dos artefactos: `hypothesis.md` y `rejected_hypotheses.md`. El primero amplía hipótesis plausibles; el segundo recoge refutaciones o hipótesis descartadas durante la fase adversarial.

## Finalización y findings

El archivo `findings.md` no se construye como una simple salida libre del modelo. El runtime actual deja explícito que el pase dedicado de findings con LLM se omite y que los candidatos se renderizan mediante reglas de promoción deterministas. Esto es una decisión de arquitectura importante: el modelo ayuda en hipótesis y contraste, pero los borradores de findings se derivan desde reglas controladas por el backend.

Finalmente, el sistema genera `validation_plan.md`, que convierte los artefactos previos en una guía operativa de validación manual.

## Artefactos persistentes

El resultado del análisis queda repartido en varios archivos: outputs de `map`, `trace` y `diff`, metadata de recuperación, findings similares, semillas de hipótesis, hipótesis promovidas, rechazos, borradores de findings, plan de validación y log de análisis. Esta colección constituye la unidad documental real del backend cuando actúa como orquestador de auditoría.
