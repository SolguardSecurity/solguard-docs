# Diccionario canónico de claims de producto

Estado: candidato pre-genesis de `C0-002`. Este documento y su
[registro machine-readable](product-claim-dictionary.v1.json) no aceptan
`C0-002` ni `GOV-002`, no modifican el acceptance ledger y no conceden autoridad
para publicar claims.

## Regla general

Solguard separa cinco planos que nunca se promocionan por vocabulario:

```text
evidencia -> hipótesis -> veredicto técnico -> admisión -> evaluación/publicación
```

Un commit, una rama, una PR, una suite local o un identificador con aspecto de
release no cambia de plano. Cada término se usa únicamente con la autoridad y
la evidencia indicadas abajo.

## Vocabulario congelado

| Término | Significado canónico | No significa |
|---|---|---|
| `signal` | Observación tipada de un productor de evidencia. | Candidate, finding o detección. |
| `lead` | Hipótesis incompleta con obligaciones abiertas. | Candidate aceptado ni finding. |
| `candidate` | Hipótesis canónica con scope, claim e identidad exactos. | Veredicto, FILTER pass o finding. |
| `proof` | Bundle o certificado versionado de obligaciones y evidencia. | Veredicto automático ni release. |
| `supported` | Veredicto técnico de VALIDATE con proof completo para inputs sellados. | FILTER pass, finding o match. |
| `refuted` | Veredicto técnico de VALIDATE con contraevidencia o protección efectiva. | Ausencia universal ni FILTER reject. |
| `inconclusive` | VALIDATE no puede soportar ni refutar porque quedan obligaciones abiertas. | Refuted, supported o review. |
| `pass` | FILTER admite un resultado `supported` para la proyección de findings. | Match, detección, blind, novel o release. |
| `review` | FILTER conserva deuda de admisión explícita. | Pass, reject o finding. |
| `reject` | FILTER excluye la publicación por una razón independiente demostrada. | Refuted ni ausencia universal. |
| `finding` | `PublishedFinding`: VALIDATE `supported` + FILTER `pass` + `publication_eligibility` y lineage inmutable. | Match, detected, blind, novel o release. |
| `match` | Enlace post-producto entre output congelado y un oracle item exacto. | Veredicto del producto ni finding nuevo. |
| `detected` | Finding acreditado por un match dentro de cohort, denominador y evaluación explícitos. | Detección universal, blind o novel. |
| `known` | Material perteneciente a un corpus de regresión conocido y versionado. | Blind, novel o generalización. |
| `blind` | Evaluación con precommitment, cohort sellada y separación de capacidades verificada. | Perfil `generic_blind` por sí solo ni novel. |
| `novel` | Finding adjudicado fuera de corpora conocidos y del prior-art scope declarado. | Blind automático ni novedad universal. |
| `expert` | Revisión humana atribuida, acotada y firmada. | Corrección automática ni calidad global. |
| `release` | Artefacto versionado publicado tras candidate epoch, gates, dossier y tag inmutables. | PR, CI local, canario, replay conocido o bounty readiness. |

El JSON canónico amplía cada fila con `stage`, afirmación permitida, implicaciones
prohibidas y evidencia mínima. Las traducciones pueden cambiar la prosa, pero no
la identidad inglesa de estos términos ni su autoridad.

## Reglas de promoción

- MAP, TRACE, DISCOVER, ECONOMIC, VALUE e INVARIANT producen evidencia,
  señales, modelos o hipótesis; nunca findings.
- Sólo VALIDATE emite `supported`, `refuted` o `inconclusive`.
- Sólo FILTER emite `pass`, `review` o `reject`.
- Un finding exige simultáneamente el verdict `supported`, FILTER `pass`,
  `publication_eligibility` y referencias inmutables al candidate y al run.
- `match` y `detected` pertenecen al evaluador después de congelar los outputs
  del producto.
- `known` nunca se presenta como `blind`; `blind` nunca se deduce del nombre de
  un perfil; `novel` exige adjudicación independiente.
- Una release no concede por sí misma claims de recall, precisión, detección
  blind, novedad, utilidad para bounty ni generalización.

## Aliases prohibidos y compatibilidad

Los aliases `release_eligible` y `finding_eligibility`, incluso con namespace,
no conceden autoridad de claim. El campo canónico de admisión es
`publication_eligibility`; los claims se derivan de gates tipados del ledger.

Los campos serializados antiguos permanecen como deuda de compatibilidad hasta
`C1-021`. Mientras tanto sólo pueden citarse como legacy, deprecated,
compatibility-only, forbidden o con el valor literal `false`. Una aparición
positiva, no cualificada o con valor `true` falla el linter.

## Linter

Validación del registro, fixtures y documentación del repositorio:

```powershell
node --test test/product-claim-dictionary.test.mjs
node scripts/validate-product-claims.mjs --repo-root . --json
```

Auditoría coordinada de documentación activa en los quince repositorios:

```powershell
node scripts/validate-product-claims.mjs --workspace-root .. --json
```

El scope activo contiene `README.md`, `agents/README.md` y `docs/**/*.md`.
Changelogs, releases históricas, fixtures y source contracts no se reescriben
como si fueran claims actuales. Los contratos serializados que todavía usan un
alias legacy se eliminan únicamente mediante su tarea de migración registrada;
esta excepción de lectura no permite introducir usos nuevos.

## Evidencia exigida al escribir documentación

- `supported`, `refuted`, `inconclusive`, `pass`, `review` y `reject` deben
  nombrar el productor y el run cuando se presenten como resultados reales.
- `finding` debe enlazar verdict, FILTER decision, candidate y run.
- `match` y `detected` deben enlazar cohort, denominador, matcher y evaluación.
- `blind`, `novel`, `expert` y `release` requieren un enlace verificable al
  dossier que concede exactamente esa autoridad.
- Si la evidencia no existe, la redacción correcta es `pending`, `unknown`,
  hipótesis, deuda o resultado local de tests; nunca se degrada el término.
