# Plan de commits y trenes de integración

## 1. Objetivo

Este documento convierte el programa de madurez en una secuencia auditable de
commits. No describe un orden decorativo: define dependencias, fronteras de
responsabilidad, pruebas de cada cambio y condiciones de publicación.

Cada commit debe ser:

- de un solo repositorio;
- comprensible sin contexto oral;
- reversible;
- acompañado por tests del comportamiento que introduce;
- compatible con el estado publicado de sus dependencias;
- vinculado a un task ID y a evidencia;
- libre de cambios oportunistas.

Un commit que solo «prepara» una corrección sin comprobarla no cierra ninguna
entrada de la checklist.

### 1.1 Errata normativa de R2 (`.4`)

La revisión `solguard-detection-maturity-2026-07-25.4` corrige la clasificación
de `C2-CON-11` y `C2-CON-RM-10` de la versión congelada `.3`. El inventario
`C2-CON-01` demuestra que `solguard-diff` no es miembro de ninguno de sus nueve
grupos contractuales; por tanto, ambas filas son contributions de receipt de
ausencia y no implementaciones.

La corrección conserva los IDs, `RUN-201`, el orden y todas las dependencias
duras. R2 mantiene **80 contributions: 76 de implementación y cuatro receipts
de ausencia**. Ningún receipt autoriza branch, commit, PR ni escritura en su
repositorio owner. La auditoría de impacto y los bindings normativos exactos
están registrados en
[ERRATA_2026-07-28_R2_SOLGUARD_DIFF.md](ERRATA_2026-07-28_R2_SOLGUARD_DIFF.md).

## 2. Convención

### 2.1 Identidad

```text
branch: codex/<task-id>-<slug>
commit: <type>(<scope>): <resultado observable> [<task-id>]
```

En una fila de commit, el `ID` de la primera columna es siempre el
`contribution_id` y sustituye `<task-id>` en branch, bracket y footer. El
`Parent gate` se registra por separado; nunca se usa como branch compartida.

Tipos admitidos:

- `feat`: capacidad nueva;
- `fix`: corrección observable;
- `refactor`: estructura sin cambiar contrato;
- `test`: cobertura que no podía convivir con un cambio previo;
- `docs`: contrato o evidencia documental;
- `build`: construcción y dependencias;
- `ci`: gates de integración;
- `perf`: mejora con medición;
- `chore`: mantenimiento sin semántica de producto.

### 2.2 Footer obligatorio

```text
Task: <ID>
Parent-Gate: <primary-integration-ID>
Contract: <schema@version|none>
Depends-On: <repo@sha,...|none>
Evidence: <artifact-root>
Verification: <commands or dossier entry>
```

### 2.3 Regla de changelog nuevo

El primer commit aceptado de cada repositorio crea un `CHANGELOG.md` nuevo con:

- enlace al archivo histórico conservado en
  `solguard-docs/changelogs/20-25-Jul-2026`;
- programa de origen `25-jul-2026`;
- versión no publicada;
- task IDs incluidos;
- contratos cambiados;
- migraciones;
- evidencia de validación;
- limitaciones abiertas.

El historial archivado no se copia ni se reescribe. Cada commit posterior
actualiza el changelog en la misma unidad que el cambio funcional.

### 2.4 Qué no debe mezclarse

No combinar en un commit:

- cambio de schema y retirada de compatibilidad;
- refactor amplio y cambio semántico;
- parser de varios lenguajes;
- migración de datos y eliminación de backup;
- nuevo threshold y resultados de benchmark;
- productor y consumidor de repositorios distintos;
- corrección y regeneración no explicada de resultados;
- cambios de formato y lógica de ranking.

## 3. Protocolo de un tren multi-repositorio

Cada tren se publica en este orden:

1. aprobar decisión y schema con todo writer nuevo desactivado;
2. añadir fixtures y goldens contractuales;
3. publicar todos los lectores compatibles;
4. ejecutar old/old, new/old y old/new mediante fixtures o un candidate writer
   inerte;
5. activar el productor nuevo;
6. ejecutar new/new, fallos, reorder y tamper contra todos los consumidores;
7. migrar datos si aplica;
8. cambiar autoridad;
9. observar cero lecturas legacy;
10. retirar compatibilidad en un commit separado;
11. fijar SHAs en manifest de producto.

Este protocolo se aplica a **cada** ID del registry de `09`, aunque una tabla
posterior resuma varios lectores en una fila. Antes de implementar, el brief GPT
expande esa fila a un commit o receipt firmado por consumidor; un contrato sin
schema/goldens, reader gate, writer gate, matriz new/new y rollback no puede
cerrar su task.

La integración no usa ramas flotantes. Cada consumidor declara el SHA exacto
del productor verificado.

Si un paso falla:

- no se fuerza el siguiente;
- se conserva el artefacto;
- se detiene o revierte primero el productor que ya emita el contrato nuevo;
- los consumidores dual-read permanecen hasta restaurar el productor anterior;
- se revierte únicamente el commit culpable y sus activaciones dependientes;
- no se reescribe el tag;
- se abre un task de causa raíz;
- la checklist permanece sin marcar.

## 4. Onda C0 — Gobierno, baseline y ledger nuevo

### Objetivo

Congelar el punto de partida, el alcance y la forma de aceptar cambios.
Precondición absoluta: versionar este plan y ejecutar primero los quince commits
`C0-101..C0-115` de `GOV-005` enumerados al final de esta onda, sin aceptarlos;
inmediatamente después `C0-001` liga por separado el `audit_baseline_root`
anterior a ese material documental y el `program_bootstrap_root` posterior,
antes de cualquier cambio funcional. El replay usa el primero; el roadmap parte
del segundo.

| ID | Repositorio | Commit propuesto | Condición de aceptación |
|---|---|---|---|
| C0-001 | `solguard-deploy` | `feat(manifest): capture immutable maturity baseline [C0-001]`<br>Parent gate: `GOV-001` | Audit/program roots separados; SHAs, dirty state, tree, suites, delta changelog y DB verificables |
| C0-001A | `solguard-deploy` | `feat(baseline-replay): run pinned current-state v1-v8 and 90-lab manifests without product mutation [C0-001A]`<br>Parent gate: `BASELINE-009` | Usa sólo HEAD/tree capturados; KNOWN, no blind |
| C0-001B | `solguard-deploy` | `feat(loss-ledger): reconstruct first observable stage loss and baseline metrics [C0-001B]`<br>Parent gate: `BASELINE-009` | Missing/no observable no se imputa; artifacts content-addressed |
| C0-002 | `solguard-docs` | `docs(vocabulary): publish canonical product claim dictionary [C0-002]`<br>Parent gate: `GOV-002` | Linter y usos ambiguos corregidos |
| C0-003 | `solguard-agents` | `feat(contracts): register contract owners producers consumers and versions [C0-003]`<br>Parent gate: `GOV-003` | Registry machine-readable validado; ningún schema ajeno publicado |
| C0-004 | `solguard-agents` | `feat(workers): enforce disjoint ownership and independent review [C0-004]`<br>Parent gate: `GOV-004` | Brief incompleto falla |
| C0-005 | `solguard-core` | `fix(profile): make exploit phase unreachable in detection [C0-005]`<br>Parent gate: `SCOPE-CAP-900` | Process/file closure negativo |
| C0-006 | `solguard-deploy` | `fix(profile): remove exploit from detection setup and runtime [C0-006]`<br>Parent gate: `SCOPE-CAP-900` | SBOM y setup sin exploit |
| C0-007 | `solguard-agents` | `feat(registry): preregister runtime tcb and governance scopes [C0-007]`<br>Parent gate: `GOV-008` | Allowlist y forbidden list previas al producto; no closure claim |
| C0-008 | `solguard-docs` | `docs(program): publish architecture decisions and evidence rules [C0-008]`<br>Parent gate: `GOV-002` | Documentos enlazados y validados |
| C0-009 | `solguard-agents` | `feat(tasks): generate executable briefs with disjoint ownership [C0-009]`<br>Parent gate: `GOV-006` | Colisiones, comandos y outputs validados |
| C0-010 | `solguard-agents` | `feat(acceptance): enforce implementer verifier identity separation [C0-010]`<br>Parent gate: `GOV-007` | Autoaceptación y replay rechazados |
| C0-011 | `solguard-agents` | `feat(scope): reject work outside detection only allowlist [C0-011]`<br>Parent gate: `GOV-008` | Repos, paths y capacidades cerrados |
| C0-012 | `solguard-agents` | `feat(ledger-schema): publish acceptance ledger event and transition schemas goldens and deterministic evaluator with writer off [C0-012]`<br>Parent gate: `LEDGER-001` | ID-set, DAG, firmas, reapertura y claims tipados; cero eventos |
| C0-013 | `solguard-deploy` | `feat(ledger-reader): validate acceptance ledger events and dependency state [C0-013]`<br>Parent gate: `LEDGER-001` | Evaluator y release listos; writer aún inactivo |
| C0-014 | `solguard-docs` | `feat(ledger-reader): render ledger state without inferring acceptance [C0-014]`<br>Parent gate: `LEDGER-001` | Vista Markdown no adquiere autoridad |
| C0-015 | `solguard-deploy` | `test(ledger-contract): verify readers against valid tampered replay and future fixtures [C0-015]`<br>Parent gate: `LEDGER-001` | Matriz prewriter cerrada |
| C0-016 | `solguard-agents` | `feat(ledger-writer): activate create-only signed acceptance and reopen events after every reader is ready [C0-016]`<br>Parent gate: `LEDGER-001` | Writer autorizado único; append-only, hash-chain y role policy |
| C0-017 | `solguard-deploy` | `test(ledger-new-new): feed real writer output replay tamper stale dependency and reopen cases to every reader [C0-017]`<br>Parent gate: `LEDGER-001` | Deploy y Docs verifican bytes reales; bootstrap listo |

`C0-005` y `C0-006` son contribuciones tempranas a `SCOPE-900`; no lo aceptan
ni conceden closure. El gate permanece pendiente hasta las comprobaciones C7
contra los 30 manifests C0 y los BOM reales. Del mismo modo, `C0-003` registra
el contrato y `C0-012..017` construye schemas, evaluator, readers, writer y verificador
de `LEDGER-001`; `C7-016` lo ejerce contra el
dossier real y es la prueba end-to-end final, no una publicación tardía del
schema.

El orden real de bootstrap es estricto:

1. crear `C0-101..115` sin marcarlos accepted;
2. ejecutar `C0-001`, resolver los HEAD/trees auditados de `03` y los HEAD
   bootstrap después de versionar plan+C0-101..115, probar que el delta está
   limitado al material documental/changelogs allowlisted y sellar ambos roots
   antes de cambios funcionales, todavía pending;
3. implementar registry `C0-003` (`GOV-003`) y worker/evidence contract
   `C0-004` (`GOV-004`), todavía pending;
4. ejecutar `C0-012..017` schema → readers → prewriter matrix → writer →
   new-new de `LEDGER-001`, sin emitir un evento previo a genesis;
5. celebrar una única transacción genesis externa con evidence root y
   implementador/verificador separados por contribution y nodo; el tentative
   post-state acepta exactamente
   `C0-001 → GOV-001 → C0-003 → GOV-003 → C0-004 → GOV-004 →
    C0-012 → C0-013/C0-014 → C0-015 → C0-016 → C0-017 → LEDGER-001`,
   o no publica ninguno;
6. registrar después, sin retrofechar, las contribuciones/changelogs y aceptar
   `GOV-005` y `C0-002/005..011` mediante eventos normales;
7. implementar `C0-001A/B` mediante eventos normales y, apuntando
   exclusivamente a los trees ya capturados, ejecutar el replay current-state
   y stage-loss ledger. Puede avanzar en paralelo con T1/R2 porque no cambia ni
   consulta los trees candidatos, pero `BASELINE-009` debe quedar accepted
   antes de abrir `RC-V-EVM-1`, congelar sus cohortes o medirlas;
8. sólo entonces iniciar cualquier operación candidate. Las ondas T1/R2 que no
   consuman evidencia del baseline pueden ejecutarse en paralelo con el punto
   7, manteniendo sus dependencias normales.

Genesis no acepta `GOV-005`, ningún commit meramente documental, claim ni
campaign, y no permite que writer/implementer se autoverifique. Si la ceremonia
falla, los cuatro nodos y sus contribuciones permanecen `pending`.

Aunque esta tabla se muestra después por legibilidad, se ejecuta **antes de
cualquier otro commit C0**. Inicializa el changelog nuevo de cada repositorio
en un commit puramente documental y local:

| ID | Repositorio | Commit |
|---|---|---|
| C0-101 | `solguard-value` | `docs(changelog): start structural maturity ledger [C0-101]`<br>Parent gate: `GOV-005` |
| C0-102 | `solguard-validate` | `docs(changelog): start structural maturity ledger [C0-102]`<br>Parent gate: `GOV-005` |
| C0-103 | `solguard-trace` | `docs(changelog): start structural maturity ledger [C0-103]`<br>Parent gate: `GOV-005` |
| C0-104 | `solguard-map` | `docs(changelog): start structural maturity ledger [C0-104]`<br>Parent gate: `GOV-005` |
| C0-105 | `solguard-invariant` | `docs(changelog): start structural maturity ledger [C0-105]`<br>Parent gate: `GOV-005` |
| C0-106 | `solguard-filter` | `docs(changelog): start structural maturity ledger [C0-106]`<br>Parent gate: `GOV-005` |
| C0-107 | `solguard-economic` | `docs(changelog): start structural maturity ledger [C0-107]`<br>Parent gate: `GOV-005` |
| C0-108 | `solguard-docs` | `docs(changelog): start structural maturity ledger [C0-108]`<br>Parent gate: `GOV-005` |
| C0-109 | `solguard-discover` | `docs(changelog): start structural maturity ledger [C0-109]`<br>Parent gate: `GOV-005` |
| C0-110 | `solguard-diff` | `docs(changelog): start structural maturity ledger [C0-110]`<br>Parent gate: `GOV-005` |
| C0-111 | `solguard-deploy` | `docs(changelog): start structural maturity ledger [C0-111]`<br>Parent gate: `GOV-005` |
| C0-112 | `solguard-database` | `docs(changelog): start structural maturity ledger [C0-112]`<br>Parent gate: `GOV-005` |
| C0-113 | `solguard-core` | `docs(changelog): start structural maturity ledger [C0-113]`<br>Parent gate: `GOV-005` |
| C0-114 | `solguard-backend` | `docs(changelog): start structural maturity ledger [C0-114]`<br>Parent gate: `GOV-005` |
| C0-115 | `solguard-agents` | `docs(changelog): start structural maturity ledger [C0-115]`<br>Parent gate: `GOV-005` |

Estos quince commits no prueban capacidad y no incrementan el porcentaje
funcional.

## 5. Onda C1 — Autoridad de verdad

### Objetivo

Eliminar contradicciones entre score, candidatos, VALIDATE, FILTER, API y base
de datos.

### Tren C1-A — Veredicto y admisión

| ID | Repo | Commit | Depende de | Prueba bloqueante |
|---|---|---|---|---|
| C1-000V | `solguard-validate` | `feat(verdict-schema): publish technical verdict schema and goldens with writer off [C1-000V]`<br>Parent gate: `TRUTH-101` | C0 | Schema, reason codes y compatibility fixtures |
| C1-000VA | `solguard-filter` | `feat(verdict-reader): dual-read technical verdicts [C1-000VA]`<br>Parent gate: `TRUTH-101` | C1-000V@SHA | FILTER listo |
| C1-000VB | `solguard-core` | `feat(verdict-reader): dual-read technical verdicts [C1-000VB]`<br>Parent gate: `TRUTH-101` | C1-000V@SHA | CORE listo |
| C1-000VC | `solguard-backend` | `feat(verdict-reader): expose technical verdicts unchanged [C1-000VC]`<br>Parent gate: `TRUTH-101` | C1-000V@SHA | Backend listo |
| C1-000VD | `solguard-database` | `feat(verdict-reader): persist technical verdicts without reinterpretation [C1-000VD]`<br>Parent gate: `TRUTH-101` | C1-000V@SHA | Database lista |
| C1-000VE | `solguard-deploy` | `feat(verdict-reader): verify technical verdicts in evaluator and replay [C1-000VE]`<br>Parent gate: `TRUTH-101` | C1-000V@SHA | Deploy listo |
| C1-000VF | `solguard-deploy` | `test(verdict-contract): verify every old-new and new-new consumer [C1-000VF]`<br>Parent gate: `TRUTH-101` | C1-000VA..VE | Writer aún desactivado |
| C1-001 | `solguard-validate` | `fix(verdict-writer): require complete economic break for supported [C1-001]`<br>Parent gate: `TRUTH-101` | C1-000VF@SHA | Matriz que elimina una obligación cada vez |
| C1-002 | `solguard-validate` | `test(verdict): reject rule-backed incomplete proofs [C1-002]`<br>Parent gate: `TRUTH-101` | C1-001 | Compound auditado deja de ser Supported |
| C1-003 | `solguard-validate` | `test(verdict): prove dedupe and presentation cannot mutate verdict bytes [C1-003]`<br>Parent gate: `TRUTH-102` | C1-001 | TechnicalVerdict no contiene dedupe role ni representative |
| C1-003A | `solguard-filter` | `feat(admission-schema): publish admission result schema and goldens with writer off [C1-003A]`<br>Parent gate: `TRUTH-103` | C1-003 | Pass/review/reject, eligibility y presentation tipados |
| C1-003B | `solguard-core` | `feat(admission-reader): dual-read admission results [C1-003B]`<br>Parent gate: `TRUTH-103` | C1-003A@SHA | CORE listo |
| C1-003C | `solguard-backend` | `feat(admission-reader): expose admission results unchanged [C1-003C]`<br>Parent gate: `TRUTH-103` | C1-003A@SHA | Backend listo |
| C1-003D | `solguard-database` | `feat(admission-reader): persist admission results without reinterpretation [C1-003D]`<br>Parent gate: `TRUTH-103` | C1-003A@SHA | Database lista |
| C1-003E | `solguard-deploy` | `feat(admission-reader): verify admission results in evaluator and replay [C1-003E]`<br>Parent gate: `TRUTH-103` | C1-003A@SHA | Deploy listo |
| C1-003F | `solguard-deploy` | `test(admission-contract): verify every old-new and new-new consumer [C1-003F]`<br>Parent gate: `TRUTH-103` | C1-003B..003E | Writer aún desactivado |
| C1-004 | `solguard-filter` | `feat(admission-writer): own pass review reject invalid-upstream dedupe and presentation [C1-004]`<br>Parent gate: `TRUTH-103` | C1-003F@SHA | Representative determinista; cross-flow no fusiona; contradicción causal reabre VALIDATE |
| C1-005 | `solguard-filter` | `fix(evidence): require independent corroboration groups [C1-005]`<br>Parent gate: `TRUTH-103` | C1-004 | Evidencia copiada cuenta una vez |

### Tren C1-B — Cerrar fuga blind

La secuencia es obligatoria: TRACE publica provenance, DISCOVER la consume y
CORE impide cualquier bypass.

| ID | Repo | Commit | Depende de | Prueba bloqueante |
|---|---|---|---|---|
| C1-006 | `solguard-trace` | `fix(blind): label origin on every scoreable channel [C1-006]`<br>Parent gate: `TRUTH-104` | C1-005 | Exhaustividad Go/Node y alias |
| C1-007 | `solguard-discover` | `fix(blind): reject known-pattern evidence in generic blind [C1-007]`<br>Parent gate: `TRUTH-104` | C1-006@SHA | Señal copiada a todos los campos |
| C1-008 | `solguard-core` | `fix(blind): enforce origin policy at canonicalization [C1-008]`<br>Parent gate: `TRUTH-104` | C1-007@SHA | Sentinel conocido sin autoridad |

### Tren C1-C — Publicación y medición

| ID | Repo | Commit | Depende de | Prueba bloqueante |
|---|---|---|---|---|
| C1-009 | `solguard-core` | `feat(findings-schema): publish canonical finding review schemas and goldens [C1-009]`<br>Parent gate: `TRUTH-105` | C1-004/008 | Writer nuevo desactivado |
| C1-009A | `solguard-backend` | `feat(findings-reader): dual-read canonical finding and review bundles [C1-009A]`<br>Parent gate: `TRUTH-105` | C1-009@SHA | API reader listo |
| C1-009B | `solguard-database` | `feat(findings-reader): dual-read canonical finding and review bundles [C1-009B]`<br>Parent gate: `TRUTH-105` | C1-009@SHA | Mapping y round-trip listos |
| C1-009C | `solguard-deploy` | `feat(findings-reader): dual-read canonical finding and review bundles [C1-009C]`<br>Parent gate: `TRUTH-105` | C1-009@SHA | Deploy reader listo |
| C1-009D | `solguard-docs` | `test(findings-reader): validate docs and ui projection from canonical schemas [C1-009D]`<br>Parent gate: `TRUTH-105` | C1-009@SHA | Docs/UI consumer listo |
| C1-009E | `solguard-deploy` | `feat(review-reader): consume product review envelopes in reviewer package [C1-009E]`<br>Parent gate: `TRUTH-105` | C1-009@SHA | Revisor consume sin reescritura |
| C1-009F | `solguard-deploy` | `test(findings-contract): verify every old-new and new-new consumer [C1-009F]`<br>Parent gate: `TRUTH-105` | C1-009A..009E | Todos los consumidores listos |
| C1-009G | `solguard-core` | `feat(findings-projector): implement pure admission to envelopes projection behind writer off [C1-009G]`<br>Parent gate: `TRUTH-105` | C1-009F@SHA | Todo Pass proyecta envelope; sólo role publicable proyecta finding; cero persistencia de runtime |
| C1-010 | `solguard-backend` | `test(findings-reader): expose synthetic canonical collections and projections unchanged [C1-010]`<br>Parent gate: `TRUTH-105` | C1-009G@SHA | API reader no reconstruye ni pierde Pass suprimidos |
| C1-011 | `solguard-database` | `test(findings-reader): round trip every synthetic canonical envelope and role [C1-011]`<br>Parent gate: `TRUTH-105` | C1-009G@SHA | Contract fixture de eligible, ineligible, duplicate y review; cero authority cutover |
| C1-012 | `solguard-deploy` | `refactor(metrics): define oracle-free lineage mapping with canonical writer off [C1-012]`<br>Parent gate: `TRUTH-106` | C1-009G/011 | Funnel, summary y primario reconciliados; no emite contrato post-scan |
| C1-013 | `solguard-database` | `fix(metrics): reject ambiguous legacy csv mappings [C1-013]`<br>Parent gate: `TRUTH-106` | C1-012@SHA | Null no se transforma en cero |
| C1-014 | `solguard-deploy` | `fix(gates): split integrity health truth and blind eligibility [C1-014]`<br>Parent gate: `TRUTH-107` | C1-012 | Cero proofs/cero pass no autoriza health |
| C1-015 | `solguard-backend` | `fix(integration): pin compatible database and safe defaults [C1-015]`<br>Parent gate: `TRUTH-108` | C1-011@SHA | CI en checkout limpio |
| C1-016 | `solguard-deploy` | `test(truth): exercise complete authority chain end to end [C1-016]`<br>Parent gate: `TRUTH-107` | C1-001..015 | Positive, patch, near-miss y fallo FILTER |
| C1-017 | `solguard-agents` | `docs(contracts): route truth work and dependency pins [C1-017]`<br>Parent gate: `TRUTH-108` | C1-016 | Registry y READMEs coherentes |
| C1-018 | `solguard-docs` | `docs(truth): publish verdict admission metrics and defaults [C1-018]`<br>Parent gate: `TRUTH-108` | C1-016 | Coincide con fixtures y runtime |

