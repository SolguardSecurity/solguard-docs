# Validación ciega, medición y release de Solguard Detection

## 1. Propósito

Este documento define cómo demostrar, con evidencia reproducible, que Solguard
ha dejado de ser una colección de componentes prometedores y se ha convertido
en un producto de detección fiable.

La implementación del código no completa este programa. Tampoco lo completan
los tests unitarios, una ejecución satisfactoria contra casos conocidos ni una
demo visualmente convincente. El programa solo se completa cuando se superan
las puertas de aceptación descritas aquí con denominadores congelados,
artefactos íntegros, ground truth inaccesible durante el scan y adjudicación
independiente.

El alcance termina en un finding automático, trazable, validado y
económicamente material. La construcción de exploits, la ejecución ofensiva y
la generación de reportes de bounty quedan fuera.

## 2. Vocabulario de claims

Solguard no usará la palabra `release`, `validado`, `ciego`, `nuevo` o
`bounty-ready` sin indicar exactamente qué claim está sosteniendo.

| Claim | Qué demuestra | Qué no demuestra |
|---|---|---|
| `operational_canary` | El pipeline arranca, termina y persiste artefactos coherentes | Precisión, recall, novedad o utilidad |
| `sealed_blind_generalization` | H-GEN-A/B pasan con oracle ausente e independencia humana demostrada | Novedad de raíz causal |
| `sealed_novel_detection` | H-NOVEL-A/B pasan y confirman raíces causales independientes excluidas del conocimiento operativo | Explotabilidad ejecutada |
| `reviewer_useful` | Los findings válidos llegan con precisión, ranking y carga de revisión aceptables | Que exista un bounty real |
| `bounty_detection_ready` | La cadena automática ha producido en un objetivo autorizado una detección nueva, económicamente material y confirmada de forma independiente | Exploit, reporte o pago de bounty |
| `product_release` | Todos los claims obligatorios anteriores y las puertas de producto están satisfechos | Garantía de encontrar bugs futuros |

`known_regression` es un perfil de evidencia emitido por `KNOWN-910`, no un
claim de producto. Puede demostrar que el candidate no ha perdido capacidades
en el corpus conocido y versionado, pero no concede ningún `CLAIM-*` ni
generalización.

Reglas:

1. Un claim inferior nunca se anunciará con el nombre de uno superior.
2. El perfil `known_regression` nunca se describirá como claim ni como ciego.
3. Un finding coincidente con una etiqueta conocida no demuestra novedad.
4. Un match textual o por línea no demuestra causalidad ni impacto.
5. Un resultado sin cierre de denominador se considera inválido para release.
6. Un resultado `unverifiable` cuenta como no demostrado; no desaparece del
   denominador.
7. La ausencia de crashes no demuestra calidad de detección.
8. Todo claim publicado incluye su nivel de ceguera, perfil de alcance y root
   del ledger de aceptación que lo autoriza.
9. Una campaña `self_administered_isolated_evaluation` no puede usar
   `sealed_blind_generalization`, `sealed_novel_detection` ni
   `bounty_detection_ready`, aunque su aislamiento técnico sea correcto.
10. README, CHANGELOG, tag, dashboard o resumen de base de datos no conceden un
    claim: sólo reflejan el último estado firmado del ledger de aceptación.

## 3. Alcance medido y frontera del producto

### 3.1 Tres Bills of Materials obligatorios

El closure de gobierno del producto está formado por:

1. `solguard-agents`
2. `solguard-backend`
3. `solguard-core`
4. `solguard-database`
5. `solguard-deploy`
6. `solguard-diff`
7. `solguard-discover`
8. `solguard-docs`
9. `solguard-economic`
10. `solguard-filter`
11. `solguard-invariant`
12. `solguard-map`
13. `solguard-trace`
14. `solguard-validate`
15. `solguard-value`

No significa que los quince repositorios deban abrirse en runtime. Se separan:

1. **`scanner_runtime_bom`:** únicamente repos, binarios, modelos,
   configuraciones y archivos alcanzables durante el scan.
2. **`build_execution_tcb_bom`:** builders, VM, OS, imagen, toolchains,
   runtimes, modelo, supervisor, CAS y controles de aislamiento que pueden
   alterar el binario o su ejecución.
3. **`governance_evidence_bom`:** los quince repositorios, registry, docs,
   código del harness, schemas, matching, rúbrica, queries de métricas,
   manifests de protocolo e implementación/configuración del evidence store
   externo.

`solguard-docs` y `solguard-agents` pertenecen a gobierno y no deben abrirse
durante el scan. Truth, matches, `solguard-adjudication-review.v1`, ledger y
evaluator pertenecen a evidencia y no pueden aparecer en
`scanner_runtime_bom`. `solguard-review-envelope.v1` sí es un artefacto de
producto oracle-free emitido por CORE. El manifest de producto enlaza los tres
BOM sin confundirlos y registra tres closures
transitivos separados: dependencias/archivos/procesos de runtime,
builders/toolchains/host de ejecución y artefactos/autoridades de medición.
Cada closure tiene root propio; compartir un repositorio no autoriza a compartir
su subtree ni su mount.

Los payloads dinámicos de campaña no mutan el BOM congelado. Inputs sellados,
attempts, outputs, adjudication reviews y decisiones forman roots de evidencia
append-only separados, enlazados por el ledger al mismo
`governance_evidence_bom_root`.

Cada BOM debe fijar, según aplique:

- URL canónica;
- commit SHA exacto;
- árbol Git;
- estado limpio;
- versión y tag inmutable;
- runtime y lockfile;
- hash de los artefactos construidos;
- contratos de entrada y salida consumidos;
- migración de base de datos;
- configuración efectiva;
- modelo, prompts y reglas;
- corpus permitido;
- feature flags;
- imagen OCI y digest;
- SBOM;
- identidad del constructor y del verificador;
- rol `runtime|tcb|governance|evidence`;
- razón de alcanzabilidad;
- digest de subtree ejecutable cuando un repo también aloje evidencia.

Antes del primer scan de una campaña se congelan por separado el código del
scanner y el harness completo de medición. El harness incluye selección y
scoreability, taxonomía, schemas, matching, rúbrica, queries, intervalos,
multiplicidad y generador del dossier. Ninguno puede cambiar entre cohortes; una
corrección obliga a crear otro release candidate y campañas nuevas.

### 3.2 Exclusión verificable de otros componentes

`solguard-exploit`, cualquier generador de exploit y cualquier CLI externa al
producto quedan fuera de alcance. No basta con omitirlos de una lista.

Antes de cualquier medición sellada se debe demostrar que:

- no forman parte del grafo de dependencias de runtime;
- no son descargados por scripts de setup;
- no son invocados por shell, proceso hijo, hook, plugin o ruta de fallback;
- no aportan reglas, fixtures, etiquetas ni ground truth;
- no comparten volumen, base de datos ni caché con el scanner;
- no aparecen en la SBOM ni en el closure de archivos abiertos;
- la coordinación valida los quince repositorios y no exige un decimosexto.

El baseline auditado no satisface esta condición por declaración: el perfil
detection-only debe retirar explícitamente cualquier repo, binario, setup o
fallback de `solguard-exploit` y probar no reachability antes del freeze.

Si un componente fuera del BOM es alcanzable durante el scan, hay solo dos
opciones válidas: incluirlo formalmente en el alcance de otra auditoría o
eliminar su alcanzabilidad. No se permite declararlo «auxiliar» y seguir.

### 3.3 Prueba de alcance

Debe producirse `scope-proof.json` con:

```json
{
  "schema_version": "solguard-scope-proof.v1",
  "release_candidate_root": "sha256:<frozen-candidate-manifest>",
  "governance_repository_count": 15,
  "governance_repositories": [],
  "scanner_runtime_bom_root": "sha256:...",
  "build_execution_tcb_bom_root": "sha256:...",
  "governance_evidence_bom_root": "sha256:...",
  "runtime_allowed_repositories": [],
  "runtime_dependency_closure": [],
  "opened_file_hashes": [],
  "spawned_processes": [],
  "network_attempts": [],
  "sentinel_denied_attempts": [],
  "sentinel_successful_open_read_mmap": [],
  "sentinel_byte_matches_in_outputs": [],
  "unexpected_dependencies": [],
  "verdict": "pass|fail"
}
```

`release_candidate_root` liga el candidate manifest ya existente y congelado;
no es un `release_id`, dossier manifest ni release manifest futuro. El dossier
y la decisión de release referencian después este scope-proof/root. Introducir
un placeholder o referencia hacia un objeto todavía no creado falla por
causalidad circular.

Una dependencia inesperada, un proceso no declarado, cualquier
`open/read/mmap` exitoso sobre un sentinel, cualquier byte filtrado o la ausencia
de los intentos denied esperados produce `fail` cerrado. El gate compara el
runtime contra una allowlist cerrada y exige ausencia de componentes prohibidos;
no exige abrir los quince repos.

## 4. Pirámide de validación

Cada nivel depende de los inferiores. Saltarse uno invalida los superiores.

### Nivel V0 — Tests locales deterministas

- unitarios;
- property-based;
- golden fixtures;
- serialización/deserialización;
- esquemas y migraciones;
- parsers malformados;
- límites de recursos;
- pruebas de manipulación de artefactos;
- determinismo o no determinismo explícitamente acotado.

### Nivel V1 — Contratos productor-consumidor

Para cada arista del DAG:

- fixture válida;
- campos requeridos;
- versión soportada;
- campos desconocidos;
- productor adelantado;
- consumidor atrasado;
- hash incorrecto;
- artefacto incompleto;
- evidencia ausente;
- estado de fallo explícito;
- compatibilidad de lectura durante migración;
- rechazo de escrituras legacy tras el corte.

### Nivel V2 — Vertical slices por familia económica

Cada slice atraviesa como mínimo:

`MAP -> TRACE -> DISCOVER -> ECONOMIC/INVARIANT -> VALUE -> VALIDATE -> FILTER -> DATABASE`

Debe contener:

- caso vulnerable;
- control seguro cercano;
- mutante que conserva semántica;
- mutante que elimina la vulnerabilidad;
- evidencia causal;
- impacto económico;
- fallo inyectado en un stage intermedio;
- comprobación de que FILTER no borra evidencia upstream.

### Nivel V3 — Canarios por lenguaje

Cada uno de los ocho lenguajes aporta:

- un canario positivo mínimo;
- un control negativo emparejado;
- build reproducible;
- trace o evidencia equivalente;
- binding fuente/IR/runtime;
- candidate;
- prueba de impacto;
- decisión de VALIDATE;
- decisión de FILTER;
- persistencia completa.

La puerta exige 16/16 resultados terminales correctos. Un target perdido,
saltado o convertido en `unknown` no es un pass.

### Nivel V4 — Interoperabilidad y equivalencia

- implementaciones equivalentes en varios lenguajes;
- ABI/FFI/RPC/callback/serialización;
- propagación de identidad y unidades;
- orden temporal;
- redondeo entre fronteras;
- fallos parciales;
- reintentos e idempotencia;
- conservación económica de extremo a extremo.

### Nivel V5 — Regresión conocida

Usa únicamente material cuya respuesta es conocida por los mantenedores.
Sirve para evitar retrocesos y medir cobertura declarada, no para afirmar
generalización.

El inventario inicial a normalizar contiene:

- benchmarks `v1`: 24 targets;
- benchmarks `v2` a `v8`: 20 targets por versión;
- labs: 90 targets;
- total inicial: 254 targets;
- findings declarados en el inventario actual: 630.

Estos números son denominadores de partida, no resultados garantizados. La
tarea de medición debe reconstruirlos desde manifests, detectar duplicados,
clasificar scoreabilidad y publicar la razón de cada exclusión. Una exclusión
posterior a ver resultados invalida la campaña.

### Nivel V6 — Generalización ciega sellada

Usa `H-GEN-A` y una réplica independiente `H-GEN-B`, dos holdouts
representativos cuyos manifests, identidades y oracles son inaccesibles al
maintainer y al scanner. Sólo el código fuente necesario se monta dentro de la
VM con IDs opacos. Miden capacidad sobre familias conocidas sin permitir
conocimiento del caso concreto ni retuning entre ceremonias.

### Nivel V7 — Novedad causal sellada

Usa `H-NOVEL-A` y `H-NOVEL-B`, dos cohortes comprometidas antes de ejecutar
ninguna, cuyas raíces causales no están expresadas en firmas, fixtures,
prompts, reglas, taxonomías operativas ni ejemplos accesibles.

### Nivel V8 — Confirmación en objetivo autorizado

Ejecuta detección, sin explotación, sobre código autorizado y no incorporado al
desarrollo. La salida se congela antes de cualquier investigación asistida por
oracle. Un revisor independiente determina si existe una ruta causal y un
impacto económico defendibles.

## 5. Separación del corpus

### 5.1 Conjuntos

| Conjunto | Accesible al desarrollo | Ground truth accesible al scanner | Uso |
|---|---:|---:|---|
| `TRAIN` | Sí | Sí | Desarrollo, reglas, fixtures |
| `DEV` | Sí | Sí tras cada ejecución | Ajuste y diagnóstico |
| `KNOWN` | Sí | Sí | Regresión |
| `H-GEN-A` | No durante el ciclo de release | No | Generalización primaria |
| `H-GEN-B` | No durante el ciclo de release | No | Réplica sin retuning |
| `H-NOVEL-A` | No | No | Novedad causal primaria |
| `H-NOVEL-B` | No | No | Réplica causal independiente |
| `LIVE-AUTH` | No antes del freeze | No | Preparación para bounty |

### 5.2 Disjunción obligatoria

La separación se comprueba por:

- hash exacto;
- similitud de AST/IR;
- historial Git y forks;
- autor y repositorio de origen;
- protocolo y familia;
- plantilla o lab progenitor;
- descripción de vulnerabilidad;
- raíz causal;
- parche;
- nombres y literales distintivos;
- fecha de disponibilidad;
- embeddings usados solo por el custodio para detectar contaminación;
- dependencia compartida que contenga la misma lógica vulnerable.

Una copia renombrada, un fork, un parche cosmético o una traducción entre
lenguajes pertenecen al mismo linaje.

### 5.3 Registro de contaminación

Toda colisión se registra en `contamination-ledger.jsonl`; cada línea es un
record `schema_version=solguard-contamination-event.v1` firmado, no un schema
implícito derivado del nombre del fichero. Incluye:

- identidades enfrentadas;
- método de detección;
- similitud;
- decisión;
- responsable;
- firma;
- efecto sobre denominadores.

No se elimina silenciosamente un caso contaminado. Se mantiene en el ledger y
se crea un reemplazo antes de sellar el denominador.

El campaign manifest fija `contamination_root_at_freeze`, root de la cadena de
eventos existente y timestamped antes del scan. Las búsquedas post-reveal no lo
reemplazan: agregan eventos encadenados/superseding y producen
`post_reveal_contamination_root` dentro de metric provenance, report y dossier.
Cada evento preserva predecessor, identidad/linaje, método, decisión, reason,
firma y efecto métrico.

Una colisión descubierta después del seal no permite reemplazar o excluir el
target/truth: permanece en `all_committed` y en el denominador
`predeclared_scoreable` original, no obtiene crédito blind/novel y puede causar
`insufficient_evidence`, fail del scope o invalidación conforme a la regla
pre-registrada. La vista post-reveal de scoreability y el change reason se
publican aparte, pero nunca reescriben denominadores. Missing chain, root
rollback, evento borrado o cambio favorable post-resultado falla cerrado.

### 5.4 Superficie visible y niveles de ceguera

El commitment público del holdout contiene sólo:

- policy y schema;
- conteos y estratos agregados;
- Merkle root;
- digest del ciphertext;
- claves públicas y timestamp independiente.

No publica IDs, URLs, commits, nombres de repositorios ni fingerprints. El
custodio entrega directamente a la VM un bundle privado con IDs opacos. El
maintainer no ve su manifest.

La superficie entregada al scanner excluye siempre:

- `.git` e historial;
- issues, advisories, reports y soluciones;
- patches y diffs posteriores;
- etiquetas, nombres de vulnerabilidad y ground truth;
- fixtures o tests que revelen el oracle;
- metadata de bounty no necesaria para compilar.

Un test o fixture de producción sólo se incluye si se pre-registra como
non-oracular; de lo contrario se retira del bundle. Toda inclusión se enumera
por clase y hash.

Cada campaña publica un vector de propiedades; no se sustituyen entre sí:

| Nivel | Demostración |
|---|---|
| `runtime_oracle_blind` | Oracle ausente durante ejecución |
| `developer_blind` | Maintainer y scanner operator nunca vieron targets/labels |
| `model_temporal_blind` | Material privado, embargado o posterior al cutoff del modelo congelado |
| `model_pretraining_unknown` | No puede demostrarse si el modelo conocía el material o una causa equivalente |
| `self_administered_isolated_evaluation` | Aislamiento técnico sin independencia humana |

`sealed_blind_generalization` exige al menos `runtime_oracle_blind` y
`developer_blind`. La novedad fuerte exige además `model_temporal_blind` con
evidencia verificable. No se puede demostrar que una causa pública pre-cutoff
esté ausente de los pesos latentes de un LLM; en ese caso se publica
`model_pretraining_unknown` como riesgo residual y la novedad se limita al
inventario Solguard congelado. `self_administered_isolated_evaluation` degrada
los claims humanos aunque el sandbox pase.

## 6. Tamaño y composición mínimos del holdout

Un conjunto pequeño puede servir para depurar la ceremonia, pero no para cerrar
el programa.

### 6.1 Suelo operativo

