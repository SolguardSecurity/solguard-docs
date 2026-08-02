# Decisiones de arquitectura del programa

Estado: candidato pre-genesis de `C0-008`. Esta síntesis está subordinada al
[contrato de madurez](../../changelogs/25-26-jul-2026/tasks/01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md),
al [programa estructural](../../changelogs/25-26-jul-2026/tasks/02_PROGRAMA_ESTRUCTURAL.md)
y a las [reglas de evidencia](evidence-rules.md). No acepta `C0-008` ni
`GOV-002`.

Cada decisión usa estado `required_target`: describe la arquitectura exigida
por el programa. No afirma que todos los repositorios ya la implementen ni que
la evidencia operacional exista.

## ADR-001 — Separar producto, evaluación y gobierno

- Estado: `required_target`.
- Decisión: el producto genera artefactos sin oracle; matching, scoring y
  adjudicación ocurren después de congelar esos artefactos; el ledger de
  gobierno sólo registra transiciones autorizadas.
- Consecuencia: una métrica del evaluador no puede volver al runtime como
  feature, regla, ranking o fixture.
- Falla cerrada: acceso del producto a ground truth, matcher, splits o material
  privado del holdout.

## ADR-002 — Terminar detección en FILTER

- Estado: `required_target`.
- Decisión: el modo canónico es `detection_only` y termina después de FILTER.
  EXPLOIT, generación o ejecución de PoC y envío de reports quedan fuera de la
  superficie de detección.
- Consecuencia: diagnóstico histórico o tooling aislado no adquiere autoridad
  de producto por compartir un repositorio o un nombre de fase.
- Falla cerrada: cualquier camino runtime de detección que alcance una
  capacidad posterior a FILTER.

## ADR-003 — Mantener máquinas de estado ortogonales

- Estado: `required_target`.
- Decisión: verdad técnica (`supported|refuted|inconclusive`), admisión
  (`pass|review|reject`), evaluación (`match|detected`) y gobierno
  (`pending|accepted|reopened`) son planos distintos.
- Consecuencia: ninguna conversión se deduce por vocabulario, proximidad de
  archivos, commit, rama, PR o resultado de CI.
- Falla cerrada: promocionar un estado porque otro plano tuvo éxito.

## ADR-004 — Publicar findings sólo desde la conjunción autorizada

- Estado: `required_target`.
- Decisión: un finding necesita el candidate exacto, verdict `supported`,
  FILTER `pass`, `publication_eligibility` y lineage inmutable.
- Consecuencia: MAP, TRACE, DISCOVER, ECONOMIC, VALUE e INVARIANT producen
  evidencia o hipótesis; VALIDATE y FILTER conservan autoridades separadas.
- Falla cerrada: llamar finding a un resultado pre-FILTER o sin referencias
  físicas verificables.

## ADR-005 — Hacer física y cerrada la autoridad de evidencia

- Estado: `required_target`.
- Decisión: la autoridad reside en bytes contenidos, estables y
  content-addressed, con producer, schema/version, inputs y digest explícitos.
- Consecuencia: IDs copiados, texto libre, aliases, paths no contenidos o
  sidecars sin primary no crean autoridad.
- Falla cerrada: digest, tamaño, identidad física, schema, producer o lineage
  no verificables.

## ADR-006 — Exigir independencia real

- Estado: `required_target`.
- Decisión: dos evidencias son independientes sólo si no comparten la misma
  derivación determinante y cada una puede reabrirse desde su propia autoridad.
- Consecuencia: una copia, reformulación, proyección o self-corroboration no
  satisface una obligación independiente.
- Falla cerrada: contar dos representaciones del mismo dato como dos pruebas.

## ADR-007 — Usar roots inmutables, CAS y journal DAG

- Estado: `required_target`.
- Decisión: cada run se liga a un root inmutable; los artefactos se publican
  create-only y el journal representa dependencias explícitas como DAG.
- Consecuencia: reintentos producen nuevas identidades y los objetos huérfanos
  no avanzan autoridad.
- Falla cerrada: overwrite, mutación in-place, dependencia implícita o receipt
  que no reabre los bytes exactos.

## ADR-008 — Representar límites como deuda tipada

- Estado: `required_target`.
- Decisión: truncación, timeout, ausencia de inputs, cobertura parcial y
  presupuesto agotado son estados observables; nunca equivalen a evidencia
  negativa.
- Consecuencia: una obligación con deuda permanece inconclusive o review según
  el plano que la consume.
- Falla cerrada: imputar cero, ausencia o éxito a una observación no realizada.

## ADR-009 — Separar especificación, implementación y medición

- Estado: `required_target`.
- Decisión: un contrato escrito, una implementación validada y una capacidad
  medida son evidencias diferentes y se reportan por separado.
- Consecuencia: tests locales demuestran comportamiento bajo sus fixtures, no
  recall, precisión, rendimiento o generalización.
- Falla cerrada: presentar cierre documental o CI como capacidad empírica.

## ADR-010 — Conceder claims sólo mediante autoridad explícita

- Estado: `required_target`.
- Decisión: acceptance, known-regression, blind, novel y release requieren sus
  propios dossiers, roles y transiciones; ninguna autoridad se hereda de otra.
- Consecuencia: `generic_blind`, una release histórica o un match conocido no
  demuestran una evaluación blind ni novedad.
- Falla cerrada: claim sin la evidencia mínima del
  [diccionario canónico](product-claim-dictionary.md).

## Límite de esta publicación

Estas diez decisiones son un índice normativo verificable, no una certificación
del runtime. Su cierre operacional pertenece a los gates y campañas indicados
por el plan y sólo puede demostrarse con las [reglas de evidencia](evidence-rules.md).
