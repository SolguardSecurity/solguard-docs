# Plantilla ejecutable para GPT-5.6-Sol

## 1. Objetivo

Esta plantilla convierte cada work package en una tarea pequeña, verificable y
con ownership disjunto. Extiende las plantillas actuales de `solguard-agents`;
no las sustituye silenciosamente. La implementación del programa deberá
trasladar este contrato a:

- `templates/task-brief.md`;
- `templates/worker-prompt.md`;
- `templates/reviewer-prompt.md`;
- `templates/final-report.md`;
- workflow de integración;
- validador de coordinación.

El usuario actúa como revisor/copiloto. GPT-5.6-Sol implementa, prueba,
documenta y entrega evidencia. Un segundo contexto GPT-5.6-Sol verifica el
resultado y el integrador de aceptación aplica la transacción al ledger. Nadie
cierra una casilla Markdown directamente.

Existen exactamente tres perfiles, discriminados por `task_type`:

- `implementation_task`: cambia código/docs/contracts **antes** del freeze;
  usa worktree, branch, tests, changelog y commits;
- `absence_receipt_task`: demuestra de forma read-only que un consumidor,
  contrato o path ya no existe en un tree Git exacto; produce una contribution
  receipt verificable, sin branch, diff, changelog ni commit;
- `operational_ceremony`: ejecuta una operación `OP-*` sobre SHAs/BOM ya
  congelados; repositorios y candidate son read-only, no crea branch, no edita,
  no actualiza changelog y no hace commit. Sólo realiza los writes explícitos
  del allowlist cerrado de su mode y emite artefactos/receipts firmados.

No existe perfil híbrido. `task_type` desconocido, ausencia del discriminante,
campos Git de implementación dentro de un receipt/ceremonia o cualquier
source-tree write no autorizado bloquean dispatch y anulan la evidencia. Las
secciones 3–9 son la plantilla `implementation_task`; §9.1 define el receipt de
ausencia; §10 es una plantilla operacional independiente. Ninguna de las dos
últimas hereda pasos de edición.

Dentro de `implementation_task`, `dispatch_kind` es
`primary_implementation|contribution_implementation`. Una contribución es la
unidad owner-única de un commit/repo dentro de un primary de integración
multi-repo: tiene ID, estado, versión, evidencia y verifier propios, pero nunca
acepta el parent ni concede un claim. El ledger/checklist debe contener cada
fila de commit de `06` como contribución; usar el ID agregado del parent como
branch de varios repos está prohibido.

## 2. Reglas globales para todos los workers

1. Leer completamente el `AGENTS.md` aplicable.
2. Leer `solguard-agents/PROJECT_CONTEXT.md`.
3. Leer `agents/README.md` del repositorio.
4. Resolver el repositorio desde `registry/repos.json`.
5. Leer `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md`, el nodo exacto de
   `acceptance-ledger.v1.json` y, si afecta lenguajes, la matriz `10`.
6. Confirmar `ledger_revision`, `node_version`, ID-set hash y estado de cada
   dependencia antes de empezar; una referencia a `main` o `latest` no sirve.
7. En `implementation_task`, confirmar cwd y root Git antes de toda escritura;
   en receipt/ceremonia, verificar SHAs/trees/BOM y mantener los repositorios
   read-only.
8. En implementación, inspeccionar `git status --short` y preservar cambios
   ajenos; en receipt/ceremonia, cualquier dirty tree o source write aborta.
9. Editar únicamente archivos asignados sólo en implementación; ownership de
   receipt/ceremonia se limita a sus outputs externos allowlisted.
10. Usar una rama `codex/<dispatch-id>-<slug>` sólo para un primary o
    contribution owner-único con `task_type=implementation_task`; un derived o
    una ceremonia no puede ser task Git, branch ni commit de implementación.
11. No usar comandos Git destructivos.
12. No cambiar schemas, JSON, API o autoridad fuera de un task contractual.
13. Usar exclusivamente contract IDs canónicos de `09`; no crear aliases.
14. No introducir product code en `solguard-agents`.
15. No acceder a ground truth sellado ni hacer alcanzables contratos de
    medición desde el runtime scanner.
16. No usar nombres, etiquetas o soluciones de benchmarks como señal de scan.
17. No presentar KNOWN como blind.
18. No inventar métricas, rendimiento o soporte.
19. Añadir tests en la misma unidad funcional para implementación; una
    ceremonia ejecuta únicamente verificadores ya congelados.
20. Ejecutar pruebas negativas, contractuales y end-to-end.
21. Actualizar el changelog nuevo sólo en implementación; post-freeze está
    prohibido.
22. Emitir artefactos machine-readable.
23. No editar `07_CHECKLIST_MAESTRA.md`; sólo el integrador la regenera desde
    una transacción válida del ledger.
24. Parar ante una dependencia ausente en vez de fabricar un fallback.
25. Resolver `node.predicate.reference` como path contenido en esta carpeta
    `tasks/`; traversal, path ausente o referencia fuera del snapshot bloquea
    dispatch.
26. Leer **completo** el documento referenciado y la sección/tabla exacta del
    `criteria_locator`; leer también completos los documentos normativos que esa
    sección enlace para el criterio. Un `must_hold` genérico no los sustituye.
27. Registrar path, locator y SHA-256 de cada input normativo en brief y
    `task-manifest.json`; no se acepta `latest`, memoria del agente ni resumen.
28. El dispatcher y el verifier recomputan esos digests contra la misma
    `ledger_revision`; missing/mismatch reabre o bloquea la tarea antes de
    escribir/aceptar.
29. Si predicate, locator y texto normativo discrepan, parar y tramitar una
    revisión del ledger; el worker no elige la interpretación conveniente.

## 3. Task brief canónico — `implementation_task`

Copiar el siguiente bloque en
`solguard-agents/sprints/<sprint-id>/tasks/<task-id>.md`.

