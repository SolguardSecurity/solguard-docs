# Pipeline de Ingesta y Normalización

La lógica de ingesta vive principalmente en `crates/solguard-core`, es decir, `solguard-database::solguard-core`; no en `solguard-pipeline-core`. Su punto de entrada público es `ingest_document`. Esta función recibe una ruta y una configuración opcional y devuelve un `IngestPayload` estructurado listo para persistirse en SQLite.

## Fases del pipeline

El pipeline sigue una secuencia rígida:

1. carga del documento,
2. resolución de metadatos de origen,
3. normalización del texto a Markdown,
4. detección del perfil documental,
5. extracción de metadatos del informe,
6. selección de estrategia de findings,
7. extracción de findings,
8. extracción de snippets de código,
9. chunking del documento,
10. ensamblado del payload final.

Ese orden es importante porque evita que la extracción de findings ocurra sobre texto sin normalizar o sobre un documento cuya familia no se ha identificado todavía.

## Carga y tipos de entrada

La ingesta soporta `pdf`, `markdown` y `text`. El tipo queda reflejado en `SourceType`. Durante la carga se calcula también el `sha256` del documento y se fija la ruta local canónica cuando es posible. Esto fortalece la trazabilidad y la deduplicación.

## Normalización a Markdown

Una vez cargado el documento, el pipeline normaliza el texto a Markdown. Esto unifica el tratamiento de PDFs, Markdown originales y texto plano en una representación intermedia consistente. El objetivo no es embellecer el documento, sino crear una superficie común para detección de headings, findings, secciones y snippets.

## Perfilado documental

El módulo `document_profile` detecta la familia del documento y la estrategia de parser que conviene usar. Puede identificar formatos como Zenith, Code4rena, Sherlock, Cantina, OffsideLabs o caer en `GenericAudit`. Además, selecciona estrategias como `SeverityIdHeadings`, `NumericSectionHeadings`, `ContestIssueHeadings`, `SingleFindingMarkdown` o `GenericHeadings`.

Esto es crucial porque la extracción de findings depende fuertemente del formato del informe. Un informe tipo Zenith no debe parsearse igual que un writeup de Sherlock o un informe genérico con secciones numeradas.

## Estrategias de findings

Tras detectar el perfil, el pipeline llama a `select_finding_strategy`. La estrategia elegida extrae borradores de findings y luego cada borrador se convierte en `FindingPayload`. El sistema actual contempla estrategias como reportes con IDs de severidad, reportes con secciones numéricas, reportes estilo concurso e incluso documentos que ya representan un único finding.

Esta fase es la que convierte texto de informe en conocimiento auditable con título, severidad, taxonomía, componentes afectados y contenido estructurado.

## Taxonomía y snippets

Cada finding se enriquece con taxonomía fuerte. A la vez, la fase de `code` extrae y clasifica snippets de código desde el propio texto del finding. El sistema puede reconocer diffs, código vulnerable, nuevo código, fixes o pruebas de concepto.

Esto es valioso porque la base no se limita a registrar descripciones narrativas. También conserva evidencia técnica que puede alimentar búsquedas o análisis posteriores.

## Chunking

El documento completo se trocea con `chunk_markdown`. El chunking persigue un objetivo distinto al de los findings: preservar contexto recuperable incluso en partes del documento que no son findings canónicos. Cada chunk guarda contenido, tipo de sección, cantidad de palabras y metadatos, incluyendo páginas cuando el texto proviene de PDF.

Esta capa es especialmente útil para retrieval contextual en preguntas donde el detalle relevante no quedó como campo estructurado de un finding, pero sí aparece en el cuerpo del informe.

## Calidad y validación

El repositorio incluye fixtures de validación del parser para distintos formatos. Esto existe para medir regresiones en la extracción. La calidad del parsing no se asume; se comprueba mediante casos versionados que definen familia, estrategia esperada, conteo de findings y distribución por severidad.

Desde el punto de vista de producto, esta fase convierte a `solguard-database` en una base de conocimiento defendible. Si el parsing fuera arbitrario, la recuperación posterior para IA sería mucho menos fiable.