Una primera ceremonia sellada es interpretable solo si incluye, como mínimo:

- 48 targets;
- los ocho lenguajes;
- ocho familias de protocolo;
- doce familias de vulnerabilidad;
- 64 findings scoreables;
- 16 controles negativos;
- ningún linaje con más del 20 % del total.

Superar este suelo no basta para certificar producto.

### 6.2 Puerta estadística de producto

Cada una de las campañas finales `H-GEN-A` y `H-GEN-B` debe incluir, como
mínimo:

- ocho familias de protocolo;
- doce familias de vulnerabilidad;
- positivos fáciles, medios y profundos;
- controles cercanos que compartan estructura pero no la causa;
- targets monolingües y políglotas.

El número de targets, truth items, findings adjudicables y controles de **cada
uno de los 30 scopes × cada cohort** se deriva antes del sellado mediante power
analysis pre-registrado sobre los endpoints, alpha allocation y análisis
exactos. El agregado por lenguaje es secundario y nunca sustituye un scope. No
se usan 8 controles por lenguaje como evidencia experta.

Como suelo ilustrativo previo a multiplicidad, con cero falsos un intervalo
binomial exacto unilateral 95 % necesita al menos 59 controles independientes
por scope/cohort para situar el upper bound en 5 % o menos; si se pre-registra
bilateral 95 %, el suelo es 72. Sólo el caso unilateral sin corrección ya
representa `30 × 2 × 59 = 3.540` observaciones scope-control. Una corrección
Bonferroni ilustrativa para 60 tests lleva el best case de cero falsos a 139 por
scope/cohort, `8.340` observaciones. Clustering, linaje compartido, no-response
y otros endpoints sólo pueden aumentar `N`; una misma raíz/target no se
fragmenta para inflar `n_eff`.

Para precisión observada alrededor del 90–91 %, un Wilson lower bound unilateral
de 80 % requiere aproximadamente 42 subjects por scope/cohort sin corrección y
alrededor de 133 bajo una corrección 60-way ilustrativa. Estos números no
reemplazan el cálculo firmado: el harness debe regenerarlos con el método,
alpha, dependencia y estimand definitivos.

El power analysis fija y publica:

- estimand;
- efecto mínimo;
- potencia mínima del 80 % para el efecto mínimo predeclarado;
- alpha global y por endpoint/scope/cohort;
- método unilateral o bilateral;
- clusters y dependencia;
- `n_eff`;
- tasa esperada;
- no-response;
- inflación por multiplicidad.

El cálculo produce el `N` nominal y el `n_eff` mínimo de cada endpoint, scope y
cohort. Ambos, junto con el código de cálculo y sus inputs, se firman antes de
seleccionar o escanear. El tamaño nunca se reduce para hacer pasar una métrica,
ni se aumenta después de mirar resultados salvo bajo una regla secuencial
pre-registrada que preserve alpha y que ya forme parte del harness congelado.

Si no existe muestra suficiente para un scope, ese scope no alcanza C5 y
`full_eight_language` falla. El inventario actual de ~220 protocolos y 90 labs
no se presume suficiente y, si ya fue observado o usado para desarrollo, sólo
sirve para TRAIN/DEV/KNOWN. Para el claim completo hay tres opciones honestas:
ampliar sustancialmente corpus/holdouts independientes, pre-registrar un
`partial_scope` más pequeño con claims limitados, o publicar una release piloto
sin C5/full-product. Relajar gates, reciclar known como blind o reducir scopes
después de ver resultados está prohibido.

### 6.3 Población y muestreo

Antes de seleccionar targets se congela:

- población bounty elegible;
- sampling frame;
- scopes de lenguaje y ecosistema;
- criterios de inclusión/exclusión;
- estratos y pesos;
- seed de selección;
- probabilidad de selección;
- política de no-response;
- unidad de cluster;
- stopping rule.

Si los casos se seleccionan manualmente, el resultado se describe como
rendimiento sobre un `sealed challenge set`, no como estimación representativa
del universo bounty.

## 7. Autoridades y custodia

Los roles son lógicos, pero la independencia fuerte también es humana.
Para `sealed_blind_generalization`, el product maintainer/scanner operator y el
holdout custodian deben ser personas distintas; el adjudicador final también
debe ser independiente del maintainer. Separar GPTs, claves, worktrees o VMs no
borra memoria humana.

Si una sola persona opera varios roles, la campaña se etiqueta
`self_administered_isolated_evaluation`. Puede probar aislamiento técnico, pero
no puede sostener el claim `sealed_blind_generalization`.

| Rol | Puede ver | No puede ver | Firma |
|---|---|---|---|
| Product maintainer | Código, TRAIN, DEV, KNOWN | H-GEN/H-NOVEL y sus targets/etiquetas | Build candidate |
| Measurement authority | Manifests públicos y protocolo | Ground truth sellado | Campaign manifest |
| Holdout custodian | Targets y ground truth | Estado interno del scanner durante el scan | Holdout root |
| Isolation attestor | VM, OCI, CAS, telemetría | Ground truth semántico | Isolation report |
| Scanner operator | Imagen y bundle de fuentes con IDs opacos | Manifest privado, oracle, etiquetas y claves de reveal | Run root |
| Evaluator | Salida congelada y ground truth tras reveal | Capacidad de modificar salida | Evaluation root |
| Adjudicators | Paquetes de evidencia y product envelopes inmutables | Identidad del autor cuando sea posible | `solguard-adjudication-review.v1` y adjudication root |
| Release approver | Dossier completo | Ningún bypass | Release decision |

Requisitos:

- claves distintas por rol;
- logs de uso de claves;
- ninguna clave privada dentro de la imagen;
- ningún prompt o mensaje lateral con etiquetas;
- tareas GPT independientes para implementación y verificación;
- worktrees o clones separados cuando un agente actúe con otro rol;
- el verificador no acepta afirmaciones sin abrir el artefacto firmado;
- role-to-public-key mappings se fijan antes de la campaña;
- rotación y revocación de claves están documentadas;
- las claves privadas de custodia, timestamp, evaluación y aprobación están
  fuera de la imagen, del host de scan y de las cuentas del maintainer;
- commitments se anclan antes del scan en un transparency log o autoridad de
  timestamp externa, con receipt verificable incluido en el dossier;
- un timestamp local, una firma autofirmada sin anclaje externo o la hora del
  filesystem no prueban precedencia.

### 7.1 Receipt externo de precedencia

Toda afirmación temporal del programa usa
`solguard-external-timestamp-receipt.v1`; una URL, un log de consola o una fecha
sin prueba criptográfica no son evidencia. El record base cerrado contiene:

```text
schema_version = "solguard-external-timestamp-receipt.v1"
receipt_id
receipt_kind = rfc3161 | transparency_log
subject_role
subject_artifact_id
subject_digest_algorithm = "sha256"
subject_digest
authority_id
trust_policy_id
trust_policy_root
authority_key_id
authority_signature_algorithm
issued_at
validity_status_snapshot_ref
validity_status_snapshot_content_digest
validity_status_snapshot_root
receipt_payload
signatures[]
external_timestamp_receipts[] = FORBIDDEN
self_hash
```

`subject_digest` es exactamente el SHA-256 de los bytes autoritativos ya
canonizados por su propio contrato; no se vuelve a serializar el objeto para el
timestamp. `subject_role`, artifact ID y digest forman un binding indivisible.
Los authority IDs, trust roots, policy OIDs, log IDs, public keys, algoritmos,
ventanas de validez, fuentes de revocación y checkpoints base permitidos quedan
congelados en el `governance_evidence_bom` antes de la campaña.

`receipt_payload` es una discriminated union:

```text
rfc3161:
  message_imprint_algorithm = "sha256"
  message_imprint
  request_nonce
  tsa_policy_oid
  response_status = "granted"
  serial_number
  gen_time
  timestamp_token_ref
  timestamp_token_content_digest
  signer_certificate_fingerprint_sha256
  certificate_chain_ref
  certificate_chain_content_digest
  certificate_chain_root

transparency_log:
  log_id
  log_protocol_id
  log_protocol_version
  log_specification_ref
  log_specification_content_digest
  entry_uuid
  submitted_leaf_ref
  submitted_leaf_content_digest
  canonical_log_entry_ref
  canonical_log_entry_content_digest
  leaf_hash_algorithm
  leaf_hash
  leaf_index
  inclusion_tree_size
  inclusion_path[]
  signed_checkpoint_ref
  signed_checkpoint_content_digest
  signed_checkpoint_root
  checkpoint_tree_size
  checkpoint_timestamp
  checkpoint_key_id
  checkpoint_signature
  pinned_checkpoint_ref
  pinned_checkpoint_content_digest
  pinned_checkpoint_root
  pinned_checkpoint_tree_size
  consistency_path[]
```

En RFC 3161, `message_imprint == subject_digest`, el nonce debe coincidir con la
petición conservada y token, policy, cadena, estado, firma y `genTime` se
verifican offline contra el trust policy congelado. En transparency log, la leaf
tipada incluye subject role/artifact/digest; inclusion proof llega al checkpoint
firmado y consistency proof enlaza ese checkpoint con el checkpoint fijado
prefreeze. El protocolo/spec digest congelado define de forma única canonical
entry, leaf preimage, prefix/domain, node hashing y proof order; el verifier
recomputa todos los digests desde los bytes conservados. `issued_at` debe ser
exactamente el `genTime` autenticado o el checkpoint timestamp autenticado del
branch, no un reloj del productor. La firma del checkpoint y la identidad del
log se verifican contra el BOM; una consulta HTTP exitosa no basta.

Todo artefacto cuya precedencia abra o cierre una frontera de autoridad
—freeze, cohort/truth/policy commitment, output seal, reveal, decisión, DSSE,
ausencia/creación de tags y promoción— exige quorum `2-of-2` con autoridades
independientes: exactamente un receipt RFC 3161 y uno de transparency log sobre
el mismo subject digest. Autoridad, operador y productor no pueden ser la misma
identidad ni compartir key. Para telemetría no decisiva puede declararse
`timestamp_quorum=1`, pero nunca se usa después para probar una frontera.

Digest/role equivocado, nonce replay, serial duplicado para otro subject,
`genTime` fuera de ventana, key/certificado revocado o desconocido, policy/log
no allowlisted, checkpoint stale, inclusion/consistency inválida, split view,
quorum incompleto o dos receipts controlados por la misma autoridad fallan
cerrado. Los bytes de token, certificados, checkpoints y proofs se conservan
create-only en el dossier, de modo que la verificación no dependa de que el
servicio externo siga disponible.

## 8. Entorno ciego

### 8.1 Capas

La ejecución final usa tres capas:

1. **VM restaurada desde snapshot firmado.**
2. **Imagen OCI fijada por digest.**
3. **Content Addressed Store de solo lectura.**

La VM impide que una configuración defectuosa del contenedor exponga el host.
La imagen fija runtimes y dependencias. El CAS fija cada entrada y salida por
hash.

### 8.2 Restricciones del scanner

- usuario no privilegiado;
- root filesystem de solo lectura;
- capacidades Linux eliminadas;
- seccomp/AppArmor o control equivalente;
- límites de CPU, memoria, disco, PIDs y tiempo;
- sin red ni DNS;
- sin shared folders;
- sin clipboard;
- reloj y locale declarados;
- entropía/seed declarados cuando aplique;
- fuentes, binarios y configuración montados de solo lectura;
- base de datos nueva y vacía;
- cachés vacías o declaradas en el manifest;
- directorio de salida nuevo;
- ground truth físicamente ausente;
- modelos y prompts fijados por hash;
- telemetría local firmada;
- destrucción de la VM de scan antes del reveal.

### 8.3 Pruebas de capacidad negativa

Antes del scan se colocan sentinels secretos fuera del alcance declarado y un
probe, ejecutado bajo exactamente el mismo sandbox, intenta alcanzarlos. La
ceremonia debe probar que:

- cada intento esperado queda **observable** en la traza de syscalls o en una
  attestation equivalente, con operación, path/inode opaco, resultado y errno;
- todo `open`/`openat`, `read`/`pread` y `mmap` contra el sentinel es denegado:
  no existe ningún descriptor, lectura o mapeo exitoso;
- ningún byte, fragmento, hash derivado o metadata secreta del sentinel aparece
  en stdout, stderr, logs, artefactos, base de datos, cachés o prompts;
- rutas alternativas, symlinks, `/proc`, file descriptors heredados, helpers y
  volúmenes laterales reciben el mismo resultado denegado;
- la red está realmente bloqueada;
- una resolución DNS sintética falla;
- no existe credential helper;
- no hay procesos persistentes de campañas anteriores.

La ausencia de eventos no es un pass: demuestra que el probe no se ejecutó o
que falta observabilidad. Cualquier apertura, lectura o mapeo exitoso, o
cualquier byte filtrado, invalida la campaña aunque el resultado técnico sea
bueno. Los intentos denegados esperados se registran como evidencia positiva de
aislamiento, no como «cero intentos».

## 9. Ceremonia sellada

### 9.1 Preparación

1. Crear un release candidate inmutable y congelar el código, configuración,
   modelos, prompts, reglas, thresholds y feature flags del scanner.
2. Congelar el harness de medición: selección, scoreability, taxonomía,
   schemas, matching, rúbrica de materialidad/severidad, queries, estadística y
   generador del dossier.
3. Resolver y firmar los tres BOM/closures desde commits limpios; construir,
   generar SBOM/provenance y firmar la imagen OCI.
4. Pre-registrar claims solicitados, perfiles de alcance, endpoints,
   denominadores `all_committed` y `predeclared_scoreable`, alpha, potencia,
   `N`/`n_eff`, umbrales, retries, stopping rule, política de adjudicación,
   `materiality_profile_root`,
   `policy_commitment_scheme=solguard-policy-set-commitment.v1` y
   `policy_set_commitment_root` hiding por cohort.
5. Construir el commitment público opaco y el manifest privado custodiado de
   cada cohort; el público no contiene IDs, URLs, commits ni fingerprints.
6. Comprometer `H-GEN-A` y `H-GEN-B` antes de escanear cualquiera; para una
   campaña novel, hacer lo mismo con `H-NOVEL-A` y `H-NOVEL-B`.
7. Comprobar disjunción, linaje y contaminación sin revelar el manifest privado
   al maintainer ni al scanner operator.
8. Publicar roots, digest del ciphertext y receipts de timestamp externo tanto
   del candidate como del harness y de todas las cohorts.
9. Crear fuera de los repositorios de producto una base y un evidence store
   nuevos, append-only y sin artefactos de campañas anteriores.
10. Restaurar snapshot limpio y ejecutar las pruebas de capacidad negativa.

Cada operación usa una instancia firmada de
`solguard-campaign-manifest.v1`, no parámetros sueltos. La instancia liga
`campaign_id/kind`, `pair_id`, cohort, paired commitment, release candidate,
el `CandidateEpochBinding` exacto de `01` §4.2.1,
los tres BOM, harness, todos los `scope_ids`, `scope_manifest_roots` y
candidate roots C0-C4 aplicables, commitments de corpus/truth/contaminación,
`contamination_root_at_freeze`, `truth_mode`, sampling frame, power analysis, perfil métrico, políticas de
matching/adjudicación, `materiality_profile_root`,
`policy_commitment_scheme`, `policy_set_commitment_root`, intentos, presupuesto,
stopping rule, `resource_profile_id/version/root`, los ceilings numéricos y vistas
separadas de custodio/operador. A/B deben coincidir byte a byte en los roots
comunes salvo sus policy-set commitments; son disjuntas en corpus/truth y
policies target-specific. La ausencia o discordancia de un solo
binding invalida la campaña antes del scan; compartir sólo un número de versión
nunca demuestra que dos ejecuciones usaron el mismo scope o candidate.

Cada intento materializa `solguard-run-spec.v1` con el mismo
CandidateEpochBinding, `run_input_membership_root/count`, campaign/cohort/pair,
ablation profile, source root, scope roots, scanner/harness/BOM, seed,
budgets/stopping rule, model/prompt/rule roots, output/cache namespaces y
resource profile. RunSpec, campaign, pair common binding, ArtifactEnvelope,
ProofCertificate, Finding/ReviewEnvelope, metric provenance, report y dossier
repiten esos bindings byte-exact. Tooling membership, candidate accepted input
y run input son sets distintos; sustituir uno por otro, variar resource profile
o compartir cache/output entre perfiles invalida todas las mediciones afectadas.

Si `campaign_kind=LIVE_AUTH`, la misma instancia contiene el
`live_authorization` exacto de `01` §13.2: artifact ref/content digest/root,
issuer/key/signature, sujeto, target+revision+program set, ventana,
allowed-actions/probes, rate/resource limits, prohibiciones y status/revocation
snapshot. El campo se omite en no-LIVE. Cada intento registra otro status
snapshot y trusted timestamp antes de iniciar; no se reutiliza un check global.

La vista de operador/scanner sólo contiene el materiality profile genérico y el
commitment opaco común a la cohort. El manifest privado del custodio contiene
las policies/mappings cifradas y salts necesarios para abrir después cada hoja;
IDs, URLs, policy roots, membership proofs, categorías y thresholds
target-specific no llegan a la imagen, host, logs ni prompts del scanner.

El commitment usa **exactamente** el algoritmo normativo de
`01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md` §4.2: leaf JCS domain-separated,
salt CSPRNG único de 32 bytes revelado dentro de la policy-leaf entry, sort
bytewise por target/revision, padding determinista hasta potencia de dos,
node hash con nivel/lado y root ligado a campaign/cohort/count/height. El
manifest privado conserva bytes, salts, índices, entropy receipt y proofs; el
público expone sólo scheme/root/count permitido y timestamp. Empty set, salt
corto/reutilizado, sort/padding distinto, proof incompleto, leaf/root swap o
reutilización cross-campaign/cohort invalida antes de evaluar materialidad.

