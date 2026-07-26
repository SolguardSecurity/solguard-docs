import fs from 'node:fs';
import crypto from 'node:crypto';

const ledger = JSON.parse(fs.readFileSync('acceptance-ledger.v1.json', 'utf8'));
let doc = fs.readFileSync('09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md', 'utf8');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const esc = value => String(value ?? '').replaceAll('|', '\\|').replace(/\s+/g, ' ').trim();
const replaceRange = (text, start, end, replacement) => {
  const a = text.indexOf(start);
  if (a < 0) throw new Error(`Missing start marker: ${start}`);
  const b = text.indexOf(end, a + start.length);
  if (b < 0) throw new Error(`Missing end marker: ${end}`);
  return `${text.slice(0, a)}${replacement.trimEnd()}\n\n${text.slice(b)}`;
};

const nodeContractEdges = [];
for (const node of ledger.nodes) {
  for (const dep of node.dependencies || []) {
    if (dep.type === 'contract') nodeContractEdges.push({ contract_id: dep.contract_id, version: dep.contract_version, producer: dep.id, consumer: node.id });
  }
}
nodeContractEdges.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
const contributionContractBindings = [];
for (const item of ledger.contributions) {
  for (const dep of item.dependencies || []) {
    if (dep.type === 'contract') contributionContractBindings.push({ contract_id: dep.contract_id, version: dep.contract_version, producer: dep.id, contribution: item.contribution_id });
  }
}
contributionContractBindings.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

const contractGroups = new Map();
for (const edge of nodeContractEdges) {
  const key = `${edge.contract_id}@${edge.version}|${edge.producer}`;
  if (!contractGroups.has(key)) contractGroups.set(key, { ...edge, consumers: [] });
  contractGroups.get(key).consumers.push(edge.consumer);
}

const contractSection = [];
contractSection.push('### 3.3 Aristas contractuales materiales');
contractSection.push('');
contractSection.push(`El snapshot contiene exactamente **${nodeContractEdges.length} aristas contractuales de nodo** y **${contributionContractBindings.length} bindings contractuales de contribución**. Son conjuntos distintos: una contribución verifica publicación/SHA antes de su trabajo; el primary integra y consume el contrato como gate de aceptación. Duplicar uno no sustituye al otro.`);
contractSection.push('');
contractSection.push(`- SHA-256 de tuplas node: \`${sha256(JSON.stringify(nodeContractEdges))}\`.`);
contractSection.push(`- SHA-256 de bindings contribution: \`${sha256(JSON.stringify(contributionContractBindings))}\`.`);
contractSection.push('- Toda tupla es `(contract_id, version, producer_node_id, consumer_node_id|contribution_id)`. Producer y consumer deben existir; versión, schema digest y authority no se infieren del filename.');
contractSection.push('- Si `contract_id` termina en `.vN`, `contract_version` debe ser `vN`. Una excepción exigiría versionado independiente explícito en el registry; este snapshot no contiene ninguna.');
contractSection.push('- Un derived sólo admite dependencies `hard`; contrato dentro de formula, alias o dependency faltante falla el linter.');
contractSection.push('');
contractSection.push('| Contract/version | Producer | Consumers de nodo exactos | Count |');
contractSection.push('|---|---|---|---:|');
for (const group of [...contractGroups.values()].sort((a, b) => `${a.contract_id}@${a.version}|${a.producer}`.localeCompare(`${b.contract_id}@${b.version}|${b.producer}`))) {
  const consumers = [...new Set(group.consumers)].sort();
  contractSection.push(`| \`${group.contract_id}\` / \`${group.version}\` | \`${group.producer}\` | ${consumers.map(id => `\`${id}\``).join(', ')} | ${consumers.length} |`);
}
contractSection.push('');
contractSection.push('La expansión exacta contribution→contract permanece machine-readable en `contributions[].dependencies`; no se duplica en una tabla humana de 1.160 filas. El linter recomputa ambos digests y compara todos los bindings.');
doc = replaceRange(doc, '### 3.3 Aristas contractuales materiales', '## 4. Schema `solguard-acceptance-ledger.v1`', contractSection.join('\n'));

const schemaSection = `## 4. Schema \`solguard-acceptance-ledger.v1\`