### Corte de autoridad

Solo después de que C1-018 pase:

| ID | Repo | Commit | Aceptación |
|---|---|---|---|
| C1-020 | `solguard-core` | `test(findings-projector): reject validation-only publication input [C1-020]`<br>Parent gate: `TRUTH-105` | Projector puro bloquea bypass; path runtime aún no se corta |
| C1-021 | `solguard-deploy` | `refactor(gates): remove legacy eligibility aliases [C1-021]`<br>Parent gate: `TRUTH-107` | Todos los consumidores migrados |
| C1-022 | `solguard-backend` | `refactor(defaults): remove compatibility release default [C1-022]`<br>Parent gate: `TRUTH-108` | Known y canarios sin regresión |

## 6. Onda C2 — Runtime reproducible y ArtifactStore

### Objetivo

Hacer que toda ejecución tenga identidad, inputs, outputs, estados y lineage
inmutables.

### Tren C2-A — Contrato compartido y retirada de copias

El inventario decide qué filas de adopción requieren cambio; cada repositorio
debe producir un commit o una evidencia firmada de que no contiene una copia.

| ID | Repo | Commit | Resultado |
|---|---|---|---|
| C2-CON-01 | `solguard-agents` | `feat(contracts): inventory every vendored contract copy [C2-CON-01]`<br>Parent gate: `RUN-201` | Matriz repo/archivo/hash/owner |
| C2-CON-02 | `solguard-core` | `feat(contracts): publish neutral crate schemas and goldens [C2-CON-02]`<br>Parent gate: `RUN-201` | Fuente canónica |
| C2-SCOPE-01 | `solguard-deploy` | `build(languages): publish scope-manifest schema goldens and toolchain profile harness [C2-SCOPE-01]`<br>Parent gate: `LANG-020-HARNESS` | Writer de instancias desactivado |
| C2-SCOPE-02 | `solguard-map` | `feat(scope-reader): consume exact language scope manifests [C2-SCOPE-02]`<br>Parent gate: `LANG-020-HARNESS` | MAP listo |
| C2-SCOPE-03 | `solguard-trace` | `feat(scope-reader): consume exact language scope manifests [C2-SCOPE-03]`<br>Parent gate: `LANG-020-HARNESS` | TRACE listo |
| C2-SCOPE-04 | `solguard-discover` | `feat(scope-reader): consume exact language scope manifests [C2-SCOPE-04]`<br>Parent gate: `LANG-020-HARNESS` | DISCOVER listo |
| C2-SCOPE-05 | `solguard-economic` | `feat(scope-reader): consume exact language scope manifests [C2-SCOPE-05]`<br>Parent gate: `LANG-020-HARNESS` | ECONOMIC listo |
| C2-SCOPE-06 | `solguard-invariant` | `feat(scope-reader): consume exact language scope manifests [C2-SCOPE-06]`<br>Parent gate: `LANG-020-HARNESS` | INVARIANT listo |
| C2-SCOPE-07 | `solguard-value` | `feat(scope-reader): consume exact language scope manifests [C2-SCOPE-07]`<br>Parent gate: `LANG-020-HARNESS` | VALUE listo |
| C2-SCOPE-08 | `solguard-validate` | `feat(scope-reader): consume exact language scope manifests [C2-SCOPE-08]`<br>Parent gate: `LANG-020-HARNESS` | VALIDATE listo |
| C2-SCOPE-09 | `solguard-filter` | `feat(scope-reader): consume exact language scope manifests [C2-SCOPE-09]`<br>Parent gate: `LANG-020-HARNESS` | FILTER listo |
| C2-SCOPE-10 | `solguard-diff` | `feat(scope-reader): consume exact language scope manifests [C2-SCOPE-10]`<br>Parent gate: `LANG-020-HARNESS` | DIFF listo |
| C2-SCOPE-11 | `solguard-core` | `feat(scope-reader): validate scope manifests before scheduling [C2-SCOPE-11]`<br>Parent gate: `LANG-020-HARNESS` | CORE listo |
| C2-SCOPE-12 | `solguard-deploy` | `feat(scope-reader): validate manifests for qualification and certification [C2-SCOPE-12]`<br>Parent gate: `LANG-020-HARNESS` | Certifier listo |
| C2-SCOPE-13 | `solguard-deploy` | `test(scope-contract): verify every reader with profile writers off [C2-SCOPE-13]`<br>Parent gate: `LANG-020-HARNESS` | Old/new matrix cerrada antes de C6 |
| C2-CON-03 | `solguard-map` | `refactor(contracts): dual-read canonical shared types [C2-CON-03]`<br>Parent gate: `RUN-201` | Parity con copia |
| C2-CON-04 | `solguard-trace` | `refactor(contracts): dual-read canonical shared types [C2-CON-04]`<br>Parent gate: `RUN-201` | Parity con copia |
| C2-CON-05 | `solguard-discover` | `refactor(contracts): dual-read canonical shared types [C2-CON-05]`<br>Parent gate: `RUN-201` | Parity con copia |
| C2-CON-06 | `solguard-economic` | `refactor(contracts): dual-read canonical shared types [C2-CON-06]`<br>Parent gate: `RUN-201` | Parity con copia |
| C2-CON-07 | `solguard-invariant` | `refactor(contracts): dual-read canonical shared types [C2-CON-07]`<br>Parent gate: `RUN-201` | Parity con copia |
| C2-CON-08 | `solguard-value` | `refactor(contracts): dual-read canonical shared types [C2-CON-08]`<br>Parent gate: `RUN-201` | Parity con copia |
| C2-CON-09 | `solguard-validate` | `refactor(contracts): dual-read canonical shared types [C2-CON-09]`<br>Parent gate: `RUN-201` | Parity con copia |
| C2-CON-10 | `solguard-filter` | `refactor(contracts): dual-read canonical shared types [C2-CON-10]`<br>Parent gate: `RUN-201` | Parity con copia |
| C2-CON-11 | `solguard-diff` | receipt de ausencia `[C2-CON-11]`<br>Parent gate: `RUN-201` | Fuera de los miembros de C2-CON-01; `no_repository_write` |
| C2-CON-12 | `solguard-database` | `refactor(contracts): consume generated canonical schemas [C2-CON-12]`<br>Parent gate: `RUN-201` | Round-trip |
| C2-CON-13 | `solguard-backend` | `refactor(contracts): consume generated canonical schemas [C2-CON-13]`<br>Parent gate: `RUN-201` | API parity |
| C2-CON-14 | `solguard-deploy` | `refactor(contracts): verify canonical schemas and goldens [C2-CON-14]`<br>Parent gate: `RUN-201` | Clean checkout |
| C2-CON-15 | `solguard-agents` | `feat(contracts): bind every consumer to canonical source [C2-CON-15]`<br>Parent gate: `RUN-201` | Registry de dual-read completo |

Tras demostrar cero lecturas legacy se ejecuta esta retirada. Si el inventario
prueba que un repo no contiene copia, la fila se satisface mediante receipt
firmado de ausencia y no mediante un commit vacío:

| ID | Repo | Commit o receipt | Resultado |
|---|---|---|---|
| C2-CON-RM-01 | `solguard-core` | `refactor(contracts): remove vendored authoritative copies [C2-CON-RM-01]`<br>Parent gate: `RUN-201` | Sólo crate canónico |
| C2-CON-RM-02 | `solguard-map` | `refactor(contracts): remove vendored authoritative copies [C2-CON-RM-02]`<br>Parent gate: `RUN-201` | Cero copia autoritativa |
| C2-CON-RM-03 | `solguard-trace` | `refactor(contracts): remove vendored authoritative copies [C2-CON-RM-03]`<br>Parent gate: `RUN-201` | Cero copia autoritativa |
| C2-CON-RM-04 | `solguard-discover` | `refactor(contracts): remove vendored authoritative copies [C2-CON-RM-04]`<br>Parent gate: `RUN-201` | Cero copia autoritativa |
| C2-CON-RM-05 | `solguard-economic` | `refactor(contracts): remove vendored authoritative copies [C2-CON-RM-05]`<br>Parent gate: `RUN-201` | Cero copia autoritativa |
| C2-CON-RM-06 | `solguard-invariant` | `refactor(contracts): remove vendored authoritative copies [C2-CON-RM-06]`<br>Parent gate: `RUN-201` | Cero copia autoritativa |
| C2-CON-RM-07 | `solguard-value` | `refactor(contracts): remove vendored authoritative copies [C2-CON-RM-07]`<br>Parent gate: `RUN-201` | Cero copia autoritativa |
| C2-CON-RM-08 | `solguard-validate` | `refactor(contracts): remove vendored authoritative copies [C2-CON-RM-08]`<br>Parent gate: `RUN-201` | Cero copia autoritativa |
| C2-CON-RM-09 | `solguard-filter` | `refactor(contracts): remove vendored authoritative copies [C2-CON-RM-09]`<br>Parent gate: `RUN-201` | Cero copia autoritativa |
| C2-CON-RM-10 | `solguard-diff` | receipt de ausencia `[C2-CON-RM-10]`<br>Parent gate: `RUN-201` | Escaneo nuevo en su orden duro; `no_repository_write` |
| C2-CON-RM-11 | `solguard-database` | `refactor(contracts): remove vendored authoritative copies [C2-CON-RM-11]`<br>Parent gate: `RUN-201` | Sólo schemas generados |
| C2-CON-RM-12 | `solguard-backend` | `refactor(contracts): remove vendored authoritative copies [C2-CON-RM-12]`<br>Parent gate: `RUN-201` | Sólo schemas generados |
| C2-CON-RM-13 | `solguard-deploy` | `refactor(contracts): remove vendored authoritative copies [C2-CON-RM-13]`<br>Parent gate: `RUN-201` | Sólo verifier canónico |
| C2-CON-RM-14 | `solguard-docs` | receipt de ausencia `[C2-CON-RM-14]`<br>Parent gate: `RUN-201` | Sin implementación contractual |
| C2-CON-RM-15 | `solguard-agents` | receipt de ausencia `[C2-CON-RM-15]`<br>Parent gate: `RUN-201` | Registry no duplica schemas |
| C2-CON-RM-16 | `solguard-agents` | `ci(contracts): reject authoritative contract copies [C2-CON-RM-16]`<br>Parent gate: `RUN-201` | Registry final, manifest de retirada y linter global |

`C2-CON-RM-16` ocurre después de todas las filas anteriores. El manifest de
retirada enumera SHAs/receipts y el linter CI rechaza una copia nueva.

### Tren C2-B — Runtime y publicación

| ID | Repo | Commit | Resultado |
|---|---|---|---|
| C2-RUN-01 | `solguard-core` | `feat(run-contracts): publish run spec source authority and generic materiality schemas with writers off [C2-RUN-01]`<br>Parent gate: `RUN-202` | Materiality no identificante + policy-set commitment opaco; policy leaf/mapping/program severity prohibidos |
| C2-RUN-02 | `solguard-map` | `refactor(run-reader): dual-read run spec and source authority [C2-RUN-02]`<br>Parent gate: `RUN-202` | Rechaza source/materiality/commitment roots incompatibles sin abrir policies |
| C2-RUN-03 | `solguard-trace` | `refactor(run-reader): dual-read run spec and source authority [C2-RUN-03]`<br>Parent gate: `RUN-202` | Causalidad ligada al source root |
| C2-RUN-04 | `solguard-discover` | `refactor(run-reader): dual-read run spec and source authority [C2-RUN-04]`<br>Parent gate: `RUN-202` | Modelo consume identidad inmutable |
| C2-RUN-05 | `solguard-economic` | `refactor(run-reader): dual-read generic materiality profile [C2-RUN-05]`<br>Parent gate: `RUN-202` | Impact class y lower bound nativos; cero mapping target-specific |
| C2-RUN-06 | `solguard-invariant` | `refactor(run-reader): dual-read run spec and source authority [C2-RUN-06]`<br>Parent gate: `RUN-202` | Scope e independencia ligados |
| C2-RUN-07 | `solguard-value` | `refactor(run-reader): dual-read run spec materiality and source authority [C2-RUN-07]`<br>Parent gate: `RUN-202` | Certificate liga lower bound, materiality y opaque policy-set commitment; no policy leaf |
| C2-RUN-08 | `solguard-validate` | `refactor(run-reader): verify generic materiality commitment and source bindings [C2-RUN-08]`<br>Parent gate: `RUN-202` | Root swap/leak/program-severity-in-proof fallan |
| C2-RUN-09 | `solguard-filter` | `refactor(run-reader): verify immutable generic run profile before admission [C2-RUN-09]`<br>Parent gate: `RUN-202` | No recibe policy mapping ni clasifica bounty severity |
| C2-RUN-10 | `solguard-diff` | `refactor(run-reader): dual-read run spec and source authority [C2-RUN-10]`<br>Parent gate: `RUN-202` | Comparación conserva identidad |
| C2-RUN-11 | `solguard-backend` | `feat(run-reader): expose canonical run spec without reinterpretation [C2-RUN-11]`<br>Parent gate: `RUN-202` | Passthrough byte-exact |
| C2-RUN-12 | `solguard-deploy` | `feat(run-verifier): verify run source generic materiality and hiding commitment contracts [C2-RUN-12]`<br>Parent gate: `RUN-202` | Evaluator-only policy opening separado del scanner |
| C2-RUN-13 | `solguard-deploy` | `test(run-prewriter): execute old-new tamper dictionary fingerprint and leak matrix with writers off [C2-RUN-13]`<br>Parent gate: `RUN-202` | Todos los readers probados; ninguna policy leaf/ID/mapping alcanza scanner |
| C2-003 | `solguard-core` | `feat(run): activate immutable run specification and source authority writers [C2-003]`<br>Parent gate: `RUN-202` | Sólo tras C2-RUN-01..13; identidad desde source/config/toolchain/model/materiality/opaque commitment |
| C2-004 | `solguard-core` | `feat(run): validate budgets capabilities and stage dag [C2-004]`<br>Parent gate: `RUN-202` | Spec inválida rechazada |
| C2-005 | `solguard-core` | `feat(artifacts): add append-only artifact store [C2-005]`<br>Parent gate: `RUN-203` | Create-only, atomicidad y tamper |
| C2-006 | `solguard-core` | `feat(journal): record attempts lineage budgets and monotonic time [C2-006]`<br>Parent gate: `RUN-204` | Cronología causal correcta |
| C2-007 | `solguard-core` | `feat(resume): bind cache retry and resume to complete inputs [C2-007]`<br>Parent gate: `RUN-205` | Drift de un byte invalida reuse |
| C2-008 | `solguard-core` | `feat(supervision): add cancellation deadline and process cleanup [C2-008]`<br>Parent gate: `RUN-206` | Árbol de procesos cerrado |
| C2-009 | `solguard-backend` | `feat(control): propagate cancellation and terminal receipts [C2-009]`<br>Parent gate: `RUN-206` | Cancel/restart concurrente |
| C2-009A | `solguard-core` | `feat(publication): dual-read tool-owned output manifests [C2-009A]`<br>Parent gate: `RUN-207-CORE-READER` | Consumidor listo antes del productor |
| C2-009B | `solguard-database` | `feat(publication): dual-read sealed output manifests [C2-009B]`<br>Parent gate: `RUN-207-DATABASE` | Persistencia compatible |
| C2-009C | `solguard-backend` | `feat(publication): expose sealed outputs without rewriting [C2-009C]`<br>Parent gate: `RUN-207-BACKEND` | Passthrough compatible |
| C2-009D | `solguard-deploy` | `feat(publication): verify old and new output matrices [C2-009D]`<br>Parent gate: `RUN-207-DEPLOY` | Gate consumidor |
| C2-010 | `solguard-map` | `feat(publication): own and seal map outputs [C2-010]`<br>Parent gate: `RUN-207-MAP` | Manifest de productor |
| C2-011 | `solguard-trace` | `feat(publication): own and seal trace outputs [C2-011]`<br>Parent gate: `RUN-207-TRACE` | Estados tipados |
| C2-012 | `solguard-discover` | `feat(publication): own and seal model and hypothesis outputs [C2-012]`<br>Parent gate: `RUN-207-DISCOVER` | Leads inmutables |
| C2-013 | `solguard-economic` | `feat(publication): own and seal economic outputs [C2-013]`<br>Parent gate: `RUN-207-ECONOMIC` | Unidades y supuestos |
| C2-014 | `solguard-invariant` | `feat(publication): own and seal invariant outputs [C2-014]`<br>Parent gate: `RUN-207-INVARIANT` | Authority y scope |
| C2-015 | `solguard-value` | `feat(publication): own and seal proof outputs [C2-015]`<br>Parent gate: `RUN-207-VALUE` | Obligaciones preservadas |
| C2-016 | `solguard-validate` | `feat(publication): own and seal verdict outputs [C2-016]`<br>Parent gate: `RUN-207-VALIDATE` | Technical verdict inmutable |
| C2-017 | `solguard-filter` | `feat(publication): own and seal admission outputs [C2-017]`<br>Parent gate: `RUN-207-FILTER` | Rechazos conservados |
| C2-018 | `solguard-diff` | `feat(publication): own and seal diff outputs [C2-018]`<br>Parent gate: `RUN-207-DIFF` | Cambios causales |
| C2-019 | `solguard-core` | `feat(publication): bind hypotheses into canonical candidates [C2-019]`<br>Parent gate: `RUN-207-CORE-CUTOVER` | Root/trigger/impact exactos |
| C2-019A | `solguard-deploy` | `test(publication): prove reader-first tool-owned publication end to end [C2-019A]`<br>Parent gate: `RUN-207-E2E` | Todos los children, matrices y fallos parciales |
| C2-020 | `solguard-core` | `feat(manifest-schema): publish run and product artifact schemas with writer off [C2-020]`<br>Parent gate: `RUN-208` | IDs, roles, schema, producer, lineage, roots, digest, size y complete marker |
| C2-020A | `solguard-database` | `feat(manifest-reader): dual-read and persist immutable run artifact manifests [C2-020A]`<br>Parent gate: `RUN-208` | Integridad referencial; consumidor listo |
| C2-020B | `solguard-backend` | `feat(manifest-reader): dual-read run artifacts by identity and role [C2-020B]`<br>Parent gate: `RUN-208` | API no infiere por path |
| C2-020C | `solguard-deploy` | `feat(manifest-reader): verify portable manifests without filename authority [C2-020C]`<br>Parent gate: `RUN-208` | Replayer listo |
| C2-020D | `solguard-deploy` | `test(manifest-contract): verify all old-new and new-new consumers [C2-020D]`<br>Parent gate: `RUN-208` | Writer aún desactivado |
| C2-021 | `solguard-core` | `feat(manifest-writer): close portable run and product manifests [C2-021]`<br>Parent gate: `RUN-208` | Stage y artifact closure después de C2-020A..D |
| C2-022 | `solguard-backend` | `feat(runs): expose manifests artifacts and terminal states [C2-022]`<br>Parent gate: `RUN-208` | Passthrough sin reinterpretación |
| C2-023 | `solguard-deploy` | `test(runtime): replay portable run and reject tampering [C2-023]`<br>Parent gate: `RUN-208` | Reproducción desde entorno limpio |
| C2-024 | `solguard-docs` | `docs(runtime): publish contracts resume cancel and recovery [C2-024]`<br>Parent gate: `RUN-208` | Tercero reproduce lifecycle |
| C2-025 | `solguard-core` | `refactor(handoffs): replace implicit temp paths with artifact identities [C2-025]`<br>Parent gate: `RUN-209` | Cero filename/mtime/cwd authority |
| C2-026 | `solguard-deploy` | `test(handoffs): prove concurrent runs cannot consume implicit files [C2-026]`<br>Parent gate: `RUN-209` | Symlink, temp, crash y reorder |
| C2-027 | `solguard-core` | `fix(artifacts): reject corrupt foreign partial and incompatible roots [C2-027]`<br>Parent gate: `RUN-210` | Fail-closed con reason codes |
| C2-028 | `solguard-deploy` | `test(artifacts): execute tamper and foreign-root chaos matrix [C2-028]`<br>Parent gate: `RUN-210` | Ningún fallback o empty success |

Commit de retirada:

| ID | Repo | Commit | Precondición |
|---|---|---|---|
| C2-030 | `solguard-core` | `refactor(runtime): remove implicit shared tool outputs [C2-030]`<br>Parent gate: `RUN-207-CORE-CUTOVER` | Cero rutas legacy observadas |

## 7. Onda C3 — Semantic IR y modelo económico

### Tren C3-A — IR común