```markdown
# <TASK-ID> — <resultado observable>

## Metadata

- Program: `solguard-detection-maturity-2026-07-25.3`
- Task type: `implementation_task`
- Dispatch kind: `<primary_implementation|contribution_implementation>`
- Ledger schema: `solguard-acceptance-ledger.v1`
- Ledger revision: `<exact integer>`
- Ledger ID-set SHA-256: `<exact hash>`
- Work package: `<primary ID canónico>`
- Contribution ID: `<canonical contribution ID or NOT_APPLICABLE>`
- Parent primary/integration gate:
- Acceptance eligibility:
  `<primary_transition_candidate|contribution_transition_only>`
- Node kind: `primary`
- Node version: `<exact integer>`
- Predicate reference: `<ledger predicate reference>`
- Predicate source path: `<contained exact path>`
- Criteria locator: `<section/table/row exact locator>`
- Predicate source SHA-256: `<exact digest>`
- Linked normative inputs: `<path@sha256 list>`
- Dependency-state hash at dispatch: `<exact hash>`
- Role: `<implementer|test-engineer|migration-worker|docs-worker>`
- Repository: `<solguard-*>`
- Repository root: `<absolute path>`
- Base commit: `<full SHA>`
- Branch: `codex/<dispatch-id>-<slug>`
- Required model: `GPT-5.6-Sol`
- Implementer identity: `<agent/run id>`
- Independent verifier: `<different agent/run id or UNASSIGNED>`
- Contract versions before: `<list>`
- Contract versions after: `<list or unchanged>`
- Claim profile affected, never granted by this task:
  `<none|partial_scope|bounty_vertical|full_eight_language|full_product>`
- Scope IDs affected: `<exact frozen IDs or none>`

## Objective

<Un solo resultado observable y falsable. No usar "mejorar", "robustecer" o
"dar soporte" sin definir el comportamiento que cambia.>

## User-visible outcome

<Qué será cierto después y cómo podrá comprobarlo un operador o consumidor.>

## Non-goals

- <Comportamiento explícitamente fuera>
- <Repositorio o componente que no se tocará>
- <Claim que este task no demuestra>

## Dependencies

| Dependency | Exact SHA/schema | Why required | Verification |
|---|---|---|---|
| `<repo/artifact>` | `<sha/version>` | `<reason>` | `<command>` |

No se permiten dependencias por `main`, tag móvil o "latest".
Cada fila debe coincidir con una arista `hard` o `contract` del ledger. Si el
brief necesita una arista nueva, primero se tramita una revisión del ledger; el
worker no la presupone.

## Authoritative inputs

- `AGENTS.md`
- `../solguard-agents/PROJECT_CONTEXT.md`
- `agents/README.md`
- `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md`
- `acceptance-ledger.v1.json@<ledger_revision>`
- `<node.predicate.reference completo>@<sha256>`
- `<documentos normativos enlazados por criteria_locator>@<sha256>`
- `10_MATRIZ_CERTIFICACION_SCOPES.md` cuando aplique
- `<ADR>`
- `<contract schema>`
- `<fixture manifest>`
- `<parent evidence root>`

## Ownership

### May edit

- `<exact file>`
- `<exact directory subtree>`

### Read-only

- `<dependency files>`
- `<audit evidence>`

### Must not edit

- `<files owned by parallel workers>`
- `<ground truth>`
- `<generated result baseline>`
- `<unrelated repositories>`

## Current behavior

<Evidence-backed description, including command/output/artifact.>

## Required behavior

1. `<postcondition>`
2. `<postcondition>`
3. `<failure behavior>`
4. `<provenance behavior>`
5. `<resource behavior>`

## Contract impact

| Contract ID/version | Producer/writer | Every consumer/reader | Reader gate | Writer gate | Schema old → new | Migration/window | Authority/cutover | Rollback |
|---|---|---|---|---|---|---|---|---|
| `<solguard-*.vN>` | `<one authority>` | `<complete list>` | `<old-new/new-new evidence>` | `<activation gate>` | `<exact versions>` | `<plan or none>` | `<exactly when or none>` | `<mechanism>` |

Usar una fila por **cada** contrato producido, consumido o modificado. `none`
sólo es válido si una búsqueda del registry y del diff demuestra cero impacto.
Omitir un consumer o compactar varios contract IDs en una sola fila bloquea el
task.

- Documentation updates: `<files>`

## Behavior matrix

| Case | Input/state | Expected artifact | Expected decision | Must not happen |
|---|---|---|---|---|
| Positive | `<case>` | `<artifact>` | `<state>` | `<bad outcome>` |
| Safe control | `<case>` | `<artifact>` | `<state>` | `<false pass>` |
| Near-miss | `<case>` | `<artifact>` | `<state>` | `<keyword match>` |
| Unsupported | `<case>` | `<artifact>` | `unsupported` | `<empty success>` |
| Malformed | `<case>` | `<failure>` | `failed` | `<crash/bypass>` |
| Resource limit | `<case>` | `<failure>` | `failed` | `<pass>` |
| Tampered | `<case>` | `<rejection>` | `failed` | `<consume>` |

## Implementation steps

1. Add or update contract fixtures.
2. Add the failing tests that express required behavior.
3. Implement the smallest coherent change.
4. Add negative, property and metamorphic tests.
5. Execute the affected producer-consumer matrix.
6. Execute the affected vertical slice.
7. Verify resource and failure behavior.
8. Update changelog and contract documentation.
9. Produce evidence manifest.
10. Reinspect the diff for scope drift.

No step se considera completado por descripción; debe tener output.

## Verification commands

### Preflight

```powershell
git rev-parse --show-toplevel
git rev-parse HEAD
git status --short
```

### Focused tests

```powershell
<exact command>
```

### Contract tests

```powershell
<exact producer-consumer command>
```

### Negative/adversarial tests

```powershell
<exact command>
```

### End-to-end

```powershell
<exact vertical-slice command>
```

### Regression

```powershell
<exact known-regression command or NOT_APPLICABLE with reason>
```

### Static/build checks

```powershell
<lint/typecheck/build/schema validation>
git diff --check
git status --short
```

Un comando aún inexistente debe ser parte explícita de la implementación; no
se incluirá como si hubiese sido ejecutado.

## Required fixtures

| Fixture | Purpose | Oracle independence | Expected result |
|---|---|---|---|
| `<vulnerable>` | Positive | `<why independent>` | `<finding>` |
| `<patched>` | Causal mutation | `<why>` | `<no finding>` |
| `<safe>` | Negative | `<why>` | `<no finding>` |
| `<near-miss>` | Anti-keyword | `<why>` | `<no finding>` |
| `<malformed>` | Failure | N/A | `<typed failure>` |

## Evidence deliverables

`solguard-task-evidence.v1` tiene un `subtype` cerrado:
`task_evidence_bundle | acceptance_transition_proposal |
independent_verification_report | integration_evidence_bundle`. Unknown subtype
falla. Todo envelope exige `task_id`, `node_version`, `ledger_revision`,
producer/tool/version, `created_at`, normative input digests, parent evidence
root, payload digest y firmas.

`task-manifest.json` usa `subtype=task_evidence_bundle` y contiene predicate
path/locator/digest, todos los normative inputs y `attachments[]`. El role de
cada attachment pertenece al enum cerrado:

```text
focused_test_report
contract_matrix_report
e2e_run_report
negative_test_report
resource_report
changed_contract_manifest
git_diff_summary
repository_status
reviewer_input_bundle
ledger_snapshot
external_timestamp_receipt
```

Cada attachment exige `artifact_id`, role, media type, `role_schema_digest`
registrado, producer tool/version, input artifact IDs, `content_digest`,
byte_size y locator contenido. Así un log/report interno no inventa un schema
top-level, pero su forma sigue congelada y content-addressed. Faltan o sobran
roles obligatorios, role desconocido, schema digest drift, locator traversal,
digest/size mismatch o attachment duplicado falla.

`review-request.json` usa
`subtype=acceptance_transition_proposal`, referencia el bundle/root exacto,
contiene la transición candidata `pending -> accepted`, snapshot de
ledger/node/dependency/ID-set y queda marcado no autoritativo, condicionado a
`verifier.verdict=ACCEPT`. El verificador emite
`independent_verification_report`; una integración multi-repo usa
`integration_evidence_bundle`. Un filename u objeto ad hoc no crea contrato.

## Commit plan

| Commit | Message | Files | Gate before commit |
|---|---|---|---|
| 1 | `<type>(scope): result [TASK-ID]` | `<list>` | `<tests>` |

No crear el commit si el gate falla.

## Stop conditions

Parar y reportar `BLOCKED` si:

- el root Git no coincide;
- existen cambios ajenos en archivos owned;
- falta una dependencia o schema;
- el task exige editar fuera de ownership;
- el comportamiento autoritativo es ambiguo;
- el único camino requiere consultar ground truth;
- un comando de validación no puede ejecutarse;
- una migración no tiene backup/rollback;
- aparece una vulnerabilidad o secreto fuera de scope;
- la solución requeriría ampliar materialmente el objetivo.
- el nodo no es `primary`, su versión cambió o el ledger revision/ID-set ya no
  coincide con el snapshot de dispatch;
- una dependencia está `pending`/`reopened` o su dependency-state hash cambió.

## Completion criteria

- [ ] Required behavior completo.
- [ ] Behavior matrix completa.
- [ ] Focused tests pasan.
- [ ] Contract tests pasan.
- [ ] Negative/adversarial tests pasan.
- [ ] E2E pasa.
- [ ] Regression aplicable pasa.
- [ ] Evidence root válido.
- [ ] Changelog y docs actualizados.
- [ ] Diff limitado al ownership.
- [ ] Independent verifier asignado.
- [ ] Snapshot del ledger todavía vigente o drift reportado como `BLOCKED`.

El worker no cambia el ledger ni marca la checklist maestra.
```