H-GEN/H-NOVEL/KNOWN usan `truth_mode=precommitted_private` y un truth root
privado no vacío timestamped antes del scan. LIVE usa
`truth_mode=empty_live_oracle` y el root canónico del conjunto vacío. Un finding
LIVE confirmado se adjudica con match/truth refs nulos y se añade al ledger de
novedad/confirmación; jamás se inserta retroactivamente en el oracle de LIVE.

La campaña es una operación de medición externa al producto. Specs privados,
targets, truth, logs, outputs, adjudication reviews, métricas, ledger y dossier
no se
commitean en repositorios del scanner ni se incorporan a una build posterior.
El producto sólo emite artefactos oracle-free hacia el evidence store; nunca
lee de él durante el scan.

### 9.2 Scan one-shot

1. Verificar firmas, los tres BOM roots, candidate root, harness root y receipts
   externos anteriores al scan.
2. El custodio monta directamente en la VM el bundle privado de fuentes con IDs
   opacos y sólo las entradas runtime allowlisted; no entrega manifest, labels,
   truth ni claves de reveal al operador o al scanner.
3. Ejecutar cada target comprometido conforme al número de intentos, retries y
   stopping rule ya firmados. Un retry permitido es un intento nuevo visible,
   nunca un reemplazo del intento fallido.
4. Registrar todos los intentos y todo target comprometido, incluidos cero
   findings, crash, timeout, OOM, fallo de source/preflight y presupuesto
   agotado.
5. Cerrar cada stage con estado terminal y sellar run roots, base de datos,
   telemetría, logs y artefactos en el evidence store externo.
6. Firmar y anclar externamente cada output root antes de abandonar la VM.
7. Ejecutar las dos cohorts emparejadas con el mismo candidate y harness.
8. Destruir cada entorno de scan sin abrir ground truth.

En H-GEN y H-NOVEL, las salidas completas de A **y** B deben estar congeladas,
firmadas y timestamped antes de revelar cualquiera. No existe un reveal de A
que permita decidir, reparar, reordenar o afinar el scan de B.

No se permite:

- reintentar fuera de la política pre-registrada o ocultar un intento;
- cambiar thresholds;
- añadir reglas;
- cambiar código, harness, modelo, prompts, dependencias o build;
- reordenar findings manualmente;
- inspeccionar etiquetas;
- excluir targets tras ver resultados;
- completar artefactos a mano;
- convertir fallos en `skipped`.

### 9.3 Reveal y evaluación

1. Verificar que los roots privados revelados coinciden con todos los
   commitments públicos y que, en campañas A/B, ambos output receipts preceden
   al primer reveal.
2. Abrir manifests y ground truth en un entorno distinto e inaccesible al
   scanner destruido.
3. Verificar que outputs, intentos y denominadores siguen inmutables.
4. Ejecutar el matching automático pre-registrado.
5. Crear paquetes para todos los `FindingEnvelope` de `Pass`, todos los
   `ReviewEnvelope` y todo top-10 no resuelto, además de candidatos novel no
   presentes en el oracle.
6. Obtener adjudicación terminal del 100 % del universo exigido sin modificar
   el finding original; pendientes, `unverifiable` y `needs_context` son no-TP.
7. Firmar decisiones y calcular métricas desde ambos denominadores congelados.
8. Generar intervalos simultáneos y reconciliar point estimates, `N` y `n_eff`.
9. Registrar el resultado en el ledger de aceptación externo.
10. Publicar el dossier completo, incluidos todos los intentos, fallos,
    exclusiones, outputs nulos y decisiones adversas.

## 10. Unidad de matching

Un `FindingEnvelope` solo cubre un elemento de ground truth si coincide en:

- target y revisión;
- componente afectado;
- raíz causal;
- condición de activación;
- flujo económico;
- activo y unidad;
- actor;
- estado previo relevante;
- consecuencia;
- severidad material;
- evidencia ejecutable o reproducible.

La misma línea de código puede alojar causas distintas. Dos líneas distintas
pueden representar la misma causa. El matching por archivo/línea, título,
keyword o embedding sirve para proponer pares, nunca para decidirlos.

El crédito de recall usa una asignación bipartita determinista entre
`PublishedFinding` canónicos y truth items comprometidos. Por defecto, cada
finding y cada truth item tienen capacidad uno. Los pares admisibles son
únicamente los que recibieron adjudicación terminal `true_positive`; el
algoritmo, pesos y orden de desempate se predeclaran y firman antes del scan.
No existen excepciones de capacidad para métricas estrictas. Un finding con aristas válidas hacia
varios truth items sólo aporta crédito a uno; las demás aristas se publican,
pero no incrementan recall. Del mismo modo, varios findings contra un truth
item no multiplican el numerador.

El corpus no puede dividir una sola raíz causal en varios truth items
scoreables para inflar el denominador o el éxito. Esos items se agrupan bajo un
`truth_cluster_id` antes del freeze y el cluster tiene capacidad uno. Una
raíz que contiene varias consecuencias sigue siendo una unidad de scoring. Si
existen causas realmente independientes, cada una requiere truth cluster y
finding canónico distintos; nunca se concede capacidad mayor que uno a un
finding o cluster.

Cada match produce:

```json
{
  "schema_version": "solguard-match-decision.v1",
  "match_decision_id": "match:...",
  "finding_id": "sgf:...",
  "truth_id": "truth:...",
  "target_revision": "sha256:...",
  "root_cause_match": true,
  "economic_path_match": true,
  "impact_match": true,
  "evidence_supported": true,
  "matcher_proposal": "candidate_match|candidate_no_match|needs_review",
  "proposal_signature": "..."
}
```

La decisión humana o arbitral se registra por separado y nunca muta el match:

```json
{
  "schema_version": "solguard-adjudication-review.v1",
  "adjudication_review_id": "review:...",
  "subject_kind": "finding_envelope|review_envelope|top10_item",
  "subject_ref": "artifact-id:...",
  "match_decision_ref": "match:...|null",
  "truth_ref": "truth:...|null",
  "target_revision": "sha256:...",
  "target_policy_opening_ref": "artifact-id+json-pointer",
  "target_policy_opening_digest": "sha256:...",
  "materiality_assessment_ref": "artifact-id+json-pointer",
  "materiality_assessment_digest": "sha256:...",
  "reviewer_identity": "pseudonymous-signed-id",
  "verdict": "true_positive|false_positive|duplicate|unverifiable|needs_context",
  "reason_codes": [],
  "evidence_refs": [],
  "supersedes_review_id": null,
  "signed_payload_digest": "sha256:...",
  "decision_signature": "..."
}
```

`subject_kind + subject_ref` es una unión cerrada y exactamente una rama debe
resolver a un artefacto inmutable del product manifest. Para
`finding_envelope`, `subject_ref` apunta al FindingEnvelope; para
`review_envelope`, al ReviewEnvelope aunque no exista truth match; para
`top10_item`, al candidate/verdict artifact rankeado. `match_decision_ref` y
`truth_ref` son ambos obligatorios cuando se adjudica un par contra ground
truth y ambos nulos cuando se adjudica un sujeto fuera del oracle. No se
permite un match huérfano, truth sin match, subject cross-run/root ni reutilizar
una decisión para dos subjects.

En una campaign post-reveal, los cuatro campos de materiality son obligatorios.
La assessment resuelve al mismo subject/digest y a la policy opening del mismo
target/revision, campaign y cohort. Un subject no económico conserva assessment
con `program_severity=not_applicable` y outcome tipado, no null ni omisión.
Review liga entries/digests, no set roots globales; la assessment no contiene el
review digest. Missing ref/digest, cross-subject o cross-target falla cerrado.
Una corrección crea review+assessment nuevas y una nueva provenance/report; las
reviews no modificadas conservan sus digests.

La cobertura terminal se calcula por `subject_kind/subject_ref` sobre la unión
comprometida. Una corrección crea otro review con `supersedes_review_id`; sólo
la cabeza válida de la cadena cuenta y nunca se borra la historia.

Cada cadena queda particionada por
`campaign_id + cohort + subject_kind + subject_ref`, exige
`review_revision = previous + 1`, predecessor event monotónico y supersede
exactamente sobre la head vigente. Sólo puede existir un hijo válido por head.
Fork, stale predecessor, ciclo, gap o cross-campaign/cohort/subject invalida
provenance/report y deja el subject sin adjudicación terminal hasta un
`adjudication_arbitration_event` firmado por autoridad separada que referencia
todas las ramas y fija la nueva head. Ningún evaluator puede cherry-pickear una
rama; fixtures adversariales fuerzan fork simultáneo, replay y corrección
cruzada.

## 11. Política de adjudicación

### 11.1 Clasificaciones

- `true_positive`: causa, reachability e impacto demostrados;
- `false_positive`: la afirmación es falsa o no se sostiene;
- `duplicate`: misma causa ya contada para ese target;
- `unverifiable`: faltan datos para demostrarla;
- `needs_context`: requiere información externa no disponible en la campaña.

Para las métricas de release, `unverifiable` y `needs_context` no se cuentan
como true positives. Se publican y permanecen en el denominador de carga de
revisión.

### 11.2 Revisión

- el 100 % de la unión de todos los `FindingEnvelope` de `Pass`, todos los
  `ReviewEnvelope` y top-10 recibe una decisión terminal; el muestreo de casos
  para revisión no es válido para release;
- un revisor independiente evalúa todo el universo y dos revisores
  independientes evalúan cada TP propuesto, high/critical, candidato novel o
  caso discutido;
- identidad del productor oculta cuando sea viable;
- tercera revisión si no hay acuerdo;
- razón y evidencia obligatorias;
- acuerdo inter-reviewer publicado;
- cambios a la rúbrica requieren nueva campaña;
- ningún mantenedor puede reescribir el finding tras el reveal.

Un desacuerdo no resuelto termina como `unverifiable`, no como pendiente ni TP.
Si `adjudication_coverage` no es exactamente 100 %, la campaña falla cerrada.

### 11.3 Hallazgos no presentes en el oracle

Un finding no listado no se marca automáticamente como falso. Se evalúa como
candidato novel:

1. confirmar que fue emitido antes del reveal;
2. reconstruir causa y ruta económica;
3. verificar contra un control seguro;
4. buscar duplicados públicos con fecha anterior al freeze;
5. determinar contaminación;
6. adjudicar;
7. añadirlo al ledger de novedades, no al oracle original.

## 12. Métricas canónicas

Todas las métricas se calculan desde IDs y artefactos, nunca desde resúmenes
manuales.

### 12.1 Integridad

```text
target_closure = targets_con_estado_terminal / targets_comprometidos
stage_closure = stages_con_estado_terminal / stages_esperados
artifact_closure = artefactos_requeridos_presentes_y_validos / artefactos_requeridos
successful_target_completion =
  targets_con_todas_las_fases_obligatorias_complete / targets_comprometidos
```

Un crash, timeout u OOM es un resultado terminal fallido y permanece en el
denominador. Por eso `target_closure=100 %` no implica operación correcta:
`successful_target_completion` se publica globalmente y por cohort, scope,
estrato positivo y estrato de control. Source/preflight failure, crash, timeout,
OOM, cancel no autorizado o budget exhaustion nunca se interpreta como rechazo
seguro ni true negative.

### 12.2 Detección

Un match sólo cuenta si la salida satisface la definición canónica completa:
`VALIDATE Supported + FILTER Pass + publication_eligibility == eligible +
presentation_role IN {unique, representative} + ProofCertificate complete`.

```text
all_committed_strict_recall =
  truth_items_con_finding_canónico / all_committed_truth

predeclared_scoreable_strict_recall =
  truth_items_scoreables_con_finding_canónico / predeclared_scoreable_truth

strict_precision =
  published_findings_true_positive / todos_los_published_findings

raw_pass_support_precision =
  (pass_envelopes_no_duplicate_adjudicados_true_positive
   + pass_envelopes_duplicate_cuyo_child_fue_adjudicado_duplicate_del_parent
     canónico_true_positive_de_la_misma_causa)
  / todos_los_pass_envelopes

presented_actionable_precision =
  subjects_pass_o_review_confirmados_true_positive_y_materiales
  / unión_anti_dedupe_de_todos_los_pass_envelopes_y_review_envelopes

publication_suppression_rate =
  pass_envelopes_no_publicados / todos_los_pass_envelopes

non_duplicate_suppression_rate =
  pass_envelopes_ineligible_con_role_no_duplicate
  / todos_los_pass_envelopes_con_role_no_duplicate

macro_recall =
  media_ponderada_predeclarada_del_recall_por_target_o_cluster

positive_target_hit_rate_at_10 =
  targets_positivos_con_truth_confirmado_en_top_10 / targets_positivos

finding_recall_at_10 =
  truth_items_con_finding_canónico_rank_menor_igual_10 / truth_items_comprometidos

negative_target_false_alert_rate =
  controles_con_al_menos_un_finding_admitido_incorrecto / controles

negative_control_review_rate =
  controles_con_al_menos_un_review_envelope_no_true_positive_y_material / controles

conservative_negative_control_failure_rate =
  controles_con_pass_incorrecto_o_review_no_tp_material_o_non_completion
  / todos_los_controles_comprometidos

adjudication_coverage =
  unión_todos_los_pass_envelopes_review_top10_con_decisión_terminal
  / unión_todos_los_pass_envelopes_review_top10_total
```

`strict_precision` mide exclusivamente la proyección `PublishedFinding`; nunca
usa todos los `Pass` como denominador implícito. `unverifiable`,
`needs_context` y pendientes entre findings publicados cuentan como no
true-positive; un pendiente además hace fallar la cobertura. Todos los
`FindingEnvelope` de `Pass`, incluidos `ineligible` y `duplicate`, se adjudican
también: un Pass falso o no verificable penaliza
`raw_pass_support_precision`, aunque quede suprimido. Un `duplicate` sólo
cuenta en el numerador raw si el **child** tiene adjudicación terminal
`duplicate` que confirma exactamente su `canonical_parent_id`, mismo target y
raíz causal, el parent tiene adjudicación terminal `true_positive` y la arista
de dedupe pasa integridad. Parent o child falso,
`unverifiable`, `needs_context`, ausente, circular o cross-cause convierte el
duplicate en no-TP. Cada Pass pertenece exactamente a una rama del numerador:
`presentation_role=duplicate` nunca puede contarse también en el término
no-duplicate. Se publican por separado
las tasas de supresión por razón, dedupe, `Review`, outcomes y carga; mover
ruido fuera de la proyección no puede mejorar silenciosamente el claim.
`presented_actionable_precision` cierra el sumidero Review: incluye exactamente
una vez todo Pass conforme a la misma lógica de child+parent anti-dedupe y todo
`ReviewEnvelope`; una edge de duplicate falsa, no adjudicada o desconocida deja
al child como sujeto separado penalizante. `false_positive`, `unverifiable` y
`needs_context` permanecen en su denominador. Un Review confirmado como TP
**y material** puede entrar en su numerador y excluirse del
`negative_control_review_rate`, pero nunca entra en recall ni en
`strict_precision`; un TP inmaterial sigue penalizando utilidad/control review.
Source/preflight failure posterior al sellado cuenta como miss en
`all_committed_truth`. Scoreability, lenguaje, familia y cluster se congelan
dentro del commitment privado antes del scan.

Toda tabla de recall publica lado a lado el numerador y denominador de
`all_committed_strict_recall` y `predeclared_scoreable_strict_recall`, tanto
globalmente como por lenguaje/scope. El segundo nunca reemplaza ni oculta el
primero. Cambiar scoreability o taxonomía después del freeze invalida la campaña;
la razón de cada item no scoreable se revela y audita igualmente.

Las familias son desglose secundario; la macro principal usa targets/clusters y
pesos de estrato predeclarados para impedir cambiar la granularidad post-hoc.
Se publican además micro-recall, FILTER-pass recall, reviewable recall y
upstream-supported recall sin confundirlos.

Un control es patched/near-miss respecto a una causa concreta, no «código sin
bugs». Un finding novel correcto en un control se adjudica antes de clasificarlo
como false alert y no permite borrar el control del denominador.

### 12.3 Utilidad

```text
review_burden = published_findings_más_review_envelopes_presentados_por_target
raw_pass_burden = todos_los_pass_envelopes_por_target
technical_inconclusive_burden =
  technical_verdicts_inconclusive_por_target
candidate_burden = candidatos_canónicos_totales_por_target
proof_debt_burden =
  candidatos_con_obligaciones_abiertas_o_deuda_por_target
filter_failure_burden =
  supported_sin_admission_terminal_por_fallo_filter_por_target
evidence_completion =
  published_findings_y_review_envelopes_con_paquete_requerido_completo
  / todos_los_published_findings_y_review_envelopes
actionable_rate = findings_confirmados_y_materiales / findings_presentados
```

`findings_presentados` incluye `PublishedFinding` y `ReviewEnvelope`.
`raw_pass_burden`, `publication_suppression_rate`, dedupe y razones de
ineligibilidad se publican al lado. Mover ruido de Pass a `ineligible` o
`duplicate` no mejora `raw_pass_support_precision`; moverlo a Review sí lo
sacaría matemáticamente de esa métrica y por eso queda penalizado por
`presented_actionable_precision`, `negative_control_review_rate` y review
burden.