El JSON es el contrato ejecutable seed. Contiene ${ledger.nodes.length} nodos (${ledger.state_counts.primary_total} primary y ${ledger.state_counts.derived_total} derived), ${ledger.state_counts.contribution_total} contribuciones owner-únicas y ${ledger.state_counts.counted_item_total} ítems contados. Los tres hashes congelados son:

| Set | SHA-256 |
|---|---|
| nodes | \`${ledger.node_id_set_sha256}\` |
| contributions | \`${ledger.contribution_id_set_sha256}\` |
| closure type-prefixed | \`${ledger.closure_id_set_sha256}\` |

\`kind\` de nodo es \`primary|derived\`; contribution es una colección top-level distinta y nunca se disfraza de nodo. Todo primary tiene \`operational=false\`, \`evidence_mode\`, \`required_contribution_ids[]\`, predicate cerrado y descriptor de evidencia compatible con el modo. Todo derived tiene owner null, no tiene \`evidence_mode\`, y sus dependencies hard coinciden byte por byte con \`formula.operands\`.

Cada contribution declara \`contribution_id\`, \`parent_primary_id\`, \`declared_parent_id\`, \`owner_repo\`, state/version, node/contract dependencies, \`hard_contribution_dependencies[]\`, source row, expected commit o receipt, predicate, evidence, verifier y acceptance roots. El Task ID, branch y footer son el contribution ID; el parent no puede usarse como branch multi-repo.

### 4.1 Event log, snapshot y dispatcher cerrado

El objeto autoritativo de cada evento se crea una sola vez en
\`ledger/events/<sequence>-<event_id>.json\`. JSONL es sólo una vista regenerada y no autoritativa. Después del freeze, snapshot y checklist viven create-once en el evidence store externo:

\`ledger/snapshots/revision-N.json\` y \`checklist/revision-N.md\`.

\`acceptance-ledger.v1.json\` y \`07_CHECKLIST_MAESTRA.md\` dentro del repo son seed/spec baseline y no se escriben postfreeze. Cada revisión externa liga program/version, los tres ID-set hashes, previous snapshot root, event object set root, signer role/key/signature y timestamp receipts.

La union de operaciones es exactamente:

\`genesis_batch | accept_contribution | reopen_contribution | accept_primary | reopen_primary | record_validation | record_freeze_attestation | record_campaign | record_measurement | record_database_cutover | record_final_evidence | accept_release_pre_tag | accept_post_tag_terminal | materialize_derived\`.

| Operación | Target/perfil | Regla bloqueante |
|---|---|---|
| \`genesis_batch\` | 9 contributions + GOV-001/GOV-003/GOV-004/LEDGER-001 | un tentative post-state atómico en el orden intercalado exacto de JSON; fallo deja ledger ausente |
| \`accept_contribution\` | contribution implementation/absence receipt | owner exacto, deps contribution accepted, SHA/receipt publicado, evidence root único y verifier independiente; genesis members prohibidos |
| \`reopen_contribution\` | contribution accepted | conserva roots/version anterior; reabre parent y todo dependiente/derived/claim transitivo |
| \`accept_primary\` | implementation | required contribution set exacto accepted + integration E2E; missing/extra/reused evidence falla |
| \`record_validation\` | validation | validation_context; ningún campo campaign/Git |
| \`record_freeze_attestation\` | freeze | liga los 7 eventos OP-PREFREEZE exactos y el mismo SHA/tree/manifest candidate |
| \`record_campaign\` | campaign subtype | corpus snapshot, H-GEN/H-NOVEL pair seal o bounty-vertical preregistration |
| \`record_measurement\` | measurement subtype | cardinalidad exacta por subtype; C5A/B son 60 eventos distintos |
| \`record_database_cutover\` | DB-902 | state machine operational, create-once, shadow/rollback/guards; jamás commits de tooling |
| \`record_final_evidence\` | FINAL-001..005 | una transición por owner/verifier; sin DSSE/tag |
| \`accept_release_pre_tag\` | FINAL-006 | RELEASE-914, dossier release_pre_tag, DSSE threshold y ausencia de tags |
| \`accept_post_tag_terminal\` | FINAL-007 | tentative post-state dinámico, receipt 15/15, cero pending/reopened y CLAIM-007 true |
| \`materialize_derived\` | derived operacional | receipt de formula/operands/verifier; nunca escribe state derived |

Evidence mode primary exacto:

\`bootstrap | implementation | validation | freeze_attestation | campaign | measurement | database_cutover | final_evidence | release_pre_tag | post_tag_terminal\`.

Measurement subtype exacto:

\`canary_validation | known_campaign | h_gen_scope_replica | h_gen_pair_aggregate | h_novel_pair_aggregate | live_auth_campaign | chaos_validation\`.

Cada descriptor es \`closed=true\`. Sólo implementation/contribution commit permite Git fields. Ceremony, absence receipt y derived los prohíben. Campos no aplicables deben estar ausentes; null, placeholder o payload de otro branch falla schema.

Genesis exacto:

\`C0-001 -> GOV-001 -> C0-003 -> GOV-003 -> C0-004 -> GOV-004 -> C0-012 -> C0-013/C0-014 -> C0-015 -> C0-016 -> C0-017 -> LEDGER-001\`.

Las dependencias intra-batch se evalúan sobre el mismo tentative post-state. No se exige estado preexistente dentro del evento, no se persiste un prefijo y no se permite \`accept_contribution\` previo al genesis.
`;
doc = replaceRange(doc, '## 4. Schema `solguard-acceptance-ledger.v1`', '### 4.2 Manifest del dossier de aceptación', schemaSection);
doc = doc.replace('### 4.2 Manifest del dossier de aceptación\n\n### 4.2 Manifest del dossier de aceptación', '### 4.2 Manifest del dossier de aceptación');

