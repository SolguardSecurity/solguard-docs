# Relacion con la IA y Uso en Cada Escaneo

`solguard-database` no se comunica directamente con la IA. No abre sesiones con
Ollama, no genera prompts y no decide hipotesis. La comunicacion real con la IA
la realiza el adaptador local Node/Ollama alojado por `solguard-backend`; los
servicios que preparan el contexto viven en `solguard-pipeline-core`.

La base prepara y sirve memoria historica estructurada: findings, taxonomia,
snippets, chunks, embeddings y conteos. Esa memoria puede alimentar busquedas y
enriquecer resultados, pero no es autoridad de veredicto.

## Como se comunica con la IA

La comunicacion es indirecta:

```text
solguard-database (SQLite + retrieval)
        -> solguard-pipeline-core/knowledge
        -> adaptador alojado por solguard-backend
        -> InternalSearchRequest.context
        -> servicio interno Node
        -> Ollama
```

La base no habla con la IA; la IA consume contexto producido desde la base.

## Papel en `search`

En `solguard-backend`, `POST /search` puede funcionar en tres modos:

- `general`: sin contexto de base de datos.
- `knowledge`: con contexto de `solguard-database`.
- `hybrid`: con contexto historico mas razonamiento general.

En `knowledge`, el backend puede responder algunas preguntas agregadas
directamente desde SQLite sin usar IA, por ejemplo conteos o rankings que tengan
respuesta estructurada.

## Papel en `analyze`

En el pipeline actual, la base historica no participa en la generacion previa de candidatos
ni en VALIDATE. El pipeline primero ejecuta las fases deterministas:

```text
map -> diff -> trace -> discover -> economic -> value -> invariant
    -> candidates -> validate -> filter
```

Hasta ese punto, las decisiones salen de source, MAP, TRACE, DISCOVER,
ECONOMIC, VALUE, INVARIANT, candidatos canonicos, VALIDATE y FILTER. La similitud historica no
puede convertir una hipotesis en finding.

Despues de FILTER, el core ejecuta `historical-enrichment` y construye
consultas por candidato validado. Los resultados se escriben en:

```text
knowledge/post_candidate_retrieval.json
knowledge/retrieved_patterns.json
knowledge/similar_findings.md
knowledge/similar_exploit_paths.md
knowledge/similar_fixes.md
knowledge/similar_impact_escalations.md
knowledge/similar_triage_results.md
tool-outputs/historical-enrichment/historical_enrichment.json
```

`historical_evidence.json` queda como placeholder pre-validacion para declarar
explicitamente que la recuperacion historica se difiere.

## De que sirve en cada escaneo

En `map`, no sirve como motor de extraccion. MAP trabaja sobre el repositorio
objetivo y genera evidencia estructural propia.

En `trace`, no genera rutas ni findings. TRACE consume MAP y source para montar
guards, estado, efectos y causalidad.

En `discover`, `economic`, `invariant` y `candidates`, la base no debe inventar
reglas ni rupturas. Si existe un input historico tipado, se trata como evidencia
normalizada y acotada; texto legacy o similitud libre no crea invariantes.

En `validate`, la base no participa. `validation_results.json` es la autoridad.

En `historical-enrichment`, la base aporta comparacion: findings historicos,
exploits parecidos, fixes, escalados de impacto y resultados de triage. Ese
contexto ayuda a explicar y priorizar, pero no puede modificar `result`,
`finding_class`, confianza, diagnosticos ni evidencia del veredicto.

En `search`, la base si es una dependencia directa. Puede proporcionar contexto
rico al modelo o respuestas autoritativas cuando la consulta es agregable.

## Regla de interpretacion

La utilidad principal de `solguard-database` para la IA no es darle mas texto.
Su utilidad es convertir informes previos en estructura defendible. En un
escaneo nuevo, esa estructura es memoria historica post-validacion, no criterio
de admision de bugs.