Los cuatro burdens adicionales nunca se mezclan con review burden, pero tampoco
se ocultan: incluyen Inconclusive, candidatos no elevados, proof debt y
Supported cuyo FILTER no produjo Admission. Se publican mediana, P90, P95,
máximo, top-K y reason distribution por target/scope/origin. Mover objetos entre
tracks, no presentar una cola o fallar FILTER no mejora ninguna métrica.

### 12.4 Estabilidad

- conjunto admitido idéntico en replays deterministas;
- Jaccard de top-N;
- variación de ranking;
- variación de scores;
- variación de costes;
- cambios de decisión por stage;
- razón explícita para cualquier fuente no determinista.

### 12.5 Recursos

- CPU, memoria, disco y tiempo por target;
- número de llamadas a modelos;
- tokens y coste por finding confirmado;
- timeouts y OOM;
- distribución por lenguaje y tamaño;
- presupuesto excedido tratado como fallo visible.

Cada candidate epoch congela antes de scan un
`solguard-resource-profile.v1` distinto para RC-V/RC-FULL: hardware/runtime
class, p95 y máximo de wall time, peak RAM/disk, model calls/tokens/coste,
retries, throughput mínimo, concurrency y tasas máximas de timeout/schema/model
failure. Todos son valores numéricos, no «razonable» o «best effort».

Reports publican p50/P90/P95/max, total, successful completion y censored/
failed attempts contra esos ceilings. Model timeout debe ser inferior al 2 % y
schema/model failure inferior al 1 %; controles contractuales admiten cero
OOM/disk exhaustion/non-completion. Cualquier ceiling omitido, p95/max excedido,
throughput inferior, coste truncado o target fallido eliminado produce
`insufficient_evidence|failed`. El claim queda limitado al resource profile y
hardware medidos.

### 12.6 Protocolo estadístico

- endpoints primarios globales:
  `all_committed_strict_recall`, `strict_precision` y
  `negative_target_false_alert_rate`;
- jerarquía pre-registrada: gate global, después scopes/lenguajes;
- alpha global, allocation y procedimiento Holm/Bonferroni u otro método
  simultáneo fijados antes del scan;
- nivel de confianza y carácter unilateral/bilateral pre-registrados;
- target o linaje como unidad independiente, nunca cada línea o candidato;
- Wilson o intervalo binomial exacto para precision/false-alert, fijado antes
  del scan;
- bootstrap estratificado por target, lenguaje y scope para macro-recall;
- resampling por cluster cuando un target contiene varios truth items;
- denominador y número efectivo de clusters publicados;
- potencia mínima del 80 % frente al efecto mínimo predeclarado; el power
  analysis usa el mismo alpha, clustering y procedimiento de comparaciones
  múltiples que el gate final;
- script, versión, seed e inputs del power analysis quedan dentro del harness
  firmado antes del muestreo;
- point estimate, intervalo y distribución, no solo `pass/fail`;
- cero falsos positivos se acompaña de su límite superior, nunca de «FPR 0»
  sin incertidumbre;
- muestra insuficiente produce `insufficient_evidence`;
- no se cambia el método después de observar resultados ni se hace peeking u
  optional stopping salvo diseño secuencial pre-registrado que preserve alpha.

### 12.7 Materialidad y severidad económica

Todas las campañas consumen el `materiality_profile` canónico, genérico y no
identificante sellado dentro de `solguard-run-spec.v1`. Antes del scan fija ID,
versión/root, taxonomía de impacto, algoritmo de lower bound nativo,
unidades/conversión genéricas, uncertainty, horizonte, privilegio, capital,
timing, repeticiones, estado previo y demás prerrequisitos. No contiene programa,
policy snapshot, precio target-specific, categoría bounty ni threshold de
severidad.

Durante el scan, campaign/run/proof/finding conservan el mismo
`materiality_profile_root` y el `policy_set_commitment_root` hiding de su
cohort. El scanner produce impact class, amount/asset/native unit, uncertainty,
horizon y actor prerequisites; no produce `program_severity`. Cada cohort A/B y
LIVE tiene un policy-set commitment distinto, aunque comparten el algoritmo
genérico.

Sólo después de sellar todos los outputs y hacer reveal, el evaluator abre la
policy leaf target-specific, verifica `target_program_policy_root` y membership
proof contra el policy-set commitment, toma el price snapshot permitido y
deriva `program_severity`. Truth/adjudication, metric provenance, measurement
report y dossier conservan ambos roots y el proof; nunca mutan los bytes del
FindingEnvelope.

En una campaign multi-target, `TargetPolicyOpeningSet` contiene exactamente una
opening por target/revision comprometido, incluidos no-result/no-response, y
produce `target_policy_openings_root`. Cada opening conserva artifact
ref+content digest resoluble de la policy leaf, del snapshot completo y de la
mapping table, además de sus roots y membership proof. Por separado,
`FindingMaterialityAssessmentSet` contiene exactamente una assessment por cada
subject de la unión Pass + ReviewEnvelope + top-10: liga subject/digest,
opening/digest, lower-bound artifact/evidence refs+digests, price-snapshot
artifact ref+digest/root, mapping-table artifact ref+digest y threshold-rule
artifact ref+digest/ID y
program severity/outcome, y produce
`finding_materiality_assessments_root`. Un target puede tener cero o varios
subjects sin cambiar la cardinalidad del primer set.

Ambos sets son campos requeridos de `solguard-metric-provenance.v1`, no
top-level schemas adicionales. Report/dossier ligan ambos roots; cada
adjudication review liga su assessment. Los headers fijan campaign/cohort,
policy-set root, committed target set/count y committed adjudication subject
set/count; exactamente una entry por miembro, cero extras/duplicados. Así no se
pueden omitir targets sin resultado ni findings incómodos, reusar una apertura
en otra campaign o asignar una severidad singular imposible a todo un target.

Cada assessment tipa impact/lower-bound/price como
`proven|not_proven|not_applicable`; refs y valores existen sólo en la rama
`proven`, y las otras exigen reason/evidence refs+digests de ausencia. El
mapping repite byte-exact el artifact ref/digest de la opening; una regla
aplicada liga su ID, artifact ref y digest. Su outcome es
`material|non_material|unclassified|not_applicable`. `material` requiere cruzar
el `claim_materiality_threshold` pre-registrado con policy/mapping válidos. Para
`bounty_detection_ready` ese threshold es `high`: `medium`, unmapped,
unclassified o un threshold cambiado post-reveal no mejora
`presented_actionable_precision` ni `negative_control_review_rate`.

La severidad usa el lower bound conservador demostrado. No usa máximo teórico,
TVL, repetición ilimitada, precio futuro ni condición no probada. Mapping
ausente, price stale/no permitido, cross-asset incompatible, intervalo cuyo
límite inferior no cruza el threshold o policy drift produce `unclassified` o
la menor severidad demostrable. El report publica amount, asset, native unit,
conservative value, price source/snapshot/root, uncertainty, horizon,
prerequisites, rule ID y mapping status. Se rechazan delta mínimo rotulado
critical, upper-bound-only, root/policy swap, reclasificación post-evaluación y
dictionary/fingerprint/leak del commitment o sus hojas hacia el scanner.

Cada artifact ref es `artifact_id + JSON Pointer`, resuelto de forma
content-addressed mediante una entry del evidence store con la forma tipada de
`solguard-acceptance-dossier-manifest.v1`: artifact ID/role, media type,
`role_schema_digest`, `content_digest`, byte size y locator. URL/path/ID sin
bytes, role schema y digest no es evidencia. Todos los artifacts anteriores
son entries obligatorias del dossier antes de `FINAL-001`. `FINAL-003`
rederiva la materialidad desde esos bytes sellados. Missing ref, pointer
ambiguo, role/digest/root mismatch, swap entre target/revision/cohort/campaign
y snapshot/rule alterado fallan cerrado y no pueden contarse como `material`.

### 12.8 Origen y ablación

Todo report/provenance conserva por finding y agregado
`origin_classes[]`, `primary_origin_class`, `knowledge_taint`, roots de rule
pack/model/tool/retrieval y el profile de ablación. Los enums y perfiles
canónicos son los definidos en
`01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md#6-separación-de-motores-de-hipótesis`.

H-GEN/H-NOVEL ejecutan `semantic_core_only`, `generic_with_model`,
`rule_pack_only` y `full_without_retrieval` sobre el mismo candidate, cohort
commitment, seed, budget, stopping rule y evaluator, con cache/output roots
separados. `known_retrieval_control` sólo se ejecuta en KNOWN. El metric
provenance publica deltas pareados, intervals y primera etapa de pérdida por
scope/origen; omitir un perfil o cambiar su denominador produce
`insufficient_evidence`.

La cardinalidad es exacta: cuatro RunSpecs y cuatro outputs sellados por cada
`profile × target × cohort`; no basta ejecutar cuatro perfiles globales. El
evaluator verifica igualdad de inputs/budget/stopping/evaluator/resource
profile, separación de cache/output y ausencia de pooling entre profiles.
Missing/extra/retry no comprometido, cache cross-profile o un profile sin
terminal outcome produce non-pass.

`historical_retrieval` físicamente alcanzable invalida una campaign blind.
Para el claim de novedad sólo cuenta
`effective_knowledge_taint=open_world` con cero ancestor rule-pack,
historical-retrieval o TRAIN/DEV, probado por ancestor-set/join receipt.
`knowledge_taint=unknown` queda fuera del numerador. Esto es independiente de
`model_pretraining_unknown`, que limita el wording a novedad relativa a
Solguard. Ningún agregado permite decir «motor genérico» si sus ablaciones
fallan.

## 13. Puertas cuantitativas

Los siguientes umbrales son requisitos de cierre del plan, no promesas sobre el
estado actual.

### 13.1 Puerta de integridad

- `target_closure = 100 %`;
- `stage_closure = 100 %`;
- `artifact_closure = 100 %`;
- cero hashes inválidos;
- cero dependencias inesperadas;
- cero accesos exitosos a sentinels, con todos los intentos de probe denegados
  y observables y cero bytes filtrados;
- cero targets borrados del denominador;
- cero estados ambiguos.

### 13.2 Puerta de contrato

- 100 % de los contratos productor-consumidor obligatorios;
- 100 % de must-pass tests;
- cero bypasses silenciosos;
- cero escrituras legacy después del corte;
- migración, restore sobre entorno nuevo y recuperación forward-only ensayados
  desde copias; cero downgrade in-place.

### 13.3 Puerta canario

- 8/8 lenguajes ejecutados;
- 8/8 positivos detectados y soportados;
- 8/8 controles rechazados;
- persistencia completa;
- causalidad y unidades conservadas;
- cero crash, timeout u OOM.

### 13.4 Puerta de regresión conocida

- 100 % del inventario comprometido ejecutado;
- 100 % de must-pass truth items adjudicados preservados;
- ningún high/critical canónico, independently adjudicated y normalizado al
  contrato nuevo perdido;
- un `Supported` histórico que no cumple TRUTH-101 se registra como corrección
  de falso positivo, no como regresión;
- cero findings high/critical admitidos en controles seguros;
- toda variación frente al baseline firmada y explicada;
- mejora de métrica no acompañada de aumento oculto del review burden.

### 13.5 Puerta ciega H-GEN

Para cada lenguaje y scope candidato al perfil experto precongelado:

- `strict_precision` puntual igual o superior al 90 %;
- límite inferior de confianza de precisión igual o superior al 80 %;
- `raw_pass_support_precision` puntual igual o superior al 90 % y límite
  inferior de confianza igual o superior al 80 %;
- `presented_actionable_precision` puntual igual o superior al 90 % y límite
  inferior de confianza igual o superior al 80 %;
- `all_committed_strict_recall` puntual igual o superior al 70 % y límite
  inferior simultáneo igual o superior al 55 %;
- `predeclared_scoreable_strict_recall` puntual igual o superior al 70 % y
  límite inferior simultáneo igual o superior al 55 %;
- `macro_recall` puntual igual o superior al 70 % y límite inferior simultáneo
  igual o superior al 55 %;
- `finding_recall_at_10` igual o superior al 80 %;
- `positive_target_hit_rate_at_10` publicado como métrica secundaria;
- `negative_target_false_alert_rate` puntual igual o inferior al 2 %;
- límite superior de confianza de false-alert igual o inferior al 5 %;
- `negative_control_review_rate` puntual igual o inferior al 2 % y límite
  superior de confianza igual o inferior al 5 %;
- `conservative_negative_control_failure_rate` puntual igual o inferior al 2 %
  y límite superior de confianza igual o inferior al 5 %; crash selectivo,
  preflight failure u otro non-completion penaliza este endpoint;
- cero `FILTER Pass` incorrectos y cero `ReviewEnvelope` no-TP en cada
  patched/safe/near-miss obligatorio y en todas sus transformaciones negativas;
  el 2 % estadístico no autoriza a ignorar un control contractual fallido;
- `successful_target_completion=100 %` en cada control contractual obligatorio;
  un source/preflight failure, crash, timeout, OOM, cancel no autorizado o
  budget exhaustion falla el scope en vez de contar como rechazo seguro;
- en los restantes estratos se aplica el ceiling operacional pre-registrado por
  el power analysis; ningún ceiling puede excluir fallos del denominador y
  cualquier exceso produce `fail`, no una cohorte más pequeña;
- `adjudication_coverage = 100 %`;
- evidence completion del 100 %;
- mediana de review burden igual o inferior a 10;
- P95 de review burden igual o inferior a 25;
- mediana de raw pass burden igual o inferior a 15 y P95 igual o inferior a
  40 por target;
- mediana de `technical_inconclusive_burden` igual o inferior a 10 y P95 igual
  o inferior a 25 por target;
- mediana de `candidate_burden` igual o inferior a 50 y P95 igual o inferior a
  100 por target; se cuentan todos los candidatos aunque no se eleven;
- mediana de `proof_debt_burden` igual o inferior a 10 y P95 igual o inferior
  a 25 por target;
- `filter_failure_burden=0`: ningún Supported queda sin Admission terminal por
  crash, timeout, schema mismatch, excepción o writer incompleto;
- `non_duplicate_suppression_rate` puntual igual o inferior al 10 % y límite
  superior de confianza igual o inferior al 20 % por scope/cohort;
- distribución completa de raw pass burden, suppression y dedupe publicada,
  con cero Pass falsos ocultos como `ineligible` o `duplicate`;
- todas las distribuciones de burden incluyen targets fallidos/censurados y
  cumplen el `solguard-resource-profile.v1` congelado; timeout de modelo es
  inferior al 2 %, schema/model failure inferior al 1 % y los controles
  contractuales tienen cero OOM, disk exhaustion o non-completion;
- cero high/critical falsos en controles.

`H-GEN-A` y `H-GEN-B` se comprometen antes del primer scan y se ejecutan sin
cambiar código, harness, reglas, prompts, modelos, thresholds, dependencias ni
build. Los outputs completos de ambos quedan firmados y timestamped antes de
revelar cualquiera. Los conjuntos son disjuntos por target, linaje y protocolo.
Cada cohort debe pasar por sí sola; pooling, promedio o selección post-hoc no
pueden ocultar que una falló.

Si el conjunto no permite estimar esos intervalos, el resultado es
`insufficient_evidence`, nunca `pass`.

### 13.6 Puerta H-NOVEL

Antes del primer scan se comprometen `H-NOVEL-A` y `H-NOVEL-B` con:

- targets, truth items, controles y clusters;
- sampling frame y selección;
- presupuesto y stopping rule;
- scoreability y taxonomía;
- root público de cada cohort;
- mismo release candidate, harness y tres BOM roots;
- outputs de ambas cohortes congelados antes de revelar cualquiera.

Cada cohort publica todos los misses, false positives y review items. Para el
claim de capacidad:

- `all_committed_strict_recall` puntual igual o superior al 30 % y límite
  inferior simultáneo 95 % superior al 5 %;
- `predeclared_scoreable_strict_recall` puntual igual o superior al 30 % y
  límite inferior simultáneo 95 % superior al 5 %;
- ambos denominadores, numeradores, `N` y `n_eff` se publican por cohort;
- `strict_precision` puntual igual o superior al 90 %;
- límite inferior de precisión igual o superior al 80 %;
- `raw_pass_support_precision` puntual igual o superior al 90 % y límite
  inferior igual o superior al 80 %;
- `presented_actionable_precision` puntual igual o superior al 90 % y límite
  inferior igual o superior al 80 %;
- 100 % de adjudicación terminal;
- todos los workload, suppression, false-alert y resource-profile gates de
  H-GEN, sin pooling ni relajación;
- al menos un true positive en un target externo real, privado, embargado o
  post-cutoff, en cada cohort;
- dos raíces causales y familias económicas independientes en total;
- findings emitidos, admitidos y congelados antes del reveal;
- causa ausente del inventario Solguard accesible;
- confirmación por dos revisores;
- ningún cambio de scanner entre cohortes o reveals.

Si sólo se obtienen dos true positives pero no se superan los endpoints, el
claim exacto es «detectó dos causas nuevas selladas entre N casos», no
«capacidad demostrada de detectar bugs nuevos».

La novedad fuerte se limita a material privado, embargado o posterior al cutoff
del modelo. En los demás casos significa «nuevo respecto al inventario Solguard
congelado», con `model_pretraining_unknown`.

### 13.7 Puerta de estabilidad

- tres replays de canarios con conjunto admitido idéntico;
- Jaccard de top-10 igual o superior a 0,90 en componentes no deterministas;
- 100 % de decisiones diferentes explicadas por artefacto;
- ningún replay reutiliza estado no declarado.

### 13.8 Puerta de utilidad

- ningún finding admitido sin causa, reachability, impacto, unidades y
  referencias;