| ID | Repo | Commit | Resultado |
|---|---|---|---|
| C3-001 | `solguard-map` | `feat(ir-schema): publish semantic ir schema and goldens [C3-001]`<br>Parent gate: `IR-301` | Wire contract sin activar writer |
| C3-001A | `solguard-trace` | `feat(ir-reader): dual-read canonical semantic ir [C3-001A]`<br>Parent gate: `IR-301` | TRACE listo |
| C3-001B | `solguard-discover` | `feat(ir-reader): dual-read canonical semantic ir [C3-001B]`<br>Parent gate: `IR-301` | DISCOVER listo |
| C3-001C | `solguard-diff` | `feat(ir-reader): dual-read canonical semantic ir [C3-001C]`<br>Parent gate: `IR-301` | DIFF listo |
| C3-001D | `solguard-economic` | `feat(ir-reader): dual-read canonical semantic ir [C3-001D]`<br>Parent gate: `IR-301` | ECONOMIC listo |
| C3-001E | `solguard-invariant` | `feat(ir-reader): dual-read canonical semantic ir [C3-001E]`<br>Parent gate: `IR-301` | INVARIANT listo |
| C3-001F | `solguard-value` | `feat(ir-reader): dual-read canonical semantic ir [C3-001F]`<br>Parent gate: `IR-301` | VALUE listo |
| C3-001G | `solguard-validate` | `feat(ir-reader): dual-read canonical semantic ir [C3-001G]`<br>Parent gate: `IR-301` | VALIDATE listo |
| C3-001H | `solguard-core` | `feat(ir-reader): verify canonical semantic ir envelopes [C3-001H]`<br>Parent gate: `IR-301` | CORE listo |
| C3-001I | `solguard-deploy` | `test(ir-contract): verify old-old new-old and old-new with writer off [C3-001I]`<br>Parent gate: `IR-301` | Todos los readers listos |
| C3-002 | `solguard-map` | `feat(ir-writer): emit versioned semantic ir [C3-002]`<br>Parent gate: `IR-301` | Writer activable tras C3-001A..I |
| C3-002A | `solguard-deploy` | `test(ir-contract): run new-new failure reorder and tamper matrix [C3-002A]`<br>Parent gate: `IR-301` | Cutover autorizado |
| C3-003 | `solguard-map` | `feat(identity): define canonical callable state flow and route ids [C3-003]`<br>Parent gate: `IR-302` | Identidades estables |
| C3-004 | `solguard-core` | `feat(identity): reject ambiguous cross-domain bindings [C3-004]`<br>Parent gate: `IR-302` | Governor/Oracle/Rewards separados |
| C3-007 | `solguard-map` | `feat(capability-schema): publish receipt schema and goldens with writers off [C3-007]`<br>Parent gate: `IR-304` | Contrato antes de productores |
| C3-007A | `solguard-core` | `feat(capability-reader): dual-read measured capability receipts [C3-007A]`<br>Parent gate: `IR-304` | CORE listo |
| C3-007B | `solguard-trace` | `feat(capability-reader): consume map frontend capability receipts [C3-007B]`<br>Parent gate: `IR-304` | TRACE reader listo |
| C3-007C | `solguard-discover` | `feat(capability-reader): consume semantic capability receipts [C3-007C]`<br>Parent gate: `IR-304` | DISCOVER listo |
| C3-007D | `solguard-diff` | `feat(capability-reader): consume semantic capability receipts [C3-007D]`<br>Parent gate: `IR-304` | DIFF listo |
| C3-007E | `solguard-economic` | `feat(capability-reader): consume semantic capability receipts [C3-007E]`<br>Parent gate: `IR-304` | ECONOMIC listo |
| C3-007F | `solguard-invariant` | `feat(capability-reader): consume semantic capability receipts [C3-007F]`<br>Parent gate: `IR-304` | INVARIANT listo |
| C3-007G | `solguard-value` | `feat(capability-reader): consume semantic capability receipts [C3-007G]`<br>Parent gate: `IR-304` | VALUE listo |
| C3-007H | `solguard-validate` | `feat(capability-reader): consume semantic capability receipts [C3-007H]`<br>Parent gate: `IR-304` | VALIDATE listo |
| C3-007I | `solguard-deploy` | `feat(capability-reader): verify receipt schemas and denominators [C3-007I]`<br>Parent gate: `IR-304` | DEPLOY listo |
| C3-007IA | `solguard-deploy` | `test(capability-contract): verify every reader with writers off [C3-007IA]`<br>Parent gate: `IR-304` | Old/new matrices |
| C3-007J | `solguard-map` | `feat(frontend-capabilities): emit measured frontend capability receipts [C3-007J]`<br>Parent gate: `IR-304` | Ratios, gaps y deuda MAP-only |
| C3-007L | `solguard-deploy` | `test(frontend-capabilities): verify MAP producer through every reader [C3-007L]`<br>Parent gate: `IR-304` | New/new y ownership |
| C3-009AA | `solguard-map` | `feat(frontend-manifest-schema): publish frontend manifest schema and goldens with writer off [C3-009AA]`<br>Parent gate: `IR-307` | Contrato por frontend inerte |
| C3-009AB | `solguard-trace` | `feat(frontend-manifest-reader): consume exact frontend manifests [C3-009AB]`<br>Parent gate: `IR-307` | TRACE listo |
| C3-009AC | `solguard-discover` | `feat(frontend-manifest-reader): consume exact frontend manifests [C3-009AC]`<br>Parent gate: `IR-307` | DISCOVER listo |
| C3-009AD | `solguard-diff` | `feat(frontend-manifest-reader): consume exact frontend manifests [C3-009AD]`<br>Parent gate: `IR-307` | DIFF listo |
| C3-009AE | `solguard-core` | `feat(frontend-manifest-reader): verify exact frontend manifests [C3-009AE]`<br>Parent gate: `IR-307` | CORE listo |
| C3-009AF | `solguard-deploy` | `test(frontend-manifest-contract): verify all readers before writer [C3-009AF]`<br>Parent gate: `IR-307` | Old/new matrices |
| C3-009B | `solguard-map` | `fix(frontend-writer): emit manifest and unsupported instead of fabricated facts [C3-009B]`<br>Parent gate: `IR-307` | Deuda bloqueante y cero grafos inventados |
| C3-009C | `solguard-deploy` | `test(frontend): propagate unsupported through the vertical slice [C3-009C]`<br>Parent gate: `IR-307` | TRACE a FILTER fail-closed |
| C3-004A | `solguard-trace` | `feat(trace-schema): publish trace graph schema and goldens with writer off [C3-004A]`<br>Parent gate: `IR-303` | Contrato TRACE aún inerte |
| C3-004B | `solguard-discover` | `feat(trace-reader): dual-read trace graphs [C3-004B]`<br>Parent gate: `IR-303` | DISCOVER listo |
| C3-004C | `solguard-economic` | `feat(trace-reader): dual-read trace graphs [C3-004C]`<br>Parent gate: `IR-303` | ECONOMIC listo |
| C3-004D | `solguard-value` | `feat(trace-reader): dual-read trace graphs [C3-004D]`<br>Parent gate: `IR-303` | VALUE listo |
| C3-004E | `solguard-invariant` | `feat(trace-reader): dual-read trace graphs [C3-004E]`<br>Parent gate: `IR-303` | INVARIANT listo |
| C3-004F | `solguard-validate` | `feat(trace-reader): dual-read trace graphs [C3-004F]`<br>Parent gate: `IR-303` | VALIDATE listo |
| C3-004G | `solguard-core` | `feat(trace-reader): dual-read trace graphs [C3-004G]`<br>Parent gate: `IR-303` | CORE listo |
| C3-004H | `solguard-deploy` | `test(trace-contract): verify old-old new-old and old-new readers [C3-004H]`<br>Parent gate: `IR-303` | Writer aún desactivado |
| C3-005 | `solguard-trace` | `feat(trace-writer): derive typed control data and state paths [C3-005]`<br>Parent gate: `IR-303` | Grafo con provenance; requiere C3-004B..H |
| C3-005A | `solguard-trace` | `feat(trace-summaries): build bounded interprocedural effect summaries [C3-005A]`<br>Parent gate: `IR-303` | Call/return, state, asset y unknown; depende C3-005 |
| C3-005B | `solguard-trace` | `feat(trace-scc): collapse recursion and cyclic call components without losing debt [C3-005B]`<br>Parent gate: `IR-303` | SCC y fixed point acotado; depende C3-005A |
| C3-005C | `solguard-trace` | `feat(trace-slices): emit backward and forward causal slices [C3-005C]`<br>Parent gate: `IR-303` | Source→sink y state→impact reproducibles; depende C3-005B |
| C3-005D | `solguard-trace` | `feat(trace-dominance): compute dominators postdominators and control dependence [C3-005D]`<br>Parent gate: `IR-303` | Guardas y bypasses sin enumerar todos los paths; depende C3-005C |
| C3-005E | `solguard-trace` | `feat(trace-feasibility): prune infeasible paths with typed constraints and explicit unknown [C3-005E]`<br>Parent gate: `IR-303` | Nunca convierte timeout/unknown en unreachable; depende C3-005D |
| C3-005F | `solguard-trace` | `feat(trace-continuations): checkpoint and resume bounded graph exploration [C3-005F]`<br>Parent gate: `IR-303` | Continuation token content-addressed y budget-bound; depende C3-005E |
| C3-005G | `solguard-trace` | `feat(trace-cache): isolate content-addressed summaries slices and feasibility caches [C3-005G]`<br>Parent gate: `IR-303` | Candidate/profile/scope/root forman la key; depende C3-005F |
| C3-005H | `solguard-trace` | `feat(trace-priority): prioritize economic risk without deleting reachable evidence [C3-005H]`<br>Parent gate: `IR-303` | Top-K sólo ordena; cobertura/deuda conserva denominador; depende C3-005G |
| C3-006 | `solguard-trace` | `fix(binding): preserve unresolved and candidate sets [C3-006]`<br>Parent gate: `IR-303` | Ambigüedad no inventada; depende de `C3-005H`, por lo que summaries, SCC, slices, dominancia, feasibility, continuations, cache y prioridad ya están integrados |
| C3-006A | `solguard-deploy` | `test(trace-contract): verify new-new failure reorder and tamper matrix [C3-006A]`<br>Parent gate: `IR-303` | Todos los consumidores |
| C3-006B | `solguard-trace` | `feat(causal-capabilities): emit measured TRACE capability receipts [C3-006B]`<br>Parent gate: `IR-308` | Depende IR-303/IR-304; reachability, orden, async y deuda |
| C3-006C | `solguard-deploy` | `test(causal-capabilities): verify TRACE producer through every reader [C3-006C]`<br>Parent gate: `IR-308` | New/new, denominadores y ownership |
| C3-008 | `solguard-core` | `feat(capabilities): gate consumers on accepted MAP and TRACE receipts [C3-008]`<br>Parent gate: `IR-308` | IR-304 + IR-308; tier nominal no autoriza |
| C3-009 | `solguard-diff` | `feat(ir): compare semantic ir and build profiles [C3-009]`<br>Parent gate: `IR-305` | C/C++ y cambios causales |
| C3-009A | `solguard-diff` | `test(metamorphic): preserve causal identities across equivalent transforms [C3-009A]`<br>Parent gate: `IR-306` | 30 scopes y mutantes causales |

### Tren C3-B — World model

| ID | Repo | Commit | Resultado |
|---|---|---|---|
| C3-010 | `solguard-discover` | `feat(model-schema): publish protocol model schema and goldens [C3-010]`<br>Parent gate: `MODEL-401` | Writer aún inactivo |
| C3-010A | `solguard-economic` | `feat(model-reader): dual-read protocol model [C3-010A]`<br>Parent gate: `MODEL-401` | ECONOMIC listo |
| C3-010B | `solguard-invariant` | `feat(model-reader): dual-read protocol model [C3-010B]`<br>Parent gate: `MODEL-401` | INVARIANT listo |
| C3-010C | `solguard-value` | `feat(model-reader): dual-read protocol model [C3-010C]`<br>Parent gate: `MODEL-401` | VALUE listo |
| C3-010D | `solguard-core` | `feat(model-reader): dual-read protocol model [C3-010D]`<br>Parent gate: `MODEL-401` | CORE listo |
| C3-010DA | `solguard-deploy` | `test(model-contract): verify every reader with writer off [C3-010DA]`<br>Parent gate: `MODEL-401` | Old/new matrices |
| C3-010E | `solguard-discover` | `feat(model-writer): emit actors assets states and boundaries [C3-010E]`<br>Parent gate: `MODEL-401` | Proposal rederivable |
| C3-010F | `solguard-deploy` | `test(model-contract): run new-new failure and tamper matrix [C3-010F]`<br>Parent gate: `MODEL-401` | Cutover autorizado |
| C3-011 | `solguard-discover` | `fix(reasoning): require coverage before absence claims [C3-011]`<br>Parent gate: `MODEL-402` | Helpers, aliases, wrappers y decoys |
| C3-012 | `solguard-economic` | `feat(transition-schema): publish economic transition schema and goldens [C3-012]`<br>Parent gate: `MODEL-403` | Writer aún inactivo |
| C3-012A | `solguard-invariant` | `feat(transition-reader): dual-read economic transitions [C3-012A]`<br>Parent gate: `MODEL-403` | INVARIANT listo |
| C3-012B | `solguard-value` | `feat(transition-reader): dual-read economic transitions [C3-012B]`<br>Parent gate: `MODEL-403` | VALUE listo |
| C3-012C | `solguard-validate` | `feat(transition-reader): dual-read economic transitions [C3-012C]`<br>Parent gate: `MODEL-403` | VALIDATE listo |
| C3-012D | `solguard-core` | `feat(transition-reader): dual-read economic transitions [C3-012D]`<br>Parent gate: `MODEL-403` | CORE listo |
| C3-012DA | `solguard-deploy` | `test(transition-contract): verify every reader with writer off [C3-012DA]`<br>Parent gate: `MODEL-403` | Old/new matrices |
| C3-012E | `solguard-economic` | `feat(transition-writer): emit typed economic state transitions [C3-012E]`<br>Parent gate: `MODEL-403` | Pre/post, effects, asset y unidad |
| C3-012F | `solguard-deploy` | `test(transition-contract): run new-new failure and tamper matrix [C3-012F]`<br>Parent gate: `MODEL-403` | Cutover autorizado |
| C3-013 | `solguard-economic` | `feat(kernel-registry): publish typed economic kernel interfaces and applicability [C3-013]`<br>Parent gate: `MODEL-404` | Registry cerrado; no declara universal una ley no aplicable |
| C3-013A | `solguard-economic` | `feat(units): type assets scales prices periods and numeric domains [C3-013A]`<br>Parent gate: `MODEL-410` | Mezclas incompatibles rechazadas |
| C3-013B | `solguard-deploy` | `test(units): verify dimensional metamorphic and adversarial matrix [C3-013B]`<br>Parent gate: `MODEL-410` | Ocho lenguajes y boundaries |
| C3-013C | `solguard-economic` | `feat(kernels-conservation): implement conservation backing and bounded-supply laws [C3-013C]`<br>Parent gate: `MODEL-404` | Assets/liabilities y sources/sinks explícitos; depende C3-013/013A |
| C3-013D | `solguard-economic` | `feat(kernels-vault): implement shares assets first-depositor and requested-received laws [C3-013D]`<br>Parent gate: `MODEL-404` | Donation, rounding y fee-on-transfer near-misses; depende C3-013C |
| C3-013E | `solguard-economic` | `feat(kernels-credit): implement debt collateral liquidation and solvency laws [C3-013E]`<br>Parent gate: `MODEL-404` | Health, bad debt y close factor acotados; depende C3-013D |
| C3-013F | `solguard-economic` | `feat(kernels-fees): implement fee rebase rounding and precision laws [C3-013F]`<br>Parent gate: `MODEL-404` | Escalas y direcciones de rounding tipadas; depende C3-013E |
| C3-013G | `solguard-economic` | `feat(kernels-oracle): implement oracle twap staleness and manipulation laws [C3-013G]`<br>Parent gate: `MODEL-404` | Heartbeat/window/orientation/source root; depende C3-013F |
| C3-013H | `solguard-economic` | `feat(kernels-distributed): implement cross-component and distributed-accounting laws [C3-013H]`<br>Parent gate: `MODEL-404` | Message/finality/retry e inter-ledger debt; depende C3-013G |
| C3-013I | `solguard-economic` | `feat(kernels-order): implement atomicity callback ordering and finality laws [C3-013I]`<br>Parent gate: `MODEL-404` | Multi-step/reentrancy/async order con unknown visible; depende C3-013H |
| C3-013J | `solguard-economic` | `feat(adversary-schema): publish economic adversary model schema and goldens with writer off [C3-013J]`<br>Parent gate: `MODEL-411` | Capital, liquidity, costes, oracle, ordering y objective tipados |
| C3-013K | `solguard-value` | `feat(adversary-reader): rederive feasibility and conservative net delta [C3-013K]`<br>Parent gate: `MODEL-411` | Reader listo antes del writer; depende C3-013J |
| C3-013L | `solguard-validate` | `feat(adversary-reader): verify feasibility bounds actor and external preconditions [C3-013L]`<br>Parent gate: `MODEL-411` | No confía en profitability declarada; depende C3-013J |
| C3-013M | `solguard-core` | `feat(adversary-reader): bind adversary model into proof obligations and evidence waves [C3-013M]`<br>Parent gate: `MODEL-411` | Unknown/cost/budget propagan deuda; depende C3-013J |
| C3-013N | `solguard-deploy` | `test(adversary-contract): verify all readers with writer off [C3-013N]`<br>Parent gate: `MODEL-411` | Old/new, tamper, infinite-resource y future-snapshot negatives; depende C3-013K..M |
| C3-013O | `solguard-economic` | `feat(adversary-writer): emit bounded satisfiable unsat or unknown strategies [C3-013O]`<br>Parent gate: `MODEL-411` | Writer tras readers; depende C3-013N |
| C3-013P | `solguard-deploy` | `test(adversary-e2e): prove net impact under realistic capital market and ordering constraints [C3-013P]`<br>Parent gate: `MODEL-411` | Positivo/safe/near-miss/metamorphic por scope aplicable; depende C3-013O |
| C3-014 | `solguard-invariant` | `feat(invariant-schema): publish invariant set schema and goldens [C3-014]`<br>Parent gate: `MODEL-405` | Writer aún inactivo |
| C3-014A | `solguard-value` | `feat(invariant-reader): dual-read invariant sets [C3-014A]`<br>Parent gate: `MODEL-405` | VALUE listo |
| C3-014B | `solguard-validate` | `feat(invariant-reader): dual-read invariant sets [C3-014B]`<br>Parent gate: `MODEL-405` | VALIDATE listo |
| C3-014C | `solguard-core` | `feat(invariant-reader): dual-read invariant sets [C3-014C]`<br>Parent gate: `MODEL-405` | CORE listo |
| C3-014D | `solguard-discover` | `feat(invariant-reader): dual-read invariant sets [C3-014D]`<br>Parent gate: `MODEL-405` | Hypothesis engines listos |
| C3-014DA | `solguard-deploy` | `test(invariant-contract): verify every reader with writer off [C3-014DA]`<br>Parent gate: `MODEL-405` | Old/new matrices |
| C3-014E | `solguard-invariant` | `feat(invariant-writer): emit independent scoped base properties [C3-014E]`<br>Parent gate: `MODEL-405` | Sin candidate text |
| C3-014F | `solguard-deploy` | `test(invariant-contract): run new-new failure and tamper matrix [C3-014F]`<br>Parent gate: `MODEL-405` | Cutover autorizado |
| C3-015 | `solguard-discover` | `feat(hypothesis-schema): publish hypothesis envelope schema and goldens [C3-015]`<br>Parent gate: `MODEL-406` | Writer aún inactivo |
| C3-015A | `solguard-core` | `feat(hypothesis-reader): dual-read hypothesis envelopes [C3-015A]`<br>Parent gate: `MODEL-406` | CORE listo |
| C3-015AA | `solguard-deploy` | `test(hypothesis-contract): verify CORE reader with writer off [C3-015AA]`<br>Parent gate: `MODEL-406` | Old/new matrices |
| C3-015B | `solguard-discover` | `feat(hypothesis-writer): emit separate known and open world hypotheses [C3-015B]`<br>Parent gate: `MODEL-406` | Origen indeleble |
| C3-015C | `solguard-deploy` | `test(hypothesis-contract): run new-new failure and tamper matrix [C3-015C]`<br>Parent gate: `MODEL-406` | Cutover autorizado |
| C3-015D | `solguard-core` | `feat(candidate-schema): publish canonical candidate schema and goldens with writer off [C3-015D]`<br>Parent gate: `MODEL-407` | Binding aún no activado |
| C3-015E | `solguard-value` | `feat(candidate-reader): dual-read canonical candidates [C3-015E]`<br>Parent gate: `MODEL-407` | VALUE listo |
| C3-015F | `solguard-validate` | `feat(candidate-reader): dual-read canonical candidates [C3-015F]`<br>Parent gate: `MODEL-407` | VALIDATE listo |
| C3-015G | `solguard-filter` | `feat(candidate-reader): dual-read canonical candidates [C3-015G]`<br>Parent gate: `MODEL-407` | FILTER listo |
| C3-015H | `solguard-deploy` | `test(candidate-contract): verify every reader before writer [C3-015H]`<br>Parent gate: `MODEL-407` | Old/new matrices |
| C3-016 | `solguard-core` | `feat(hypotheses): enforce known and open track isolation [C3-016]`<br>Parent gate: `MODEL-406` | Recursos separados |
| C3-016A | `solguard-discover` | `refactor(origins): separate semantic model rule-pack retrieval and direct-tool producers [C3-016A]`<br>Parent gate: `MODEL-406` | Enum/taint indelebles; depende de C3-015B |
| C3-016B | `solguard-core` | `feat(origin-policy): preserve origin sets taint and forbid post-merge relabeling [C3-016B]`<br>Parent gate: `MODEL-406` | Todos los consumers; depende de C3-016 y C3-016A |
| C3-016D | `solguard-core` | `feat(model-gateway): enforce structured context channels and untrusted-source boundaries [C3-016D]`<br>Parent gate: `MODEL-406` | Source/comments/tool text nunca ascienden a system/policy; depende C3-016B |
| C3-016E | `solguard-discover` | `feat(prompt-boundary): emit proposals through typed schema with provenance and no instruction execution [C3-016E]`<br>Parent gate: `MODEL-406` | Prompt/context injection queda data-only; depende C3-016D |
| C3-016F | `solguard-deploy` | `test(prompt-injection): mutate source comments manifests tool output and retrieved text [C3-016F]`<br>Parent gate: `MODEL-406` | Cero policy override, secret/network escape o blind taint loss; depende C3-016E |
| C3-016C | `solguard-deploy` | `test(ablations): compare generic model rule-pack full and known-retrieval profiles [C3-016C]`<br>Parent gate: `MODEL-406` | Mismos inputs/budgets/evaluator, caches aislados; depende de C3-016B y C3-015C |
| C3-017 | `solguard-core` | `fix(candidate-writer): bind candidate root trigger impact and route exactly [C3-017]`<br>Parent gate: `MODEL-407` | Cero cross-binding incompatible; requiere C3-015E..H |
| C3-017A | `solguard-deploy` | `test(candidate-contract): verify new-new tamper and cross-binding matrix [C3-017A]`<br>Parent gate: `MODEL-407` | Todos los consumers |
| C3-018 | `solguard-trace` | `feat(sequence): preserve state across transactions [C3-018]`<br>Parent gate: `MODEL-408-TRACE` | Actor, orden, block y callback |
| C3-019 | `solguard-discover` | `feat(counterfactual): propose multi-step causal hypotheses [C3-019]`<br>Parent gate: `MODEL-408-DISCOVER` | Contrafactual restaurado |
| C3-020 | `solguard-economic` | `feat(counterfactual): evaluate multi-transaction economic paths [C3-020]`<br>Parent gate: `MODEL-408-ECONOMIC` | Bounds y deuda explícitos |
| C3-021 | `solguard-deploy` | `test(world): validate multi-transaction composition and near-misses [C3-021]`<br>Parent gate: `MODEL-408-E2E` | Positivo/control/mutantes |
| C3-022 | `solguard-deploy` | `test(causal-matrix): seal vulnerable patch safe near-miss and mutants [C3-022]`<br>Parent gate: `MODEL-409` | Cada family/scope con lineage independiente |
| C3-023 | `solguard-deploy` | `test(causal-matrix): verify restored property and oracle separation [C3-023]`<br>Parent gate: `MODEL-409` | Scanner no alcanza labels |

