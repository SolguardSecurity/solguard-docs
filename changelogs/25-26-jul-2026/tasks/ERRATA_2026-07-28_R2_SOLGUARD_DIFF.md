# Errata normativa R2: receipts de ausencia de `solguard-diff`

Errata ID: `ERRATA-R2-DIFF-ABSENCE-2026-07-28`

Revisión anterior: `solguard-detection-maturity-2026-07-25.3`.

Revisión corregida: `solguard-detection-maturity-2026-07-25.4`.

Estado de ejecución: **PENDING**. Esta errata no acepta contributions, no marca
la checklist y no convierte ninguna PR draft en ready.

## 1. Corrección limitada

`C2-CON-11` y `C2-CON-RM-10` se reclasifican como
`absence_receipt_contribution`. Se conservan sus IDs, owner
`solguard-diff`, parent `RUN-201`, dependencias duras y posición en el orden.
R2 conserva 80 contributions: 76 de implementación y cuatro receipts de
ausencia (`C2-CON-11`, `C2-CON-RM-10`, `C2-CON-RM-14` y `C2-CON-RM-15`).

La huella previa a la enmienda del grafo completo de dependencias duras es
`d6e86a36f754b7624806a23a8e2e3b52da0070c2c5aea786c347cee75659d835`,
calculada en el dominio `solguard:hard-dependency-graph:v1`. La revisión `.4`
debe reproducir exactamente esa huella.

## 2. Evidencia que obliga a reclasificar

El inventario de `C2-CON-01` queda ligado a:

- PR draft: `SolguardSecurity/solguard-agents#15`;
- contribution commit: `6867a70bd1e6b41c8cb66f93abdc3af66677a80f`;
- inventory root: `18dd2a95377007e95c7140fe6156d59138dbf00ae88ca6c5cdddac7a21e4470f`;
- nueve grupos y 29 miembros contractuales;
- repositorios miembro: `solguard-core`, `solguard-discover`,
  `solguard-economic`, `solguard-filter`, `solguard-invariant`, `solguard-map`,
  `solguard-trace`, `solguard-validate` y `solguard-value`.

`solguard-diff` no aparece en esa lista de miembros. Su `Cargo.toml` tampoco
declara dependencias Solguard. Obligar un cambio de código, una dependencia no
utilizada o un commit vacío sería una implementación artificial y queda
prohibido.

## 3. Binding normativo de `C2-CON-11`

El receipt se generará sólo después de publicar y verificar esta enmienda, y
deberá ligar exactamente:

- contribution: `C2-CON-11`;
- repositorio: `solguard-diff`;
- commit auditado: `2bb4239eb50b503b63233435f39e562dd169193c`;
- Git tree SHA completo: `3294eb3a3d73a1218a0d61636acf66775833d794`;
- inventario: `C2-CON-01` en el root anterior;
- dominio: `solguard:r2:absence-receipt:C2-CON-11:v1`;
- `no_repository_write=true`.

No se conserva ni se acepta ningún hash candidato calculado antes de cerrar
esta enmienda. El `immutable_receipt_root` se recalculará desde el receipt
cerrado y será verificado independientemente.

## 4. Política diferida de `C2-CON-RM-10`

`C2-CON-RM-10` no se genera con esta enmienda. Al alcanzar su posición en el
orden duro, deberá ejecutar un escaneo nuevo contra el SHA vigente de
`solguard-diff`, construir un inventario acotado nuevo y usar el dominio propio
`solguard:r2:absence-receipt:C2-CON-RM-10:v1`. Su evidence root será nuevo y no
podrá reutilizar el de `C2-CON-11`. También exige
`no_repository_write=true`.

## 5. Auditoría de impacto sobre las diez PR existentes

Auditoría realizada el 28 de julio de 2026 antes de fijar `.4`. Las diez PR
seguían `OPEN`, draft, con una contribution pendiente y su commit publicado
exacto. Ninguna fija la versión `.3` ni sus roots; sus footers encadenan la
evidencia previa y mantienen `GOV-003=pending`. No existe vinculación
contractual que exija reescribirlas.

| Contribution | PR draft | Commit publicado | Decisión |
|---|---|---|---|
| `C2-CON-01` | `solguard-agents#15` | `6867a70bd1e6b41c8cb66f93abdc3af66677a80f` | conservar |
| `C2-CON-02` | `solguard-core#11` | `3b97fd107cc9de17c0c3471515733ce877833c37` | conservar |
| `C2-CON-03` | `solguard-map#18` | `d1fc9705267ef63f0ca19fdebbe5085333ebc7cf` | conservar |
| `C2-CON-04` | `solguard-trace#21` | `15fe0af56f393fa6563bc381c53e704da755b67a` | conservar |
| `C2-CON-05` | `solguard-discover#5` | `3b81926a09ee7632553895b0f659f6f80e2008a7` | conservar |
| `C2-CON-06` | `solguard-economic#4` | `1ce0b3d005a535e02af5327dfd4b6579e45739a3` | conservar |
| `C2-CON-07` | `solguard-invariant#4` | `4129181146aeb804db85cc497e4a0c7b42330df6` | conservar |
| `C2-CON-08` | `solguard-value#4` | `80870b57287d51bd63713c3a417236b493de669a` | conservar |
| `C2-CON-09` | `solguard-validate#8` | `4e50261332ab5fd57a9d51068b43ac8c654622e9` | conservar |
| `C2-CON-10` | `solguard-filter#8` | `6bb0859a0e1f113235619f5809447af0649994ba` | conservar |

Resultado operativo tras la corrección: **10/76 PR draft** y **0/4 receipts
sellados**. Todas las contributions y la checklist permanecen pendientes.

## 6. Verificación de la revisión `.4`

Dos ejecuciones consecutivas de `node rebuild-final-plan.mjs` produjeron bytes
idénticos en los cuatro artefactos generados:

| Artefacto | SHA-256 idéntico en rebuild 1 y 2 |
|---|---|
| `acceptance-ledger.v1.json` | `d913bd315c6fc1d476a4deb7718338d78aba1f7ca346e4ce5ae4f415e2f8dfe9` |
| `07_CHECKLIST_MAESTRA.md` | `9b38432ef7b8d1e9c2e0b186674c60debed650c0f3a500e93c7de3b0c64d6b10` |
| `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md` | `da251ad36136523436f2a874aa69cbc1936ecc49fd8709103f6d33c1393ddd36` |
| `README.md` | `047f789869602ed5e23c309f0446e4f3edbb5771fa0ebeea048fdac6c56de158` |

Comandos de cierre ejecutados:

- `node validate-final-plan.mjs`: PASS, 71.715 comprobaciones;
- `node --test`: 15/15 tests PASS, incluido el test de idempotencia del
  generador;
- reader read-only con los roots `.4`: PASS;
- `git diff --check`: PASS;
- `solguard-diff`: worktree sin cambios; no se creó branch, commit ni PR para
  `C2-CON-11`.
