# 06. Conocimiento, Base de Datos e Ingesta

El core usa `solguard-database` como memoria historica, no como autoridad de
veredicto para un analisis nuevo. El backend conserva los endpoints HTTP y
delega estas operaciones. La base SQLite sirve para buscar patrones,
responder preguntas y enriquecer resultados ya validados.

## Base SQLite

La ruta se configura con:

```text
SOLGUARD_DATABASE_PATH
```

Default:

```text
../solguard-database/data/solguard.sqlite
```

`solguard-core/src/services/knowledge.rs` lee SQLite para resumenes, busqueda y
recuperacion historica. `services/ingest.rs` usa el conector de
`solguard-database` para insertar
nuevos informes.

## Busqueda de conocimiento

`POST /search` acepta tres modos:

- `general`: no prepara contexto de la base.
- `knowledge`: busca en la base; algunas preguntas agregadas se responden de
  forma directa con `model = "solguard-database"`.
- `hybrid`: default; recupera contexto historico y lo entrega al modelo local
  como prior.

La respuesta incluye `retrieval` cuando hubo consulta a base. Ese bloque sirve
para auditar que contexto fue recuperado y no debe confundirse con validacion de
un finding.

## Ingesta

`POST /ingest` recibe una ruta y procesa archivos soportados. La respuesta
separa:

- `processed`: total evaluado.
- `inserted`: informes insertados con hash, titulo, numero de findings y payload.
- `skipped`: rutas omitidas.
- `failures`: errores parciales.
- `database_path`: SQLite final.

La ingesta debe ser idempotente respecto a hashes de fuente. Si un informe ya
existe o no es soportado, debe aparecer como omitido o fallo parcial, no tumbar
todo el proceso sin diagnostico.

## Politica durante analisis

El pipeline separa dos momentos:

1. Antes de VALIDATE: se usan source, map, diff, trace, discover, economic,
   value, invariant, seeds deterministas y model discovery acotado. La base historica no
   decide si algo es un finding.
2. Despues de VALIDATE: se recupera evidencia historica para enriquecer,
   comparar familias y ayudar a redactar o priorizar.

Esta separacion evita overfitting directo al corpus historico y permite auditar
por que un candidato fue soportado o rechazado sin depender de similitudes de
base de datos.

## Artefactos de conocimiento por proyecto

Durante el analisis se escriben artefactos bajo:

```text
<project>/knowledge/
```

Archivos principales:

- `historical_evidence.json`: placeholder pre-validacion que declara que la
  recuperacion historica se difiere hasta despues de la validacion determinista.
- `post_candidate_retrieval.json`: solicitudes y respuestas de recuperacion
  despues de validar candidatos.
- `retrieved_patterns.json`: alias de compatibilidad del reporte post-candidate.
- `similar_findings.md`, `similar_exploit_paths.md`, `similar_fixes.md`,
  `similar_impact_escalations.md` y `similar_triage_results.md`: resumenes
  humanos por categoria.

La fase `historical-enrichment` tambien escribe:

```text
<project>/tool-outputs/historical-enrichment/historical_enrichment.json
```

Ese artefacto referencia el hash de `validation_results.json` usado como
autoridad. Si una fase posterior cambia ese archivo, el runtime aborta.

## Regla de oro

La base de conocimiento puede decir "esto se parece a algo visto antes". No puede
decir "esto es un finding" sin pasar por candidatos canonicos y VALIDATE.