Commit de retirada:

| ID | Repo | Commit | Precondición |
|---|---|---|---|
| C3-030 | `solguard-discover` | `refactor(reasoning): remove lexical absence authority [C3-030]`<br>Parent gate: `MODEL-402` | Cobertura semántica demostrada |

## 8. Onda C4 — Bucle de prueba y evidencia

| ID | Repo | Commit | Resultado |
|---|---|---|---|
| C4-000A | `solguard-value` | `feat(obligation-schema): publish proof obligation schema and goldens with writer off [C4-000A]`<br>Parent gate: `PROOF-501` | Producer inerte |
| C4-000B | `solguard-core` | `feat(obligation-reader): dual-read proof obligations [C4-000B]`<br>Parent gate: `PROOF-501` | CORE listo |
| C4-000C | `solguard-validate` | `feat(obligation-reader): dual-read proof obligations [C4-000C]`<br>Parent gate: `PROOF-501` | VALIDATE listo |
| C4-000D | `solguard-map` | `feat(obligation-reader): consume directed obligations [C4-000D]`<br>Parent gate: `PROOF-501` | MAP provider listo |
| C4-000E | `solguard-trace` | `feat(obligation-reader): consume directed obligations [C4-000E]`<br>Parent gate: `PROOF-501` | TRACE provider listo |
| C4-000F | `solguard-economic` | `feat(obligation-reader): consume directed obligations [C4-000F]`<br>Parent gate: `PROOF-501` | ECONOMIC provider listo |
| C4-000G | `solguard-invariant` | `feat(obligation-reader): consume directed obligations [C4-000G]`<br>Parent gate: `PROOF-501` | INVARIANT provider listo |
| C4-000H | `solguard-value` | `feat(obligation-reader): consume directed obligations [C4-000H]`<br>Parent gate: `PROOF-501` | VALUE provider listo |
| C4-000I | `solguard-deploy` | `test(obligation-contract): verify all readers before writer [C4-000I]`<br>Parent gate: `PROOF-501` | Old/new matrices |
| C4-001 | `solguard-value` | `feat(obligation-writer): compile mandatory proof obligations by claim [C4-001]`<br>Parent gate: `PROOF-501` | Mandatory/conditional/N-A justificado; requiere C4-000B..I |
| C4-001A | `solguard-deploy` | `test(obligation-contract): verify new-new failure and tamper matrix [C4-001A]`<br>Parent gate: `PROOF-501` | Todos los consumers |
| C4-002 | `solguard-core` | `feat(evidence-schema): publish request and response schemas and goldens with writers off [C4-002]`<br>Parent gate: `PROOF-502` | Wave, parents, scopes y budget |
| C4-002A | `solguard-map` | `feat(evidence-request-reader): dual-read directed requests [C4-002A]`<br>Parent gate: `PROOF-502` | MAP listo |
| C4-002B | `solguard-trace` | `feat(evidence-request-reader): dual-read directed requests [C4-002B]`<br>Parent gate: `PROOF-502` | TRACE listo |
| C4-002C | `solguard-economic` | `feat(evidence-request-reader): dual-read directed requests [C4-002C]`<br>Parent gate: `PROOF-502` | ECONOMIC listo |
| C4-002D | `solguard-value` | `feat(evidence-request-reader): dual-read directed requests [C4-002D]`<br>Parent gate: `PROOF-502` | VALUE listo |
| C4-002E | `solguard-invariant` | `feat(evidence-request-reader): dual-read directed requests [C4-002E]`<br>Parent gate: `PROOF-502` | INVARIANT listo |
| C4-002F | `solguard-core` | `feat(evidence-response-reader): dual-read provider responses [C4-002F]`<br>Parent gate: `PROOF-502` | CORE listo |
| C4-002G | `solguard-value` | `feat(evidence-response-reader): dual-read provider responses [C4-002G]`<br>Parent gate: `PROOF-502` | VALUE compiler listo |
| C4-002H | `solguard-validate` | `feat(evidence-response-reader): dual-read provider responses [C4-002H]`<br>Parent gate: `PROOF-502` | VALIDATE listo |
| C4-002I | `solguard-deploy` | `test(evidence-contract): verify request and response readers with inert writers [C4-002I]`<br>Parent gate: `PROOF-502` | Old/new matrices |
| C4-003 | `solguard-map` | `feat(provider): answer directed structural requests [C4-003]`<br>Parent gate: `PROOF-503-MAP` | Reabre primarios |
| C4-004 | `solguard-trace` | `feat(provider): answer directed reachability requests [C4-004]`<br>Parent gate: `PROOF-503-TRACE` | Guardas, secuencia y tiempo |
| C4-005 | `solguard-economic` | `feat(provider): answer directed transition requests [C4-005]`<br>Parent gate: `PROOF-503-ECONOMIC` | Ecuación y unidades |
| C4-006 | `solguard-value` | `feat(provider): answer directed impact requests [C4-006]`<br>Parent gate: `PROOF-503-VALUE` | Before/after y actor |
| C4-007 | `solguard-invariant` | `feat(provider): answer directed invariant requests [C4-007]`<br>Parent gate: `PROOF-503-INVARIANT` | Scope y predicate |
| C4-007A | `solguard-deploy` | `test(provider): exercise directed request response chain [C4-007A]`<br>Parent gate: `PROOF-503-E2E` | Todos los providers y no-progress |
| C4-008 | `solguard-core` | `feat(scheduler): orchestrate bounded evidence waves [C4-008]`<br>Parent gate: `PROOF-504` | Fixed point, cycles y terminación |
| C4-008C | `solguard-deploy` | `test(evidence-contract): verify new-new reorder tamper and partial-response matrix [C4-008C]`<br>Parent gate: `PROOF-504` | Scheduler y todos los providers |
| C4-008A | `solguard-core` | `fix(budgets): propagate exhaustion cancellation and unknown as debt [C4-008A]`<br>Parent gate: `PROOF-509` | Nunca ausencia segura o Pass |
| C4-008B | `solguard-deploy` | `test(budgets): exhaust every proof resource dimension [C4-008B]`<br>Parent gate: `PROOF-509` | Chaos, resume y combinaciones |
| C4-009 | `solguard-value` | `feat(solver): add typed constraints and dimensional analysis [C4-009]`<br>Parent gate: `PROOF-505` | Witness/counterexample/unknown |
| C4-010 | `solguard-economic` | `feat(solver): verify numeric domains and economic equations [C4-010]`<br>Parent gate: `PROOF-505` | Width, signedness y rounding |
| C4-011 | `solguard-value` | `feat(probe): run bounded offline semantic assertions [C4-011]`<br>Parent gate: `PROOF-506` | Sin red ni explotación |
| C4-011A | `solguard-value` | `feat(probe-symbolic): add typed SMT and symbolic execution adapter [C4-011A]`<br>Parent gate: `PROOF-506` | Sat/unsat/unknown, bounds y solver receipt; depende C4-011 |
| C4-011B | `solguard-value` | `feat(probe-property): add property-based fuzzing adapter with deterministic replay [C4-011B]`<br>Parent gate: `PROOF-506` | Seed/corpus/shrink trace preservados; depende C4-011A |
| C4-011C | `solguard-value` | `feat(probe-concolic): add bounded concolic path exploration adapter [C4-011C]`<br>Parent gate: `PROOF-506` | Path constraints y exhaustion como deuda; depende C4-011B |
| C4-011D | `solguard-value` | `feat(probe-snapshot): simulate bounded stateful transaction sequences on pinned snapshots [C4-011D]`<br>Parent gate: `PROOF-506` | Sin red, explotación ni future state; depende C4-011C |
| C4-011E | `solguard-deploy` | `test(probe-matrix): verify deterministic adapter receipts isolation and causal agreement [C4-011E]`<br>Parent gate: `PROOF-506` | SMT/fuzz/concolic/snapshot positivo, safe, near-miss y failures; depende C4-011A..D |
| C4-012 | `solguard-deploy` | `feat(probe): isolate and attest semantic probes [C4-012]`<br>Parent gate: `PROOF-506` | Sin host mounts ni secrets; depende C4-011E |
| C4-013 | `solguard-value` | `feat(certificate-schema): publish proof certificate schema and goldens with writer off [C4-013]`<br>Parent gate: `PROOF-507` | VALUE conserva ownership; wire type sin política |
| C4-014 | `solguard-validate` | `feat(certificate): dual-read and verify new certificates [C4-014]`<br>Parent gate: `DECIDE-601` | Consumidor listo |
| C4-014A | `solguard-filter` | `feat(certificate-reader): dual-read proof certificates for admission [C4-014A]`<br>Parent gate: `PROOF-507` | FILTER listo |
| C4-014B | `solguard-core` | `feat(certificate-reader): dual-read proof certificates for envelopes [C4-014B]`<br>Parent gate: `PROOF-507` | CORE listo |
| C4-014C | `solguard-deploy` | `test(certificate-contract): verify all proof certificate consumers [C4-014C]`<br>Parent gate: `PROOF-507` | Old/new y new/new |
| C4-015 | `solguard-value` | `feat(certificate): emit complete proof certificates [C4-015]`<br>Parent gate: `PROOF-507` | C4-014/014A/014B/014C aceptados |
| C4-016 | `solguard-validate` | `feat(verdict-writer): emit v1 technical verdict from new certificate and primaries [C4-016]`<br>Parent gate: `DECIDE-601` | Mismo schema C1; corte tras matriz new/new |
| C4-017 | `solguard-value` | `feat(refutation): emit terminal causal refutations [C4-017]`<br>Parent gate: `PROOF-508` | Ausencia no equivale a refutación |
| C4-018 | `solguard-validate` | `feat(refutation): verify protection and impossible-path proofs [C4-018]`<br>Parent gate: `PROOF-508` | Refuted > 0 en negativos |
| C4-019 | `solguard-filter` | `feat(checkers): register generic kernel and framework checkers [C4-019]`<br>Parent gate: `DECIDE-602` | Ningún checker decide el estado por sí solo |
| C4-019A | `solguard-filter` | `feat(admission-writer): emit v1 admission from immutable verdict and checker evidence [C4-019A]`<br>Parent gate: `DECIDE-602` | Mismo schema C1; pass/review/reject y presentation separados |
| C4-019B | `solguard-deploy` | `test(decision-contract): replay v1 verdict and admission through every consumer [C4-019B]`<br>Parent gate: `DECIDE-602` | Validate→Filter→Core→Backend/Database/Deploy |
| C4-020 | `solguard-core` | `feat(ranking): separate product ranking from truth [C4-020]`<br>Parent gate: `DECIDE-603-CORE` | Features sin ground truth |
| C4-021 | `solguard-validate` | `feat(calibration): calibrate by origin language and family [C4-021]`<br>Parent gate: `DECIDE-603-VALIDATE` | Reliability curves |
| C4-022 | `solguard-deploy` | `feat(calibration): freeze and evaluate ranking pre-oracle [C4-022]`<br>Parent gate: `DECIDE-603-DEPLOY` | Ranking inmutable |
| C4-022A | `solguard-deploy` | `test(calibration): prove ranking truth and evaluation separation [C4-022A]`<br>Parent gate: `DECIDE-603-E2E` | Cero imports de oracle |
| C4-023 | `solguard-core` | `feat(product-writer): cut over once to verdict pass review coverage and published sarif products [C4-023]`<br>Parent gate: `DECIDE-604` | Único writer autoritativo; índice byte-exact de verdict refs, Pass envelopes, PublishedFinding, Review, Reject, debt y counts exactos |
| C4-023A | `solguard-deploy` | `test(product-writer): verify every role and reader new-new retry tamper and partial failure [C4-023A]`<br>Parent gate: `DECIDE-604` | Backend, Database, Deploy y Docs consumen bytes reales; JSON/Markdown/SARIF se recomputan |
| C4-023B | `solguard-core` | `refactor(product-writer): remove validation-only runtime path after zero-use receipt [C4-023B]`<br>Parent gate: `DECIDE-604` | Cero doble escritura y cero fallback |
| C4-024 | `solguard-filter` | `test(threat): reject forged stale and cross-run evidence [C4-024]`<br>Parent gate: `DECIDE-605` | Threat suite completa |
| C4-025 | `solguard-docs` | `docs(threat): publish finding threat model [C4-025]`<br>Parent gate: `DECIDE-605` | JSON/Markdown coherentes |
| C4-026 | `solguard-deploy` | `test(proof): exercise multi-wave proof loop end to end [C4-026]`<br>Parent gate: `PROOF-508` | Fallos, refutación y budgets |
| C4-027 | `solguard-deploy` | `feat(replay): build self-contained causal reproduction packages [C4-027]`<br>Parent gate: `PROOF-510` | Sin logs privados ni oracle |
| C4-028 | `solguard-deploy` | `test(replay): reproduce route delta contradiction and verdict cleanly [C4-028]`<br>Parent gate: `PROOF-510` | Tamper y missing root fallan |
| C4-029 | `solguard-validate` | `fix(scores): keep incomplete evidence outside pass at any score [C4-029]`<br>Parent gate: `DECIDE-606` | Max, NaN y calibration drift |
| C4-029A | `solguard-core` | `fix(filter-failure): preserve upstream in typed failure receipts without forged review [C4-029A]`<br>Parent gate: `DECIDE-607` | ReviewEnvelope sólo si existe Admission Review/Reject; crash/checker/schema matrix |
| C4-029B | `solguard-filter` | `fix(dedupe): preserve causal groups without metric inflation [C4-029B]`<br>Parent gate: `DECIDE-608` | Reorder, aliases y cross-flow |
| C4-029C | `solguard-deploy` | `test(decision): verify score filter-failure and dedupe invariants [C4-029C]`<br>Parent gate: `DECIDE-606` | Vertical slice y denominadores |

Commit de endurecimiento:

| ID | Repo | Commit | Precondición |
|---|---|---|---|
| C4-030 | `solguard-validate` | `fix(validation): fail closed on incomplete certificates [C4-030]`<br>Parent gate: `DECIDE-601` | Matriz negativa completa |

## 9. Onda C5 — Plataforma, datos y observabilidad

| ID | Repo | Commit | Resultado |
|---|---|---|---|
| C5-001 | `solguard-database` | `feat(schema): publish benchmark database v2 schemas and goldens with writer off [C5-001]`<br>Parent gate: `PLAT-801` | Runs, phases, verdicts y admissions |
| C5-001A | `solguard-backend` | `feat(database-reader): dual-read benchmark database v1 and v2 [C5-001A]`<br>Parent gate: `PLAT-801` | Backend listo |
| C5-001B | `solguard-deploy` | `feat(database-reader): dual-read benchmark database v1 and v2 [C5-001B]`<br>Parent gate: `PLAT-801` | Evaluator listo |
| C5-001C | `solguard-deploy` | `test(database-contract): verify old-old new-old old-new and new-new [C5-001C]`<br>Parent gate: `PLAT-801` | Todos los consumidores listos |
| C5-002 | `solguard-database` | `feat(database-writer): implement append-only v2 writes behind disabled flag [C5-002]`<br>Parent gate: `PLAT-801` | Idempotent no-op o conflicto; sin activación |
| C5-003 | `solguard-database` | `feat(migration): implement versioned v2 migration tooling without authority cutover [C5-003]`<br>Parent gate: `PLAT-802` | Sólo copias efímeras; no crea la base autoritativa |
| C5-004 | `solguard-database` | `feat(migration): quarantine and reconcile a legacy database copy [C5-004]`<br>Parent gate: `PLAT-802` | Backup, checks, dry-run y restore ensayado |
| C5-004A | `solguard-deploy` | `test(migration): reconcile ephemeral v2 through both consumers [C5-004A]`<br>Parent gate: `PLAT-802` | Counts, roots, confidence y provenance; `authority_changed=false` |
| C5-004B | `solguard-database` | `feat(legacy-guard): implement write rejection behind disabled cutover flag [C5-004B]`<br>Parent gate: `TRUTH-109` | Sin activar sobre la base viva |
| C5-004C | `solguard-deploy` | `test(legacy-guard): rehearse zero-use cutover restore and stale writer rejection on replicas [C5-004C]`<br>Parent gate: `TRUTH-109` | Receipt de ensayo, no evidencia de corte real |
| C5-004F | `solguard-deploy` | `test(truth): execute global zero-bypass mutation suite [C5-004F]`<br>Parent gate: `TRUTH-110` | Todos los mutantes terminales, cero Pass |
| C5-005 | `solguard-core` | `feat(jobs): expose durable async job control [C5-005]`<br>Parent gate: `PLAT-803-CORE` | Recovery y cancel receipts |
| C5-005A | `solguard-backend` | `feat(job-api-schema): publish job API schema clients and goldens with server off [C5-005A]`<br>Parent gate: `PLAT-803-BACKEND` | Contrato HTTP/eventos inerte |
| C5-005B | `solguard-deploy` | `feat(job-api-reader): consume versioned job API and event stream [C5-005B]`<br>Parent gate: `PLAT-803-E2E` | Cliente Deploy listo |
| C5-005C | `solguard-deploy` | `test(job-api-contract): verify old-new and synthetic new-new before server cutover [C5-005C]`<br>Parent gate: `PLAT-803-E2E` | Server nuevo aún desactivado |
| C5-006 | `solguard-backend` | `feat(job-api-writer): add create status events cancel and result endpoints [C5-006]`<br>Parent gate: `PLAT-803-BACKEND` | Clientes concurrentes y auth; requiere C5-005B/C |
| C5-006A | `solguard-deploy` | `test(jobs): verify idempotency reconnect cancel and replay [C5-006A]`<br>Parent gate: `PLAT-803-E2E` | API y lifecycle integrados |
| C5-007 | `solguard-backend` | `feat(readiness): verify core tools model database and bom [C5-007]`<br>Parent gate: `PLAT-804` | Health público no suplanta readiness |
| C5-008 | `solguard-backend` | `feat(observability): expose bounded authenticated job telemetry [C5-008]`<br>Parent gate: `PLAT-804` | Sin path leakage |
| C5-009 | `solguard-agents` | `feat(dependencies): validate exact producer consumer pins [C5-009]`<br>Parent gate: `PLAT-805` | Branch móvil prohibida |
| C5-010 | `solguard-deploy` | `ci(dependencies): test clean checkout compatibility matrix [C5-010]`<br>Parent gate: `PLAT-805` | Schema y lectores compatibles antes del productor |
| C5-011 | `solguard-docs` | `docs(contracts): publish api schemas defaults db and runbooks [C5-011]`<br>Parent gate: `PLAT-806` | Drift gate contra implementación |
| C5-012 | `solguard-docs` | `docs(recovery): publish backup restore rollback and limits [C5-012]`<br>Parent gate: `PLAT-806` | Procedimiento reproducido |
| C5-013 | `solguard-deploy` | `build(release): implement hermetic image provenance builder [C5-013]`<br>Parent gate: `BOM-CAP-903` | Harness de provenance y SBOM; no freeze final |
| C5-014 | `solguard-deploy` | `feat(isolation): implement vm oci and cas boundary [C5-014]`<br>Parent gate: `ISO-CAP-904` | Harness y capacidad negativa prefreeze |
| C5-015 | `solguard-deploy` | `test(platform): verify migration recovery and dependency train [C5-015]`<br>Parent gate: `PLAT-806` | Ensayo end-to-end |
| C5-016 | `solguard-backend` | `feat(api): add stable cursor pagination and snapshot filters [C5-016]`<br>Parent gate: `PLAT-807` | Sin pérdida ni duplicado |
| C5-017 | `solguard-backend` | `fix(isolation): namespace concurrent run state cache logs and decisions [C5-017]`<br>Parent gate: `PLAT-808` | Cero cruce entre runs |
| C5-018 | `solguard-database` | `fix(migrations): enforce forward-only production and tested restore [C5-018]`<br>Parent gate: `PLAT-809` | Fallo por statement y restore limpio |
| C5-019 | `solguard-backend` | `feat(observability): reconcile evidence closure at every stage [C5-019]`<br>Parent gate: `PLAT-810` | Missing/failed/partial localizable |
| C5-020 | `solguard-deploy` | `test(platform): verify pagination concurrency restore and evidence loss [C5-020]`<br>Parent gate: `PLAT-810` | Property, load y chaos |