- `presented_actionable_precision` y actionable rate compatibles con la puerta
  de precisión, sin usar Review como sumidero;
- carga de revisión dentro de los límites;
- technical inconclusive, candidate, proof-debt y filter-failure burden dentro
  de los límites de §13.5, sin mover objetos entre tracks ni excluir fallos;
- todos los ceilings numéricos del resource profile se cumplen y se publican
  p50/P90/P95/máximo, total y successful completion por scope/cohort;
- ranking high/critical calibrado contra el `materiality_profile_root` genérico
  y la policy leaf cuya pertenencia al `policy_set_commitment_root`
  precongelado se abrió post-reveal;
- cada severidad usa un lower bound conservador reproducible y su rule ID; todo
  caso `unclassified`, price-stale, mapping-unknown o lower-bound-insufficient
  queda fuera de high/critical;
- controles cercanos no generan alertas equivalentes;
- un revisor puede reproducir el paquete sin consultar logs privados.

### 13.9 Puerta bounty detection ready

Antes de ejecutar se comprometen la población autorizada, el sampling frame,
los criterios y seed de selección, un `N` exacto de slots de target, el número
de scans/intentos por slot, presupuesto total y por target, retries y stopping
rule, `materiality_profile_root` y `policy_set_commitment_root`. Una ventana
temporal sólo es válida si ya fija una regla determinista y
un `N` máximo; no permite ampliar el frame al ver cero resultados. Todos los
intentos, incluidos reemplazos preautorizados, targets retirados/no-response,
cero-resultados, timeouts, OOM y fallos permanecen en el dossier y en el
denominador correspondiente.

La autorización no se infiere del sampling frame. Cada LIVE manifest liga un
artifact firmado content-addressed con issuer/key, sujeto, set exacto de
target+revision+program, `valid_from/to`, probes/acciones permitidas, límites de
rate/recursos, prohibiciones y procedimiento de revocación, más su
artifact/content digest/root. La cadena de autoridad termina en program owner
o bounty platform aceptada por el trust policy prefreeze, liga ownership al
target/program y queda atestada por una identidad/clave independiente; un
permiso self-issued o de autoridad desconocida falla. Antes de cada intento se captura un trusted
timestamp y un status/revocation snapshot firmado; attempt ledger, provenance,
report y dossier preservan esos refs/digests/roots. Missing, expirado, revocado,
stale, target/action mismatch o exceso de límites produce
`authorization_failed` antes del scan, permanece en N y hace fallar TEST-V8 si
se intentó analizar. Ningún campo autoriza explotación.

En ese frame autorizado, ajeno al corpus y congelado antes de la revisión:

- todos los workload y resource-profile gates de H-GEN se cumplen sobre LIVE,
  incluyendo intentos fallidos/censurados y cero filter-failure;
- al menos un finding automático;
- raíz causal no codificada como caso específico;
- impacto económico `high|critical` derivado del lower bound conservador por la
  regla precongelada: run/proof/finding ligan materiality profile +
  policy-set commitment opaco; post-reveal adjudicación/provenance/report/dossier
  ligan las opening/assessment exactas sin mutar el finding;
- ruta de reachability reproducible sin alterar el finding;
- confirmación independiente;
- ausencia de contaminación;
- artefactos sellados antes de investigación manual;
- scanner operó sin oracle;
- selección realizada o atestada por un tercero;
- confirmación del mantenedor afectado, auditor externo o equivalente
  independiente, obtenida después del freeze y preservada con firma/provenance;
- resultado publicado como `findings confirmados / N slots comprometidos`,
  `targets con confirmación / N slots comprometidos`, todos los intentos y
  recursos totales, no sólo el intento exitoso.

No se permite seguir escaneando hasta obtener un acierto, sustituir slots fuera
de la regla o descartar intentos anteriores. Esta puerta es un claim existencial
de preparación en el frame y `N` medidos, no una tasa de éxito generalizable.
La explotación y la confirmación ofensiva siguen siendo el siguiente programa,
fuera de este plan.

## 14. H-NOVEL-A/B: diseño de novedad real

H-NOVEL-A/B no puede consistir en renombrar un bug conocido. Debe aplicar al
menos uno de estos mecanismos:

- holdout temporal posterior al freeze del producto;
- root causes custodiadas y nunca entregadas al equipo;
- composiciones de mecanismos económicos cuya interacción no aparece en
  fixtures;
- traslación inter-lenguaje con distinta semántica, no simple reescritura;
- protocolos externos autorizados e inéditos para el scanner;
- mutaciones de segundo orden que cambien el mecanismo causal;
- fallos emergentes en fronteras entre componentes individualmente correctos.

Para cada candidato se construye un `novelty-proof`:

- inventario de conocimiento accesible;
- búsquedas de colisión;
- análisis de linaje;
- comparación causal;
- timestamp de freeze;
- timestamp de disponibilidad pública;
- hashes de prompts, reglas y corpus;
- modelo exacto, evidencia publicada de su cutoff cuando exista y nivel de
  ceguera reclamado;
- root de los inventarios TRAIN/DEV/KNOWN y de toda fuente accesible al equipo;
- búsqueda de colisiones ejecutada por el custodio sobre material que no se
  revela al maintainer;
- decisión firmada.

El proof distingue `model_temporal_blind` de `model_pretraining_unknown`. No se
eleva el segundo al primero por no haber encontrado una colisión. Una causa sólo
cuenta como réplica independiente si cambia el mecanismo causal y el linaje, no
únicamente target, lenguaje, etiqueta o superficie sintáctica.

## 15. Base de datos de medición

### 15.1 Regla de migración

La base histórica `benckmarks.sqlite` es evidencia legada, no autoridad de una
release nueva. Se conserva de solo lectura con su hash. `benchmarks.sqlite`
debe inicializarse mediante migración versionada y reproducible.

Pasos obligatorios:

1. publicar schema/goldens v2 con writer desactivado;
2. desplegar readers v1/v2 en Backend y Deploy/evaluator;
3. superar la matriz old/old, new/old, old/new y new/new;
4. copiar y hashear la base histórica, activar inmediatamente su protección de
   solo lectura y atestar que ningún writer legacy permanece habilitado;
5. inventariar tablas, índices, constraints y filas;
6. identificar provenance ausente;
7. clasificar filas como `trusted`, `legacy_unverified` o `invalid`;
8. crear esquema nuevo desde cero;
9. migrar solo mediante herramienta versionada;
10. mantener IDs legacy como referencias, no como autoridad;
11. ejecutar reconciliación por conteos y hashes;
12. ensayar restauración desde snapshot/clone y una migración correctiva
   **forward-only**; nunca ejecutar un downgrade de schema in-place;
13. activar el writer v2 en shadow, conservando readers duales y la autoridad
    legacy;
14. observar reconciliación, ensayar restore y firmar cero lecturas legacy
    durante la ventana declarada, sin cambiar aún la autoridad;
15. ejecutar un único cutover de autoridad a v2 usando ese recibo;
16. mantener y reatestar el legacy de solo lectura; retirar compatibilidad sólo
    en una tarea posterior;
17. prohibir acceso del scanner ciego a la base histórica.

`benchmarks.sqlite` de producción nunca se usa como laboratorio de recuperación.
Cada ensayo parte de copias verificadas, conserva el original y demuestra que
una release anterior puede operar contra su propio snapshot compatible o que
la release nueva puede avanzar mediante otra migración. Una migración aplicada
no se «desaplica» sobre la base viva. El rollback detiene primero el writer v2,
restaura un snapshot compatible y conserva readers duales hasta cerrar la
recuperación.

### 15.2 Tablas lógicas mínimas

- `releases`;
- `repository_pins`;
- `campaigns`;
- `campaign_attempts`;
- `targets`;
- `target_lineage`;
- `stage_runs`;
- `artifacts`;
- `artifact_edges`;
- `findings`;
- `product_review_envelopes`;
- `finding_evidence`;
- `decisions`;
- `truth_items`;
- `matches`;
- `adjudication_reviews`;
- `contamination_events`;
- `metrics`;
- `resource_usage`;
- `claim_profiles`;
- `acceptance_ledger_refs`;
- `timestamp_receipts`;
- `signatures`;
- `migrations`;
- `exceptions`.

Ninguna métrica canónica se almacena sin query, versión, denominador y root de
entrada. La base puede indexar el último evento del ledger para consulta, pero
no puede crear, elevar ni revocar claims por sí misma; ante discrepancia, el
ledger externo firmado es la autoridad.

## 16. Release train

### 16.1 Estados

| Estado | Requisito | Claim permitido |
|---|---|---|
| `component-alpha` | Tests V0-V2 del componente | Ningún claim de producto |
| `integrated-alpha` | DAG integrado, contratos y canarios | `operational_canary` |
| `release-candidate` | Tres BOM/closures, CI, migración, V0-V5, `KNOWN-910` y harness congelado | Ningún claim de producto; publica evidencia known separada |
| `experimental-detection` | H-GEN-A y H-GEN-B superados para el perfil declarado | `sealed_blind_generalization`, `reviewer_useful`, limitados al perfil |
| `novel-detection` | H-NOVEL-A y H-NOVEL-B superados | `sealed_novel_detection` |
| `product-v1.0.0` | Todas las puertas, incluido LIVE-AUTH | `bounty_detection_ready`, `product_release` |

No se crea `product-v1.0.0` para celebrar la terminación del código. Se crea
después de que el dossier pruebe el estado.

### 16.2 Versionado

- tags firmados e inmutables;
- versión independiente por componente;
- manifest de producto que fija el conjunto;
- cambios de contrato incrementan la versión de schema;
- cambios incompatibles no se ocultan en patch releases;
- el tag no se mueve si falla una campaña;
- un rebuild debe producir los mismos digests o explicar la fuente de
  variación.

«Manifest de producto» y «manifest de release» no nombran un payload nuevo:
son la revisión release/pre-tag de
`solguard-acceptance-dossier-manifest.v1`, envuelta y firmada por el DSSE. Sus
entries/roles obligatorios incluyen los
SHAs de los quince repos y el plan inmutable de nombres/targets/firmantes de
tags, los tres BOM roots, candidate/harness roots,
campaign/report/certification roots, acceptance-ledger version,
`release_decision_event_id/hash`, `pre_promotion_ledger_root`,
riesgos/límites, artefactos fallidos y decisión de release.

El DSSE es byte-exact:

```text
payloadType =
  "application/vnd.solguard.acceptance-dossier-manifest.v1+jcs"
payload_bytes =
  UTF8(RFC8785_JCS(release_pre_tag_revision_including_self_hash))
payload = RFC4648_BASE64_WITH_PADDING(payload_bytes)
PAE =
  UTF8("DSSEv1") || SP ||
  ASCII_DECIMAL(byte_length(payloadType)) || SP || UTF8(payloadType) || SP ||
  ASCII_DECIMAL(byte_length(payload_bytes)) || SP || payload_bytes
```

Cada firma DSSE usa Ed25519 sobre `PAE`. El signed public-key map prefreeze
fija key ID, algoritmo, human role, validity/revocation y
`threshold=2`, con exactamente una firma válida de
`governance_evidence_authority` y otra de `release_approver`; son personas y
keys distintas, y ninguna es el acceptance verifier. Firma duplicada, key
unknown/revoked/out-of-window, role incorrecto, otro payloadType, type vacío o
alias, firma sobre digest en vez de PAE, base64 no canónico o reserialización
del mismo objeto falla.

El manifest porta su `self_hash` canónico, pero no lo incluye como entry ni en
su propia preimage; tampoco incluye su DSSE como entry, los tag object IDs que
se crearán después, `FINAL-006/007` ni el ledger root posterior. Tras
`FINAL-006` se crea primero un precondition receipt firmado que prueba que los
quince refs/nombres del plan no existen ni localmente ni en el remote canónico.
El `tag_plan` ya congelado contiene por cada repo `repo_id`, canonical repository
ID, URL normalizada del remote autorizado, tag name, target full commit SHA,
annotated/signed tag policy, signer key ID, expected hosting provider y
non-force publication policy. Alias de URL, mirror no declarado, remote local,
ref móvil o target abreviado fallan.

Después se crean exactamente annotated signed tags y se publican con push
non-force al remote fijado; está prohibido crear commits, mover branches,
modificar index/worktree, borrar/recrear tags o usar force. La respuesta del
push no basta: se verifica el ref con protocolo Git independiente y con API del
hosting, se conserva `ls-remote`/object resolution, signer verification, remote
audit event y receipts temporales externos. Si un repo carece de remote
publicable o no puede aportar receipt remoto, queda como candidato local y
`CLAIM-007` no se autoriza.

Un
verificador debe emitir un `tag_realization_receipt` con
`final_006_event_id/self_hash`, ledger root de aceptación, manifest/DSSE,
precondition receipt y 15/15 local tag object IDs, remote refs, targets,
signatures, push results, hosting audit IDs y creation/publication/audit receipts
con timestamps externos posteriores. Su schema cerrado es:

```text
schema_version = "solguard-tag-realization-receipt.v1"
receipt_id
release_id
tag_plan_id
tag_plan_root
final_006_event_id
final_006_event_self_hash
final_006_ledger_root
precondition_receipt_ref
precondition_receipt_content_digest
precondition_receipt_root
entries[15] sorted ascending by repo_id
  repo_id
  canonical_repository_id
  canonical_remote_url_digest
  tag_name
  expected_target_full_sha
  local_tag_object_id
  local_ref_name
  remote_ref_name
  remote_advertised_object_id
  peeled_target_full_sha
  tagger_key_id
  signature_verification_ref
  signature_verification_content_digest
  push_receipt_ref
  push_receipt_content_digest
  hosting_audit_event_id
  hosting_audit_receipt_ref
  hosting_audit_receipt_content_digest
  creation_timestamp_receipt_ids[2]
  publication_timestamp_receipt_ids[2]
entry_count = 15
entries_root =
  SHA256(UTF8("solguard/tag-realization-entries/v1") || 0x00 ||
    RFC8785_JCS(entries sorted ascending by repo_id))
verifier_id
verifier_key_id
signatures[]
external_timestamp_receipts[]
self_hash
```

La fecha interna de un annotated tag no
demuestra precedencia. Tag preexistente, recreado tras borrar, movido, sólo
local, ausente o creado/publicado antes de FINAL-006 falla. Un fallo parcial
preserva los
objetos ya creados, pero no
autoriza `FINAL-007` ni ningún claim. El dossier builder añade entonces una
revisión terminal create-only cuyo predecessor es el manifest release/pre-tag y
cuya entry nueva es el receipt 15/15; no muta ni re-firma el DSSE. Sólo esa
revisión terminal permite aceptar `FINAL-007`/`CLAIM-007`. Después, un receipt
de transparency externo liga manifest/DSSE pre-tag, revisión terminal, tag
realization, eventos/claim finales y
`post_promotion_ledger_root`; ninguno se inserta retroactivamente en la
preimagen. Cualquier segundo manifest autoritativo, campo paralelo no cubierto
por el schema o desacuerdo entre DSSE, dossier, ledger y tags falla cerrado.

### 16.3 Perfiles de claim

El candidate declara antes de medir qué perfil solicita y su política de
degradación:

| Perfil | Requisito | Presentación permitida |
|---|---|---|
| `partial_scope` | H-GEN-A/B pasan en cada lenguaje/scope enumerado | Claim experimental sólo para esa lista; todos los scopes fallidos o sin potencia se publican |
| `bounty_vertical` | El epoch `RC-V-EVM-1` satisface `VERTICAL-EVM-SCOPE-001`, `VERTICAL-EVM-BOM-001`, `VERTICAL-EVM-ISO-001`, `VERTICAL-EVM-CORPUS-001`, `VERTICAL-EVM-CANARY-001`, `VERTICAL-EVM-V5-001`, `VERTICAL-EVM-KNOWN-001`, pair seals y réplicas A/B propias, `VERTICAL-EVM-BLIND-001`, `VERTICAL-EVM-NOVEL-001`, `VERTICAL-EVM-CHAOS-001` y `VERTICAL-EVM-LIVE-001` | Sólo `bounty_detection_ready dentro del frame SOL-EVM-DEFI medido`, mediante `CLAIM-VERTICAL-EVM-001`; prohíbe extrapolar a ocho lenguajes o producto global |
| `full_eight_language` | H-GEN-A/B y gates globales pasan por separado en los 30 scopes obligatorios congelados por `10_MATRIZ_CERTIFICACION_SCOPES.md`, sin promedio entre ellos | Claim de generalización ciega para esos scopes publicados de los ocho lenguajes |
| `full_product` | `full_eight_language`, H-NOVEL-A/B, LIVE-AUTH y todas las puertas de producto | `product_release` y `bounty_detection_ready` en el frame medido |

Un fallo de `full_eight_language` no se convierte post-hoc en éxito parcial. El
perfil `partial_scope` sólo puede emitirse si la política de degradación, la
lista candidata y sus gates se pre-registraron; el ledger conserva también
cada scope fallido, excluido o `insufficient_evidence`. Un claim parcial nunca
usa «soporte experto en ocho lenguajes» ni una etiqueta de producto completo.

`bounty_vertical` es la ruta priorizada y honesta a utilidad temprana: concentra
la primera candidatura de bounty en Solidity/EVM DeFi sin reducir los criterios
de canary/known, ceguera, novedad, robustez, materialidad o autorización LIVE.
Antes de ver targets o resultados congela el scope exacto, candidate root, dos
pares H-GEN, dos pares
H-NOVEL, población LIVE autorizada, análisis de potencia, endpoints, thresholds,
stopping rule y wording solicitado. Todos los gates verticales deben referir
byte-exact al mismo candidate, `SOL-EVM-DEFI`, sampling frame y política de
materialidad. Un fallo no se reinterpreta como otro perfil, no se sustituye por
KNOWN y no autoriza `CLAIM-VERTICAL-EVM-001`.