## 4. Prompt del worker

```text
Eres el implementador GPT-5.6-Sol del task <TASK-ID>.

Tu autoridad se limita al task brief adjunto. Primero lee todas las
instrucciones y contratos indicados. Confirma root Git, SHA base, worktree y
ownership. Preserva cambios ajenos.

Implementa el resultado completo, incluidos tests, fallos negativos,
vertical-slice E2E, changelog y artefactos. No uses ground truth de benchmark,
no cambies contratos silenciosamente y no presentes un score como decisión.

Si falta información autoritativa o el cambio requiere ampliar scope, detente
y reporta BLOCKED con evidencia exacta. No inventes fallbacks.

Antes de terminar, ejecuta todos los comandos del brief. Registra exit code,
duración observada, digest de inputs y rutas de outputs. "No ejecutado" nunca
equivale a pass.

Devuelve el Final Report canónico y el root del evidence bundle.
```

## 5. Final Report del implementador

```markdown
# Final Report — <TASK-ID>

## Verdict

`READY_FOR_INDEPENDENT_REVIEW | BLOCKED | FAILED`

## Result

<Resultado observable, sin marketing.>

## Repository state

- Root:
- Base SHA:
- Final SHA:
- Branch:
- Status:

## Changed files

| File | Why | Ownership matched |
|---|---|---:|

## Contract/API/schema changes

| Contract | Before | After | Consumers verified | Migration |
|---|---|---|---|---|

## Behavior matrix result

| Case | Expected | Actual | Evidence | Verdict |
|---|---|---|---|---|

## Commands

| Command | Exit | Result artifact | Verdict |
|---|---:|---|---|

## E2E result

- Run ID:
- Run root:
- Target manifest:
- Stage closure:
- Artifact closure:
- Finding decision:

## Regression

- Denominator:
- Passed:
- Failed:
- Excluded before run:
- Not run and reason:

## Evidence bundle

- Manifest:
- Merkle root:
- Signature:
- Reproduction command:

## Commits

| SHA | Message | Evidence |
|---|---|---|

## Deviations

<None or exact deviations.>

## Residual risks

<Risks not closed by this task.>

## Requested ledger review

- Node: `<primary ID>`
- Candidate transition after independent `ACCEPT`: `pending -> accepted`
- Node version and dependency-state hash:
- Authority exercised by implementer: `none`

Esto solicita revisión; no cambia el estado. El integrador es la única
identidad que puede aplicar la transacción tras el veredicto independiente.
```

## 6. Task del verificador independiente

El verificador recibe:

- task brief original;
- base y final SHA;
- diff;
- evidence bundle;
- contratos;
- comandos de reproducción;
- ninguna explicación privada adicional necesaria para que pase.

No recibe ownership de implementación. Puede escribir únicamente el informe de
review y artefactos de verificación.

```markdown
# Verification Brief — <TASK-ID>

## Objective

Determinar si el resultado cumple literalmente el task brief y permite
proponer al integrador la transición `pending -> accepted` del nodo primary.

## Required checks

1. Verificar instrucciones, root, SHA y ownership.
2. Inspeccionar diff completo.
3. Comprobar autoridad y contratos.
4. Ejecutar tests focused desde entorno limpio.
5. Ejecutar contract matrix.
6. Ejecutar tests negativos no elegidos por el implementador.
7. Reproducir vertical slice.
8. Verificar hashes y lineage.
9. Buscar bypasses, fail-open y denominator loss.
10. Revisar changelog, docs y rollback.
11. Comprobar que la métrica afirmada sale de artefactos.
12. Clasificar residual risk.

## Adversarial additions

- mutar input válido;
- retirar artefacto requerido;
- alterar hash;
- usar schema anterior;
- agotar budget;
- repetir con estado limpio;
- repetir con orden distinto;
- presentar safe near-miss;
- verificar que no existe acceso a oracle.

## Verdict

`ACCEPT | REJECT | BLOCKED`

`ACCEPT` exige cero finding P0/P1/P2 abierto y todos los gates obligatorios.
```

## 7. Reporte del verificador

```markdown
# Independent Verification — <TASK-ID>

## Verdict

`ACCEPT | REJECT | BLOCKED`

## Findings

| Severity | File/artifact | Evidence | Contract impact | Required correction |
|---|---|---|---|---|

## Reproduced commands

| Command | Exit | Matches worker | Artifact |
|---|---:|---:|---|

## Additional adversarial tests

| Test | Expected | Actual | Verdict |
|---|---|---|---|

## Contract compatibility

- Producer:
- Consumers:
- Old/new matrix:
- Cutover safe:

## Evidence verification

- Manifest valid:
- Root valid:
- Signature valid:
- Inputs available:
- Run reproducible:

## Scope verification

- Files within ownership:
- Unexpected dependencies:
- Oracle access:
- Worktree contamination:

## Residual risk

<Exact risk; no "none" unless demostrado.>

## Ledger acceptance proposal

- Dispatch target: `<primary ID|contribution ID>`
- Parent primary: `<ID or NOT_APPLICABLE>`
- Proposal:
  `PROPOSE_PENDING_TO_ACCEPTED | REMAINS_PENDING | PROPOSE_REOPEN`
- Expected current state: `pending`
- Node version:
- Dependency-state hash:
- Evidence pointer:
- Verification root:
- Reason:
```

`PROPOSE_PENDING_TO_ACCEPTED` sólo es válido con `Verdict: ACCEPT`. No muta el
ledger ni `07`. Si el veredicto es `REJECT`, se crea un nuevo task de
corrección. El verificador no arregla el código dentro del mismo contexto y no
cambia su propio test para hacerlo pasar.

Para `contribution_implementation`, la única transición posible es
`accept_contribution` sobre su propio ID. El parent primary permanece pending
hasta que **todas** sus contribuciones exactas estén accepted y otro brief
`primary_implementation` de su owner ejecute la integración/E2E. Missing/extra
contribution, owner/repo mismatch o reutilizar un evidence root entre
contribuciones falla.

## 8. Plantilla de integración multi-repositorio

```markdown
# Integration Wave — <PRIMARY-INTEGRATION-TASK-ID>

- Ledger node: `<primary ID, for example RUN-207-E2E>`
- Parent derived train: `<TRAIN-C0..TRAIN-C7>`
- The derived train is not a task, branch or commit ID.

## Contracts

| Contract ID/version | Authority writer | Every reader | Old-reader window | New-writer gate | Cutover | Retirement signal | Rollback |
|---|---|---|---|---|---|---|---|
| `<canonical ID>` | `<one>` | `<complete list>` | `<matrix>` | `<evidence gate>` | `<exact event>` | `<zero-use evidence>` | `<forward-safe mechanism>` |

La tabla cubre todos los contract edges del primary de integración. La
aceptación compara el set de filas con registry+ledger; missing/extra/duplicate
contract o consumer falla.

## Pins

| Repo | Candidate SHA | Tree | Contract version | Clean |
|---|---|---|---|---:|

## Matrix

| Producer | Consumer | Old/old | New/old | Old/new | New/new |
|---|---|---:|---:|---:|---:|

## Publication order

1. Fixtures/schema.
2. Compatible readers.
3. New producers.
4. Migration.
5. Authority cutover.
6. Legacy telemetry reaches zero.
7. Legacy removal.

## E2E

- Target manifest:
- Run root:
- Required stages:
- Failure injections:
- Expected finding states:

## Rollback

- Trigger:
- Stop/revert new writer first:
- Restore previous authority/data format:
- Keep compatible readers until old format is restored and verified:
- Remove compatible readers last:
- Database restore:
- Artifact isolation:
- Verification:

## Acceptance

- [ ] All pins exact.
- [ ] Contract matrix green.
- [ ] E2E green.
- [ ] Negative matrix green.
- [ ] Migration and rollback green.
- [ ] Independent integration verifier accepts.
```

