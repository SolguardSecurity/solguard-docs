import fs from 'node:fs';

const ledger = JSON.parse(fs.readFileSync('acceptance-ledger.v1.json', 'utf8'));
const stateMark = state => state === 'accepted' ? 'x' : ' ';
const escape = value => String(value ?? '').replaceAll('|', '\\|').replace(/\s+/g, ' ').trim();
const hardDeps = node => (node.dependencies || []).filter(dep => dep.type === 'hard').map(dep => dep.id);
const contractDeps = node => (node.dependencies || []).filter(dep => dep.type === 'contract').map(dep => `${dep.contract_id}@${dep.contract_version}<-${dep.id}`);

const lines = [];
lines.push('# Checklist maestra ejecutable');
lines.push('');
lines.push('Esta vista se genera exclusivamente desde `acceptance-ledger.v1.json`. No es una lista aspiracional ni se marca a mano. Antes del freeze, un cambio exige modificar el ledger canónico, validar todo el DAG y regenerar esta vista. Después del freeze, los archivos de este paquete son **seed/spec baseline read-only**: cada evento autoritativo vive como objeto create-once externo `ledger/events/<sequence>-<event_id>.json`, y las revisiones se publican create-once en `ledger/snapshots/revision-N.json` y `checklist/revision-N.md`.');
lines.push('');
lines.push('Un checkbox sólo aparece marcado cuando la transición autoritativa, la evidencia inmutable, el verifier independiente y todas las dependencias están aceptados. Un derived nunca se marca manualmente: el evaluador lo recalcula. Una contribución nunca acepta su parent ni un claim.');
lines.push('');
lines.push('## 1. Identidad congelada');
lines.push('');
lines.push('| Campo | Valor |');
lines.push('|---|---|');
lines.push(`| Programa | \`${ledger.program_id}\` |`);
lines.push(`| Versión | \`${ledger.program_version}\` |`);
lines.push(`| Revisión seed | \`${ledger.ledger_revision}\` |`);
lines.push(`| Node ID-set SHA-256 | \`${ledger.node_id_set_sha256}\` |`);
lines.push(`| Contribution ID-set SHA-256 | \`${ledger.contribution_id_set_sha256}\` |`);
lines.push(`| Closure ID-set SHA-256 | \`${ledger.closure_id_set_sha256}\` |`);
lines.push(`| Primaries | **${ledger.state_counts.primary_total}** |`);
lines.push(`| Derived | **${ledger.state_counts.derived_total}** |`);
lines.push(`| Contributions | **${ledger.state_counts.contribution_total}** |`);
lines.push(`| Ítems contados | **${ledger.state_counts.counted_item_total}** |`);
lines.push('');
lines.push('La closure usa `sha256(utf8(canonical-json(sorted(type-prefixed-id-array))))`; por tanto `node:X` y `contribution:X` no pueden colisionar. Cambiar, añadir o retirar cualquier ID obliga a nueva versión congelada.');
lines.push('');
lines.push('## 2. Reglas de progreso');
lines.push('');
lines.push('1. `pending` no significa empezado: significa no aceptado.');
lines.push('2. `accepted` exige operación compatible con `evidence_mode`; los campos de otra rama se rechazan.');
lines.push('3. `reopened` conserva roots/eventos previos, incrementa versión y reabre transitivamente parents, derived y claims.');
lines.push('4. `accept_contribution` exige todas sus `hard_contribution_dependencies`, SHA/receipt exacto, evidence root único y verifier independiente.');
lines.push('5. Un primary `implementation` sólo se acepta cuando su conjunto exacto `required_contribution_ids` está accepted y el integrador aporta E2E.');
lines.push('6. Las ceremonias no aceptan commits ni heredan campos Git. C5A/C5B tiene 60 eventos `record_measurement` separados.');
lines.push('7. `accept_post_tag_terminal` evalúa FINAL-007, todos los derived, todos los totals, cero pending/reopened y CLAIM-007 en un tentative post-state; un fallo no persiste nada.');
lines.push('');

const modeCounts = {};
for (const node of ledger.nodes.filter(node => node.kind === 'primary')) modeCounts[node.evidence_mode] = (modeCounts[node.evidence_mode] || 0) + 1;
lines.push('## 3. Rollup verificable');
lines.push('');
lines.push('| Clase | Total | Accepted/satisfied | Pending | Reopened |');
lines.push('|---|---:|---:|---:|---:|');
const primary = ledger.nodes.filter(node => node.kind === 'primary');
const derived = ledger.nodes.filter(node => node.kind === 'derived');
const contributions = ledger.contributions;
for (const [label, items] of [['Primary', primary], ['Derived', derived], ['Contribution', contributions]]) {
  const accepted = items.filter(item => label === 'Derived' ? item.computed_state === 'satisfied' : item.state === 'accepted').length;
  const reopened = items.filter(item => item.state === 'reopened').length;
  lines.push(`| ${label} | ${items.length} | ${accepted} | ${items.length - accepted - reopened} | ${reopened} |`);
}
lines.push('');
lines.push('| Evidence mode primary | Total |');
lines.push('|---|---:|');
for (const [mode, count] of Object.entries(modeCounts).sort()) lines.push(`| \`${mode}\` | ${count} |`);
lines.push('');