const reopenSection = `## 5. Reapertura y versionado

\`reopen_primary\` y \`reopen_contribution\` son transacciones create-once. Conservan state/version/evidence/verifier/dependency/context roots históricos, motivo tipado, invalidation artifact y signer autorizado. Después incrementan versión y marcan \`reopened\` al target, al parent si el target es contribution, y a todos los consumidores hard/contract, integration gates, derived, claims y release gates transitivos. La propagación se calcula antes de persistir; partial reopen falla entero.

Una contribution reabierta no puede ser sustituida por otra repo/commit ni borrarse del required set. Para reaceptarla se repiten deps, publicación exacta, evidence/verifier independientes y luego el parent integra E2E otra vez. Old roots permanecen auditables; un evento nuevo nunca reescribe un objeto anterior.

Cambiar ID-set, formula, owner, parent, contract edge, predicate, evidence branch o cardinalidad requiere nueva versión congelada, no una aceptación ordinaria.`;
doc = replaceRange(doc, '## 5. Reapertura y versionado', '## 6. IDs base importados', reopenSection);

const idSection = `## 6. Identidad, counts y cierre

El snapshot exacto contiene ${ledger.state_counts.primary_total} primary, ${ledger.state_counts.derived_total} derived y ${ledger.state_counts.contribution_total} contributions: ${ledger.state_counts.counted_item_total} ítems contados. Los IDs se congelan por tres hashes (node, contribution y closure type-prefixed) mostrados en §4. Ni Markdown ni rango abreviado crea IDs.

FINAL-007 no contiene literales de totals como predicate de negocio. Carga el snapshot candidato cuyo closure hash está comprometido y exige dinámicamente todos los primary accepted, todos los derived satisfied, todas las contributions accepted, cero pending/reopened y CLAIM-007 true en el mismo tentative post-state.`;
doc = replaceRange(doc, '## 6. IDs base importados', '## 7. Umbrellas multi-repo y children de owner único', idSection);