La vertical y el producto completo son **candidate epochs distintos**. El
primero se corta después de common stack + Solidity + todas las capacidades de
medición/release necesarias y queda inmutable como `RC-V-EVM-1`. Seguir
implementando Vyper/Rust/Go/C/C++/JS/TS crea `RC-FULL-1` con SHAs, tree,
scope/BOM/ISO y candidate root nuevos; no muta ni reabre la evidencia histórica
vertical. CORPUS/CANARY/V5/KNOWN, pair seals, CHAOS y LIVE son instancias
separadas por epoch. Sólo DB-902 y capabilities cuya evidencia no depende del
candidate pueden compartirse.

Los resultados verticales pasan al contamination ledger como conocimiento
TRAIN/DEV antes de seleccionar el full-product holdout. `RC-FULL-1` usa cohorts,
truth, policies, outputs y población LIVE frescos y lineage-disjoint; no suma ni
reetiqueta ningún target, finding o control vertical. Artifact sin
`candidate_epoch_id`, cross-epoch root, singleton global reutilizado o
reapertura del epoch antiguo falla.

`solguard-candidate-epoch.v1` es la definición inmutable del epoch, no un
registro mutable de lifecycle. Fija ID/root, parent program version, candidate
SHAs/trees, scopes, closures, inputs/tooling ya aceptados, gates/observations
planificados, allowed next actions y regla de contamination successor. Los
siete validation events verticales V0–V4/NEG/META son eventos create-only
posteriores y propios; también lo son SCOPE/BOM/ISO/CORPUS/CANARY/V5/KNOWN. El
La definición ya es inmutable desde `open`; el freeze vuelve read-only los
validation/BOM/scope/environment artifacts comprometidos para **ese epoch** y
no prohíbe commits que sólo pertenecerán a un successor.

```text
schema_version = "solguard-candidate-epoch.v1"
candidate_epoch_id
program_id
program_version
parent_candidate_epoch_id?
parent_candidate_epoch_closure_event_id?
parent_candidate_epoch_closure_root?
historical_boundary_member_records[]?
candidate_manifest_id
candidate_root
repository_sha_tree_set_root
scope_id_set_root
scope_id_count
evaluation_closure_member_set_root
evaluation_closure_member_count
release_train_closure_member_set_root
release_train_closure_member_count
planned_input_subject_set_root
planned_input_subject_count
accepted_input_membership_root
accepted_input_membership_count
planned_operational_gate_set_root
planned_operational_gate_count
required_pass_member_set_root
required_pass_member_count
pass_claim_target_set_root
pass_claim_target_count
evaluation_observation_set_root
evaluation_observation_count
allowed_next_action_set_root
allowed_next_action_count
planned_tooling_subject_set_root
planned_tooling_subject_count
accepted_tooling_membership_root
accepted_tooling_membership_count
resource_profile_id
resource_profile_version
resource_profile_root
resource_profile_policy_id
resource_profile_policy_version
resource_profile_policy_root
resource_profile_policy_compliance_root
contamination_successor_required
created_at
signatures[]
external_timestamp_receipts[]
self_hash
```

Los campos condicionales existen sólo para la rama vertical o full indicada y
se omiten, nunca usan null. `parent_candidate_epoch_id`,
`parent_candidate_epoch_closure_event_id` y
`parent_candidate_epoch_closure_root` son obligatorios en `RC-FULL-1` y ligan
el close **ya aceptado** del epoch vertical; se prohíben en el epoch vertical.
No se llaman `contamination_close_*`: ese nombre confundiría el input histórico
del full con el evento futuro que cerrará el propio vertical. El binding padre
debe resolver al mismo evento/root y probar que su contamination mapping
TRAIN/DEV fue aceptado antes de abrir `RC-FULL-1`.
`historical_boundary_member_records[]` contiene entonces exactamente ese close
con kind/ID/version, contract ID/version, outcomes admitidos
`closed_pass|closed_nonpass` y `dependency_expansion=forbidden`. El full importa
el receipt autosuficiente, no `RC-V-EVM-1` ni sus observations/claim; cualquier
segundo boundary, expansión transitiva o outcome no terminal falla.

Validation/freeze/campaign/measurement/close event IDs o roots futuros,
`lifecycle_state`, `frozen_at` y `closed_at` están prohibidos en esta
definición. El lifecycle se deriva de
`record_candidate_epoch_open`, eventos validation/freeze/campaign/measurement
y `record_candidate_epoch_close` contra un único ledger head. Cambiar un
set/root exige otro epoch ID. Supersession es un evento separado: no revoca
evidencia ni autoriza copiar el claim anterior.

Cada set root usa `solguard-canonical-set-commitment.v1` y una única preimagen:

```text
payload = {
  schema_version: "solguard-canonical-set-commitment.v1",
  program_id,
  program_version,
  candidate_epoch_id,
  set_kind,
  member_count,
  members: members sorted ascending by the normative logical key
}
set_root = SHA256(
  UTF8("solguard:candidate-set:" + set_kind + ":v1") || 0x00 ||
  UTF8(RFC8785_JCS(payload))
)
```

El domain externo y `set_kind` interno son ambos obligatorios: impiden
transplantar bytes entre epochs o clases de set. Antes de hashear se valida una
sola clave lógica por member, orden ascendente, cardinalidad exacta, enteros
finitos y ausencia de null/campos ajenos. Duplicados, count mismatch,
canonicalización distinta, root transplant entre kinds/epochs o serialización
`JSON.stringify(array.sort())` fallan. Reordenar propiedades de un objeto sin
cambiar su valor JCS no cambia el root; reordenar members contra la clave
normativa sí falla validación antes del hash. Los
records planificados sólo contienen identidad/version; los memberships runtime
añaden el evento aceptado, content/evidence/operand roots y, para tooling, el
receipt que prueba que el commit aceptado está contenido en el tree candidato.
`candidate_root` es el root del build/material candidato declarado, no el hash
del propio objeto. `self_hash` se calcula como
`SHA256(UTF8("solguard:candidate-epoch:v1") || 0x00 ||
UTF8(RFC8785_JCS(object omitting exactly self_hash)))`; el ArtifactEnvelope
externo aporta su content digest. Se prohíbe
cualquier preimagen que contenga su propio digest, event ID futuro o
post-persistence ledger root.

El seed fija sólo `resource_profile_policy_id/version/root`. La instancia real
`resource_profile_id/version/root` se elige y sella antes de abrir el epoch y
debe contener todos los ceilings numéricos de §12.5; el
`resource_profile_policy_compliance_root` demuestra contra la policy del seed
que ningún campo obligatorio o hard ceiling fue omitido. Un root calculado sólo
sobre ID/version/schema, sin valores, hardware/runtime class y ceilings, es
inválido.

La autoridad machine-readable publica los dos payloads cerrados en
`acceptance-ledger.v1.json.resource_profile_policy_registry[]`. Cada
`policy_root` es
`SHA256(UTF8("solguard:resource-profile-policy:v1") || 0x00 ||
UTF8(RFC8785_JCS(payload omitting exactly policy_root)))`. El candidate seed y
sus `epoch_constants` deben referenciar exactamente un registro de esa registry;
un payload ausente, un campo no numérico cuando corresponda, una versión
distinta o un root opaco no reconstruible fallan antes de abrir el epoch.

`planned_input_subject_records` tiene una identidad lógica única
`kind+ID+version` y un array ordenado `dependency_bindings[]`; hard+contract
sobre el mismo sujeto no crean dos members. El accepted input conserva el mismo
set lógico mediante union cerrada: primary liga acceptance event,
content/evidence root y `dependency_state_hash`; derived liga evaluation
event/root y `operand_state_hash`; contribution liga acceptance event/evidence
y `accepted_implementation_ref`. Un campo de otra rama, duplicado lógico o
planned/accepted ID-version mismatch falla.

`dependency_bindings[]` se ordena por
`dependency_type + contract_id/version + required_state`; duplicados exactos o
dos bindings incompatibles del mismo tipo/contrato fallan antes del hash. El
array forma parte del member JCS, pero nunca de su clave lógica de unicidad.

`planned_tooling_subject_records` contiene exactamente una identidad
`contribution_id+version` por **cada** contribution cuyo resultado se consume
en el closure comprometido: para full, toda contribution alcanzable en el
`release_train_closure`; para vertical, toda contribution alcanzable en su
`evaluation_closure`. No es una lista manual de binarios principales ni puede
omitir contributions transitivas. `accepted_tooling_membership_records`
conserva ese mismo set y usa una union cerrada de dos ramas:

- `accepted_implementation_ref`: liga contribution acceptance event/evidence,
  repo ID, commit SHA, tree SHA y publication receipt aceptados, y demuestra
  que ese tree es el tree candidato comprometido para el repo;
- `accepted_absence_tree_receipt`: para una contribution que prueba ausencia,
  liga igualmente repo ID, commit SHA, tree SHA y publication receipt, más el
  bounded-inventory root, la consulta de ausencia y su receipt, y demuestra
  contención en el mismo tree candidato.

Las ramas son mutuamente excluyentes. Un receipt de ausencia sin commit/tree,
una ref aceptada que no pertenece al candidate, un contribution posterior a
open/freeze, extra, omisión, duplicado o diferencia entre planned y accepted
falla. Los roots de planned y accepted son distintos porque sus records lo
son, pero sus claves lógicas y cardinalidades deben ser exactamente iguales.

Tras evaluar la vertical, pase o falle, una autoridad distinta acepta
`VERTICAL-EVM-CONTAMINATION-CLOSE-001` únicamente si el 100 % de targets,
attempts, outputs, reveals, adjudications y resultados quedó sellado y
clasificado como conocimiento TRAIN/DEV. Este gate no convierte un fallo
métrico en pass. `RC-FULL-1` no puede abrir prefreeze, corpus ni selección de
holdout hasta consumir ese root.

El estado operacional distingue `accepted` de
`terminal_failed|terminal_invalid|insufficient_evidence|terminal_not_run`. Los
cuatro últimos son cierres auditables no-pass: bloquean el claim de su propio
epoch, conservan evidence/reason/denominator o causal blocker y nunca se tratan
como accepted. Cada primary susceptible de ese cierre declara
`terminalizable=true` en el registry. `terminalizable` es independiente de
`operational`: no se infiere por nombre, owner o posición en el DAG. Una
contribution, un derived o el propio candidate-close nunca se vuelve
`terminal_not_run`.

Hay dos closures deliberadamente distintos. El
`evaluation_closure_member_set_root` se congela al abrir el epoch y contiene
records cerrados `member_kind + member_id + subject_version` para todo
lo que debe terminar **antes** de decidirlo: implementación/tooling e inputs
aceptados, validaciones, freeze, DB/campañas/measurements aplicables y los claims
pre-close. En full, los claim observations son exactamente `CLAIM-001..006`;
en vertical, exactamente `CLAIM-VERTICAL-EVM-001`. El candidate-close,
`FINAL-001..007`, `CLAIM-007`, `CLAIM-008` y `RELEASE-914` no pertenecen al
evaluation closure full.

El `release_train_closure_member_set_root` contiene el evaluation closure exacto
más su candidate-close y, para full, la cadena post-close
`FINAL-001..007 + CLAIM-007 + CLAIM-008 + RELEASE-914`. Éste es el set exacto
que debe completar una release de producto; no significa «todos los nodos que
hayan existido». Incluye como input el contamination-close vertical ya
aceptado, pero no exige que el claim vertical histórico haya pasado. Así un
experimento vertical fallido no se borra ni bloquea para siempre una
candidatura full nueva; un non-pass dentro del evaluation closure full produce
`closed_nonpass` y hace inalcanzable la cadena post-close, nunca la maquilla
como release completada.

El `allowed_next_action_set` gobierna sólo el lifecycle interno del epoch y es
una union cerrada de las acciones realmente planificadas: validation/freeze,
DB cuando aplique, campaign, measurement, `record_upstream_nonpass`,
`materialize_derived` para los claims pre-close y
`record_candidate_epoch_close`. `RC-FULL-1` debe incluir explícitamente esta
última. `record_final_evidence`, `accept_release_pre_tag`,
`accept_post_tag_terminal`, realización de tags y claims post-close no se
incluyen: pertenecen a la release train y se autorizan exclusivamente al
consumir el receipt `closed_pass`. Ausencia de close, acción extra o uso de una
acción post-close antes del receipt falla cerrado.

Esta vía no altera la condición global: `CLAIM-006` y cualquier
`product_release` requieren el perfil `full_product`, `LANG-200`, H-NOVEL y
LIVE-AUTH globales. Un LIVE exitoso aislado, incluso de alta severidad, no es un
atajo hacia el claim de ocho lenguajes ni hacia producto completo.

### 16.4 Ledger de aceptación

El `acceptance-ledger.v1.json` versionado en esta carpeta es el **seed/spec**
inmutable del programa: fija schemas, ID-set, DAG inicial, predicates, owners y
claims, pero no se reescribe para aparentar progreso. Tras genesis, la autoridad
de estado vive exclusivamente en el evidence store externo mediante:

```text
ledger/events/<zero-padded-sequence>-<event_id>.json
ledger/snapshots/<ledger_revision>-<ledger_root>.json
ledger/checklists/<ledger_revision>-<checklist_root>.md
ledger/indexes/acceptance-ledger-events.v1.jsonl
```

Cada event object y snapshot se crea con semántica create-only/O_EXCL, path
derivado de su propio ID/root, firma y timestamp externo. La transacción compara
el expected previous event/root/revision, toma un lock de autoridad con lease
firmado, escribe evento y snapshot candidatos, los verifica y publica el receipt
de commit; colisión, revisión concurrente, path existente con bytes distintos o
commit parcial falla y se conserva. Nunca se sobrescribe un event, snapshot o
checklist.

`acceptance-ledger-events.v1.jsonl` es sólo un índice determinista regenerable,
ordenado por sequence y producido desde los event objects; no es autoridad ni
un fichero que se abra en append. Borrarlo y reconstruirlo debe dar bytes
idénticos. La vista Markdown de esta carpeta es igualmente seed/proyección; cada
revisión operacional de checklist se escribe en el path externo revisionado.

Todo evento contiene sólo el record base común: event/schema/program version,
operation, actor, resultado/reason codes, evidence refs/roots, verificador,
firmas, timestamp receipt, `previous_event_hash` y, si corrige,
`supersedes_event_id`. Los branches genesis/primary/contribution exigen sus
transition(s); `materialize_derived` exige `derived_id`,
`formula_digest`, `operand_state_hash` y evaluation/root, y **prohíbe**
transition o escritura manual de state. Derived disfrazado de primary, o al
revés, falla.

`operation` es una discriminated union cerrada:
`genesis_batch | accept_primary | reopen_primary | accept_contribution |
reopen_contribution | record_candidate_epoch_open | record_validation |
record_freeze_attestation |
record_database_cutover | record_campaign | record_measurement |
record_upstream_nonpass | record_candidate_epoch_close |
record_final_evidence | accept_release_pre_tag |
accept_post_tag_terminal | materialize_derived`. El ledger fija
en cada primary un `evidence_mode=bootstrap|implementation|candidate_epoch|
validation|
freeze_attestation|database_cutover|campaign|measurement|
candidate_epoch_close|final_evidence|
release_pre_tag|post_tag_terminal`; el dispatcher obtiene el branch desde ese
campo y el node/contribution ID, nunca desde lo declarado por el emisor.
`accept_primary` sólo sirve para `implementation`; cada branch operacional o
final acepta únicamente su mode exacto. `materialize_derived`
emite `solguard-derived-evaluation.v1`, no cambia manualmente un derived ni
acepta primaries.

Los branches operacionales que ejecutan una prueba (`record_validation`,
`record_freeze_attestation`, `record_database_cutover`, `record_campaign`,
`record_measurement`, `record_final_evidence`, `accept_release_pre_tag` y
`accept_post_tag_terminal`) portan `terminal_outcome = pass | failed | invalid |
insufficient_evidence`. Sólo `pass` transiciona el primary a `accepted`; los
demás transicionan respectivamente a
`terminal_failed | terminal_invalid | insufficient_evidence`, conservando
denominador, evidence y reason codes. `accept_*` exige pass. Readiness de una
dependencia es kind-aware: primary/contribution `accepted`; derived
`satisfied=true` sobre el operand-state hash de la revisión. Un cierre non-pass
no satisface un gate métrico, pero puede ser consumido por
`record_candidate_epoch_close` mediante una arista cerrada
`terminal_observation` para probar cobertura/contaminación completa. Esa arista
es ilegal en cualquier otro target y nunca relaja un dependency `hard`.
`record_upstream_nonpass` y `record_candidate_epoch_close` usan sus propias
uniones cerradas y no aceptan un `terminal_outcome` de esta lista.

Si un ancestor non-pass vuelve imposible ejecutar un descendant primary
terminalizable que pertenece al evaluation closure congelado,
`record_upstream_nonpass` puede transicionar **un** target
`pending -> terminal_not_run`. Exige mismo candidate epoch, blocker
ID/event/evidence root terminal, dependency-path root y verifier independiente;
el evaluator recompone el DAG y prueba que el target no es runnable. Target
runnable, target sin `terminalizable=true`, implementation/contribution/derived,
candidate close, cross-epoch, path inventado o batch que oculta varios targets
falla. El branch cubre únicamente un primary terminalizable del mismo closure y
epoch; se emite un evento por descendant pre-close hasta que el evaluation
closure observe cero `pending|reopened`. Los nodos post-close no se rellenan
artificialmente con `terminal_not_run` cuando el close resulta non-pass: quedan
fuera del evaluation closure y la release train simplemente no alcanza su
estado de éxito.

