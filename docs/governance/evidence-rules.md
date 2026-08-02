# Reglas de evidencia del programa

Estado: candidato pre-genesis de `C0-008`. Estas reglas concretan la
[arquitectura objetivo](architecture-decisions.md), el
[diccionario canónico](product-claim-dictionary.md) y el
[contrato de ledger y dependencias](../../changelogs/25-26-jul-2026/tasks/09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md).
No aceptan una contribución ni autorizan claims.

## EVD-001 — Abrir la autoridad física

Toda evidencia debe resolver a un archivo regular, contenido en un root
declarado y sin symlink, reparse point, hardlink de autoridad o escape. La ruta
o el ID por sí solos no son evidencia.

## EVD-002 — Verificar bytes, tamaño e identidad estable

El consumidor comprueba SHA-256 y tamaño sobre los bytes físicos y revalida
identidad y metadata antes y después de leer. Un drift o lectura parcial falla
cerrado.

## EVD-003 — Declarar producer, schema y versión

Cada attachment nombra producer, versión, media type, role schema y autoridad
de contrato. Un objeto desconocido, abierto o publicado por un owner ajeno no
adquiere autoridad por parecer compatible.

## EVD-004 — Cerrar lineage de inputs

El artefacto enumera todos los inputs materiales mediante IDs y digests. Cada
salto se reabre hasta una autoridad física; una referencia copiada o un
`source_id` semántico no reemplaza ese lineage.

## EVD-005 — Publicar create-only y content-addressed

Evidence bundles, snapshots y receipts se crean bajo una identidad inmutable.
Un reintento usa otra identidad; overwrite, delete-and-recreate o mutación
in-place invalida la continuidad.

## EVD-006 — No inferir decisiones

Un commit, rama, PR, tag, test, workflow o documento no implica acceptance. Un
candidate no implica verdict; `supported` no implica FILTER `pass`; un finding
no implica match; un match conocido no implica evaluación blind.

## EVD-007 — Probar independencia

La evidencia independiente debe tener producer, contexto, credencial y
derivación determinante separados cuando el gate lo exija. Duplicar, traducir,
resumir o proyectar el mismo input no aumenta la cardinalidad de pruebas.

## EVD-008 — Registrar contraevidencia y negativos

Una afirmación técnica declara las protecciones, rutas seguras, contradicciones
y casos adversariales examinados. Omitir un negativo obligatorio bloquea la
decisión; un waiver o un test saltado no cuenta como PASS.

## EVD-009 — Conservar deuda y ausencia como estados distintos

`missing`, `not_run`, `unknown`, `timeout`, truncación y cobertura parcial se
registran sin convertirlos en cero o ausencia demostrada. La evidencia negativa
requiere un scope completo y verificable.

## EVD-010 — Separar producto y oracle

Ground truth, matcher, scoring, splits, adjudicación y material privado del
holdout permanecen fuera del runtime de producto. Sólo un join post-producto
sobre outputs congelados puede producir un match de evaluación.

## EVD-011 — Hacer reproducible cada comando

La evidencia de ejecución incluye comando exacto, working directory, versión
de toolchain, inputs, outputs, exit code y entorno material. Un log sin esos
bindings es diagnóstico, no receipt reproducible.

## EVD-012 — Ligar cada claim a su dossier mínimo

La terminología de producto conserva los requisitos del
[diccionario canónico](product-claim-dictionary.md). Known-regression, blind,
novel, expert y release usan dossiers y autoridades diferentes; si falta uno,
el estado correcto es pending, unknown o deuda.

## Regla de precedencia

Ante una discrepancia mandan, en este orden, el acceptance ledger y sus schemas,
los contratos owner-published, las fuentes canónicas enlazadas y después esta
síntesis. Ningún texto derivado puede ampliar permisos, cerrar un gate o
reclasificar evidencia.