const languageSection = `### 10.2 Paquetes de lenguaje derivados e integración owner-única

Los 39 IDs \`LANG-(SOL|VYP|RUST|GO|C|CPP|JS|TS|X)-*\` que no son harness son **derived**, no branches ni work packages. Cada uno es \`AND(<ID>-INTEGRATION)\`. Su \`<ID>-INTEGRATION\` es el primary owner del cierre E2E y enumera todas las contributions exactas de \`06\`. Esto elimina el antiguo owner ficticio deploy sobre commits de MAP/TRACE/DISCOVER/ECONOMIC/etc.

Cada contribution tiene branch/footer propio y deps contribution. El integrador no puede aceptar el package hasta que el conjunto exacto esté accepted y haya replay E2E. Reopen de una contribution reabre integration, package y consumidores. La tabla exacta de 39 pares está en §16.2.

Los 30 scopes mantienen C0 owner deploy, C1/C2 owner map, C3 owner trace y C4 owner deploy-integrator. C4 exige las contribuciones MODEL, ECONOMIC, INVARIANT, CORE, VALUE, VALIDATE, FILTER, DIFF, REPLAY, CANDIDATE y SCOPE. El DAG C6 exacto es PROFILE → FRONTEND → LOCAL-IR → TRACE → C4 providers → REPLAY → CANDIDATE → SCOPE; cada publicación se liga a SHA/receipt y evidence root.`;
doc = replaceRange(doc, '### 10.2 Paquetes de implementación C0-C4 primary', '### 10.3 Gates explícitos de los 30 scopes', languageSection);

doc = doc.replace('| `CLAIM-006` | `AND(LIVE-913)`; exige MeasurementReport post-LIVE `live_auth_campaign`, materiality root exacto, TargetPolicyOpeningSet completo y FindingMaterialityAssessmentSet 1:1 con toda la unión adjudicada | `bounty_detection_ready`, no explotación |', '| `CLAIM-006` | `AND(CLAIM-003, CLAIM-004, CLAIM-005, LIVE-913, TEST-V8)`; full-product, 30 scopes certificados, blind+novel y LIVE autorizado/high/material | `bounty_detection_ready` global, no explotación |');
doc = doc.replace('| `CLAIM-007` | `AND(RELEASE-914, FINAL-006, FINAL-007)` | `product_release` |', '| `CLAIM-007` | `AND(RELEASE-914, FINAL-006, FINAL-007)` | `product_release` |\n| `CLAIM-VERTICAL-EVM-001` | `AND(VERTICAL-EVM-PROFILE-001, VERTICAL-EVM-BLIND-001, VERTICAL-EVM-NOVEL-001, VERTICAL-EVM-LIVE-001)` | sólo `bounty_detection_ready dentro del frame SOL-EVM-DEFI medido`; prohíbe full-product/ocho lenguajes/release |');

doc = doc.replace(/398 accepted\/86 satisfied/g, `${ledger.state_counts.primary_total} accepted/${ledger.state_counts.derived_total} satisfied y ${ledger.state_counts.contribution_total} contributions accepted`);
doc = doc.replace(/primary_progress == 398\/398/g, 'primary_accepted == primary_total');
doc = doc.replace(/derived_progress == 86\/86/g, 'derived_satisfied == derived_total');
doc = doc.replace(/las 567 tuplas/g, `las ${nodeContractEdges.length} tuplas de nodo`);
doc = doc.replace(/exactamente estas \*\*567 aristas contractuales\*\*/g, `exactamente estas **${nodeContractEdges.length} aristas contractuales de nodo**`);