lines.push('## 4. Checklist de nodos');
lines.push('');
lines.push('Cada ID aparece exactamente una vez. En derived, «deps» debe ser idéntico a `formula.operands`; en primary, «contribs» es el conjunto cerrado que bloquea integración.');
lines.push('');
for (const kind of ['primary', 'derived']) {
  lines.push(`### 4.${kind === 'primary' ? '1' : '2'} ${kind}`);
  lines.push('');
  const items = ledger.nodes.filter(node => node.kind === kind).sort((a, b) => a.id.localeCompare(b.id));
  for (const node of items) {
    const identity = node.id;
    const mode = node.evidence_mode || (node.operational ? 'derived_operational' : 'derived_formula');
    const owner = node.owner || 'deterministic-ledger-evaluator';
    const deps = hardDeps(node);
    const contracts = contractDeps(node);
    const contributionsCount = (node.required_contribution_ids || []).length;
    const criteria = node.predicate?.criteria_id || node.predicate?.type || 'predicate';
    lines.push(`- [${stateMark(node.kind === 'derived' ? (node.computed_state === 'satisfied' ? 'accepted' : 'pending') : node.state)}] \`${identity}\` — ${mode}; owner=\`${owner}\`; hard=${deps.length}; contracts=${contracts.length}; contribs=${contributionsCount}; criterio=\`${criteria}\`.`);
  }
  lines.push('');
}

lines.push('## 5. Checklist de contribuciones owner-únicas');
lines.push('');
lines.push('El ID es el Task/branch/footer canónico. `declared_parent_id` conserva el gate de arquitectura; `parent_primary_id` es el único integrador aceptable. Los dos receipts de ausencia son read-only y no tienen commit.');
lines.push('');
let currentParent = null;
for (const item of contributions.sort((a, b) => a.parent_primary_id.localeCompare(b.parent_primary_id) || a.contribution_id.localeCompare(b.contribution_id))) {
  if (item.parent_primary_id !== currentParent) {
    currentParent = item.parent_primary_id;
    lines.push(`### Parent \`${currentParent}\``);
    lines.push('');
  }
  const artifact = item.expected_commit ? `commit=\`${escape(item.expected_commit.planned_subject)}\`` : `receipt=\`${item.expected_receipt.receipt_identity}\``;
  lines.push(`- [${stateMark(item.state)}] \`${item.contribution_id}\` — owner=\`${item.owner_repo}\`; declared=\`${item.declared_parent_id}\`; contribution-deps=${item.hard_contribution_dependencies.length}; ${artifact}.`);
}
lines.push('');

lines.push('## 6. Gates de campaña y certificación');
lines.push('');
lines.push('- Los 30 scopes permanecen separados. Cada `S-C5A` y `S-C5B` exige su propio evento y report exacto; 59/60 no materializa BLIND-911 ni ningún CERT.');
lines.push('- `VERTICAL-EVM-PROFILE-001` es el único perfil partial preregistrado en este snapshot. Autoriza como máximo `bounty_detection_ready dentro del frame SOL-EVM-DEFI medido`; no autoriza ocho lenguajes, full product ni release.');
lines.push('- `CLAIM-006` global exige el camino full-product: lenguaje completo, blind, novelty y LIVE autorizado. LIVE por sí solo no lo satisface.');
lines.push('- Los tamaños reales de H-GEN/H-NOVEL los determina el power analysis preregistrado. Los ~220 protocolos/90 labs no se reinterpretan como 30 scopes × 2 campañas.');
lines.push('');

lines.push('## 7. Cierre terminal');
lines.push('');
lines.push('La checklist está al 100 % únicamente si los totals dinámicos del snapshot terminal cumplen:');
lines.push('');
lines.push('```text');
lines.push('primary_accepted == primary_total');
lines.push('AND derived_satisfied == derived_total');
lines.push('AND contribution_accepted == contribution_total');
lines.push('AND primary_contribution_pending == 0');
lines.push('AND primary_contribution_reopened == 0');
lines.push('AND CLAIM-007 == true');
lines.push('```');
lines.push('');
lines.push('No se reemplazan esos totals por literales dentro de FINAL-007. El evaluador usa el ID-set/hash congelado de la revisión candidata y persiste una sola vez si todo el tentative post-state es válido.');

fs.writeFileSync('07_CHECKLIST_MAESTRA.md', `${lines.join('\n')}\n`);
console.log(JSON.stringify({ lines: lines.length, nodes: ledger.nodes.length, contributions: ledger.contributions.length }, null, 2));