El payload contextual es otra union cerrada: `candidate_epoch_context`,
`validation_context`,
`freeze_attestation_context`, `database_cutover_context`,
`campaign_context`, `measurement_context`, `upstream_nonpass_context`,
`vertical_candidate_epoch_close_context | full_candidate_epoch_close_context`
o el contexto final exacto.
Contexto está prohibido en `genesis_batch` e implementación/contribution; es
obligatorio en todos los branches operacionales, finales, claim y release.
`validation_context` liga candidate/test manifest/comandos/entorno/denominador
pero prohíbe BOM futuro; `freeze_attestation_context` consume los validation
event roots y candidate byte-exact y produce, no presupone, closure/BOM roots;
DB liga la state machine/paths/digests/receipts; campaign y measurement siempre
ligan sus instancias exactas. Para
`final_evidence` no contiene una release decision aún inexistente;
`release_pre_tag` añade decision/pre-promotion root+DSSE y
`post_tag_terminal` añade FINAL-006 event, realization 15/15 y dossier
terminal. Required/forbidden es una union, no una lista universal:

| Context branch | Required | Forbidden |
|---|---|---|
| `candidate_epoch_context` | artifact/ref/digest y root de la definición inmutable, candidate/repository/scope/closure roots, planned y accepted input/tooling memberships, allowed-actions root, custodian/verifier y timestamp quorum | lifecycle mutable, validation/freeze/campaign/measurement event IDs futuros, output/reveal/metrics, close event o post-state root |
| `validation_context` | candidate SHAs/trees/root, validation manifest, commands, environment, denominator, terminal outcomes/failures, runner/verifier roots | BOM producido en el futuro, campaign/cohort/truth, métricas de claim, release/tag |
| `freeze_attestation_context` | candidate byte-exact, accepted validation event roots, capability verifier roots, attestation kind, SCOPE/BOM/ISO roots **producidos**, signatures y timestamp quorum | tratar outputs como inputs previos, campaign, measurement, claim/release |
| `database_cutover_context` | DB-CAP y freeze roots, old/new absolute paths/digests, backup, migration/shadow/zero-writer/cutover/guard/retention/rollback step receipts | campaign/cohort/truth, scanner metrics, tag/release |
| `campaign_context` | candidate/scanner/harness y tres BOM, campaign/cohort/scope, blind level, input/truth/policy/corpus/contamination commitments, attempts/budget/stopping/abort y output seals | post-reveal openings/assessments/adjudication/metrics, release decision, tags |
| `measurement_context` | closed subtype, exact validation/campaign instance set and cardinality, candidate/BOM, denominators, `N/n_eff`, metrics/intervals/coverage, output commitments, openings/assessments when applicable, contamination chain, adjudication, requested/prohibited claims, authority/verifier roots | generic singular campaign placeholder, inputs de otro subtype, release/tag state |
| `upstream_nonpass_context` | target/epoch, blocker IDs with terminal event/evidence roots, dependency-path root, recomputed non-runnable verdict, reason and verifier | runnable target, implementation/contribution, cross-epoch blocker, fabricated metrics |
| `vertical_candidate_epoch_close_context` | candidate epoch/root; evaluation-closure member records/root/count con kind+ID+version; refs/root/count del set exacto de campaign manifests preexistentes; terminal-state binding records/root/count; `claim_observation_records[]`/root/count exactamente para `CLAIM-VERTICAL-EVM-001`; complete target/attempt/output/reveal/adjudication/result roots; zero-pending receipt; coverage 100 %; resource-profile compliance root; TRAIN/DEV contamination root; successor seed commitment; proposed/resulting closure outcome; authority/verifier | crear, embebir o mutar campaign manifests durante close; observation singular o claim duplicado en generic observations; omitted failure; metric non-pass relabeled accepted; successor epoch ya abierto |
| `full_candidate_epoch_close_context` | candidate epoch/root; evaluation-closure member records/root/count con kind+ID+version; refs/root/count del set exacto de campaign manifests preexistentes; terminal-state binding records/root/count; `claim_observation_records[]`/root/count exactamente para `CLAIM-001..006`; complete target/attempt/output/reveal/adjudication/result roots; zero-pending receipt; coverage 100 %; resource-profile compliance root; proposed/resulting closure outcome; authority/verifier | contamination/successor, FINAL/RELEASE/tag/post-close evidence, observation singular o claim duplicado en generic observations, creación/mutación de campaign manifest, omitted failure, non-pass como accepted |
| `final_evidence_context` | exact FINAL-001..005 ID, dossier evidence revision, owner output/evidence roots, verifier reproduction and applicable limits/closure result | campaign placeholders, release decision/pre-promotion root, tag objects |
| `release_pre_tag_context` | derived release decision/event, pre-promotion root, release-pre-tag dossier/DSSE, frozen tag plan and role-separated signatures | tag object IDs, realization receipt, post-promotion root |
| `post_tag_terminal_context` | FINAL-006 event/root, local+remote absence receipt, realization 15/15, terminal dossier, tentative post-state operands | missing/partial/recreated tag, post-promotion root embedded retroactively in dossier |
| derived claim/release context | derived ID, formula digest, operand-state hash, evaluation/result artifact, authority/verifier | primary transition, campaign/BOM placeholders, manual state |

`claim_observation_records[]` es siempre un array canónico, aunque el epoch
vertical tenga un solo claim. Cada entry liga claim ID/version, formula digest,
operand ID-set/root/count, operand-state hash, derived-evaluation event/root y
boolean result. Su ID-set debe ser exactamente igual al
`pass_claim_target_set_root/count` congelado; cero extras, omisiones o
duplicados. Los claim IDs quedan excluidos de los generic
`evaluation_observation_records[]`, por lo que ningún claim se cuenta dos
veces. Candidate-open y candidate-close tampoco son observations: sus eventos
y receipts se verifican por las ramas lifecycle específicas. El root del array
usa el domain/set commitment normativo de esta sección.

`resource_profile_compliance_root` compromete un record por cada attempt/target
del set congelado, incluidos timeout, OOM, cancel, censored, retry y cero
resultado, más los agregados p50/P90/P95/max, total, throughput y tasas de
model/schema failure. Cada record liga el mismo
`resource_profile_id/version/root` del candidate y su evidence digest. Omitir
un intento, recalcular con otro hardware/profile, excluir fallos del denominador
o superar cualquiera de los ceilings numéricos obliga a `closed_nonpass` o
`insufficient_evidence`; nunca puede producir `closed_pass`.

Los `terminal_state_binding_records[]` son otra union cerrada y contienen
exactamente un member por sujeto del evaluation closure **salvo** los IDs de
`pass_claim_target_set`, que pertenecen exclusivamente a
`claim_observation_records[]`. Ese complemento debe coincidir byte-exact con
`required_pass_member_set`: primary liga su evento terminal y
content/evidence roots; contribution liga su acceptance event, evidence root y
accepted implementation/absence ref; derived liga evaluation event/root,
formula digest y operand-state hash. Exigir content root a un derived,
operand-state hash a un primary o un record universal con campos null falla. El
evaluator comprueba igualdad bidireccional entre el set congelado y la unión de
estas dos particiones, sin faltantes, extras ni solapamiento.

El evento close incluye `proposed_closure_outcome` en su preimagen firmada. El
receipt create-only repite byte-exact ese valor, los roots de observaciones y el
ledger post-state root. `closed_pass` se produce si y sólo si todo required-pass
primary/contribution está accepted, todo derived requerido es `true`, todos los
claims del array son `true`, la cobertura/recursos cumplen y no queda
`pending|reopened`. `closed_nonpass` se produce si y sólo si cada miembro está
terminal/materializado, no queda pending/reopened y al menos un requisito o
claim es false/non-pass. Estado incompleto no puede cerrarse. En ambos casos la
operación `record_candidate_epoch_close` es aceptada como una transición de
cierre válida; `closure_outcome` conserva el resultado experimental y nunca se
convierte en el `terminal_outcome` del nodo close.

Un campo no aplicable está ausente: no se representa con null, `N/A`, array
vacío ficticio ni sentinel.

El close vertical termina atómicamente el epoch y materializa su contamination
mapping; preparar inputs y aceptar el close no son dos autoridades divergentes.
El close full ocurre **después** de materializar `CLAIM-001..006` y **antes** de
`FINAL-001`. Puede producir `closed_nonpass`: sella el evaluation closure y un
dossier create-only `revision_role=full_nonpass_terminal`, sin DSSE, tags ni
evidencia final inventada. No intenta observar ni marcar terminal-not-run los
nodos post-close. Sólo un receipt `closed_pass` es dependencia hard de
`FINAL-001` y habilita `FINAL-001..007`, `CLAIM-007`, `CLAIM-008` y
`RELEASE-914`; la release terminal verifica entonces igualdad exacta con el
release-train closure. Ninguna rama muta el manifest del epoch ni permite que
un `closed_nonpass` satisfaga la dependencia de FINAL.

La ausencia de `measurement_context` cuando el branch lo exige, su presencia
cuando está prohibido, un `operation` desconocido, spoof de kind, null o
payload de otro branch fallan schema/semántica. Wrong branch para el
`evidence_mode` del node ID falla aunque las firmas sean válidas. Un evento
normal nunca rellena campaign, `N`, métricas o BOM con nulls ficticios.

El ledger se arranca mediante una única ceremonia genesis, antes de aceptar
cualquier work package de producto. Se implementan primero el registry
`GOV-003`, schemas, readers, writer create-only y matrices de `LEDGER-001`;
todos permanecen `pending` hasta que un implementador y un verificador
independientes firman un genesis externo que liga schema digest, ID-set hash,
DAG root, public-key map, SHAs del writer/verifier, fixtures, resultados,
evidence roots y timestamp. Genesis sólo puede aceptar los nodos mínimos de
bootstrap declarados; el conjunto literal y único es
`genesis_acceptance_set=[GOV-001,GOV-003,GOV-004,LEDGER-001]`.
La única operación `genesis_batch` acepta también, y sólo dentro de ese mismo
tentative post-state, las contributions bootstrap
`[C0-001,C0-003,C0-004,C0-012,C0-013,C0-014,C0-015,C0-016,C0-017]`. El orden
topológico literal es:

```text
C0-001 -> GOV-001 ->
C0-003 -> GOV-003 ->
C0-004 -> GOV-004 ->
C0-012 -> (C0-013 || C0-014) -> C0-015 -> C0-016 -> C0-017 ->
LEDGER-001
```

Cada flecha satisface los hard/contract y
`hard_contribution_dependencies` exactos; una dependencia intra-batch sólo
observa el tentative state producido por elementos anteriores. El batch exige
evidence root, implementer y verifier independiente por contribution/nodo y
publica todos los estados o ninguno. Un layout
`contribution_set_then_node_set`, pre-state `ledger_absent` interpretado como
dependencias satisfechas, reorder o aceptación parcial falla. Sólo este evento
omite `previous_event_hash`;
lleva cero `measurement_context`, campaign o claim. Extra, missing, dependencia
no satisfecha, fallo parcial, replay o segundo genesis rechaza el batch
completo. No autoriza claims ni campañas. Los commits de changelog y cualquier
trabajo preparatorio anterior reciben después eventos con su evidencia real
—nunca timestamps retroactivos—. Desde ese punto, no comienza ni se acepta
otro nodo sin evento canónico.

Una corrección añade un evento y genera un nuevo snapshot autorizado; nunca
reescribe ni borra el anterior. Un cambio del ID-set o schema crea una nueva
versión de programa y reabre sus dependientes. El release manifest referencia
la versión, `id_set_sha256`, `release_decision_event_id/hash` y
`pre_promotion_ledger_root` exactos. Tags, dashboards, documentos y filas SQL
son vistas derivadas y deben fallar cerrado si no coinciden con el ledger.
Campañas anuladas, intentos fallidos y claims retirados permanecen visibles.
Las claves, timestamps y eventos no residen en el host de scan.

### 16.5 Rollback forward-only

Cada release debe probar una transición de recuperación sin downgrade in-place:

- detener promoción y enrutar a la versión inmutable anterior junto con su
  snapshot/clone de base compatible, o desplegar una versión correctiva nueva;
- aplicar únicamente migraciones hacia delante sobre la base viva;
- aislar y marcar, sin borrar, filas producidas por la release fallida;
- leer artefactos anteriores mediante readers versionados o exportación sobre
  copias, sin rebajar el schema vivo;
- conservar continuidad de firmas, roots, ledger y audit trail;
- no reutilizar findings de una campaña anulada;
- registrar la release fallida y la transición como eventos nuevos del ledger.

Restaurar un backup sobre un entorno nuevo es válido; sobrescribir o degradar
la base viva no lo es. Los tags y manifests nunca se mueven para simular que la
release fallida no existió.

## 17. Dossier de aceptación

El dossier vive en el evidence store externo, no dentro de un repositorio del
scanner. Estructura obligatoria:

```text
acceptance/<release-id>/
  dossier-manifest.json
  00-decision/
    release-decision.json
    claims.json
    claim-profile.json
    acceptance-ledger.v1.json
    acceptance-ledger-event.json
    acceptance-ledger-events-root.json
    public-key-map.json
    timestamp-receipts/
    approver-signatures/
  01-scope/
    product-manifest.json
    scanner-runtime-bom.json
    build-execution-tcb-bom.json
    governance-evidence-bom.json
    scope-proof.json
    sbom/
    repository-status/
  02-build/
    provenance.json
    oci-digests.json
    reproducibility.json
  03-contracts/
    contract-matrix.json
    migration-report.json
    compatibility-report.json
  04-isolation/
    isolation-manifest.json
    negative-capability-report.json
    sentinel-probe-events.jsonl
    syscall-events.jsonl
    byte-leak-scan.json
  05-corpus/
    public-commitments/
    encrypted-private-manifests/
    revealed-private-manifests/
    contamination-ledger.jsonl
    cohort-roots.json
    power-analysis.json
  06-runs/
    canary/
    known/
    h-gen-a/
    h-gen-b/
    h-novel-a/
    h-novel-b/
    live-auth/
    attempts.jsonl
  07-evaluation/
    reveal-proof.json
    matches.jsonl
    adjudication-reviews/
    adjudication-report.json
    inter-reviewer-agreement.json
  08-metrics/
    metrics.json
    confidence-intervals.json
    resource-report.json
    stability-report.json
  09-risks/
    residual-risks.md
    accepted-exceptions.json
  10-reproduction/
    README.md
    commands.json
    environment.json
```

El dossier es append-only y se identifica por una cadena de manifests con
digest acumulativo canónico.
Cada manifest create-only usa
`schema_version=solguard-acceptance-dossier-manifest.v1` y es la única autoridad
de resolución de su revisión:

EVAL/dossier builder es el único writer de esas instancias. Docs prepara y
revisa entries y posee la aceptación de `FINAL-001`, pero no implementa un
writer paralelo; `FINAL-007` consume otra instancia del mismo builder/schema.

```text
dossier_id
dossier_revision
revision_role
previous_dossier_manifest_id?
previous_dossier_manifest_root?
release_id
campaign_ids[]
candidate_root
entries[]
  artifact_id
  artifact_role
  payload_contract_id
  payload_contract_version
  role_schema_digest
  media_type
  producer
  parent_artifact_ids[]
  content_digest
  byte_size
  confidentiality
  signature_refs[]
  timestamp_refs[]
  locator
  supersedes_artifact_id?
cumulative_entry_count
cumulative_entries_root
signatures[]
external_timestamp_receipts[]
self_hash
```

Los dos roots no son intercambiables:

```text
cumulative_entries_root =
  SHA256(
    UTF8("solguard/dossier-entries/v1") || 0x00 ||
    RFC8785_JCS(entries sorted ascending by artifact_id)
  )

self_hash =
  SHA256(UTF8(
    "solguard/self-hash/solguard-acceptance-dossier-manifest.v1"
  ) || 0x00 ||
    RFC8785_JCS(manifest omitting exactly self_hash,
      top-level signatures and top-level external_timestamp_receipts))
```

Durante la preimage, `self_hash` está ausente —no null, vacío o placeholder—.
Entry-level `signature_refs` y `timestamp_refs` permanecen incluidos.
El array vacío usa exactamente la representación JCS `[]`; no existe leaf
hash, padding, duplicación del último elemento ni caso Merkle implícito. Cada
firma top-level cubre `schema_version`, `self_hash`, `revision_role` y su
`key_id`; cada receipt externo cubre el `self_hash` y los digests de esas
firmas. Ninguno de esos dos contenedores puede cambiar el root de entries.
`previous_dossier_manifest_root` es exactamente el `self_hash` del predecessor,
no su entries root ni el hash de bytes con otra canonicalización. El DSSE cubre
los bytes canónicos finales que ya contienen `self_hash`. Incluir self-hash en
su preimage, usar canonicalización alternativa, cambiar orden semántico,
insertar null o confundir ambos roots falla.

Sólo genesis omite ambos `previous_*`. Cada revisión posterior referencia el ID
y root exactos de la anterior y su conjunto de entries es un superset byte-exact:
ningún artifact ID previo desaparece, muta, cambia role/schema/digest o se
reasigna. Una corrección añade otra entry con nuevo ID y
`supersedes_artifact_id`; no sustituye bytes históricos. El root se calcula
sobre todas las entries acumuladas en orden canónico y el count debe coincidir.