const annex = [];
annex.push('## 16. Registry generado de capacidades, integración y contribuciones');
annex.push('');
annex.push('Esta sección es normativa y generada desde el JSON. Hace resoluble cada `criteria_id`; una fila ausente bloquea dispatch.');
annex.push('');
annex.push('### 16.1 Capacidades, cutover y perfil vertical');
annex.push('');
annex.push('| Criteria ID | Kind/mode | Owner | Required contributions | Must hold exacto |');
annex.push('|---|---|---|---:|---|');
const specialNodes = ledger.nodes.filter(node => node.id.includes('-CAP') || node.id.endsWith('-INTEGRATION') || node.id.startsWith('VERTICAL-') || node.id === 'CLAIM-VERTICAL-EVM-001' || node.id === 'DB-902');
for (const node of specialNodes.sort((a, b) => a.id.localeCompare(b.id))) {
  annex.push(`| \`${node.id}\` | ${node.kind}/${node.evidence_mode || (node.operational ? 'derived_operational' : 'derived')} | \`${node.owner ?? 'null'}\` | ${(node.required_contribution_ids || []).length} | ${(node.predicate?.must_hold || []).map(item => `\`${esc(item)}\``).join(', ')} |`);
}
annex.push('');
annex.push('### 16.2 Paquetes LANG derived e integration');
annex.push('');
annex.push('| Derived criteria ID | Formula | Integration primary | Contributions |');
annex.push('|---|---|---|---:|');
for (const node of ledger.nodes.filter(node => /^LANG-(SOL|VYP|RUST|GO|C|CPP|JS|TS|X)-/.test(node.id) && !node.id.endsWith('-INTEGRATION') && node.kind === 'derived').sort((a, b) => a.id.localeCompare(b.id))) {
  const integration = ledger.nodes.find(candidate => candidate.id === `${node.id}-INTEGRATION`);
  annex.push(`| \`${node.id}\` | \`AND(${node.formula.operands.join(', ')})\` | \`${integration.id}\` | ${integration.required_contribution_ids.length} |`);
}
annex.push('');
annex.push('### 16.3 Measurement subtype y cardinalidad');
annex.push('');
annex.push('| Criteria ID | Subtype | Cardinalidad/roots |');
annex.push('|---|---|---|');
for (const node of ledger.nodes.filter(node => node.evidence_mode === 'measurement' || ['BLIND-911', 'VERTICAL-EVM-BLIND-001'].includes(node.id)).sort((a, b) => a.id.localeCompare(b.id))) {
  annex.push(`| \`${node.id}\` | \`${node.measurement_subtype || node.evidence_descriptor.profile}\` | \`${esc(JSON.stringify(node.evidence_descriptor.cardinality || {}))}\` |`);
}
annex.push('');
annex.push('### 16.4 Registry exacto de contributions');
annex.push('');
annex.push('| Contribution criteria ID | Type | Owner repo | Parent primary | Declared gate | Hard contribution deps | Source/expected artifact |');
annex.push('|---|---|---|---|---|---:|---|');
for (const item of ledger.contributions.sort((a, b) => a.contribution_id.localeCompare(b.contribution_id))) {
  const artifact = item.expected_commit ? item.expected_commit.planned_subject : item.expected_receipt.receipt_identity;
  annex.push(`| \`${item.contribution_id}\` | \`${item.contribution_type || 'contribution_implementation'}\` | \`${item.owner_repo}\` | \`${item.parent_primary_id}\` | \`${item.declared_parent_id}\` | ${item.hard_contribution_dependencies.length} | \`${esc(artifact)}\` |`);
}
annex.push('');
annex.push('Los IDs C6 scope se generan por producto cartesiano cerrado de 30 series × 15 sufijos. Su source normativo es la regla/suffix table de `06` y la scope row de `10`; la fila generada anterior materializa el locator exacto. Los otros 589 IDs corresponden 1:1 a la fila explícita de `06`. C2-CON-RM-14/15 son `absence_receipt_contribution`, no commits.');
annex.push('');
annex.push('### 16.5 Política, materialidad, autorización y timestamps');
annex.push('');
annex.push('- Único commitment: `policy_commitment_scheme=solguard-policy-set-commitment.v1`; salt CSPRNG 32 bytes, target index y membership proof bottom-up. Alternate/legacy scheme falla.');
annex.push('- `TargetPolicyOpeningSet` y `FindingMaterialityAssessmentSet` son sets distintos. Cada entry del dossier referencia `artifact_id + JSON Pointer`, role schema digest, content digest y locator.');
annex.push('- `solguard-live-authorization.v1` exige artifact/content/root, issuer authority chain, trust policy, ownership binding e independent attestor además de issuer/subject/target/ventana/actions/rate/status/revocation. Se verifica antes de cada intento.');
annex.push('- `solguard-external-timestamp-receipt.v1` exige base + RFC3161/transparency union, trust policy y quorum 2-of-2 para freeze, commitments, output seals, reveal, DSSE/tags y promotion.');

const annexMarker = '## 16. Registry generado de capacidades, integración y contribuciones';
const oldAnnex = doc.indexOf(annexMarker);
if (oldAnnex >= 0) doc = doc.slice(0, oldAnnex).trimEnd();
doc = `${doc.trimEnd()}\n\n${annex.join('\n')}\n`;

fs.writeFileSync('09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md', doc);
console.log(JSON.stringify({ nodeContractEdges: nodeContractEdges.length, contributionContractBindings: contributionContractBindings.length, specialNodes: specialNodes.length, contributionRows: ledger.contributions.length }, null, 2));