## 9. Especialización para tareas de lenguaje C0-C4

Cada task de lenguaje añade:

```markdown
## Language implementation scope

- Language:
- Exact scope ID from matrix 10:
- Compiler/runtime versions:
- Ecosystems:
- Protocol families:
- Build profiles:
- Supported feature set:
- Explicit exclusions:
- Unsupported behavior:

## Conformance

- Parser/frontend fixtures:
- Compiler-derived conformance oracle, nunca benchmark truth:
- IR golden cases:
- Binding cases:
- Replay cases:
- Cross-language boundaries:

## Economic families

| Family | Vulnerable | Patched | Safe | Near-miss | Metamorphic |
|---|---:|---:|---:|---:|---:|

## C0-C4 transition requested

- Current qualified level:
- Requested level, never above C4:
- Exact C0-C4 gate IDs:
- Gate evidence roots:
- C5 candidate manifest/root:
- Frozen scanner/rules/prompts/models/proof-policy/admission-policy hashes:
- Generic `materiality_profile_root`:
- `policy_set_commitment_root`: `NOT_AVAILABLE_TO_C0_C4_TASK`
- C5A/C5B status: `NOT_RUN_BY_THIS_TASK`
```

No se admite un task llamado «añadir soporte Rust» o equivalente. Debe declarar
ecosistema, toolchain, families y nivel solicitado. Una tarea de
implementación de lenguaje no solicita ni ejecuta C5, no accede a holdout y no
contiene una campaña blind. C5A y C5B se ejecutan exclusivamente como campañas
operacionales externas C7, una vez congelado el candidato, por custodio,
operador y evaluadores separados.

## 9.1 Receipt read-only de ausencia

`task_type=absence_receipt_task` sólo se usa cuando `06_PLAN_DE_COMMITS.md`
declara explícitamente una contribution sin commit cuya entrega es probar que
un consumidor o contrato está ausente. No es una implementación vacía ni una
ceremonia de campaña.

```markdown
# Absence receipt contribution — <CONTRIBUTION-ID>

## Metadata

- Task type: `absence_receipt_task`
- Dispatch kind: `absence_receipt_contribution`
- Parent primary:
- Contribution ID/version:
- Ledger revision / ID-set hash:
- Repository ID / absolute root:
- Base full commit SHA:
- Git tree hash:
- Repository status before: `CLEAN`
- Branch/edit/changelog/commit/changed_files: `FORBIDDEN`
- Absence predicate ID and exact normative locator:
- Independent verifier identity/key:

## Bounded inventory

- Included roots:
- Explicit excluded roots and justification:
- Case-sensitivity and symlink policy:
- File types/encodings:
- Literal identifiers:
- Structural/AST queries:
- Generated/vendor policy:
- Inventory tool IDs/versions/digests:

## Frozen commands

| Sequence | Read-only command | Expected exit | Expected machine result |
|---:|---|---:|---|
| 1 | `<bounded inventory>` | `0` | `<zero matching authoritative consumers>` |

## Receipt

- Schema: `solguard-absence-receipt-contribution.v1`
- Contribution/parent/repository/base/tree bindings:
- Inventory specification root:
- Commands, exit codes and stdout/stderr artifact roots:
- Traversed path count/root and exclusion root:
- Match count and matching artifact IDs:
- Predicate verdict: `ABSENT | PRESENT | INDETERMINATE`
- Repository status after: `CLEAN`
- Evidence root:
- Producer signature:
- External timestamp receipts:
- Independent reproduction receipt/root/signature:
- Transition proposed: `accept_contribution` only if `ABSENT`
```

El receipt conserva el inventario completo por paths/digests, no sólo una línea
«0 matches». `PRESENT`, permisos/encoding no resueltos, traversal parcial,
symlink escape, tool crash o diferencia entre producer/verifier producen
`INDETERMINATE` o `PRESENT`; nunca `ABSENT`. Está prohibido crear un commit vacío
para satisfacer esta contribution. El ledger exige este descriptor sólo a
`C2-CON-RM-14` y `C2-CON-RM-15`; cualquier otro uso requiere revisar el programa.

## 10. Especialización para medición ciega

Un worker del scanner no puede ser custodio ni evaluator. Ésta es la plantilla
completa `operational_ceremony` para operaciones `OP-*` que abren un candidate
epoch o producen evidencia de validación, freeze, DB, C5A/B, H-GEN/H-NOVEL,
LIVE-AUTH o cierre C7; no hereda Metadata, Ownership, Implementation steps,
changelog ni Commit plan de §3. El dispatcher rechaza una ceremonia si aparece
branch, `may edit`, commit message o source write no allowlisted.