`revision_role` es el enum top-level hasheado
`evidence_revision | release_pre_tag | post_tag_terminal`. Tipifica la propia
instancia sin crear una entry autorreferencial. El DSSE envuelve
`release_pre_tag`; `tag_realization_receipt` es una entry real añadida a
`post_tag_terminal`.

La revisión release/pre-tag envuelta por DSSE encadena exactamente la
revisión/root aceptada por `FINAL-001` y conserva todos sus fallos, riesgos,
intentos y excepciones. La revisión terminal posterior encadena a su vez esa
revisión y agrega únicamente el tag realization 15/15 más provenance permitida;
`FINAL-007` consume la terminal. Los manifests se escriben en paths revisionados
create-only; `dossier-manifest.json` o `latest` puede ser un índice de
conveniencia, nunca autoridad ni archivo sobrescribible. Mutation tests borran,
reemplazan y reordenan entries previas, cambian predecessor/count/root y prueban
que todo falla cerrado.

Todo payload interrepo autoritativo referencia un contract ID registrado. Un
attachment interno no wire usa `artifact_role` y `role_schema_digest`
congelados; nunca se interpreta por filename. Renombrar un fichero no cambia su
identidad, y swap, duplicado, ausencia, role/schema mismatch o digest inválido
hacen fallar el dossier.

Cada fichero de runs se reconcilia con `attempts.jsonl`, incluidos outputs
nulos y errores. Cada línea de `attempts.jsonl` usa
`schema_version=solguard-run-telemetry.v1`; el nombre del contenedor no crea
otro contrato wire. Los resúmenes Markdown se regeneran desde JSON firmado. Si
el dossier discrepa del ledger de aceptación, manda el ledger y la promoción
falla hasta que una nueva entrada firmada explique la corrección.

## 18. Paquetes de trabajo

### SCOPE-900 — Congelar la frontera de producto

**Implementación**

- corregir el registry para los quince repos;
- construir runtime dependency graph;
- excluir componentes fuera de alcance;
- instrumentar procesos, archivos y red;
- crear `scope-proof`.

**Aceptación**

- tres closures exactos con roots independientes;
- probe de sentinels con intentos denegados observables, cero
  `open/read/mmap` exitosos y cero bytes filtrados;
- coordinación, build/host y runtime coinciden con su BOM respectivo;
- verificador independiente reproduce el grafo.

### MEASURE-901 — Definir contratos de medición

**Owner**

`solguard-deploy` y el evaluator post-scan. `solguard-database` sólo consume y
persiste el set exacto de ingesta benchmark de `01 §13.2`. En el plano MEASURE,
CORE no emite contratos de medición: el evaluator consume artefactos de producto
oracle-free —telemetry, finding/review envelopes y manifests—. CORE no contiene
truth, matches, adjudication reviews, rúbricas ni cálculo de métricas de
evaluación.

**Implementación**

- schemas de campaign, truth item, corpus manifest, contamination event, match,
  adjudication review, metric provenance, measurement report y acceptance
  dossier;
- consumo y reader-tests de `solguard-language-certification.v1`, cuyo único
  schema/fixture publisher prefreeze es `LANG-200-HARNESS`; MEASURE no lo
  republica ni lo redefine;
- publicación de schemas y despliegue de cada lector obligatorio de `09` con
  todos los writers canónicos desactivados antes de EVAL-908; Database consume
  únicamente campaign, truth, corpus, contamination, match, adjudication,
  metric provenance y measurement report, mientras evidence store, Docs,
  Agents y release consumen dossier/certificación según su rol;
- consumo y verificación del schema y cadena hash del acceptance ledger
  definidos por AGENTS/governance en `LEDGER-001`; MEASURE sólo aporta eventos
  y evidence refs de campaña;
- fórmulas canónicas;
- scoreability y taxonomía prefreeze;
- denominadores `all_committed` y `predeclared_scoreable` explícitos;
- queries versionadas;
- intervalos de confianza, alpha, multiplicidad, `N`, `n_eff` y power analysis;
- harness completo congelable por root.

Los IDs, fórmulas y perfiles `CLAIM-*` proceden exclusivamente del acceptance
ledger gobernado por AGENTS. MEASURE los consume y evalúa; no los define,
modifica ni autoriza.

MEASURE-901 consume el mapping oracle-free de TRUTH-106, pero no convierte los
outputs C1 en medición canónica. EVAL-908 es el primer productor operativo de
`solguard-metric-provenance.v1` y `solguard-measurement-report.v1`, siempre
después de que sus consumidores hayan superado compatibilidad old/new.

**Aceptación**

- fixtures válidas e inválidas;
- recomputación independiente;
- ningún resumen puede alterar el resultado;
- 100 % de la unión de todos los Pass envelopes, Review envelopes y top-10
  tiene decisión terminal;
- mutation tests prueban que el ledger no reescribe historia y que promoción
  falla ante firma, root, perfil o timestamp discordante;
- closure/import scan demuestra que la imagen scanner no contiene ni alcanza
  truth, matches, adjudication reviews o evaluator.

### DB-902 — Inicializar `benchmarks.sqlite`

**Implementación**

- consumir `PLAT-801` y el dry-run firmado de `PLAT-802`;
- verificar que los schemas/readers de `MEASURE-901` están aceptados antes de
  crear la instancia autoritativa;
- hacer backup, fijar hash y preservar `benckmarks.sqlite` de solo lectura;
- crear una única `benchmarks.sqlite` desde el esquema versionado;
- migrar el legado con clasificación de confianza;
- restricciones e índices;
- ejecutar writer v2 en shadow con readers duales;
- reconciliar counts, IDs, roots, confianza y provenance;
- exigir una ventana firmada de cero lecturas/escrituras legacy;
- activar el guard ensayado en `TRUTH-109`, cortar una sola vez la autoridad a
  v2 y retirar compatibilidad en tarea explícita;
- snapshots/clones y recuperación forward-only.

**Aceptación**

- base nueva reproducible;
- un solo receipt de cutover, sin una inicialización paralela en `PLAT-802`;
- reconciliación completa y shadow equivalence;
- legacy no contamina blind;
- tests de corrupción;
- restore probado antes del corte;
- `benckmarks.sqlite` permanece preservada, hasheada y de solo lectura;
- ninguna prueba ejecuta downgrade in-place sobre la base viva.

### BOM-903 — Build reproducible

**Implementación**

- pins exactos;
- lockfiles;
- build hermético;
- SBOM;
- provenance;
- firma.

**Aceptación**

- dos constructores limpios;
- comparación de digests;
- discrepancias explicadas y bloqueantes.

### ISO-904 — Aislamiento VM + OCI + CAS

**Implementación**

- snapshot;
- imagen hardened;
- mounts declarados;
- red bloqueada;
- límites;
- telemetría;
- capacidad negativa.

**Aceptación**

- test de escape;
- test de red;
- test de sentinel;
- test de estado previo;
- attestation firmada.

### CORPUS-905 — Reconstruir corpus y linajes

**Implementación**

- `solguard-corpus-manifest.v1` canónico y firmado para el 100 % de targets
  conocidos reconstruidos;
- el mismo contrato referencia el 100 % de
  `solguard-truth-item.v1` adjudicados, sin copiar autoridad en summaries;
- comparación con la expectativa histórica de 254 targets/630 items y
  explicación firmada de cualquier drift;
- deduplicación;
- scoreabilidad y taxonomía prefreeze;
- linaje;
- controles emparejados.

**Aceptación**

- todo target tiene origen;
- toda exclusión tiene razón previa al scan;
- conteos regenerables;
- denominadores all/scoreable quedan comprometidos antes del scan.

### HOLDOUT-906 — Crear H-GEN-A y H-GEN-B

**Implementación**

- dos selecciones estratificadas y disjuntas;
- power analysis pre-registrado con potencia mínima del 80 %, alpha,
  multiplicidad, `N` y `n_eff`;
- disjunción;
- custodia;
- dos roots públicos;
- controles negativos.

**Aceptación**

- composición derivada del power analysis por cada uno de los 30 scopes y cada
  cohort; los suelos ilustrativos son 59 controles independientes para un
  intervalo unilateral 95 % o 72 para bilateral, antes de multiplicidad,
  dependencia y clustering;
- cero contaminación;
- oracle físicamente ausente;
- code candidate y harness firmados antes de seleccionar o escanear.

### NOVEL-907 — Crear H-NOVEL-A/B

**Implementación**

- raíces excluidas;
- temporalidad o custodia;
- novelty proofs;
- cohorts A/B separadas y comprometidas antes del primer scan.

**Aceptación**

- dos raíces causales correctas e independientes;
- revisión doble;
- ausencia de firmas específicas;
- outputs de A y B congelados antes del primer reveal.

### EVAL-908 — Adjudicador independiente

**Implementación**

- matching propositivo;
- UI o paquetes de revisión;
- consumo de `solguard-finding-envelope.v1` y
  `solguard-review-envelope.v1` como artefactos de producto inmutables;
- emisión post-scan de `solguard-adjudication-review.v1`, sin reescribir los
  envelopes de producto;
- subject union tipada para FindingEnvelope, ReviewEnvelope y top-10, con
  match/truth condicionales y prohibición cross-run;
- arbitraje;
- acuerdo;
- recomputación de métricas.

**Aceptación**

- salida inmutable;
- decisiones firmadas;
- replay desde roots;
- cada evaluación H-GEN, H-NOVEL o LIVE emite una instancia nueva de
  `solguard-metric-provenance.v1` y `solguard-measurement-report.v1` ligada al
  campaign/cohort exacto; no reutiliza ni muta un report anterior;
- campaign/run spec/proof/finding coinciden en `materiality_profile_root` y
  `policy_set_commitment_root`; sólo truth/adjudicación/report/dossier
  post-reveal añaden/consumen entries de `target_policy_openings_root` y
  `finding_materiality_assessments_root`;
- casos no listados tratados correctamente;
- adjudicación terminal del 100 % de la unión de todos los Pass envelopes,
  Review envelopes y top-10, reconciliada por subject ref único;
- negativos de match huérfano, truth sin match, subject swap, doble subject,
  supersedes cycle y firma contra payload distinto.

### CANARY-909 — Certificar canarios

**Implementación**

- positivo y control por lenguaje;
- vertical slices completas;
- fallos inyectados.

**Aceptación**

- puerta canario completa;
- tres replays;
- cero borrado de evidencia.

### KNOWN-910 — Congelar regresión conocida

**Implementación**

- ejecutar inventario completo;
- publicar funnel stage a stage;
- fijar must-pass;
- medir review burden.

**Aceptación**

- puerta conocida completa;
- denominador cerrado;
- ningún número se presenta como blind.

### BLIND-911 — Ejecutar H-GEN-A y su réplica H-GEN-B

**Implementación**

- candidate y harness congelados antes de ambas ceremonias one-shot;
- cero retuning entre ellas;
- sellado de ambos outputs antes de un reveal conjunto;
- evaluación;
- métricas e intervalos.

**Aceptación**

- puerta H-GEN por lenguaje en ambos conjuntos;
- denominadores all/scoreable, `N` y `n_eff` publicados para ambos;
- integridad total;
- dossier reproducible.

### NOVELRUN-912 — Ejecutar H-NOVEL-A/B

**Implementación**

- dos ceremonias;
- root causes independientes;
- novelty proof;
- sellado de A/B antes de revelar cualquiera;
- adjudicación completa.

**Aceptación**

- puerta H-NOVEL completa;
- ningún ajuste entre scan y reveal.

### LIVE-913 — Validar objetivo autorizado

**Implementación**

- selección legal y fuera del corpus;
- freeze de frame, `N`, selección, presupuesto, intentos, retries, stopping,
  `materiality_profile_root` y `policy_set_commitment_root`;
- scan automático;
- sellado append-only de todos los intentos y outputs antes de revisión;
- adjudicación/revisión independiente y confirmación externa post-scan;
- evaluación post-LIVE que emite una instancia
  `solguard-measurement-report.v1` con
  `measurement_context=live_auth_campaign`, nueva metric provenance, extensión
  append-only del dossier y evento del ledger;
- no explotación.

**Aceptación**

- puerta bounty detection ready;
- paquete causal y económico;
- lower bound conservador y severidad `high|critical` derivados por el mapping
  precongelado: finding/proof ligan materiality + policy-set commitment y la
  evaluación post-LIVE liga policy leaf + membership proof sin mutarlos;
- scope legal documentado;
- todos los intentos y outputs nulos reconciliados;
- confirmación externa independiente preservada;
- report/dossier LIVE creados después del último intento y antes de auditoría y
  DSSE; nunca se reutiliza ni muta el report H-GEN/H-NOVEL anterior.

### RELEASE-914 — Autorizar decisión pre-promotion

**Implementación**

- reunir dossier;
- verificar ledger de aceptación, perfil de claim y `FINAL-001..005`;
- añadir la decisión firmada como evento nuevo append-only;
- fijar `release_decision_event_id/hash` y `pre_promotion_ledger_root`;
- autorizar la construcción/verificación posterior del dossier manifest, sin
  emitir todavía DSSE, tags ni claim de promoción.

**Aceptación**

- ninguna puerta pendiente;
- ninguna excepción bloqueante;
- reproducción independiente;
- transición de recuperación forward-only probada;
- el evento autoriza exactamente el perfil/claims candidatos y el tag plan;
- `RELEASE-914` no implica por sí solo `FINAL-006`, `FINAL-007`,
  `CLAIM-007`, DSSE emitido ni tags creados.

## 19. Comandos como contrato futuro

Los siguientes nombres describen la interfaz que el programa deberá
implementar; no se asume que existan hoy:

```powershell
node scripts\validate-coordination.mjs --workspace-root .. --json
solguard-release scope prove --runtime-bom scanner-runtime-bom.json --tcb-bom build-execution-tcb-bom.json --evidence-bom governance-evidence-bom.json
solguard-release build --manifest build-input-manifest.json --reproducible
solguard-measure harness freeze --spec measurement-harness.json
solguard-measure corpus verify --manifest corpus.json
solguard-measure contamination check --train train.json --holdout-private holdout.private.enc
solguard-measure campaign prepare-pair --spec h-gen-a.private.json --spec h-gen-b.private.json
solguard-measure campaign scan --spec campaign.scan.json --attempts attempts.jsonl
solguard-measure campaign seal --run-id <run-id>
solguard-measure campaign seal-pair --run-root <a-root> --run-root <b-root>
solguard-measure campaign reveal-pair --reveal holdout-a.reveal.json --reveal holdout-b.reveal.json
solguard-measure evaluate --run-root <root> --truth-root <root>
solguard-measure evaluate-live --run-root <live-root> --policy-openings <bindings>
solguard-measure acceptance-ledger integrate-event --proposal pre-promotion-release-decision.json --create-only
solguard-measure dossier emit --decision-event <event-id> --pre-promotion-ledger-root <root>
solguard-measure dossier verify --manifest <manifest> --dsse <envelope>
solguard-measure acceptance-ledger integrate-event --proposal final-006-verification.json --create-only
solguard-release tags realize --manifest <manifest> --dsse <envelope> --publish-canonical-remotes --non-force
solguard-release tags verify --manifest <manifest> --require-local 15 --require-remote 15
solguard-measure dossier create-tag-realization-revision --previous <release-manifest> --receipt <receipt>
solguard-release promote --terminal-dossier <terminal-revision> --tag-realization <receipt> --final-006-event <event-id>
solguard-release transparency bind --manifest <manifest> --terminal-dossier <terminal-revision> --tag-realization <receipt> --post-promotion-ledger-root <root>
```

Cuando se implementen, deberán:

- aceptar configuración explícita;
- emitir JSON machine-readable;
- devolver exit code no cero al fallar;
- no corregir datos automáticamente;
- no acceder a oracle en `scan`;
- imprimir IDs y roots, no solo texto humano;
- registrar versión y digest de sí mismos;
- emitir y verificar receipts de timestamp externo;
- operar campañas y ledger desde el evidence store externo, no desde los
  repositorios del scanner;
- impedir `reveal-pair` hasta que ambos output roots estén sellados;
- impedir `promote` si los claims solicitados exceden el perfil autorizado por
  el ledger.

## 20. Condición de cierre

Este documento está implementado solo cuando:

- SCOPE-900 a RELEASE-914 están cerrados;
- todas las puertas cuantitativas aplicables pasan;
- existe dossier firmado y reproducido por un verificador independiente;
- H-GEN-A y H-GEN-B autorizan certificación C5 únicamente en los 30 scopes
  publicados de los ocho lenguajes;
- H-NOVEL-A y H-NOVEL-B superan sus endpoints y autorizan el claim estadístico
  de detección automática de causas nuevas dentro de sus cohortes y novelty
  tier declarados;
- LIVE-AUTH prueba utilidad en el frame autorizado y `N` precomprometidos;
- el perfil `full_product` y sus claims están autorizados por un evento del
  ledger externo; su `release_decision_event_id/hash` y
  `pre_promotion_ledger_root` coinciden con el release manifest, y un receipt
  de tag realization 15/15 precede a `FINAL-007/CLAIM-007`; otro receipt externo
  liga después la promoción y el post-promotion root;
- el resultado no depende de `solguard-exploit`, explotación o reporte;
- los límites residuales se publican sin convertirlos en éxitos.

Si todo el código está terminado pero H-NOVEL o LIVE-AUTH fallan, el plan no
está completo y el producto no merece ese claim. Los perfiles parciales que
estén pre-registrados y hayan pasado pueden publicarse como tales, con todos los
fallos visibles, pero no satisfacen esta condición de cierre.
