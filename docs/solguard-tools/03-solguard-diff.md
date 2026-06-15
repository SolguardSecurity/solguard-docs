# Solguard Diff

`solguard-diff` es la herramienta de análisis de cambios del ecosistema Solguard. Su binario se publica como `rbm-diff`, y su misión es transformar historial Git y, opcionalmente, contexto de pull requests, en prioridades de revisión manual orientadas a auditoría.

Si `solguard-map` responde qué existe en el repositorio y `solguard-trace` responde qué hace un target crítico, `solguard-diff` responde qué ha cambiado recientemente y por qué ese cambio debería volver a revisarse.

## Propósito técnico

La herramienta no afirma que un commit o una PR introduzcan una vulnerabilidad. Lo que hace es puntuar cambios, clasificarlos con señales de revisión estilo RBM, cruzarlos con superficies ya mapeadas y devolver una lista de cambios que merecen revisión manual reforzada.

Esto la convierte en una herramienta de priorización temporal. No trabaja sobre la estructura estática del repositorio únicamente, sino sobre la parte del repositorio que ha cambiado en el tiempo.

## Flujo principal

El flujo definido en `src/main.rs` comienza resolviendo la ruta del repositorio y cargando opcionalmente `MapContext` desde un `audit_map.json`. Después obtiene información básica del repositorio local desde Git, analiza commits recientes o un rango concreto y, si el usuario lo activa, enriquece el análisis con PRs obtenidas desde GitHub.

Con esos datos construye un `DiffReport`, genera la lista de `risky_changes`, calcula un resumen agregado y finalmente escribe múltiples reportes en disco.

La herramienta, por tanto, tiene tres fuentes de información potenciales:

- el repositorio Git local,
- el contexto estructural de `solguard-map`,
- y la API de GitHub, cuando se habilita explícitamente.

## Arquitectura por módulos

`cli` define la interfaz de línea de comandos. `git` encapsula el análisis local del historial y de los archivos cambiados. `github` añade el enriquecimiento opcional con pull requests. `map_context` carga y consulta el `audit_map.json`. `risk` clasifica archivos y calcula puntuaciones de prioridad. `model` define el contrato de salida y `report` persiste la información en JSON, Markdown, CSV y texto plano.

Esta división subraya una idea importante: la herramienta no trata commits y PRs como texto bruto. Primero normaliza cambios, luego los enriquece con contexto del mapa y por último los promueve a objetos de revisión con score y razones explícitas.

## Modelo de datos

`DiffReport` es la estructura principal. Contiene información del repositorio, fecha de generación, commits analizados, PRs analizadas, cambios clasificados como riesgosos, resumen y notas operativas.

Los tipos más relevantes son:

- `CommitChange`, que modela un commit con autor, fecha, archivos, razones y puntuación de revisión.
- `PullRequestChange`, que hace lo mismo para PRs cuando existe integración con GitHub.
- `FileChange`, que clasifica cada archivo cambiado por estado, lenguaje, tamaño de diff, tags RBM y puntos de revisión.
- `MapSurfaceHit`, que vincula un archivo cambiado con superficies o nodos previamente mapeados.
- `RiskyChange`, que representa el artefacto final de priorización manual.

Este modelo deja claro que la unidad de análisis no es solo el commit completo. También existe una clasificación a nivel de archivo y una posterior agregación a cambios relevantes.

## Integración con Git

La herramienta usa Git local como fuente primaria. Extrae información del repositorio, rama, `HEAD`, remoto y, si existe, relación con GitHub. Después obtiene commits recientes con `git log`, enumera archivos modificados por commit con `git diff-tree` y extrae patches con `git show`.

Esto le permite calcular adiciones, borrados, lenguaje probable del archivo, tags RBM y puntos de revisión derivados del texto del diff. La herramienta es local-first: no depende de GitHub para funcionar.

## Integración con `solguard-map`

Una de las decisiones más importantes de diseño es el cruce con `audit_map.json`. Si el usuario aporta `--map`, la herramienta puede relacionar archivos modificados con superficies críticas ya mapeadas, objetivos de revisión y puntos críticos asociados.

Ese cruce hace que `solguard-diff` no sea simplemente una capa de scoring basada en palabras clave del diff. Puede decir que un cambio toca un surface ya priorizado, que intersecta con una ruta crítica o que obliga a revalidar ciertas invariantes sugeridas por el mapa.

## Clasificación de riesgo

La puntuación de revisión se construye combinando señales del archivo, lenguaje, tags RBM, hits contra el mapa y contexto textual del commit o PR. La salida se normaliza en niveles como `urgent manual review`, `manual review`, `watch` o `low`.

Esto no es un sistema de severidad de vulnerabilidades. Es un sistema de prioridad de revisión. De hecho, los prompts manuales que genera la herramienta insisten en que la validación de comportamiento, explotabilidad, impacto, alcance y exclusiones debe venir después.

## Artefactos de salida

La herramienta escribe `recent_commits.md/json`, `pull_requests.md/json`, `risky_changes.md/json`, `changed_surfaces.csv` y `diff_summary.txt`. Esta colección cubre tres necesidades distintas: historial inspeccionable, agregación de cambios de alta señal y exportación tabular de superficies tocadas.

`risky_changes.json` es el artefacto más valioso para automatización, mientras que `risky_changes.md` y `diff_summary.txt` facilitan revisión humana rápida.

## Rol dentro de Solguard

`solguard-diff` aporta dimensión temporal al stack determinista de Solguard. Donde `map` fija la topología del código y `trace` profundiza en ejecución o invariantes, `diff` identifica dónde han cambiado esas superficies y qué parte de la revisión debe rehacerse. Su uso es especialmente natural dentro de `solguard-backend`, donde ayuda a construir consultas de recuperación y semillas de hipótesis centradas en cambios recientes.