## 10. Onda C6 — Implementación C0-C4 y candidatos C5 de ocho lenguajes

### 10.1 Regla de publicación

Cada lenguaje y cada scope de ecosistema atraviesa el mismo tren. No se agrupan
varios lenguajes en un commit. `MAP`, `TRACE`, `DISCOVER`, `ECONOMIC`,
`INVARIANT`, `VALUE`, `VALIDATE`, `FILTER`, `DIFF` y la qualification se
verifican como una vertical slice completa. Un frontend no se considera
maduro si sólo parsea o emite candidatos: debe conservar causalidad, unidades,
prueba económica, decisión y admisión hasta el finding final.

C6 no concede C5. Deja cada scope en C0-C4, con corpus de conformidad y un
candidato C5 congelado. Los certificados C5 solo se emiten en C7 después de dos
ceremonias H-GEN selladas. Los IDs agregados `LANG-100` a `LANG-200` son gates
de aceptación, no tareas que pueda cerrar un único commit.

Precondición: `C2-SCOPE-01..13` está aceptado. Por tanto
`LANG-020-HARNESS` y todos sus lectores preceden a cualquier writer
`<scope-id>-C0`; C6 no vuelve a publicar ni migrar ese schema.

### 10.2 Infraestructura común

Estos commits se aceptan antes de certificar un frontend individual:

| ID | Repo | Commit |
|---|---|---|
| C6-COM-01 | `solguard-docs` | `docs(languages): define scoped c0 through c5 claims [C6-COM-01]`<br>Parent gate: `LANG-000` |
| C6-COM-02 | `solguard-map` | `feat(languages): publish semantic ir conformance harness [C6-COM-02]`<br>Parent gate: `LANG-010-HARNESS` |
| C6-COM-04 | `solguard-deploy` | `feat(replay): provide clean-input replay harness [C6-COM-04]`<br>Parent gate: `LANG-030-HARNESS` |
| C6-COM-05 | `solguard-trace` | `feat(languages): provide semantic trace conformance harness [C6-COM-05]`<br>Parent gate: `LANG-040-HARNESS` |
| C6-COM-06A | `solguard-map` | `feat(boundaries): emit typed boundary observations [C6-COM-06A]`<br>Parent gate: `LANG-050A` |
| C6-COM-06B | `solguard-discover` | `feat(boundaries): derive protocol and boundary model [C6-COM-06B]`<br>Parent gate: `LANG-050B` |
| C6-COM-06C | `solguard-core` | `feat(boundaries): verify observation model and producer binding [C6-COM-06C]`<br>Parent gate: `LANG-050C` |
| C6-COM-07 | `solguard-economic` | `feat(kernels): expose language-neutral economic kernels [C6-COM-07]`<br>Parent gate: `LANG-060` |
| C6-COM-08 | `solguard-core` | `feat(evidence): run language-neutral request fixpoint [C6-COM-08]`<br>Parent gate: `LANG-070` |
| C6-COM-09 | `solguard-validate` | `feat(verdicts): verify language-neutral proof contracts [C6-COM-09]`<br>Parent gate: `LANG-080-VALIDATE` |
| C6-COM-10 | `solguard-filter` | `feat(admission): apply language-neutral admission contracts [C6-COM-10]`<br>Parent gate: `LANG-080-FILTER` |
| C6-COM-11 | `solguard-diff` | `feat(languages): provide semantic diff conformance harness [C6-COM-11]`<br>Parent gate: `LANG-090-HARNESS` |
| C6-COM-12 | `solguard-deploy` | `test(corpus): provide metamorphic and near-miss harness [C6-COM-12]`<br>Parent gate: `LANG-190-HARNESS` |
| C6-COM-13 | `solguard-deploy` | `build(certification): provide blind certification harness [C6-COM-13]`<br>Parent gate: `LANG-200-HARNESS` |

Los commits comunes crean infraestructura reutilizable; no sellan toolchains,
corpus, replays ni certificados de scopes que todavía no existen. Cada scope
debe fijar después su propia imagen, versiones, fixtures, replay y candidato.
`LANG-100` a `LANG-200` quedan reservados para gates derivados descritos en
`10_MATRIZ_CERTIFICACION_SCOPES.md`; no pueden aparecer como `Task:` de un
commit.

### 10.2.1 Sufijos obligatorios por scope

Las tablas siguientes enumeran capacidades particulares, pero no sustituyen
este tren. Cada scope del registro de certificación debe materializar estos
commits de owner único; `<scope-id>` se sustituye por el ID exacto publicado en
`10_MATRIZ_CERTIFICACION_SCOPES.md`.

| Sufijo | Repo | Commit normativo | Gate que alimenta |
|---|---|---|---|
| `-PROFILE` | `solguard-deploy` | `build(<scope-id>): preregister scope manifest and pin exact toolchain framework and image digests [<scope-id>-C0]` | C0; produce `solguard-language-scope-manifest.v1` |
| `-FRONTEND` | `solguard-map` | `feat(<scope-id>): bind compiler parser symbols and spans [<scope-id>-C1]` | C1 |
| `-LOCAL-IR` | `solguard-map` | `feat(<scope-id>): emit source-authoritative cfg state calls and effects [<scope-id>-C2]` | C2 |
| `-TRACE` | `solguard-trace` | `feat(<scope-id>): bind interprocedural async and atomic provenance [<scope-id>-C3]` | C3 |
| `-MODEL` | `solguard-discover` | `feat(<scope-id>): normalize facts into the shared protocol model [<scope-id>-C4]` | C4 |
| `-ECONOMIC` | `solguard-economic` | `feat(<scope-id>): instantiate units actors transitions and kernels [<scope-id>-C4]` | C4 |
| `-INVARIANT` | `solguard-invariant` | `feat(<scope-id>): provide independent economic oracles [<scope-id>-C4]` | C4 |
| `-CORE` | `solguard-core` | `feat(<scope-id>): bind canonical candidates and evidence waves [<scope-id>-C4]` | C4 |
| `-VALUE` | `solguard-value` | `feat(<scope-id>): compile obligations and prove signed nonzero deltas [<scope-id>-C4]` | C4 |
| `-VALIDATE` | `solguard-validate` | `feat(<scope-id>): reopen evidence and verify proof independently [<scope-id>-C4]` | C4 |
| `-FILTER` | `solguard-filter` | `feat(<scope-id>): enforce publication eligibility and review routing [<scope-id>-C4]` | C4 |
| `-DIFF` | `solguard-diff` | `feat(<scope-id>): compare semantic guards units state and effects [<scope-id>-C4]` | C4 |
| `-REPLAY` | `solguard-deploy` | `test(<scope-id>): replay clean-input conformance and negative corpus [<scope-id>-C4]` | C0-C4 |
| `-CANDIDATE` | `solguard-deploy` | `test(<scope-id>): freeze c0-c4 evidence and c5 candidate [<scope-id>-C4]` | candidato C5 |
| `-SCOPE` | `solguard-docs` | `docs(<scope-id>): publish exact scope exclusions and residual debt [<scope-id>-C4]` | disclosure |

No se admite compartir un único `-PROFILE`, `-REPLAY` o `-CANDIDATE` entre
CosmWasm y NEAR, entre Cosmos y Geth, entre JavaScript y TypeScript, ni entre
dos toolchains nativos. El ID agregado de lenguaje se calcula como AND de todos
sus scopes; los commits no lo marcan directamente.

`-PROFILE` no se acepta por el mero hecho de escribir JSON válido. Su instancia
real debe atravesar, con el writer nuevo activo, los once lectores declarados
en `C2-SCOPE-02..12`; `-REPLAY` conserva la matriz new-new y sus negativos
(digest, firma, scope, versión, toolchain, imagen, campos desconocidos y
manifest incompleto). `-CANDIDATE` falla si falta una sola receipt de esa
matriz.

### 10.2.2 Registro exacto de instanciación

Cada fila expande los quince sufijos anteriores. El ID de commit resultante es
`<serie><sufijo>` y el `<scope-id>`/Task se sustituye literalmente; el
generador de briefs debe rechazar cualquier placeholder restante. Son 450
commits/receipts de scope potenciales, cada uno omitible sólo mediante un
receipt firmado que demuestre que la capacidad ya existe y supera exactamente
el gate actual.

| Serie | Scope ID exacto |
|---|---|
| `C6-SCP-01` | `SOL-EVM-DEFI` |
| `C6-SCP-02` | `VYP-EVM-DEFI` |
| `C6-SCP-03` | `RST-SOLANA-ANCHOR` |
| `C6-SCP-04` | `RST-COSMWASM` |
| `C6-SCP-05` | `RST-NEAR` |
| `C6-SCP-06` | `RST-SUBSTRATE-FRAME` |
| `C6-SCP-07` | `RST-NATIVE-CLIENT` |
| `C6-SCP-08` | `GO-COSMOS-SDK` |
| `C6-SCP-09` | `GO-GETH-CLIENT` |
| `C6-SCP-10` | `GO-RELAYER-ORACLE` |
| `C6-SCP-11` | `C-UTXO-CONSENSUS` |
| `C6-SCP-12` | `C-BRIDGE-FINALITY` |
| `C6-SCP-13` | `C-WALLET-CUSTODY` |
| `C6-SCP-14` | `CPP-UTXO-CONSENSUS` |
| `C6-SCP-15` | `CPP-BRIDGE-FINALITY` |
| `C6-SCP-16` | `CPP-WALLET-CUSTODY` |
| `C6-SCP-17` | `JS-NODE-RELAYER` |
| `C6-SCP-18` | `JS-NODE-KEEPER-ORACLE` |
| `C6-SCP-19` | `JS-NODE-TX-BUILDER` |
| `C6-SCP-20` | `TS-NODE-RELAYER-SDK` |
| `C6-SCP-21` | `TS-NODE-KEEPER-ORACLE` |
| `C6-SCP-22` | `TS-NODE-TX-BUILDER` |
| `C6-SCP-23` | `X-SOL-TS-RELAYER` |
| `C6-SCP-24` | `X-VYP-JS-KEEPER` |
| `C6-SCP-25` | `X-SOLANA-TS-CLIENT` |
| `C6-SCP-26` | `X-COSMWASM-GO-RELAYER` |
| `C6-SCP-27` | `X-NEAR-JS-CLIENT` |
| `C6-SCP-28` | `X-GO-C-FFI` |
| `C6-SCP-29` | `X-GO-CPP-FFI` |
| `C6-SCP-30` | `X-TS-DATA-SOL-TX` |

Las tablas específicas que siguen añaden semántica y tests; no reemplazan
ninguna instanciación de este registro.

### 10.3 Solidity

| ID | Repo | Commit |
|---|---|---|
| C6-SOL-01 | `solguard-map` | `feat(solidity): build compiler-aware semantic frontend [C6-SOL-01]`<br>Parent gate: `LANG-SOL-01` |
| C6-SOL-02 | `solguard-map` | `feat(solidity): resolve storage inheritance proxies and abi [C6-SOL-02]`<br>Parent gate: `LANG-SOL-02` |
| C6-SOL-03 | `solguard-trace` | `feat(solidity): bind evm calls logs storage and reverts [C6-SOL-03]`<br>Parent gate: `LANG-SOL-02` |
| C6-SOL-04 | `solguard-discover` | `feat(solidity): normalize protocol facts for common economic kernels [C6-SOL-04]`<br>Parent gate: `LANG-SOL-03` |
| C6-SOL-04A | `solguard-economic` | `feat(solidity): model units transitions and actor deltas [C6-SOL-04A]`<br>Parent gate: `LANG-SOL-03` |
| C6-SOL-05 | `solguard-invariant` | `feat(solidity): add independent defi invariant pack [C6-SOL-05]`<br>Parent gate: `LANG-SOL-03` |
| C6-SOL-05A | `solguard-value` | `feat(solidity): prove signed economic deltas with native numeric domains [C6-SOL-05A]`<br>Parent gate: `LANG-SOL-03` |
| C6-SOL-06 | `solguard-diff` | `feat(solidity): compare abi storage guards units and proxies [C6-SOL-06]`<br>Parent gate: `LANG-SOL-04` |
| C6-SOL-07 | `solguard-deploy` | `test(solidity): replay compiler and semantic diffs [C6-SOL-07]`<br>Parent gate: `LANG-SOL-04` |
| C6-SOL-08 | `solguard-validate` | `feat(solidity): validate proxy callback oracle and accounting paths [C6-SOL-08]`<br>Parent gate: `LANG-SOL-03` |
| C6-SOL-09 | `solguard-filter` | `feat(solidity): calibrate admission on safe near-misses [C6-SOL-09]`<br>Parent gate: `LANG-SOL-03` |
| C6-SOL-10 | `solguard-deploy` | `test(solidity): qualify c0 through c4 and freeze c5 candidate [C6-SOL-10]`<br>Parent gate: `LANG-SOL-05` |
| C6-SOL-11 | `solguard-docs` | `docs(solidity): publish candidate scope and exclusions [C6-SOL-11]`<br>Parent gate: `LANG-SOL-05` |

### 10.4 Vyper

| ID | Repo | Commit |
|---|---|---|
| C6-VYP-01 | `solguard-map` | `feat(vyper): build versioned semantic frontend [C6-VYP-01]`<br>Parent gate: `LANG-VYP-01` |
| C6-VYP-02 | `solguard-map` | `feat(vyper): model storage interfaces and decimal semantics [C6-VYP-02]`<br>Parent gate: `LANG-VYP-01` |
| C6-VYP-03 | `solguard-trace` | `feat(vyper): bind evm observations to vyper source [C6-VYP-03]`<br>Parent gate: `LANG-VYP-03` |
| C6-VYP-04 | `solguard-discover` | `feat(vyper): normalize protocol facts for common economic kernels [C6-VYP-04]`<br>Parent gate: `LANG-VYP-04` |
| C6-VYP-04A | `solguard-economic` | `feat(vyper): model units transitions callbacks and actor deltas [C6-VYP-04A]`<br>Parent gate: `LANG-VYP-04` |
| C6-VYP-05 | `solguard-invariant` | `feat(vyper): add independent accounting invariant pack [C6-VYP-05]`<br>Parent gate: `LANG-VYP-04` |
| C6-VYP-05A | `solguard-value` | `feat(vyper): prove signed deltas under decimal and integer semantics [C6-VYP-05A]`<br>Parent gate: `LANG-VYP-04` |
| C6-VYP-06 | `solguard-validate` | `feat(vyper): validate external call and arithmetic paths [C6-VYP-06]`<br>Parent gate: `LANG-VYP-02` |
| C6-VYP-07 | `solguard-filter` | `feat(vyper): calibrate admission on safe near-misses [C6-VYP-07]`<br>Parent gate: `LANG-VYP-04` |
| C6-VYP-07A | `solguard-diff` | `feat(vyper): compare storage guards units interfaces and compiler modes [C6-VYP-07A]`<br>Parent gate: `LANG-VYP-04` |
| C6-VYP-08 | `solguard-deploy` | `test(vyper): qualify c0 through c4 and freeze c5 candidate [C6-VYP-08]`<br>Parent gate: `LANG-VYP-04` |
| C6-VYP-09 | `solguard-docs` | `docs(vyper): publish candidate scope and exclusions [C6-VYP-09]`<br>Parent gate: `LANG-VYP-04` |

### 10.5 Rust

| ID | Repo | Commit |
|---|---|---|
| C6-RST-01 | `solguard-map` | `feat(rust): build cargo and macro-aware semantic frontend [C6-RST-01]`<br>Parent gate: `LANG-RUST-01` |
| C6-RST-02 | `solguard-map` | `feat(rust-solana): model anchor accounts pda and cpi [C6-RST-02]`<br>Parent gate: `LANG-RUST-02` |
| C6-RST-03 | `solguard-trace` | `feat(rust-solana): bind signer owner constraints and cpi [C6-RST-03]`<br>Parent gate: `LANG-RUST-02` |
| C6-RST-04 | `solguard-discover` | `feat(rust-solana): normalize account authority and lifecycle facts [C6-RST-04]`<br>Parent gate: `LANG-RUST-02` |
| C6-RST-04A | `solguard-economic` | `feat(rust-solana): model lamport token authority and cpi transitions [C6-RST-04A]`<br>Parent gate: `LANG-RUST-02` |
| C6-RST-05 | `solguard-invariant` | `feat(rust-solana): add account ownership and ledger oracles [C6-RST-05]`<br>Parent gate: `LANG-RUST-02` |
| C6-RST-05A | `solguard-value` | `feat(rust-solana): prove signed asset deltas across cpi paths [C6-RST-05A]`<br>Parent gate: `LANG-RUST-02` |
| C6-RST-05B | `solguard-validate` | `feat(rust-solana): validate ownership signer and cpi proof paths [C6-RST-05B]`<br>Parent gate: `LANG-RUST-02` |
| C6-RST-05C | `solguard-filter` | `feat(rust-solana): calibrate admission on patched account controls [C6-RST-05C]`<br>Parent gate: `LANG-RUST-02` |
| C6-RST-05D | `solguard-diff` | `feat(rust-solana): compare account constraints authorities and cpi effects [C6-RST-05D]`<br>Parent gate: `LANG-RUST-02` |
| C6-RST-06 | `solguard-map` | `feat(rust-cosmwasm): model messages submessages replies and storage [C6-RST-06]`<br>Parent gate: `LANG-RUST-03A` |
| C6-RST-07 | `solguard-trace` | `feat(rust-cosmwasm): bind funds callbacks replies and persistent state [C6-RST-07]`<br>Parent gate: `LANG-RUST-03A` |
| C6-RST-08 | `solguard-discover` | `feat(rust-cosmwasm): normalize callback funds and accounting facts [C6-RST-08]`<br>Parent gate: `LANG-RUST-03A` |
| C6-RST-08A | `solguard-economic` | `feat(rust-cosmwasm): model coins submessage rollback and actor deltas [C6-RST-08A]`<br>Parent gate: `LANG-RUST-03A` |
| C6-RST-09 | `solguard-invariant` | `feat(rust-cosmwasm): add funds storage and reply oracles [C6-RST-09]`<br>Parent gate: `LANG-RUST-03A` |
| C6-RST-09A | `solguard-value` | `feat(rust-cosmwasm): prove signed deltas across execute reply chains [C6-RST-09A]`<br>Parent gate: `LANG-RUST-03A` |
| C6-RST-09B | `solguard-validate` | `feat(rust-cosmwasm): validate funds callback and rollback proofs [C6-RST-09B]`<br>Parent gate: `LANG-RUST-03A` |
| C6-RST-09C | `solguard-filter` | `feat(rust-cosmwasm): calibrate admission on reply near-misses [C6-RST-09C]`<br>Parent gate: `LANG-RUST-03A` |
| C6-RST-09D | `solguard-diff` | `feat(rust-cosmwasm): compare messages storage funds and reply effects [C6-RST-09D]`<br>Parent gate: `LANG-RUST-03A` |
| C6-RST-09E | `solguard-map` | `feat(rust-near): model promises callbacks receipts and storage [C6-RST-09E]`<br>Parent gate: `LANG-RUST-03B` |
| C6-RST-09F | `solguard-trace` | `feat(rust-near): bind promise graph deposits gas and persistent state [C6-RST-09F]`<br>Parent gate: `LANG-RUST-03B` |
| C6-RST-09G | `solguard-discover` | `feat(rust-near): normalize receipt callback and accounting facts [C6-RST-09G]`<br>Parent gate: `LANG-RUST-03B` |
| C6-RST-09H | `solguard-economic` | `feat(rust-near): model deposits receipts rollback and actor deltas [C6-RST-09H]`<br>Parent gate: `LANG-RUST-03B` |
| C6-RST-09I | `solguard-invariant` | `feat(rust-near): add deposit storage and callback oracles [C6-RST-09I]`<br>Parent gate: `LANG-RUST-03B` |
| C6-RST-09J | `solguard-value` | `feat(rust-near): prove signed deltas across promise chains [C6-RST-09J]`<br>Parent gate: `LANG-RUST-03B` |
| C6-RST-09K | `solguard-validate` | `feat(rust-near): validate promise callback and storage proofs [C6-RST-09K]`<br>Parent gate: `LANG-RUST-03B` |
| C6-RST-09L | `solguard-filter` | `feat(rust-near): calibrate admission on promise near-misses [C6-RST-09L]`<br>Parent gate: `LANG-RUST-03B` |
| C6-RST-09M | `solguard-diff` | `feat(rust-near): compare receipts deposits callbacks and state [C6-RST-09M]`<br>Parent gate: `LANG-RUST-03B` |
| C6-RST-10 | `solguard-map` | `feat(rust-substrate): model frame macros origins and storage [C6-RST-10]`<br>Parent gate: `LANG-RUST-04` |
| C6-RST-11 | `solguard-trace` | `feat(rust-substrate): bind extrinsics dispatch and weights [C6-RST-11]`<br>Parent gate: `LANG-RUST-04` |
| C6-RST-11A | `solguard-discover` | `feat(rust-substrate): normalize origin dispatch and lifecycle facts [C6-RST-11A]`<br>Parent gate: `LANG-RUST-04` |
| C6-RST-11B | `solguard-economic` | `feat(rust-substrate): model balances holds fees and issuance transitions [C6-RST-11B]`<br>Parent gate: `LANG-RUST-04` |
| C6-RST-12 | `solguard-invariant` | `feat(rust-substrate): add origin balance and lifecycle oracles [C6-RST-12]`<br>Parent gate: `LANG-RUST-04` |
| C6-RST-12A | `solguard-value` | `feat(rust-substrate): prove signed balance issuance and fee deltas [C6-RST-12A]`<br>Parent gate: `LANG-RUST-04` |
| C6-RST-12B | `solguard-validate` | `feat(rust-substrate): validate origin dispatch and storage proofs [C6-RST-12B]`<br>Parent gate: `LANG-RUST-04` |
| C6-RST-12C | `solguard-filter` | `feat(rust-substrate): calibrate admission on origin near-misses [C6-RST-12C]`<br>Parent gate: `LANG-RUST-04` |
| C6-RST-12D | `solguard-diff` | `feat(rust-substrate): compare origins storage weights and balance effects [C6-RST-12D]`<br>Parent gate: `LANG-RUST-04` |
| C6-RST-13 | `solguard-map` | `feat(rust-client): model async unsafe persistence and network state [C6-RST-13]`<br>Parent gate: `LANG-RUST-05` |
| C6-RST-14 | `solguard-trace` | `feat(rust-client): bind fork choice retries and partial failure [C6-RST-14]`<br>Parent gate: `LANG-RUST-05` |
| C6-RST-15 | `solguard-discover` | `feat(rust-client): normalize consensus persistence and state facts [C6-RST-15]`<br>Parent gate: `LANG-RUST-05` |
| C6-RST-15A | `solguard-economic` | `feat(rust-client): model reorg fee ledger and partial-failure transitions [C6-RST-15A]`<br>Parent gate: `LANG-RUST-05` |
| C6-RST-15B | `solguard-invariant` | `feat(rust-client): add fork ledger persistence and supply oracles [C6-RST-15B]`<br>Parent gate: `LANG-RUST-05` |
| C6-RST-15C | `solguard-value` | `feat(rust-client): prove signed ledger deltas under reorg and retry [C6-RST-15C]`<br>Parent gate: `LANG-RUST-05` |
| C6-RST-15D | `solguard-validate` | `feat(rust-client): validate consensus persistence and non-ub proofs [C6-RST-15D]`<br>Parent gate: `LANG-RUST-05` |
| C6-RST-15E | `solguard-filter` | `test(rust-client): reject partial unsafe or ffi proof inputs and review only complete-proof admission debt [C6-RST-15E]`<br>Parent gate: `LANG-RUST-05` |
| C6-RST-15F | `solguard-diff` | `feat(rust-client): compare fork persistence retry and ledger effects [C6-RST-15F]`<br>Parent gate: `LANG-RUST-05` |
| C6-RST-16 | `solguard-validate` | `test(rust): enforce proof conformance independently per ecosystem [C6-RST-16]`<br>Parent gate: `LANG-RUST-06` |
| C6-RST-17 | `solguard-filter` | `test(rust): enforce admission conformance independently per ecosystem [C6-RST-17]`<br>Parent gate: `LANG-RUST-06` |
| C6-RST-18 | `solguard-deploy` | `test(rust): qualify every ecosystem and freeze c5 candidates [C6-RST-18]`<br>Parent gate: `LANG-RUST-06` |
| C6-RST-19 | `solguard-docs` | `docs(rust): publish candidate ecosystems and exclusions [C6-RST-19]`<br>Parent gate: `LANG-RUST-06` |