```markdown
# Operational ceremony — <OP-ID>

## Operational metadata

- Task type: `operational_ceremony`
- Operation ID:
- Ceremony kind: `ledger_evidence | tag_realization`
- Ledger revision / ID-set hash:
- Dependency-state hash at dispatch:
- Candidate epoch definition ID / `solguard-candidate-epoch.v1` root:
- Candidate epoch open event ID/root, absent only for `candidate_epoch_open`:
- Candidate epoch freeze event ID/root, required only by post-freeze branches:
- Release-train closure ID-set root:
- Frozen candidate full SHAs and tree hashes:
- Evidence-store create-only prefix:
- Scratch root/quota/cleanup policy when the closed branch permits it:
- Declared write-allowlist root:
- Source repositories: `READ_ONLY`
- Branch/edit/changelog/commit: `FORBIDDEN`

## Conditional dispatch metadata

If `ceremony_kind=ledger_evidence`:

- Primary/derived gates evidenced, never self-accepted:
- Primary node version / evidence mode:
- Campaign profile, only when evidence mode is campaign:
- Measurement subtype, only when evidence mode is measurement:
- Mode-specific frozen input roots:
- Mode-specific output roots to create:

If `ceremony_kind=tag_realization`:

- FINAL-006 event ID/self-hash/ledger root:
- Frozen tag plan ID/root:
- Frozen 15-repository set root:
- Tag absence precondition output root to create:
- Tag realization receipt output root to create:
- Canonical remotes and publication policy root:

## Operation-specific preconditions

| Predicate | Exact artifact/root | Frozen verifier command | Expected result |
|---|---|---|---|
| `<candidate/BOM/pair/auth/dependency predicate>` | `<content-addressed ref>` | `<exact command from frozen verifier BOM>` | `<machine-readable verdict>` |

En validation/freeze, comandos, verifier y emitter ya existen en SHAs/roots de
CAP/candidate precongelados; OP-FREEZE prueba igualdad byte-exact y los incorpora
al governance/evidence BOM que produce. Sólo las ceremonias postfreeze exigen
membership previa dentro de los tres BOM aceptados. Crear o editar un verifier
durante cualquier ceremonia invalida la ejecución.

## Closed operation branch

| Branch | Expected ledger operation | Required inputs | Required outputs | Forbidden |
|---|---|---|---|---|
| `candidate_epoch_open` | `record_candidate_epoch_open` | immutable epoch definition/root, planned input/tooling sets, accepted input/tooling memberships, resource-profile root, parent-close binding when full | create-once open event, accepted lifecycle transition and external timestamp quorum | future validation/freeze/close IDs, mutable lifecycle fields, unaccepted membership, source tree not contained in tooling membership |
| `validation` | `record_validation` | candidate SHAs/trees/root, validation manifest, commands, environment, denominator | terminal test/failure artifacts and validation event | BOM output used as prior input, campaign/policy/truth placeholders |
| `freeze_attestation` | `record_freeze_attestation` | candidate root + accepted validation event roots + capability verifier roots | attestation-kind-specific SCOPE/BOM/ISO roots, signatures and timestamp | treating a produced root as an input, campaign metrics |
| `database_cutover` | `record_database_cutover` | DB-CAP, exact old/new paths, legacy digest/backup and migration plan | step receipts for create-once, migrate, shadow, zero-writer, cutover, guard, retention/forward rollback | source Git writes, downgrade, campaign fields |
| `campaign` | `record_campaign` | candidate + three accepted BOM roots + campaign/pair/corpus/truth/contamination inputs | sealed campaign manifest/output/attempt roots | missing campaign context, post-hoc inputs |
| `measurement` | `record_measurement` | candidate + three BOM roots + exact validation/campaign/report subtype inputs | provenance/report/dossier instance and verifier receipt | generic context that omits required subtype bindings |
| `upstream_nonpass` | `record_upstream_nonpass` | pending primary with `terminalizable=true` + same-epoch terminal blocker event/evidence + dependency-path root | one `terminal_not_run` transition with verifier | runnable or non-terminalizable target, implementation/contribution, cross-epoch blocker, batch terminalization |
| `candidate_epoch_close_vertical` | `record_candidate_epoch_close` | frozen vertical epoch + complete target/attempt/output/reveal/adjudication/result sets + exact single claim observation | 100 % TRAIN/DEV contamination mapping, terminal epoch outcome and successor-precondition root | campaign manifest, metric failure relabeled pass, omitted attempt/result, successor already open |
| `candidate_epoch_close_full` | `record_candidate_epoch_close` | frozen full evaluation closure + complete terminal bindings + exact `CLAIM-001..006` observations + resource compliance | terminal `closed_pass|closed_nonpass`; non-pass dossier create-only when needed | contamination/successor fields, FINAL/RELEASE/tag evidence, observation singular, omitted attempt/result, non-pass relabeled pass |
| `final_evidence` | `record_final_evidence` | dossier evidence revision + exact reports/ledger roots | one FINAL-001..005 evidence/acceptance event | release decision/pre-promotion root not yet created, singular campaign placeholders |
| `release_pre_tag` | `accept_release_pre_tag` | derived release decision + pre-promotion root + release-pre-tag dossier/DSSE | FINAL-006 event/root | tag object IDs or post-promotion root |
| `post_tag_terminal` | `accept_post_tag_terminal` | FINAL-006 event/root + absence precondition + 15/15 tag realization + terminal dossier | atomic FINAL-007/derived post-state | post-state root inside dossier, missing/recreated tag |
| `tag_realization` | none; receipt input for `post_tag_terminal` | FINAL-006, frozen tag plan, local+remote absence policy | absence receipt, exactly 15 signed local+remote tag publications, realization receipt | ledger transition, source/branch/index/commit write, local-only tag, force/delete/recreate |

`candidate_epoch_close` usa dependencies tipadas `terminal_observation`, no
`hard`: cada gate observado debe estar exactamente `accepted`,
`terminal_failed`, `terminal_invalid` o `insufficient_evidence` y portar su
evidence root. `pending|reopened` o ausencia bloquea close; un non-pass observado
no se vuelve ready para ningún claim.

`campaign` contiene otra union cerrada:

| Campaign profile | Required | Forbidden |
|---|---|---|
| `corpus_snapshot` | corpus manifest, truth-item set, contamination event set/freeze root, historical reconciliation, signatures/verifier/timestamp quorum | campaign manifest(s), scan output, measurement report, reveal/openings |
| `h_gen_pair_seal` | exactly two H-GEN A/B manifest/precommit roots, pair commitment, disjoint cohort/truth roots, same candidate/BOM/harness/scope, policies/frame/power/stopping | output/reveal/metrics, third campaign, H-NOVEL data |
| `h_novel_pair_seal` | exactly two H-NOVEL A/B manifest/precommit roots, pair commitment, disjoint cohorts, frozen novelty inventory/taxonomy, same candidate/BOM/harness/scope, policies/frame/power/stopping | output/reveal/metrics, known-only substitution, third campaign |
| `bounty_vertical_preregistration` | candidate root, `SOL-EVM-DEFI`, exact H-GEN/H-NOVEL pair IDs, LIVE frame/auth policy, power/endpoints/thresholds/stopping and claim wording root | truth bytes, campaign outputs, reveal, observed metrics or nonvertical scope |

Profile ausente/desconocido, cardinalidad distinta o campo de otra fila falla.

`measurement` contiene una segunda union cerrada y cardinalidades relacionales
exactas:

| Measurement subtype | Required bindings | Cardinality | Forbidden |
|---|---|---|---|
| `canary_validation` | validation manifest, denominator, vertical-slice set/root, attempts/failures | exactly one validation manifest; zero campaign refs | campaign, cohort, truth, reveal or materiality-assessment fields |
| `known_campaign` | KNOWN manifest/output/truth/report/provenance | exactly one campaign manifest and one report | pair/counterpart or LIVE authorization |
| `h_gen_scope_replica` | one H-GEN A **or** B instance, pair commitment/counterpart, one scope, power/thresholds, report/provenance/opening/assessment roots | `campaign_manifest_roots[1]`, `scope_ids[1]`, replica enum A/B | aggregate over scopes, unpaired instance, second manifest |
| `h_gen_pair_aggregate` | H-GEN A+B pair, reports/provenance, scope-result set, power/thresholds and two-set roots | `campaign_manifest_roots[2]`, distinct cohorts A/B, exactly one pair/set root | singleton, third campaign, retuning |
| `h_novel_scope_replica` | one H-NOVEL A **or** B instance, pair commitment/counterpart, one scope, novelty inventory/taxonomy, power/thresholds, report/provenance/opening/assessment roots | `campaign_manifest_roots[1]`, `scope_ids[1]`, replica enum A/B | aggregate over scopes, unpaired instance, known-only evidence, second manifest |
| `h_novel_pair_aggregate` | H-NOVEL A+B pair, novelty taxonomy/inventory roots, reports/provenance and two-set roots | `campaign_manifest_roots[2]`, distinct cohorts A/B, exactly one pair/set root | singleton, known-only evidence, post-hoc novelty |
| `live_auth_campaign` | LIVE manifest/output, empty oracle, per-attempt authorization/status, confirmations/materiality/report | `campaign_manifest_roots[1]`, `live_authorization_roots[1]` | nonempty truth, pair placeholder, unauthorized target |
| `chaos_validation` | frozen chaos manifest, injection/run source set, denominator, terminal failures/recovery/report | one chaos manifest; `source_run_count == len(source_run_roots) >= 1`; campaign refs exactly equal the declared source campaigns and may be empty | invented run, missing failure, mutation of source campaign |

Campo de otra fila, placeholder, `N/A`, null, count/array mismatch o campaign
singular genérico falla schema; un campo no aplicable se omite.

La ruta vertical usa pair-seal primaries propios y cuatro réplicas distintas:
`VERTICAL-EVM-HGEN-A-001/B-001` usan `h_gen_scope_replica`;
`VERTICAL-EVM-HNOVEL-A-001/B-001` usan `h_novel_scope_replica`.
`VERTICAL-EVM-BLIND-001` y `VERTICAL-EVM-NOVEL-001` son AND derived de sus
seals/réplicas; `VERTICAL-EVM-LIVE-001` usa `live_auth_campaign` y
`VERTICAL-EVM-CHAOS-001` usa `chaos_validation`. Cada descriptor vertical añade
obligatoriamente
`claim_profile=bounty_vertical`, `scope_ids=[SOL-EVM-DEFI]`,
`vertical_profile_root` y los pair/frame/auth roots exactos pre-registrados.
Prohíbe refs a H-GEN/H-NOVEL/LIVE globales, `SOL-EVM-DEFI-C5A/B` y TEST-V6/V7/V8:
la evidencia vertical es una instancia independiente y no se cuenta dos veces.

## Sealed campaign bindings

El bloque común es obligatorio únicamente para campaign profiles
`h_gen_pair_seal|h_novel_pair_seal` y para
`known_campaign|h_gen_scope_replica|h_gen_pair_aggregate|
h_novel_scope_replica|h_novel_pair_aggregate|live_auth_campaign`. Se omite completo en validation,
freeze, DB, candidate-epoch close, final, tag, `corpus_snapshot`,
`bounty_vertical_preregistration`, `canary_validation` y `chaos_validation`:

- Normative protocol:
  `05_VALIDACION_CIEGA_Y_RELEASE.md@<exact sha256>, read_complete=true`
- Claim:
- Claim profile:
  `<partial_scope|bounty_vertical|full_eight_language|full_product>`
- Operational gate IDs:
- Campaign manifest IDs/roots with subtype cardinality proof:
- Campaign kind(s)/cohort(s):
- Truth mode/root:
- Candidate freeze root:
- Public manifest root:
- Scanner image digest:
- Scanner runtime BOM root:
- Build/execution TCB BOM root:
- Governance/evidence BOM root:
- Harness root:
- Scope IDs and C0-C4 candidate roots:
- Generic materiality profile root:
- Policy commitment scheme: `solguard-policy-set-commitment.v1`
- Policy-set hiding commitment root:
- Allowed corpus root:
- Contamination root at freeze:
- Holdout public root:
- Sampling frame/selection seed root:
- Power analysis root and `N`/`n_eff` by scope/cohort:
- Attempts per slot:
- Budget total/per target:
- Retry policy:
- Stopping rule:
- Pre-registered metrics:
- Pre-registered thresholds:
- Abort conditions:

Sólo `h_gen_scope_replica|h_gen_pair_aggregate|h_novel_scope_replica|
h_novel_pair_aggregate` añaden:

- Pair ID:
- Cohort precommitment roots:
- Paired campaign commitment:
- Counterpart campaign ID(s):
- Counterpart manifest IDs/self-hashes:
- Pair commitment external timestamp receipt IDs before either scan:

Sólo `live_auth_campaign` añade:

- LIVE authorization artifact ref/digest/root:
- LIVE issuer/signature, authority-chain ref/digest/root, trust-policy root,
  target ownership binding and independent attestor:
- LIVE authorized subject:
- LIVE target/revision/program scope:
- LIVE `valid_from` / `valid_to` and status/revocation snapshot at every start:
- LIVE allowed actions/probes, rate/resource limits and prohibited actions:

No se escribe `NOT_LIVE`, `N/A`, null, array vacío ficticio ni campo pair/LIVE en
otro subtype.

## Human and key separation

Se incluye **sólo** la tabla del branch; roles no aplicables se omiten:

| Branch | Roles humanos/keys obligatorios y distintos |
|---|---|
| `candidate_epoch_open` | candidate maintainer, epoch-definition verifier, acceptance verifier |
| `validation` / `canary_validation` / `chaos_validation` | runner, evidence verifier |
| `freeze_attestation` | freeze builder, isolation/BOM attestor, acceptance verifier |
| `database_cutover` | DB operator, migration/shadow verifier, acceptance verifier |
| `corpus_snapshot` | corpus/truth custodian, import operator, contamination/reconciliation verifier, acceptance verifier |
| `bounty_vertical_preregistration` | candidate maintainer, measurement authority, cohort/frame selector, authorization-policy reviewer, acceptance verifier |
| H-GEN/H-NOVEL pair seal | candidate maintainer, ground-truth custodian, cohort selector, measurement authority, acceptance verifier |
| KNOWN/H-GEN/H-NOVEL execution or measurement | maintainer, custodian, selector, scanner operator, isolation attestor, evaluator/adjudicator, acceptance verifier; todos pairwise separados según el protocolo |
| LIVE | maintainer, authorization issuer, authorization attestor, scanner operator, isolation attestor, external confirmator, evaluator/adjudicator, acceptance verifier |
| `candidate_epoch_close` | contamination custodian, epoch close producer, acceptance verifier |
| `final_evidence` | named FINAL owner/evidence producer, acceptance verifier |
| `release_pre_tag` | dossier builder, governance evidence authority, release approver, acceptance verifier |
| `tag_realization` | tag publisher, remote audit authority, acceptance verifier |
| `post_tag_terminal` | terminal dossier builder, acceptance integrator, acceptance verifier |

La instancia materializa `human_identity`, credential/key ID y signed
input/output para cada rol requerido. Acceptance verifier es distinto de todo
evidence producer que verifica; release approver es distinto de dossier builder
y verifier. Dos GPTs, chats, cuentas, worktrees o run IDs controlados por la
misma persona **no** crean independencia humana.

## Post-seal/reveal outputs

Este bloque se incluye sólo para campaign y measurement; cada subtype omite los
campos que su tabla prohíbe:

- Attempt ledger/root including zero-result/failures:
- Output seal root and external timestamp:
- Target policy openings root:
- Finding materiality assessments root:
- Adjudication root and 100 % subject coverage:
- Metric provenance root:
- Post-reveal contamination event chain/root:
- MeasurementReport artifact/root and instance role:
- Dossier revision/root:
- Ledger event/root:

## Negative capability

Se incluye sólo en validation/campaign/measurement y declara pruebas reales, no
placeholders. DB/final/tag usan sus forbidden fields y el write audit cerrado.

- Network:
- DNS:
- Shared folders:
- Credentials:
- Legacy database:
- Sentinel locations:
- Previous state:
- Forbidden scanner fields:
  `target_program_policy_root`, membership proof, program/category IDs,
  target-specific mapping/threshold/price and `program_severity`
- Commitment dictionary/fingerprint/leak probes:

## One-shot

Para campaign/measurement:

- Retries: exactly the pre-registered policy above; every attempt retained
- Selective exclusion: forbidden
- Threshold change after start: forbidden
- Output mutation after seal: forbidden

DB usa su state machine reanudable por receipts, nunca un rerun desde cero que
borre pasos. Tag realization tiene un solo intento lógico: conserva éxitos
parciales y prohíbe borrar/recrear para “repetir”.

## Operational write allowlist

El manifest materializa paths absolutos resueltos, expected object IDs, cuotas y
actor autorizado. Variables no resueltas, glob, symlink/reparse-point escape o
un path padre amplio fallan preflight.

Writes comunes permitidos:

- objetos content-addressed nuevos bajo
  `<evidence-store>/objects/sha256/<digest>` con create-only/O_EXCL;
- receipts, manifests y outputs nuevos bajo el prefix exacto del OP;
- requests a los dos endpoints de timestamp/transparency allowlisted y sus
  responses conservadas como `solguard-external-timestamp-receipt.v1`;
- sólo el acceptance integrator, después de verificar, puede crear
  `ledger/events/<sequence>-<event_id>.json`,
  `ledger/snapshots/<revision>-<root>.json` y
  `ledger/checklists/<revision>-<root>.md`; el JSONL es una vista regenerada.

Scratch aislado, permitido sólo si el branch lo declara:

- root nuevo `<scratch-root>/<operation-id>/<random-run-id>` fuera de todos los
  repos, evidence store y caches compartidos;
- TEMP/TMP, compiler/build/model/package caches y homes de herramientas se
  redirigen dentro de ese root; redirección incompleta aborta;
- filesystem, bytes, procesos, CPU, memoria y tiempo tienen cuotas congeladas;
- un before/after manifest conserva paths, digests, tamaños, exits, truncation y
  cleanup result; outputs autoritativos se copian una vez al CAS y se verifican
  antes de limpiar;
- scratch superviviente se pone en quarantine y se registra; nunca se reutiliza
  como input de otro intento.

Allowlist adicional por branch:

| Branch | Writes adicionales exactos |
|---|---|
| validation/freeze/campaign/measurement/candidate-epoch close/final | sólo scratch aislado declarado; source, candidate, BOM y shared cache permanecen read-only |
| `database_cutover` | crear/escribir `C:\Users\Roger Gómez Martínez\Documents\GitHub\solguard-database\data\benchmarks.sqlite` y únicamente sus sidecars SQLite `benchmarks.sqlite-wal`, `benchmarks.sqlite-shm`, `benchmarks.sqlite-journal`; backup/quarantine/receipts sólo bajo el prefix externo del OP |
| `tag_realization` | crear sólo los quince objetos annotated-tag esperados y refs locales `refs/tags/<frozen-name>`, y publicar sólo esos refs a los quince canonical remotes mediante non-force push/API allowlisted |
| ledger integration | crear el event object, snapshot y checklist externos de una sola revisión; nunca reescribir seed/spec de esta carpeta |

En DB, `...\data\benckmarks.sqlite` es siempre read-only: se abre mediante URI
read-only/immutable cuando aplique y su backup externo se verifica antes de
crear la nueva base. `.git`, tracked source, config, branches, index y HEAD
permanecen inmutables; el delta de `git status` sólo puede contener los paths de
runtime DB allowlisted. En tag realization, HEAD/index/worktree/branches/commits
permanecen byte-exact; refs/objects inesperados, remote distinto, force,
delete/recreate o tag sólo local abortan sin deshacer éxitos parciales.

## Acceptance output

- Node evidence mode resolved from ledger, not operator-selectable:
- Expected ledger operation resolved from node ID/mode, not operator-selectable:
- Producer artifact ID/root and instance role:
- Campaign/cohort/scope instance bindings:
- Canonical event schema/version:
- Required measurement context root:
- Independent verifier command/result/root:
- Dossier entry IDs/role-schema/content digests:
- External timestamp receipts:
- External event-object/snapshot/checklist paths and roots, if integrator:

## Final operational report

- Verdict: `EVIDENCE_READY | ABORTED_INVALID | FAILED`
- Frozen inputs verified:
- Attempts expected/observed/terminal:
- Outputs and failures sealed:
- Contract instances emitted:
- Roots/signatures/timestamps:
- Human/key separation verdict:
- Authorization verdict when LIVE:
- Contamination/pairing verdict:
- Independent reproduction:
- Gate transition proposed, never applied by operator:
- Residual risks and reason codes:
- Repository write audit: `ZERO_UNAUTHORIZED_WRITES` or failure evidence,
  including allowlisted-write manifest/root:

Todo repo, candidate image, harness, BOM, manifest sellado y artefacto previo es
read-only salvo las excepciones cerradas DB/tag anteriores. Un write fuera del
allowlist, policy/auth mismatch, authorization
expirada/revocada/out-of-scope, pair/counterpart ausente o no timestamped antes
del primer scan, contamination chain incompleta o colisión no contabilizada
produce `ABORTED_INVALID`, conserva intentos y no acepta ningún gate.

Read-only se evalúa por candidate epoch. Tras cerrar `RC-V-EVM-1`, nuevos commits
pueden construir `RC-FULL-1`, pero ninguna ceremonia puede usar esos trees para
completar, reabrir o reinterpretar un artifact vertical. Cross-epoch ref,
ausencia de `candidate_epoch_id/root` o reutilización de una instancia
CORPUS/CANARY/KNOWN/holdout/novel/chaos/LIVE falla antes de ejecutar.
```

