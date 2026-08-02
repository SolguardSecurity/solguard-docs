# Gobierno del programa de madurez

Estado: publicación candidata pre-genesis. Estos documentos implementan la
superficie documental de `C0-002` y `C0-008`, pero no aceptan ninguna
contribución, no modifican el acceptance ledger y no conceden autoridad de
claim.

## Documentos normativos

- [Diccionario canónico de claims](product-claim-dictionary.md): fija el
  significado y la autoridad mínima de cada término de producto.
- [Decisiones de arquitectura](architecture-decisions.md): resume las
  decisiones que gobiernan separación de planos, ejecución y autoridad.
- [Reglas de evidencia](evidence-rules.md): define qué debe acompañar a una
  afirmación, una decisión técnica o una transición de gobierno.
- [Manifest de publicación](governance-publication.v1.json): enlaza los
  documentos y sus fuentes por SHA-256 y registra que C0-008 permanece
  pendiente.

## Fuentes canónicas

La publicación se deriva de estos documentos congelados del plan:

- [Contrato de madurez y arquitectura objetivo](../../changelogs/25-26-jul-2026/tasks/01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md)
- [Programa estructural](../../changelogs/25-26-jul-2026/tasks/02_PROGRAMA_ESTRUCTURAL.md)
- [Contratos, ledger y dependencias](../../changelogs/25-26-jul-2026/tasks/09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md)

Este índice es una vista de navegación. Las fuentes anteriores y el
acceptance ledger conservan su autoridad; una reformulación documental no
puede cambiar estados, dependencias ni criterios.

## Validación

```powershell
node scripts/validate-governance-program.mjs --json
node --test test/governance-program.test.mjs
node scripts/validate-product-claims.mjs --repo-root . --json
```

La validación comprueba enlaces, IDs cerrados, hashes de documentos y fuentes,
la raíz del manifest, la dependencia dura de C0-002 y los límites de autoridad.
Un PASS prueba coherencia de esta publicación; no prueba capacidad de
detección, rendimiento, recall, precisión, generalización ni release.