### 10.6 Go

| ID | Repo | Commit |
|---|---|---|
| C6-GO-01 | `solguard-map` | `feat(go): build module and build-tag-aware semantic frontend [C6-GO-01]`<br>Parent gate: `LANG-GO-01` |
| C6-GO-02 | `solguard-map` | `feat(go-cosmos): model stores keepers messages and coins [C6-GO-02]`<br>Parent gate: `LANG-GO-02` |
| C6-GO-03 | `solguard-trace` | `feat(go-cosmos): bind ante handlers state and decimal flows [C6-GO-03]`<br>Parent gate: `LANG-GO-02` |
| C6-GO-04 | `solguard-discover` | `feat(go-cosmos): normalize module authority and ledger facts [C6-GO-04]`<br>Parent gate: `LANG-GO-02` |
| C6-GO-04A | `solguard-economic` | `feat(go-cosmos): model coin supply fee and keeper transitions [C6-GO-04A]`<br>Parent gate: `LANG-GO-02` |
| C6-GO-05 | `solguard-invariant` | `feat(go-cosmos): add supply balance and authority oracles [C6-GO-05]`<br>Parent gate: `LANG-GO-02` |
| C6-GO-05A | `solguard-value` | `feat(go-cosmos): prove signed coin supply and fee deltas [C6-GO-05A]`<br>Parent gate: `LANG-GO-02` |
| C6-GO-05B | `solguard-validate` | `feat(go-cosmos): validate keeper authority and ante proof paths [C6-GO-05B]`<br>Parent gate: `LANG-GO-02` |
| C6-GO-05C | `solguard-filter` | `feat(go-cosmos): calibrate admission on patched keeper controls [C6-GO-05C]`<br>Parent gate: `LANG-GO-02` |
| C6-GO-05D | `solguard-diff` | `feat(go-cosmos): compare stores messages coins and authority effects [C6-GO-05D]`<br>Parent gate: `LANG-GO-02` |
| C6-GO-06 | `solguard-map` | `feat(go-client): model geth state consensus rpc and mempool [C6-GO-06]`<br>Parent gate: `LANG-GO-03` |
| C6-GO-07 | `solguard-trace` | `feat(go-client): bind reorg persistence and concurrency [C6-GO-07]`<br>Parent gate: `LANG-GO-03` |
| C6-GO-08 | `solguard-discover` | `feat(go-client): normalize consensus persistence and state facts [C6-GO-08]`<br>Parent gate: `LANG-GO-03` |
| C6-GO-08A | `solguard-economic` | `feat(go-client): model fee ledger reorg and mempool transitions [C6-GO-08A]`<br>Parent gate: `LANG-GO-03` |
| C6-GO-09 | `solguard-invariant` | `feat(go-client): add fork and ledger consistency oracles [C6-GO-09]`<br>Parent gate: `LANG-GO-03` |
| C6-GO-09A | `solguard-value` | `feat(go-client): prove signed ledger deltas under reorg and replacement [C6-GO-09A]`<br>Parent gate: `LANG-GO-03` |
| C6-GO-09B | `solguard-validate` | `feat(go-client): validate reorg persistence and concurrency proofs [C6-GO-09B]`<br>Parent gate: `LANG-GO-03` |
| C6-GO-09C | `solguard-filter` | `feat(go-client): calibrate admission on fork and rpc near-misses [C6-GO-09C]`<br>Parent gate: `LANG-GO-03` |
| C6-GO-09D | `solguard-diff` | `feat(go-client): compare fork state fee and mempool effects [C6-GO-09D]`<br>Parent gate: `LANG-GO-03` |
| C6-GO-10 | `solguard-map` | `feat(go-relayer): model rpc oracle and cross-chain boundaries [C6-GO-10]`<br>Parent gate: `LANG-GO-04` |
| C6-GO-11 | `solguard-trace` | `feat(go-relayer): bind retries latency ordering and stale data [C6-GO-11]`<br>Parent gate: `LANG-GO-04` |
| C6-GO-12 | `solguard-discover` | `feat(go-relayer): normalize idempotency ordering and oracle facts [C6-GO-12]`<br>Parent gate: `LANG-GO-04` |
| C6-GO-12A | `solguard-economic` | `feat(go-relayer): model escrow fee retry and finality transitions [C6-GO-12A]`<br>Parent gate: `LANG-GO-04` |
| C6-GO-12B | `solguard-invariant` | `feat(go-relayer): add exactly-once escrow and ordering oracles [C6-GO-12B]`<br>Parent gate: `LANG-GO-04` |
| C6-GO-12C | `solguard-value` | `feat(go-relayer): prove signed deltas across retries and finality [C6-GO-12C]`<br>Parent gate: `LANG-GO-04` |
| C6-GO-12D | `solguard-validate` | `feat(go-relayer): validate ordering oracle and provenance proofs [C6-GO-12D]`<br>Parent gate: `LANG-GO-04` |
| C6-GO-12E | `solguard-filter` | `feat(go-relayer): calibrate admission on stale-data near-misses [C6-GO-12E]`<br>Parent gate: `LANG-GO-04` |
| C6-GO-12F | `solguard-diff` | `feat(go-relayer): compare rpc finality retries and asset effects [C6-GO-12F]`<br>Parent gate: `LANG-GO-04` |
| C6-GO-13 | `solguard-trace` | `fix(go-blind): isolate corpus-shaped extractors [C6-GO-13]`<br>Parent gate: `LANG-GO-05` |
| C6-GO-14 | `solguard-discover` | `fix(go-blind): reject rule-assisted origin as blind evidence [C6-GO-14]`<br>Parent gate: `LANG-GO-05` |
| C6-GO-15 | `solguard-core` | `fix(go-blind): enforce origin on every scoreable channel [C6-GO-15]`<br>Parent gate: `LANG-GO-05` |
| C6-GO-16 | `solguard-validate` | `test(go): enforce proof conformance independently per ecosystem [C6-GO-16]`<br>Parent gate: `LANG-GO-05` |
| C6-GO-17 | `solguard-filter` | `test(go): enforce admission conformance independently per ecosystem [C6-GO-17]`<br>Parent gate: `LANG-GO-05` |
| C6-GO-18 | `solguard-deploy` | `test(go): qualify ecosystems and freeze c5 candidates [C6-GO-18]`<br>Parent gate: `LANG-GO-05` |
| C6-GO-19 | `solguard-docs` | `docs(go): publish candidate ecosystems and exclusions [C6-GO-19]`<br>Parent gate: `LANG-GO-05` |

### 10.7 C

| ID | Repo | Commit |
|---|---|---|
| C6-C-01 | `solguard-map` | `feat(c): build compile-database semantic frontend [C6-C-01]`<br>Parent gate: `LANG-C-01` |
| C6-C-02 | `solguard-map` | `feat(c): model preprocessor aliases memory and integer domains [C6-C-02]`<br>Parent gate: `LANG-C-02` |
| C6-C-03 | `solguard-trace` | `feat(c): bind native memory io and syscall observations [C6-C-03]`<br>Parent gate: `LANG-C-02` |
| C6-C-04 | `solguard-discover` | `feat(c): normalize native state io and ownership facts [C6-C-04]`<br>Parent gate: `LANG-C-03` |
| C6-C-04A | `solguard-economic` | `feat(c): model resource ledger integer and lifecycle transitions [C6-C-04A]`<br>Parent gate: `LANG-C-03` |
| C6-C-05 | `solguard-invariant` | `feat(c): add independent bounds and conservation invariants [C6-C-05]`<br>Parent gate: `LANG-C-03` |
| C6-C-05A | `solguard-value` | `feat(c): prove signed deltas inside a concrete non-ub domain [C6-C-05A]`<br>Parent gate: `LANG-C-03` |
| C6-C-05B | `solguard-value` | `feat(c-memory): prove bounds lifetime alias and use-after-free obligations [C6-C-05B]`<br>Parent gate: `LANG-C-03` |
| C6-C-06 | `solguard-validate` | `feat(c): validate overflow alias lifetime and state paths [C6-C-06]`<br>Parent gate: `LANG-C-04` |
| C6-C-06A | `solguard-validate` | `feat(c-memory): require a causal memory-safety to economic-impact bridge [C6-C-06A]`<br>Parent gate: `LANG-C-04` |
| C6-C-07 | `solguard-filter` | `test(c): reject ub-dependent or partial proof inputs and review only complete-proof admission debt [C6-C-07]`<br>Parent gate: `LANG-C-04` |
| C6-C-07A | `solguard-diff` | `feat(c): compare preprocessor layout integer and state effects [C6-C-07A]`<br>Parent gate: `LANG-C-05` |
| C6-C-08A | `solguard-deploy` | `test(c-memory): run sanitizer static symbolic and metamorphic qualification matrix [C6-C-08A]`<br>Parent gate: `LANG-C-05` |
| C6-C-08 | `solguard-deploy` | `test(c): qualify c0 through c4 and freeze c5 candidate [C6-C-08]`<br>Parent gate: `LANG-C-05` | Depende de `C6-C-08A`; la matriz memory-safety se ejecuta antes de congelar el candidato |
| C6-C-09 | `solguard-docs` | `docs(c): publish candidate toolchains and exclusions [C6-C-09]`<br>Parent gate: `LANG-C-05` |

### 10.8 C++

| ID | Repo | Commit |
|---|---|---|
| C6-CPP-01 | `solguard-map` | `feat(cpp): build compile-database semantic frontend [C6-CPP-01]`<br>Parent gate: `LANG-CPP-01` |
| C6-CPP-02 | `solguard-map` | `feat(cpp): model templates raii dispatch and integer domains [C6-CPP-02]`<br>Parent gate: `LANG-CPP-01` |
| C6-CPP-03 | `solguard-trace` | `feat(cpp): bind native memory concurrency and io observations [C6-CPP-03]`<br>Parent gate: `LANG-CPP-01` |
| C6-CPP-04 | `solguard-discover` | `feat(cpp): normalize lifecycle dispatch and accounting facts [C6-CPP-04]`<br>Parent gate: `LANG-CPP-02` |
| C6-CPP-04A | `solguard-economic` | `feat(cpp): model resource ledger integer and lifecycle transitions [C6-CPP-04A]`<br>Parent gate: `LANG-CPP-02` |
| C6-CPP-05 | `solguard-invariant` | `feat(cpp): add independent state and conservation invariants [C6-CPP-05]`<br>Parent gate: `LANG-CPP-02` |
| C6-CPP-05A | `solguard-value` | `feat(cpp): prove signed deltas inside a concrete non-ub domain [C6-CPP-05A]`<br>Parent gate: `LANG-CPP-02` |
| C6-CPP-05B | `solguard-value` | `feat(cpp-memory): prove lifetime ownership dispatch and object-model obligations [C6-CPP-05B]`<br>Parent gate: `LANG-CPP-02` |
| C6-CPP-06 | `solguard-validate` | `feat(cpp): validate lifetime dispatch race and overflow paths [C6-CPP-06]`<br>Parent gate: `LANG-CPP-02` |
| C6-CPP-06A | `solguard-validate` | `feat(cpp-memory): require a causal memory or race to economic-impact bridge [C6-CPP-06A]`<br>Parent gate: `LANG-CPP-02` |
| C6-CPP-07 | `solguard-filter` | `test(cpp): reject ub-dependent or partial proof inputs and review only complete-proof admission debt [C6-CPP-07]`<br>Parent gate: `LANG-CPP-02` |
| C6-CPP-08 | `solguard-diff` | `feat(cpp): compare templates dispatch layout and exceptions [C6-CPP-08]`<br>Parent gate: `LANG-CPP-03` |
| C6-CPP-09A | `solguard-deploy` | `test(cpp-memory): run sanitizer static symbolic race and metamorphic matrix [C6-CPP-09A]`<br>Parent gate: `LANG-CPP-03` |
| C6-CPP-09 | `solguard-deploy` | `test(cpp): qualify c0 through c4 and freeze c5 candidate [C6-CPP-09]`<br>Parent gate: `LANG-CPP-03` | Depende de `C6-CPP-09A`; la matriz memory/concurrency se ejecuta antes de congelar el candidato |
| C6-CPP-10 | `solguard-docs` | `docs(cpp): publish candidate standards and exclusions [C6-CPP-10]`<br>Parent gate: `LANG-CPP-03` |

### 10.9 JavaScript

| ID | Repo | Commit |
|---|---|---|
| C6-JS-01 | `solguard-map` | `feat(javascript): build module and runtime-aware semantic frontend [C6-JS-01]`<br>Parent gate: `LANG-JS-01` |
| C6-JS-02 | `solguard-map` | `feat(javascript): model prototypes coercion promises and numbers [C6-JS-02]`<br>Parent gate: `LANG-JS-01` |
| C6-JS-03 | `solguard-trace` | `feat(javascript): bind async rpc storage and event observations [C6-JS-03]`<br>Parent gate: `LANG-JS-01` |
| C6-JS-04 | `solguard-discover` | `feat(javascript): normalize async rpc numeric and state facts [C6-JS-04]`<br>Parent gate: `LANG-JS-02` |
| C6-JS-04A | `solguard-economic` | `feat(javascript): model retries precision and actor deltas [C6-JS-04A]`<br>Parent gate: `LANG-JS-02` |
| C6-JS-05 | `solguard-invariant` | `feat(javascript): add independent state and precision invariants [C6-JS-05]`<br>Parent gate: `LANG-JS-02` |
| C6-JS-05A | `solguard-value` | `feat(javascript): prove signed deltas across bigint and number domains [C6-JS-05A]`<br>Parent gate: `LANG-JS-02` |
| C6-JS-06 | `solguard-validate` | `feat(javascript): validate coercion retry and race paths [C6-JS-06]`<br>Parent gate: `LANG-JS-02` |
| C6-JS-07 | `solguard-filter` | `feat(javascript): calibrate admission across runtimes [C6-JS-07]`<br>Parent gate: `LANG-JS-02` |
| C6-JS-07A | `solguard-diff` | `feat(javascript): compare modules guards async paths and numeric effects [C6-JS-07A]`<br>Parent gate: `LANG-JS-02` |
| C6-JS-08 | `solguard-deploy` | `test(javascript): prove rule-assisted node isolation [C6-JS-08]`<br>Parent gate: `LANG-JS-03` |
| C6-JS-08A | `solguard-trace` | `test(javascript): reject missing provenance on guards state calls and paths [C6-JS-08A]`<br>Parent gate: `LANG-JS-03` |
| C6-JS-09 | `solguard-deploy` | `test(javascript): qualify c0 through c4 and freeze c5 candidate [C6-JS-09]`<br>Parent gate: `LANG-JS-03` |
| C6-JS-10 | `solguard-docs` | `docs(javascript): publish candidate runtimes and exclusions [C6-JS-10]`<br>Parent gate: `LANG-JS-03` |

### 10.10 TypeScript

| ID | Repo | Commit |
|---|---|---|
| C6-TS-01 | `solguard-map` | `feat(typescript): build tsconfig and declaration-aware frontend [C6-TS-01]`<br>Parent gate: `LANG-TS-01` |
| C6-TS-02 | `solguard-map` | `feat(typescript): model erasure narrowing generics and numbers [C6-TS-02]`<br>Parent gate: `LANG-TS-01` |
| C6-TS-03 | `solguard-trace` | `feat(typescript): bind emitted javascript to source semantics [C6-TS-03]`<br>Parent gate: `LANG-TS-01` |
| C6-TS-04 | `solguard-discover` | `feat(typescript): normalize erased runtime numeric and state facts [C6-TS-04]`<br>Parent gate: `LANG-TS-02` |
| C6-TS-04A | `solguard-economic` | `feat(typescript): model erasure precision retry and actor deltas [C6-TS-04A]`<br>Parent gate: `LANG-TS-02` |
| C6-TS-05 | `solguard-invariant` | `feat(typescript): add independent precision and state invariants [C6-TS-05]`<br>Parent gate: `LANG-TS-02` |
| C6-TS-05A | `solguard-value` | `feat(typescript): prove signed deltas across declared and runtime domains [C6-TS-05A]`<br>Parent gate: `LANG-TS-02` |
| C6-TS-06 | `solguard-validate` | `feat(typescript): validate erasure async and boundary paths [C6-TS-06]`<br>Parent gate: `LANG-TS-02` |
| C6-TS-07 | `solguard-filter` | `feat(typescript): calibrate admission across compiler modes [C6-TS-07]`<br>Parent gate: `LANG-TS-02` |
| C6-TS-07A | `solguard-diff` | `feat(typescript): compare declarations output guards and numeric effects [C6-TS-07A]`<br>Parent gate: `LANG-TS-02` |
| C6-TS-08 | `solguard-deploy` | `test(typescript): qualify c0 through c4 and freeze c5 candidate [C6-TS-08]`<br>Parent gate: `LANG-TS-03` |
| C6-TS-09 | `solguard-docs` | `docs(typescript): publish candidate compiler scope [C6-TS-09]`<br>Parent gate: `LANG-TS-03` |

### 10.11 Políglota

| ID | Repo | Commit | Resultado |
|---|---|---|---|
| C6-X-01 | `solguard-map` | `feat(polyglot): link abi ffi rpc and serialization identities [C6-X-01]`<br>Parent gate: `LANG-X-01` | Grafo común |
| C6-X-02 | `solguard-trace` | `feat(polyglot): propagate causal context across boundaries [C6-X-02]`<br>Parent gate: `LANG-X-02` | Trace continuo |
| C6-X-03 | `solguard-economic` | `feat(polyglot): preserve units across component boundaries [C6-X-03]`<br>Parent gate: `LANG-X-03` | Dimensiones correctas |
| C6-X-04 | `solguard-discover` | `feat(polyglot): compose normalized cross-component protocol facts [C6-X-04]`<br>Parent gate: `LANG-X-03` | Hipótesis compuesta |
| C6-X-05 | `solguard-invariant` | `feat(polyglot): evaluate end-to-end conservation laws [C6-X-05]`<br>Parent gate: `LANG-X-03` | Oracle independiente |
| C6-X-06 | `solguard-value` | `feat(polyglot): prove signed deltas across component and unit domains [C6-X-06]`<br>Parent gate: `LANG-X-03` | `solguard-proof-certificate.v1` completo |
| C6-X-07 | `solguard-validate` | `feat(polyglot): reopen and verify every cross-component proof edge [C6-X-07]`<br>Parent gate: `LANG-X-04` | Veredicto independiente |
| C6-X-08 | `solguard-filter` | `feat(polyglot): admit only complete eligible cross-boundary findings [C6-X-08]`<br>Parent gate: `LANG-X-04` | Admisión cerrada |
| C6-X-09 | `solguard-diff` | `feat(polyglot): compare boundary identity units guards and effects [C6-X-09]`<br>Parent gate: `LANG-X-04` | Diff semántico |
| C6-X-10 | `solguard-deploy` | `test(polyglot): qualify abi ffi rpc serialization bridge and oracle slices [C6-X-10]`<br>Parent gate: `LANG-X-04` | Las seis categorías pasan positivos y negativos |
| C6-X-11 | `solguard-docs` | `docs(polyglot): publish candidate boundaries and exclusions [C6-X-11]`<br>Parent gate: `LANG-X-04` | Scope defendible |

La qualification políglota no usa promedio ni permite elegir cinco de seis:
`ABI`, `FFI`, `RPC`, `serialización`, `bridge/message bus` y
`oracle/off-chain adapter` deben pasar individualmente. Si cualquier arista
necesaria queda `partial`, `unavailable` o sin provenance, el ProofCertificate
queda incompleto: VALIDATE emite `Inconclusive`, no existe `AdmissionResult` y
FILTER no se ejecuta. La deuda puede entrar en una cola técnica, nunca en un
`ReviewEnvelope` de producto.

## 11. Onda C7 — Congelación, medición ciega y release

### 11.1 Últimos commits ejecutables antes del freeze