## 11. Transacción de aceptación y regeneración

`acceptance-ledger.v1.json` y `07_CHECKLIST_MAESTRA.md` de esta carpeta son
seed/spec y proyección inicial; no reciben diffs operacionales. Tras un
veredicto independiente `ACCEPT`, el verificador emite una propuesta firmada y
el integrador ejecuta una transacción contra el último snapshot externo
autoritativo:

```text
expected transition:
  implementation/contribution/accept_*: pending -> accepted
  record_* pass: pending -> accepted
  record_* non-pass: pending ->
    terminal_failed | terminal_invalid | insufficient_evidence
  record_upstream_nonpass: pending -> terminal_not_run
authority: acceptance integrator
common preconditions:
  current_ledger_revision == reviewed_parent_revision
  current_ledger_root == reviewed_parent_root
  current_head_event_hash == reviewed_head_event_hash
  current_authoritative_commit_receipt_root ==
    reviewed_authoritative_commit_receipt_root
  current_dependency_state_hash == reviewed_dependency_state_hash
  verifier.verdict == ACCEPT
  verifier.human_identity != evidence_producer.human_identity
  verifier.key_id != evidence_producer.key_id

primary branch:
  node.kind == primary
  node.state == pending
  node.node_version == reviewed_node_version
  node.terminalizable is an explicit immutable boolean, never inferred from
    node.operational or evidence_mode
  every hard dependency is ready by kind:
    primary/contribution == accepted
    derived == satisfied at this exact revision/operand-state hash, with a valid
      materialization receipt when the derived node is operational
  every contract dependency verified at exact version
  every required contribution accepted at its exact version/evidence/commit
  every instance-bound dependency verified against producer_artifact_id,
    producer_artifact_root, instance_role, cohort_id/scope_id and digest
  expected operation is derived from node.evidence_mode and exact node ID
  all mode-specific context/cardinality/role-separation constraints hold
  terminal_outcome/reason/evidence are complete
  only pass may produce accepted

upstream-nonpass branch:
  target.kind == primary
  target.terminalizable == true
  target belongs to the same immutable candidate epoch and to the frozen
    closure set that governs its lifecycle transition
  target.state == pending
  at least one immutable hard ancestor is terminal non-pass in that same epoch
  dependency_path_root recomputes against the current DAG
  target cannot be runnable in this epoch
  one event transitions exactly one target to terminal_not_run

contribution branch:
  contribution.state == pending
  contribution.contribution_version == reviewed_contribution_version
  contribution.owner_repo is exactly one repository
  parent_primary_id/integration_gate match the frozen dispatch
  every hard_contribution_dependencies[] entry has
    contribution_id, type == hard_contribution,
    required_state == accepted and publication_receipt == required
  every referenced contribution is accepted at exact contribution_version,
    accepted_subject_binding (commit_sha or absence_tree_receipt_id/root),
    immutable_evidence_root and publication_receipt_root
  implementation descriptor requires branch, changed_files, tests, changelog,
    exactly its planned commit and publication receipt
  absence_receipt descriptor requires base/tree/inventory/predicate receipt,
    forbids branch, changed_files, changelog and commit
  expected operation == accept_contribution
  transition cannot alter or accept the parent primary
```

