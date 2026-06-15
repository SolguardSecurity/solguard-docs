# Relación con la IA y Uso en Cada Escaneo

`solguard-database` no se comunica directamente con la IA. No abre sesiones con Ollama, no genera prompts y no decide hipótesis. La comunicación real con la IA la hace `solguard-backend`. Lo que hace `solguard-database` es preparar y servir el contexto estructurado que el backend puede inyectar en la capa de modelo.

Esta distinción es esencial para entender el sistema.

## Cómo se comunica con la IA en la práctica

La base se comunica con la IA de forma indirecta. El backend, en sus rutas y servicios, abre SQLite mediante `rusqlite`, consulta `solguard-database` y construye un `KnowledgeSearchContext`. Ese contexto contiene texto y metadata de recuperación. Después, el backend lo pasa al servicio interno de IA como `context` dentro de `InternalSearchRequest`.

En la capa Node del backend, ese `context` se inserta explícitamente dentro del mensaje enviado al modelo. El prompt de sistema además obliga al modelo a tratar los conteos exactos como autoritativos y a no inferir totales a partir de ejemplos recuperados.

Por tanto, la comunicación real es:

```text
solguard-database (SQLite + retrieval)
        -> solguard-backend/knowledge
        -> InternalSearchRequest.context
        -> servicio interno Node
        -> Ollama
```

La base no habla con la IA; la IA consume contexto producido desde la base.

## Qué aporta a la IA

La base aporta cuatro tipos de valor:

- conteos agregados y resúmenes autoritativos,
- findings estructurados con taxonomía fuerte,
- chunks de contexto recuperables por FTS,
- embeddings locales para similitud offline.

Esto significa que cuando la IA responde, no parte de cero. Puede recibir evidencia recuperada sobre clases de bug, invariantes, componentes afectados, hallazgos similares, recomendaciones y secciones textuales concretas de informes pasados.

## Papel en `search`

En `solguard-backend`, la ruta `POST /search` puede funcionar en tres modos:

- `general`, sin contexto de base de datos;
- `knowledge`, con contexto de `solguard-database`;
- `hybrid`, con contexto de `solguard-database` más razonamiento general.

En `knowledge`, el backend incluso puede responder algunas preguntas agregadas directamente desde la base sin usar IA. Esto ocurre cuando detecta que la consulta es de conteo o ranking y puede resolverla con `direct_knowledge_answer`.

En `hybrid`, la base se usa como memoria previa de auditoría. No decide la respuesta final, pero condiciona el contexto que recibe el modelo.

## Papel en `analyze`

Durante `POST /analyze`, la base se usa después de ejecutar `map`, `trace` y `diff`. El backend construye una `retrieval_query` derivada del nombre del proyecto, el target, el `audit_map`, los resultados de trace y las pistas de diff. Esa query se pasa a `knowledge::database_search_context`.

El resultado se escribe en el proyecto como:

- `knowledge/retrieved_patterns.json`, con metadata de recuperación,
- `knowledge/similar_findings.md`, con findings y patrones similares.

Después, ese contexto textual se compacta y se pasa al servicio interno de IA como base de apoyo para la generación de hipótesis y rechazos.

Esto implica que `solguard-database` no participa al principio del escaneo estructural. No interviene en la ejecución de `map`, `trace` o `diff`. Su papel comienza cuando el backend ya tiene señales deterministas y quiere buscar memoria histórica relacionada.

## De qué sirve en cada escaneo

En `map`, no sirve como motor de extracción. `map` es autónomo y trabaja sobre el repositorio objetivo. La base solo puede ser útil después, cuando sus hallazgos históricos ayudan a interpretar o priorizar superficies semejantes.

En `trace`, tampoco participa en la generación de la traza. La utilidad de la base aparece después, cuando los estados, guards, efectos o invariantes candidatos detectados por `trace` se convierten en términos de recuperación para buscar findings análogos.

En `diff`, la base no calcula el riesgo del cambio. Ese trabajo lo hace `solguard-diff`. Sin embargo, los cambios recientes pueden acabar influyendo en la `retrieval_query` del backend, que usará la base para recuperar patrones históricos relacionados con las superficies modificadas.

En `search`, la base sí es una dependencia directa. Puede proporcionar respuestas autoritativas o contexto rico para el modelo.

En `analyze`, la base es la memoria histórica del sistema. Sirve para convertir evidencia determinista recién obtenida en hipótesis mejor informadas por auditorías pasadas.

## Por qué esto importa

La utilidad principal de `solguard-database` para la IA no es “darle más texto”. Su utilidad es convertir informes previos en estructura defendible: taxonomía, invariantes, componentes, snippets, chunks y conteos exactos. Gracias a eso, la IA puede razonar sobre evidencia recuperada en lugar de improvisar desde conocimiento difuso.

En resumen, la base no sustituye el escaneo ni el análisis determinista. Los complementa. Es la memoria histórica que permite que un escaneo actual no se interprete en vacío.