Todo código, schema, harness, evaluator y prueba de aislamiento que use **un
candidate epoch** se integra antes de escanear el primer target de ese epoch.
Tooling full-only puede publicarse después de cerrar RC-V, pero jamás entra
retroactivamente en su BOM. Esta tabla contiene las capacidades ejecutables:

La numeración C7 clasifica responsabilidades; no obliga a esperar los otros
siete lenguajes para construir la vertical. El orden de publicación es:

1. common C0–C5 y `SOL-EVM-DEFI-C0..C4`;
2. las contributions C7 requeridas por validación, medición, ledger, timestamp,
   aislamiento y evidence dossier vertical;
3. corte y cierre de `RC-V-EVM-1`;
4. sólo tras contamination-close, contributions C6 de Vyper/Rust/Go/C/C++/JS/TS
   y políglotas restantes, más tooling C7 exclusivo de release/tag full;
5. corte nuevo `RC-FULL-1` que incorpora los mismos tools C7 por SHA —o una
   revisión C7 explícita, que obliga a nuevo candidate root—.

Una contribution C7 puede pertenecer a ambos epochs por el mismo commit SHA
publicado; una **instancia operacional** jamás se comparte.

| ID | Repo | Commit | Resultado |
|---|---|---|---|
| C7-001 | `solguard-deploy` | `feat(measurement): publish campaign truth match adjudication metric report corpus contamination and dossier schemas with writers off [C7-001]`<br>Parent gate: `MEASURE-901` | Contratos del evaluator fuera del scanner; certification se consume desde LANG-200-HARNESS y CLAIM-* siguen bajo AGENTS/ledger |
| C7-001A | `solguard-agents` | `feat(claim-reader): validate evaluator output against preregistered ledger claim IDs [C7-001A]`<br>Parent gate: `MEASURE-901` | Evaluator no define ni autoriza claims |
| C7-001B | `solguard-docs` | `feat(measurement-reader): render reports certifications and dossier by schema and role [C7-001B]`<br>Parent gate: `MEASURE-901` | Docs no infiere por filename |
| C7-001C | `solguard-deploy` | `test(measurement-readers): verify custodian operator evaluator docs and release packages [C7-001C]`<br>Parent gate: `MEASURE-901` | Readers locales y externos listos; writers aún desactivados |
| C7-001D | `solguard-deploy` | `feat(bounty-vertical-schema): publish preregistration pair-seal replica aggregate chaos live and claim contracts with writers off [C7-001D]`<br>Parent gate: `MEASURE-901` | Perfiles node-bound `SOL-EVM-DEFI`; no alias con instancias globales |
| C7-001E | `solguard-agents` | `feat(bounty-vertical-policy): dispatch only exact profile scope pair frame and wording bindings [C7-001E]`<br>Parent gate: `MEASURE-901` | Claim vertical exige CANARY/KNOWN/V5, H-GEN/H-NOVEL A/B, CHAOS y LIVE propios |
| C7-001F | `solguard-deploy` | `test(bounty-vertical-contract): reject global singleton reuse cross-profile roots posthoc downgrade and missing operand [C7-001F]`<br>Parent gate: `MEASURE-901` | Goldens válidos y mutaciones prueban separación vertical/global |
| C7-001G | `solguard-agents` | `feat(timestamp-contract): register rfc3161 transparency-log and quorum receipt union [C7-001G]`<br>Parent gate: `MEASURE-901` | Trust roots, subject binding y quorum 2-of-2 son schema cerrado |
| C7-001H | `solguard-deploy` | `test(timestamp-contract): reject nonce replay stale revoked split-view bad inclusion consistency and single-authority receipts [C7-001H]`<br>Parent gate: `MEASURE-901` | Verificación offline y tamper goldens antes de cualquier frontera real |
| C7-001I | `solguard-deploy` | `feat(resource-workload-schema): publish candidate resource profile workload metrics and provenance contracts with writers off [C7-001I]`<br>Parent gate: `MEASURE-901` | Candidate/run/campaign/report/dossier bindings y cardinalidad de ablación cerrados |
| C7-002 | `solguard-database` | `feat(measurement-reader): consume campaign truth corpus contamination match adjudication metric-provenance and measurement-report contracts [C7-002]`<br>Parent gate: `MEASURE-901` | Depende de `C7-001I`; allowlist exacta de ingesta benchmark y resource/workload; reader y queries antes de cualquier writer |
| C7-002A | `solguard-deploy` | `test(measurement-contract): verify old-new and synthetic new-new for every persisted contract [C7-002A]`<br>Parent gate: `MEASURE-901` | Database, Docs, Agents, evaluator y release listos |
| C7-002B | `solguard-deploy` | `feat(custodian-reader): validate campaign corpus contamination and truth contracts with every writer off [C7-002B]`<br>Parent gate: `MEASURE-901` | El custodio no depende de filenames ni de campos tolerados |
| C7-002C | `solguard-deploy` | `feat(operator-reader): validate sealed campaign and execution authority with every writer off [C7-002C]`<br>Parent gate: `MEASURE-901` | El operador sólo recibe su vista mínima autorizada |
| C7-002D | `solguard-deploy` | `feat(holdout-reader): validate campaign corpus and contamination inputs with every writer off [C7-002D]`<br>Parent gate: `MEASURE-901` | H-GEN rechaza overlap, manifests incompletos y versiones futuras |
| C7-002E | `solguard-deploy` | `feat(novelty-reader): validate campaign corpus contamination and truth inputs with every writer off [C7-002E]`<br>Parent gate: `MEASURE-901` | H-NOVEL prueba novedad sobre autoridades tipadas |
| C7-002F | `solguard-deploy` | `feat(evaluator-reader): validate campaign truth corpus contamination and product artifact manifests with every writer off [C7-002F]`<br>Parent gate: `MEASURE-901` | Matcher y evaluator no recorren outputs por convención |
| C7-002G | `solguard-deploy` | `feat(known-reader): validate corpus truth and match contracts with every writer off [C7-002G]`<br>Parent gate: `MEASURE-901` | KNOWN conserva denominadores y misses |
| C7-002H | `solguard-deploy` | `feat(release-verifier-reader): validate reports language certifications dossier and attestations with every writer off [C7-002H]`<br>Parent gate: `MEASURE-901` | Release falla cerrado ante evidencia ausente o no firmada |
| C7-002I | `solguard-deploy` | `test(measurement-prewriter): run every role reader against old synthetic and invalid fixtures before activation [C7-002I]`<br>Parent gate: `MEASURE-901` | Matriz por contrato, versión, rol, firma y fallo; cero writers activos |
| C7-002J | `solguard-deploy` | `feat(validation-runner): implement typed prefreeze validation manifests and terminal suite runner [C7-002J]`<br>Parent gate: `VALIDATION-CAP-900` | Writer/runner liga candidate SHA/tree/root, command, environment, denominator, outputs y fallos; cero BOM futuro |
| C7-002K | `solguard-deploy` | `test(validation-runner): reject candidate drift missing denominator stale event and synthetic bom input [C7-002K]`<br>Parent gate: `VALIDATION-CAP-900` | Goldens/adversariales y reader verifier cierran `record_validation` antes de cualquier uso operacional |
| C7-002L | `solguard-deploy` | `feat(chaos-runner): implement frozen global and bounty-vertical chaos manifests injections and terminal emitters [C7-002L]`<br>Parent gate: `VALIDATION-CAP-900` | Source/preflight, crash, timeout, OOM, cancel, budget y recuperación con denominador |
| C7-002M | `solguard-deploy` | `test(chaos-runner): reject missing failures source-run drift cross-profile reuse and mutated campaign inputs [C7-002M]`<br>Parent gate: `VALIDATION-CAP-900` | `chaos_validation` global/vertical queda reproducible antes del freeze |
| C7-002N | `solguard-deploy` | `feat(bounty-vertical-reader): validate profile pair-seal replica chaos live and claim artifacts with writers off [C7-002N]`<br>Parent gate: `MEASURE-901` | Cardinalidades y roots verticales exactos; cero outputs reales |
| C7-002O | `solguard-deploy` | `test(bounty-vertical-reader): exercise valid tampered future and global-reuse fixtures across every consumer [C7-002O]`<br>Parent gate: `MEASURE-901` | Reader-first vertical completo antes de writers |
| C7-002P | `solguard-deploy` | `feat(workload-evaluator): compute burdens and resource rates per target scope origin profile and cohort [C7-002P]`<br>Parent gate: `MEASURE-901` | Sin pooling; failed/censored, missing profiles y todos los candidatos permanecen en denominador |
| C7-002Q | `solguard-deploy` | `test(workload-antigaming): reject hidden queues profile cache reuse omitted failures and resource truncation [C7-002Q]`<br>Parent gate: `MEASURE-901` | Cuatro outputs por profile×target, ceilings y rates recomputables end-to-end |
| C7-003 | `solguard-database` | `feat(database-cutover): implement create-once bootstrap legacy freeze and receipt tooling with operational writes off [C7-003]`<br>Parent gate: `DB-CAP-902` | Fixtures prueban paths/digests/backup/guard; no crea ni modifica la DB real |
| C7-003A | `solguard-database` | `feat(migration): implement classified migration shadow and reconciliation tooling with writes off [C7-003A]`<br>Parent gate: `DB-CAP-902` | Readers duales y forward rollback probados sólo sobre copias |
| C7-003B | `solguard-deploy` | `test(migration): verify shadow equivalence restore zero-writer and partial-failure receipts [C7-003B]`<br>Parent gate: `DB-CAP-902` | Counts, roots, provenance y rollback reproducibles con fixtures |
| C7-003C | `solguard-database` | `feat(cutover): implement one-shot authority switch and stale-writer guard with activation off [C7-003C]`<br>Parent gate: `DB-CAP-902` | Cutover real sólo puede ocurrir en OP-DB-CUTOVER |
| C7-003D | `solguard-database` | `test(legacy-retention): prove benckmarks sqlite retention read-only and reject downgrade [C7-003D]`<br>Parent gate: `DB-CAP-902` | Freeze, hash, ruta y writes rezagados ensayados sin tocar autoridad real |
| C7-004 | `solguard-deploy` | `feat(scope): implement detection-only dependency closure verifier [C7-004]`<br>Parent gate: `SCOPE-CAP-900` | Allowlist runtime y ausencia alcanzable de exploit/oracle probadas con fixtures; attestation real posterior |
| C7-005 | `solguard-deploy` | `build(release): implement reproducible runtime bom tcb and provenance emitters [C7-005]`<br>Parent gate: `BOM-CAP-903` | Tres closure builders separados; attestations aún no emitidos |
| C7-006 | `solguard-deploy` | `feat(ceremony): implement sealed one-shot campaign runner [C7-006]`<br>Parent gate: `ISO-CAP-904` | Oracle ausente y sentinels verificables |
| C7-007 | `solguard-deploy` | `feat(corpus-writer): implement signed corpus truth and contamination emitters with operational writes off [C7-007]`<br>Parent gate: `CORPUS-CAP-905` | Sólo fixtures sintéticos tras readers C7-001A..C y C7-002..002I; no crea corpus real prefreeze |
| C7-007A | `solguard-deploy` | `test(corpus-new-new): feed signed and tampered corpus truth and contamination outputs to every declared consumer [C7-007A]`<br>Parent gate: `CORPUS-CAP-905` | Matriz writer-reader y fallo cerrado completa |
| C7-008 | `solguard-deploy` | `feat(holdout-writer): implement h-gen pair manifest and opaque-bundle emitters with operational writes off [C7-008]`<br>Parent gate: `HOLDOUT-CAP-906` | Tras C7-002I; fixtures sintéticos de dos instancias, power analysis y commitments; OP-SEAL crea los bytes reales postfreeze |
| C7-008A | `solguard-deploy` | `test(holdout-new-new): feed both campaign manifests opaque commitments exclusions and tampered variants to every consumer [C7-008A]`<br>Parent gate: `HOLDOUT-CAP-906` | Ningún target ni truth cruza el boundary |
| C7-008B | `solguard-deploy` | `feat(bounty-vertical-hgen): implement profile-bound pair seal and separate A B replica emitters with writes off [C7-008B]`<br>Parent gate: `HOLDOUT-CAP-906` | Sólo fixtures `SOL-EVM-DEFI`; pair vertical no aliasa HOLDOUT global |
| C7-008C | `solguard-deploy` | `test(bounty-vertical-hgen): reject singleton global c5 reuse pair mismatch retuning and same-lineage replicas [C7-008C]`<br>Parent gate: `HOLDOUT-CAP-906` | A/B verticales exigen eventos/evidence roots independientes |
| C7-009 | `solguard-deploy` | `feat(novelty-writer): implement h-novel pair manifests and verifier inputs with operational writes off [C7-009]`<br>Parent gate: `NOVEL-CAP-907` | Tras C7-002I; sólo fixtures; OP-SEAL crea denominadores/roots reales postfreeze |
| C7-009A | `solguard-deploy` | `test(novelty-new-new): feed both campaign manifests novelty authorities contamination events truth reveal and rejection paths to every consumer [C7-009A]`<br>Parent gate: `NOVEL-CAP-907` | Novedad computable sin acceso del scanner |
| C7-009B | `solguard-deploy` | `feat(bounty-vertical-hnovel): implement profile-bound novel pair seal and separate A B replica emitters with writes off [C7-009B]`<br>Parent gate: `NOVEL-CAP-907` | Novelty inventory/taxonomy y cohorts verticales disjuntas |
| C7-009C | `solguard-deploy` | `test(bounty-vertical-hnovel): reject known-only substitution posthoc novelty global reuse and pair drift [C7-009C]`<br>Parent gate: `NOVEL-CAP-907` | Réplicas novel verticales permanecen causalmente independientes |
| C7-010 | `solguard-deploy` | `feat(evaluation-writer): implement reveal match provenance report and dossier emitters with campaign writes off [C7-010]`<br>Parent gate: `EVAL-908` | Capacidad prefreeze probada sólo con fixtures sintéticos; OP-REVEAL/OP-LIVE-EVAL crean instancias reales post-scan |
| C7-010A | `solguard-deploy` | `test(evaluation-new-new): feed signed and tampered evaluator outputs to database docs agents and release verifier [C7-010A]`<br>Parent gate: `EVAL-908` | Igualdad de recomputación y rechazo por rol |
| C7-010B | `solguard-deploy` | `feat(bounty-vertical-evaluator): implement separate hgen hnovel replica acceptance and derived aggregate receipts [C7-010B]`<br>Parent gate: `EVAL-908` | Profile/scope/pair/frame/power/threshold bindings byte-exact |
| C7-010C | `solguard-deploy` | `test(bounty-vertical-evaluator): reject missing replica cross-campaign evidence double-count and claim wording expansion [C7-010C]`<br>Parent gate: `EVAL-908` | Ningún resultado global satisface un operand vertical |
| C7-011 | `solguard-deploy` | `feat(evaluator-review): implement isolated terminal adjudication workflow [C7-011]`<br>Parent gate: `EVAL-908` | Binario/imagen evaluator fuera de `scanner_runtime_bom` |
| C7-012 | `solguard-agents` | `docs(ceremony): separate human custodian operator and adjudicator [C7-012]`<br>Parent gate: `ISO-CAP-904` | Briefs y claves disjuntos |
| C7-013 | `solguard-deploy` | `feat(live-writer): implement authorized live manifest and fixed-frame runner with operational execution off [C7-013]`<br>Parent gate: `LIVE-CAP-913` | Fixtures ligan authorization artifact/digest/root, vigencia/status por intento, target/action/rate scope, materiality/policy commitment, N, retries y stopping; OP-LIVE crea manifest/intentos reales |
| C7-013A | `solguard-deploy` | `test(live-new-new): reject missing expired revoked stale target action and rate authorization drift [C7-013A]`<br>Parent gate: `LIVE-CAP-913` | Todos los intentos sobreviven; autorización se verifica antes de cada intento y ningún retry desaparece |
| C7-013B | `solguard-deploy` | `feat(live-evaluation): bind live attempts policy openings subject assessments confirmation and materiality into append-only outputs [C7-013B]`<br>Parent gate: `LIVE-CAP-913` | Implementa `target_policy_openings_root` + `finding_materiality_assessments_root`, report `live_auth_campaign`, dossier extension y ledger event; cero emisión real prefreeze |
| C7-013C | `solguard-deploy` | `test(live-evaluation): reject pre-live report reuse root drift post-hoc severity and missing attempts [C7-013C]`<br>Parent gate: `LIVE-CAP-913` | OP-LIVE-EVAL sólo podrá emitir después del último intento sellado |
| C7-013D | `solguard-deploy` | `feat(bounty-vertical-live): implement profile-bound sol-evm-defi authorization runner confirmation and report path [C7-013D]`<br>Parent gate: `LIVE-CAP-913` | LIVE vertical no reutiliza población/report global y mantiene empty oracle |
| C7-013E | `solguard-deploy` | `test(bounty-vertical-live): reject global reuse wrong scope stale auth nonmaterial confirmation and missing attempt [C7-013E]`<br>Parent gate: `LIVE-CAP-913` | Claim exige hallazgo material confirmado dentro del frame |
| C7-014A | `solguard-deploy` | `test(canary): implement vertical-slice evaluator [C7-014A]`<br>Parent gate: `CANARY-CAP-909` | Todos los scopes candidatos y negativos |
| C7-014B | `solguard-deploy` | `test(known): implement signed canonical regression evaluator [C7-014B]`<br>Parent gate: `KNOWN-CAP-910` | 100 % del manifest; cifras históricas sólo baseline |
| C7-015 | `solguard-deploy` | `test(closure): prove scanner cannot import or reach evaluator truth and adjudication review [C7-015]`<br>Parent gate: `SCOPE-CAP-900` | Capacidad negativa de oracle |
| C7-015A | `solguard-agents` | `feat(dossier-validator): implement read-only graph link schema ledger and dossier validator [C7-015A]`<br>Parent gate: `FINAL-002-CAP` | Lector ejecutable consume schemas/registry canónicos y la revisión exacta sin escribir ni aceptar |
| C7-015B | `solguard-agents` | `test(dossier-validator): reject graph link schema signature root replay and tamper failures [C7-015B]`<br>Parent gate: `FINAL-002-CAP` | Fixtures válidos y mutaciones unitarias/integradas prueban fallo cerrado antes del freeze |
| C7-016 | `solguard-deploy` | `feat(release-verifier): implement independent ledger and dossier reproduction before freeze [C7-016]`<br>Parent gate: `FINAL-003-CAP` | Verificador probado con fixtures sintéticos; OP-AUDIT lo ejecuta después sobre todos los eventos reales |
| C7-016A | `solguard-deploy` | `feat(tag-realization): implement frozen-plan signed local and canonical-remote nonforce publisher with writes off [C7-016A]`<br>Parent gate: `FINAL-003-CAP` | Emitter sólo habilitable después de FINAL-006; source/heads/index/commits forbidden |
| C7-016B | `solguard-deploy` | `test(tag-realization): reject preexisting local remote backdated local-only moved recreated force partial and wrong-target tags [C7-016B]`<br>Parent gate: `FINAL-003-CAP` | Preserva éxito parcial y exige 15/15 remote audit receipts |
| C7-016C | `solguard-deploy` | `feat(release-transparency): implement dsse tag receipt terminal dossier and post-promotion binding [C7-016C]`<br>Parent gate: `FINAL-003-CAP` | Evita self-reference y publica roots sólo en el orden temporal válido |

El ledger congela dos instancias del mismo contrato genérico
`planned_tooling_subject_set_root/count`, nunca listas mantenidas a mano. La
instancia de `RC-V-EVM-1` contiene exactamente cada contribution de su
evaluation closure; excluye todos los scopes y capabilities posteriores que no
pertenecen a esa vertical —entre ellos `C7-015A`, `C7-015B`, `C7-016`,
`C7-016A`, `C7-016B` y `C7-016C`, sin que esta enumeración sea exhaustiva—.
La instancia de `RC-FULL-1` contiene cada contribution alcanzable en su
release-train closure y `C7-016C` es el último commit fuente ejecutable del
candidate full. Un epoch sólo puede **abrirse** si cada contribution de su set
ya está accepted y su commit/tree o absence-tree receipt está contenido en el
candidate; el freeze posterior atestigua las capacidades runtime que realmente
ejecutará. Cada freeze fija, por separado:

1. `scanner_runtime_bom`: binarios, modelos, reglas, prompts, configuración,
   repos y dependencias que pueden influir en findings;
2. `build_execution_tcb_bom`: toolchains, imagen base, host, runtime de modelo y
   servicios necesarios para reproducir;
3. `governance_evidence_bom`: evaluator, schemas de truth, runner de ceremonia,
   ledger, claves autorizadas y documentación normativa.

El attestation del freeze referencia SHAs que ya existen. No se almacena dentro
de un commit que pretendiera incluir su propio SHA.

Ningún `C7-*` anterior representa una campaña real. Esos commits implementan y
prueban schemas, readers, writers y runners exclusivamente con fixtures
sintéticos, manteniendo desactivada la emisión operacional. OP-V-PREFREEZE/
OP-V-FREEZE hacen esto para `RC-V-EVM-1`; OP-PREFREEZE/OP-FREEZE lo repiten para
`RC-FULL-1`. Cada freeze consume validation events de su propio epoch y
**produce** sus BOM/closures. DB, manifests, outputs, reveals, reports,
confirmations y dossier nacen sólo después del freeze aplicable y ligan roots
del mismo epoch.

### 11.2 Operaciones de campaña: evidencia, no commits

Las operaciones se ejecutan en dos candidate epochs. `record_candidate_epoch_open`
crea una definición content-addressed inmutable; el freeze posterior sólo
atestigua que las validaciones, BOM, scopes y entorno runtime comprometidos para
esa definición quedaron fijados. No muta el manifest ni congela todo el programa
para siempre. Todo OP emite objetos create-only firmados; ningún resultado de
`RC-V-EVM-1` se copia a `RC-FULL-1`.

Open/freeze/close son transiciones event-sourced con revision, previous
event/root y compare-and-swap. El membership pinnea por miembro el subject,
versión, content root y acceptance event; nunca consulta «el estado actual» para
reinterpretar una campaña cerrada. El cierre produce un
`solguard-candidate-epoch-closure-receipt.v1`. Una reapertura posterior sólo
propaga a candidates no cerrados que consuman el subject afectado.