El integrador, de forma fail-closed:

1. valida seed/spec, schema, ID-set hash, unicidad y DAG primary+contribution del
   snapshot vigente;
2. adquiere un lease firmado para `(program_id, expected_revision,
   expected_head_event_hash, previous_authoritative_commit_receipt_root,
   fencing_token, lease_expires_at)`; el fencing token debe ser estrictamente
   mayor que el del último receipt autoritativo. Un segundo writer, token stale,
   lease expirado o cambio de head/revisión/receipt aborta;
3. valida task/operational manifest, SHAs o tree receipt, evidence/verifier
   roots, firmas, independencia, reproducción y todas las dependencias;
4. aplica exactamente una transición autorizada por operation/outcome en
   tentative post-state, incrementa revision y construye un event object
   autónomo `solguard-acceptance-ledger-event.v1`. El evento liga
   `previous_authoritative_commit_receipt_id/root`, lease ID/ref/root,
   fencing token, expected revision/head/root, lease expiry y quorum temporal
   2-of-2; no contiene el snapshot root que causará y así evita
   autorreferencia;
5. reevalúa fórmulas derived sin marcarlas manualmente. Una evaluación o
   autorización se materializa después como su propio evento
   `materialize_derived`, con formula digest, operand-state hash y
   autoridad/verifier designados;