#### 11.2.1 Corte prioritario `RC-V-EVM-1`

Antes de este corte se integran common stack, `SOL-EVM-DEFI-C0..C4` y las
capacidades C7 de validación, medición, timestamp, ledger, aislamiento y dossier
de evidencia que el epoch necesita. Release DSSE, promoción y tags de los quince
repos quedan fuera. Los demás lenguajes tampoco son una precondición.

| ID operativo | Operación | Gate producido |
|---|---|---|
| OP-V-EPOCH-OPEN-000U | sólo con `BASELINE-009` accepted, abrir `RC-V-EVM-1` por CAS, pinnear manifest, SHAs/trees, membership versionado, scope/closure sets y allowed actions; probar unicidad de cadena | evento `record_candidate_epoch_open`; todavía no congela ni acepta un gate |
| OP-V-PREFREEZE-000V | sobre los SHAs/tree/root de `RC-V-EVM-1`, ejecutar y verificar por separado V0–V4, NEG y META con manifests, commands, environment, denominators, outputs y failures propios | acepta `VERTICAL-EVM-TEST-V0-001`, `VERTICAL-EVM-TEST-V1-001`, `VERTICAL-EVM-TEST-V2-001`, `VERTICAL-EVM-TEST-V3-001`, `VERTICAL-EVM-TEST-V4-001`, `VERTICAL-EVM-TEST-NEG-001` y `VERTICAL-EVM-TEST-META-001` |
| OP-V-FREEZE-001V | consumir exactamente esos siete event roots y emitir scope proof, tres BOM/SBOM, key map e isolation attestation del epoch SOL-EVM-DEFI | acepta `VERTICAL-EVM-SCOPE-001`, `VERTICAL-EVM-BOM-001` y `VERTICAL-EVM-ISO-001` |
| OP-DB-CUTOVER-001A | sólo tras el freeze vertical válido, ejecutar la state machine one-shot con verifier separado: backup/hash/read-only de `benckmarks.sqlite` → create-once `benchmarks.sqlite` → migration → shadow equivalence/zero writers → cutover/guard/retención | acepta una sola vez `DB-902`; fallo parcial queda preservado/reanudable sin downgrade |
| OP-V-CORPUS-001V | materializar corpus/truth/contamination del epoch vertical, reconciliar el histórico relevante y fijar denominadores sin crear el corpus full futuro | acepta `VERTICAL-EVM-CORPUS-001` |
| OP-V-CANARY-002V | ejecutar todas las slices/negativos SOL-EVM-DEFI del candidate congelado | acepta `VERTICAL-EVM-CANARY-001` |
| OP-V-KNOWN-003V | ejecutar y sellar el must-pass known vertical completo, incluidos misses/fallos | evidencia para `VERTICAL-EVM-V5-001` y `VERTICAL-EVM-KNOWN-001` |
| OP-V-V5-003W | verifier independiente recomputa manifest/denominator/truth/burden vertical | acepta `VERTICAL-EVM-V5-001` |
| OP-V-KNOWN-CLOSE-003X | evaluator consume V5 vertical y output seal exactos | acepta `VERTICAL-EVM-KNOWN-001` |
| OP-VERTICAL-PREREG-004V | congelar dos pares H-GEN, dos H-NOVEL, frame/policy/endpoints LIVE, potencia, thresholds, stopping/abort y wording, todos ligados a `RC-V-EVM-1` | acepta `VERTICAL-EVM-PROFILE-001`; no contiene resultados |
| OP-VERTICAL-SEAL-005V | custodio/measurement authority materializan y timestamp truth, policies, frames y manifests A/B verticales | acepta `VERTICAL-EVM-HGEN-SEAL-001` y `VERTICAL-EVM-HNOVEL-SEAL-001` |
| OP-VERTICAL-HGEN-A-006V | ejecutar y sellar H-GEN-A vertical sin reveal | output A; gate replica aún no aceptado |
| OP-VERTICAL-HGEN-B-007V | ejecutar y sellar H-GEN-B vertical sin reveal ni retuning | output B; gate replica aún no aceptado |
| OP-VERTICAL-HNOVEL-A-008V | ejecutar y sellar H-NOVEL-A vertical sin reveal | output A; gate replica aún no aceptado |
| OP-VERTICAL-HNOVEL-B-009V | ejecutar y sellar H-NOVEL-B vertical sin reveal ni retuning | output B; gate replica aún no aceptado |
| OP-VERTICAL-REVEAL-010V | con los cuatro outputs sellados, revelar, adjudicar 100 %, aplicar policy openings/materiality assessments y medir todo | acepta por eventos separados HGEN-A/B y HNOVEL-A/B; materializa derived BLIND/NOVEL verticales |
| OP-VERTICAL-CHAOS-011V | ejecutar la matriz vertical precomprometida de source/preflight, crash, timeout, OOM, cancel, budget y recuperación | acepta `VERTICAL-EVM-CHAOS-001` |
| OP-VERTICAL-LIVE-012V | ejecutar el frame LIVE autorizado con auth/status por intento, empty oracle, confirmación y materialidad | acepta `VERTICAL-EVM-LIVE-001` sólo si todos los controles pasan |
| OP-VERTICAL-CLAIM-013V | reproducir profile+blind+novel+chaos+LIVE contra el mismo epoch/root/scope/frame | materializa `CLAIM-VERTICAL-EVM-001` con wording exclusivamente frame-scoped |
| OP-VERTICAL-CONTAMINATION-014V | pase o falle la vertical, preparar y sellar create-only el 100 % de targets/attempts/results/reveals/adjudications como TRAIN/DEV, sin convertir non-pass en accepted | inputs/root de contaminación para close; todavía no acepta el primary ni abre successor |
| OP-V-EPOCH-CLOSE-015V | comprobar cero pending/reopened en el evaluation closure, observar todos los terminales, capturar claim true/false y contamination root y ejecutar por CAS `record_candidate_epoch_close` | acepta atómicamente `VERTICAL-EVM-CONTAMINATION-CLOSE-001` y crea `solguard-candidate-epoch-closure-receipt.v1` closed_pass/nonpass; único predecessor autoritativo |

Sólo después de contamination-close se reanuda trabajo de producto. Esos commits
crean `RC-FULL-1`; jamás modifican los trees, roots o evidencia de
`RC-V-EVM-1`.

#### 11.2.2 Corte de producto `RC-FULL-1`

Tras completar los 30 scopes y todo el código restante se repiten validation,
freeze, corpus, canary y known sobre los **nuevos** SHAs. Los resultados
verticales ya están en contamination y no entran en denominadores full.

| ID operativo | Operación | Gate producido |
|---|---|---|
| OP-FULL-EPOCH-OPEN-000F | consumir el closure receipt vertical y el evento `DB-902=accepted`, y abrir por CAS `RC-FULL-1` con membership/versiones, SHAs/trees y closure set propios; ninguna instancia operacional vertical es elegible | evento `record_candidate_epoch_open`; cualquier fork, DB no aceptada o receipt incompleto falla |
| OP-PREFREEZE-000 | sobre `RC-FULL-1`, ejecutar manifests completos V0–V4, NEG y META; cada suite conserva denominador, comando, entorno, outputs/fallos y verifier independiente | acepta por separado `TEST-V0..V4`, `TEST-NEG`, `TEST-META` |
| OP-FREEZE-001 | comprobar SHAs byte-exact, consumir los siete validation event roots y emitir los tres BOM, SBOM, scope proof, key map y timestamp quorum full | `BOM-903`, `SCOPE-900`, `ISO-904` |
| OP-DB-GUARD-001F | verificar que DB-902 sigue siendo autoridad v2, legacy permanece read-only y no existen writers stale; no migrar de nuevo | guard receipt full; no reacepta ni reabre `DB-902` |
| OP-CORPUS-001A | materializar corpus/truth/contamination full, incluyendo contamination-close vertical y drift histórico explicado | acepta `CORPUS-905` operacional |
| OP-CANARY-003 | ejecutar todas las vertical slices de los 30 scopes contra `RC-FULL-1` | `CANARY-909` |
| OP-KNOWN-004 | ejecutar y sellar el manifest must-pass full, incluidos todos los misses/fallos | evidencia operacional known |
| OP-TEST-V5-004A | verifier evalúa manifest/denominador/truth/burden full | acepta `TEST-V5` |
| OP-KNOWN-CLOSE-004B | evaluator consume V5 y outputs full sellados | acepta `KNOWN-910` |
| OP-SEAL-004C | sólo ahora seleccionar cohorts full frescas y lineage-disjoint y emitir/commit/timestamp H-GEN/H-NOVEL A/B, power, policies, materiality y sampling frames antes de scans | acepta `HOLDOUT-906`, `NOVEL-907`; ningún root vertical es elegible |
| OP-HGEN-A-005 | ejecutar y sellar output A sin reveal | parte A de `BLIND-911` |
| OP-HGEN-B-006 | ejecutar y sellar output B con el mismo BOM y sin retuning | parte B de `BLIND-911` |
| OP-HNOVEL-A-007 | ejecutar y sellar output novel A sin reveal | parte A de `NOVELRUN-912` |
| OP-HNOVEL-B-008 | ejecutar y sellar output novel B con el mismo BOM y sin reveal | parte B de `NOVELRUN-912` |
| OP-REVEAL-009 | revelar sólo tras congelar los cuatro outputs, adjudicar el 100 % exigido y usar la capacidad congelada de EVAL para emitir provenance/reports/dossier H-GEN/H-NOVEL create-only | outputs de EVAL y evidencia operacional para V6/V7 y cierres; no reacepta `EVAL-908` |
| OP-SCOPE-C5A-009A0 | measurement authority propone y acceptance verifier reproduce, scope por scope, los 30 eventos `record_measurement` C5A desde la instancia exacta H-GEN-A; cada evento liga manifest/report/provenance/two-set roots/power/thresholds y sólo acepta su primary | acepta individualmente los 30 `<SCOPE-ID>-C5A`; cualquier scope fallido queda pending |
| OP-SCOPE-C5B-009A1 | con identidad/clave separada y sin retuning, repetir desde la instancia exacta H-GEN-B los 30 eventos `record_measurement` C5B | acepta individualmente los 30 `<SCOPE-ID>-C5B`; no hay aceptación batch parcial ni promedio A/B |
| OP-TEST-V6-009A | verifier comprueba H-GEN A/B por scope, completion, anti-gaming, no-retuning y todos los denominadores | acepta `TEST-V6` |
| OP-BLIND-EVAL-009A2 | derived evaluator calcula `BLIND-911` desde los 64 operandos exactos: 60 C5A/B más HOLDOUT/EVAL/ISO/TEST-V6; `scope_replica_count=60` queda como cardinalidad secundaria; verifier separado reproduce formula digest y operand-state hash | emite `solguard-derived-evaluation.v1` de `BLIND-911`; no muta derived ni acepta primaries |
| OP-TEST-V7-009B | verifier comprueba H-NOVEL A/B, novelty, independencia causal, adjudicación y thresholds | acepta `TEST-V7` |
| OP-NOVEL-CLOSE-009C | evaluator consume V7 y ambos reports novel sellados | acepta `NOVELRUN-912` |
| OP-CERT-010 | certification authority calcula por separado los 30 `<SCOPE-ID>-CERT` desde C0-C4+C5A+C5B+harness exactos, emite para cada uno `solguard-derived-evaluation.v1` + `solguard-language-certification.v1`, y un verifier independiente reproduce formula/operands/BOM/limits | materializa/verifica 30 scope-CERT operacionales; ningún aggregate se acepta por atajo |
| OP-LANG-011 | sólo después de los 30 scope-CERT, calcular determinísticamente los AND de lenguaje, categorías políglotas y global | receipts derived `LANG-100..180`, `LANG-190` y `LANG-200` |
| OP-LIVE-012 | emitir el manifest LIVE real, ejecutar la población autorizada precomprometida, sellar y conservar todos los intentos sin revisión | parte de `LIVE-913` |
| OP-LIVE-EVAL-012A | después del último intento sellado, adjudicar/confirmar, recomputar y emitir una nueva provenance, MeasurementReport `live_auth_campaign` y dossier extension append-only | evidencia operacional LIVE/V8 |
| OP-TEST-V8-012B | verifier comprueba autorización, intentos, empty oracle, materialidad post-seal y no explotación | acepta `TEST-V8` |
| OP-LIVE-CLOSE-012C | operator/evaluator separados consumen V8 y el report LIVE exacto | acepta `LIVE-913` |
| OP-CHAOS-012D | agregar la matriz precomprometida de source/preflight, crash, timeout, OOM, cancel, budget y fallos parciales observada en canary/runs más inyecciones aisladas; no muta campañas | acepta `TEST-CHAOS` con manifest/denominador/env/output/failures |
| OP-FULL-EPOCH-CLOSE-012E | materializar CLAIM-001..006 true/false, terminalizar uno a uno todo descendant no runnable del evaluation closure, comprobar su membership/terminal bindings/zero-pending y ejecutar por CAS `record_candidate_epoch_close` | acepta `RC-FULL-1-CLOSE` con receipt `closed_pass|closed_nonpass`; sólo closed_pass habilita FINAL-001, nonpass crea dossier `full_nonpass_terminal` sin DSSE/tags |
| OP-FINAL-001 | Docs prepara/revisa entries; el único dossier builder EVAL emite la revisión create-only completa; owner Docs + verifier validan la instancia exacta | acepta sólo `FINAL-001` |
| OP-FINAL-002 | owner Agents + verifier ejecutan el graph/link/schema/ledger validator sobre la revisión exacta | acepta sólo `FINAL-002` |
| OP-FINAL-003 | clean-room recomputation operator A recompone ledger, matching, adjudicación, métricas y conteos y emite receipt; acceptance verifier B, con identidad/credencial distinta, lo reproduce y acepta | acepta sólo `FINAL-003` |
| OP-FINAL-004 | owner Docs emite un disclosure artifact firmado y create-only en el evidence store con límites, exclusiones, denominadores y riesgos; verifier reproduce bytes/roots y confirma que no hubo edit/commit postfreeze en `solguard-docs` | acepta sólo `FINAL-004`; una publicación web posterior es vista derivada |
| OP-FINAL-005 | isolation tester A ejecuta y firma la prueba final de closure; acceptance verifier B, con identidad/credencial distinta, reproduce el resultado y acepta | acepta sólo `FINAL-005` |
| OP-AUDIT-013 | operación read-only verifica que los cinco owners ya aceptaron `FINAL-001..005` con eventos independientes y que la fórmula derivada de `RELEASE-914` es true | audit receipt; no acepta nodos ajenos |
| OP-DECISION-013A | release approver materializa el resultado derivado sin modificarlo y fija `release_decision_event_id/hash + pre_promotion_ledger_root` | decisión pre-promotion `RELEASE-914` |
| OP-DSSE-014 | release dossier builder A emite la revisión `revision_role=release_pre_tag` de `solguard-acceptance-dossier-manifest.v1` y la envuelve en DSSE; referencia SHAs/tag plan, tres BOM, reports y decisión/root pre-promotion sin inventar otro release manifest | evidencia candidata de `FINAL-006`, no revisión terminal ni `RELEASE-914`; A no puede aceptarla |
| OP-VERIFY-015 | acceptance verifier B, con identidad/credencial distinta de A, reproduce manifest, DSSE, tag plan, dossier, decisión y pre-promotion root; añade evento append-only sólo si todo coincide | acepta `FINAL-006` |
| OP-TAGS-016A | después de FINAL-006, probar ausencia local+remote de los quince refs/nombres, crear exactamente los annotated signed tags del plan y publicarlos a los canonical remotes con non-force push; conservar cualquier éxito/fallo parcial sin mover, borrar, recrear ni reutilizar objetos | candidatos de tag con creation/publication/audit timestamps externos posteriores a FINAL-006; todavía sin `FINAL-007` |
| OP-TAG-VERIFY-016B | verificador liga `final_006_event_id/self_hash`+ledger root, precondition receipt, manifest/DSSE y resuelve 15/15 local object IDs, remote refs, peeled targets, signatures, push receipts y hosting audit events; tag preexistente, backdated, local-only, recreado, borrado, falta o extra falla | `solguard-tag-realization-receipt.v1` temporal y remotamente verificable, obligatorio de `FINAL-007` |
| OP-DOSSIER-FINAL-016C | crear una revisión create-only `revision_role=post_tag_terminal` de `solguard-acceptance-dossier-manifest.v1` cuyo previous es el release/pre-tag manifest envuelto por DSSE y cuya nueva entry es el tag realization 15/15; conserva cumulative superset y no muta/re-firma el DSSE | instancia que consume `FINAL-007` |
| OP-PROMOTE-016D | sólo con tag realization 15/15 y revisión terminal válida, el integrador reevalúa DAG, acepta `FINAL-007` y deriva `CLAIM-007` | promoción final |
| OP-TRANSPARENCY-016E | publicar receipt externo que liga manifest/DSSE pre-tag, revisión terminal, tag realization, evento FINAL-007/claim y `post_promotion_ledger_root` | cierre auditable sin self-reference |

En cualquiera de los dos epochs, la primera salida non-pass no autoriza omitir
el resto de su **evaluation closure**. Cada operación ya ejecutada conserva
`terminal_failed|terminal_invalid|insufficient_evidence`; cada descendant que
ya no sea runnable recibe, uno a uno, `terminal_not_run` con blocker/path. Se
materializan los derived/claims de evaluación como `false`, se publica el
dossier non-pass y se ejecuta el OP de cierre correspondiente. FINAL-001..007,
RELEASE-914 y CLAIM-007/008 pertenecen al release train posterior, no al
evaluation closure; sólo empiezan si el receipt full es `closed_pass`. No se
crean DSSE ni tags para un `RC-FULL-1` non-pass.

H-GEN-A y H-GEN-B deben aportar evidencia independiente para cada scope que
aspire a C5. H-NOVEL-A/B prueban novedad respecto al inventario congelado, no
reemplazan las réplicas H-GEN. Los certificados son cálculos/attestations:
ningún `LANG-100..200` se cierra mediante un commit documental.

La ruta `OP-VERTICAL-*` es deliberadamente anterior y separada: busca la primera
prueba útil para bounty sin esperar la certificación de los 30 scopes, pero no
rebaja ningún threshold. Sus cohorts, truth, policies, targets LIVE y results no
se cuentan de nuevo en H-GEN/H-NOVEL/LIVE globales una vez revelados. Un éxito
vertical sólo autoriza el wording frame-scoped de `CLAIM-VERTICAL-EVM-001`; un
fallo queda publicado y no se degrada post-hoc a KNOWN o `partial_scope`.

Después de cualquier `OP-*-FREEZE` queda prohibido cambiar código, prompts,
reglas, modelos, thresholds, corpus evaluable, evaluator, schemas o harness
**dentro de ese candidate epoch**. Continuar el roadmap sólo está permitido
cerrando el epoch anterior y creando explícitamente otro candidate ID/root; éste
requiere validation, freeze y campañas nuevas. Una
publicación posterior en `solguard-docs` puede enlazar el DSSE externo, pero:

- pertenece al plano de publicación, no al BOM medido;
- no puede reparar, reinterpretar ni ocultar un gate fallido;
- no cambia el SHA o tag del candidato;
- debe publicar también runs fallidos, denominadores y límites.

## 12. Gates antes de merge

Todo PR debe demostrar:

1. cwd y repositorio correctos;
2. worktree limpio salvo archivos propios;
3. AGENTS.md leído;
4. task ID válido;
5. ownership de archivos disjunto;
6. cambio limitado al scope;
7. tests unitarios;
8. tests contractuales;
9. test negativo relevante;
10. E2E del slice afectado;
11. no regresión del corpus conocido aplicable;
12. artefactos de evidencia;
13. changelog actualizado;
14. documentación contractual actualizada;
15. revisión independiente;
16. SHA de dependencia exacto;
17. ausencia de secretos y ground truth;
18. rollback descrito;
19. `git diff --check`;
20. estado final limpio tras commit.

Un PR multi-repo se representa como varios PRs enlazados. Ninguno se mergea
contra una dependencia no publicada.

## 13. Política de fixups

- los fixups locales se squashan antes de revisión;
- una corrección posterior a revisión conserva commit separado si cambia la
  evidencia;
- nunca se fuerza un push sobre un tag;
- nunca se oculta una campaña fallida mediante rebase;
- los artefactos fallidos siguen referenciables;
- una regresión descubierta después del merge genera revert o fix explícito;
- el changelog registra el resultado real, no la intención.

## 14. Condición de finalización del plan de commits

El plan de commits está completo cuando:

- todos los IDs aplicables están publicados;
- cada commit referencia evidencia válida;
- los trenes han atravesado sus cortes de autoridad;
- la compatibilidad legacy retirada no tiene consumidores;
- los manifests fijan SHAs exactos;
- las ramas y tags están firmados según política;
- la checklist maestra vincula cada cierre a commits y artefactos;
- `vertical_tooling_set_root` precede al freeze RC-V y
  `full_tooling_set_root` —incluido `C7-016C`— precede al freeze RC-FULL; ningún
  commit posterior pertenece retroactivamente al epoch ya congelado;
- `OP-FINAL-001..005` se aceptan por sus owners/verifiers disjuntos;
- `OP-AUDIT-013` sólo verifica y `OP-DECISION-013A` fija la materialización y
  pre-promotion root antes de construir manifest;
- `OP-DSSE-014` referencia SHAs/tag plan prefreeze y decisión pre-promotion sin
  autorreferencia, pero no se considera promoción;
- `OP-VERIFY-015` precede a tags; `OP-TAG-VERIFY-016B` exige 15/15 antes de
  `OP-DOSSIER-FINAL-016C` y `OP-PROMOTE-016D`;
- los 15/15 tags están firmados, resueltos y publicados por non-force push en
  sus canonical remotes; un tag sólo local no satisface el gate;
- un fallo parcial de tags deja objetos y refs remotos preservados pero no
  autoriza release;
- tag realization y post-promotion root quedan ligados por receipts externos,
  nunca insertados en la preimagen del manifest.

La existencia de un DSSE final sin dossier válido, o de un commit que cambie
el candidato después de medirlo, invalida la release completa.