6. crea con O_EXCL el event object
   `ledger/events/<sequence>-<event_id>.json`, después el snapshot que referencia
   su hash y la checklist externa derivada; verifica bytes, roots e igualdad de
   IDs/estados;
7. crea un commit receipt externo que liga event self-hash, snapshot,
   checklist, lease ID/root/expiry, fencing token,
   `previous_authoritative_commit_receipt_root` y timestamp quorum 2-of-2. El
   receipt lleva su propio self-hash. Hasta ese receipt, un write parcial queda
   visible pero la revisión no es autoritativa ni reutilizable;
8. regenera `acceptance-ledger-events.v1.jsonl` como vista determinista desde los
   event objects. Nunca lo abre en append y nunca escribe el JSON/Markdown seed
   de esta carpeta.

La serialización y los hashes de ambos objetos son únicos y verificables:

```text
event_self_hash =
  SHA256(UTF8("solguard/acceptance-ledger-event/v1") || 0x00 ||
    UTF8(RFC8785_JCS(event_without_event_self_hash)))

commit_receipt_self_hash =
  SHA256(UTF8("solguard/acceptance-ledger-commit-receipt/v1") || 0x00 ||
    UTF8(RFC8785_JCS(commit_receipt_without_self_hash)))
```

JCS se aplica al field set cerrado de la versión: opcionales ausentes, nunca
`null`; enteros finitos dentro del rango fijado; arrays en su orden contractual;
digests hex lowercase de 32 bytes. `event_self_hash`, el receipt anterior y el
fencing token forman la cadena autoritativa. La siguiente transacción sólo
puede encadenar el último commit receipt completo y vigente. Event, snapshot o
checklist huérfano, receipt parcial, timestamp quorum incompleto, lease stale o
token reutilizado se ignora como estado y no puede ser padre, dependencia ni
evidencia de una transición posterior.

El `genesis_batch` parte de `ledger_absent` y es la única excepción multiobjeto:
evalúa contributions bootstrap y primaries en un tentative post-state atómico,
en el orden topológico literal registrado. Una dependencia intra-batch sólo
puede resolverse contra un elemento anterior de ese mismo tentative state.
Publica un único event/snapshot/commit receipt o ninguno; no existe
`contribution_set_then_node_set` que coloque todos los consumers antes de sus
producers.

El ledger usa el enum cerrado
`evidence_mode=bootstrap|implementation|candidate_epoch|validation|
freeze_attestation|database_cutover|campaign|measurement|
candidate_epoch_close|final_evidence|release_pre_tag|post_tag_terminal`. El
dispatcher mapea el modo/ID a `genesis_batch`, `accept_primary`,
`record_candidate_epoch_open`, `record_validation`, `record_freeze_attestation`,
`record_database_cutover`, `record_campaign`, `record_measurement`,
`record_candidate_epoch_close`, `record_final_evidence`,
`accept_release_pre_tag` o
`accept_post_tag_terminal`. Las contribuciones usan exclusivamente
`accept_contribution|reopen_contribution`. `materialize_derived`
sólo materializa evaluación derived y nunca acepta un primary. Un mode/operation
elegido por el worker, wrong-branch o cross-stage falla.

`record_upstream_nonpass` es el único override de dispatch: no cambia
`evidence_mode`, no ejecuta su emitter normal y sólo es legal para un primary
con `terminalizable=true` bajo las precondiciones cerradas anteriores.
`operational=true` no basta y `operational=false` no lo impide si el contrato
declara terminalizable (por ejemplo, un gate pre-close cuyo emitter normal quedó
causalmente inalcanzable). Los FINAL permanecen fuera del evaluation closure. No
puede usarse para implementation, candidate epoch open/close, contributions,
derived, un target runnable o un target fuera del mismo epoch/closure. El
evento conserva blocker terminal, path causal, razón y evidence roots; nunca
convierte el target en accepted ni satisface un claim de pass.

Para reabrir cualquier primary se exige una transacción `reopen_primary` que
conserva old accepted o terminal-nonpass context/evidence roots, mode,
invalidation event/reason y reabre
transitivamente sus dependientes. `reopen_contribution` conserva commit/tree y
evidence anteriores, incrementa contribution version y reabre su parent y todo
primary/contribution/derived que dependa transitivamente de ella. La posterior
reaceptación usa el branch de su mode, nueva versión/evidencia y, cuando aplica,
nuevo measurement context; nunca reutiliza la aceptación anterior ni inventa
contexto al reabrir.

El validador debe comprobar, como mínimo:

- ID primary/contribution único y presente en la revisión revisada;
- evidencia no `PENDING`, inmutable, localizable y ligada al node version;
- firmas, roots, commits o tree/absence receipts y contract versions válidos y
  alcanzables;
- identidades humanas y claves del verificador separadas de implementador y
  evidence producer; en campaña, maintainer, custodio, selector, operador,
  evaluator/adjudicator y confirmator LIVE son pairwise distintos según §10;
- dos GPT contexts, run IDs, cuentas o worktrees del mismo humano no satisfacen
  separación;
- dependencies primary/contribution accepted, derived satisfied, publication
  receipts presentes y dependency-state hash idéntico;
- cero gates reabiertos, ciclos, aliases o referencias inexistentes;
- fórmulas derived recalculadas, nunca marcadas manualmente;
- checklist externa regenerada sin drift, seeds de repo intactos y `FINAL-008`
  recalculado como metaestado.

## 12. Criterio de calidad de una tarea

Una tarea está bien diseñada si otro GPT-5.6-Sol, sin memoria de la
conversación, puede:

- entender el resultado;
- localizar el código correcto;
- no tocar archivos ajenos;
- implementar sin inventar autoridad;
- ejecutar todos los checks;
- producir evidencia;
- ser refutado por un test negativo;
- entregar un diff pequeño y explicable.

Si necesita preguntar qué significa «funciona», «profundo», «experto»,
«validado» o «completo», el brief todavía no está listo para ejecutarse.
