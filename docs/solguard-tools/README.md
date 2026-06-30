# SolGuard Tools

Documentacion tecnica de las herramientas deterministas de SolGuard y de la crate
Rust reutilizable que alimenta la base de conocimiento.

Esta carpeta documenta contratos actuales de uso, inputs, outputs y limites. La
fuente de verdad final sigue siendo el codigo de cada repositorio.

## Indice

1. [SolGuard Map](01-solguard-map.md)
2. [SolGuard Trace](02-solguard-trace.md)
3. [SolGuard Diff](03-solguard-diff.md)
4. [SolGuard Core](04-solguard-core.md)
5. [SolGuard Invariant](05-solguard-invariant.md)
6. [SolGuard Validate](06-solguard-validate.md)
7. [SolGuard Discover](07-solguard-discover.md)
8. [SolGuard Economic](08-solguard-economic.md)

## Orden en el pipeline actual

```text
map -> diff -> trace -> discover -> economic -> invariant -> candidates -> validate
```

`candidates` vive en `solguard-backend`, no en un repo de herramienta separado.
Despues de `validate`, el backend ejecuta enriquecimiento historico, impacto,
PoC plan y report.

## Responsabilidad por herramienta

| Herramienta | Responsabilidad |
| --- | --- |
| `solguard-map` | Modelar el repositorio: componentes, entrypoints, estados, dependencias, grafo, build context y superficies. |
| `solguard-trace` | Profundizar sobre targets: guards, estado, efectos, rutas, findings semanticos y evidencia por target. |
| `solguard-diff` | Priorizar cambios recientes y PRs para revision manual. |
| `solguard-core` | Convertir informes de auditoria en payloads de conocimiento estructurados. |
| `solguard-discover` | Inferir modelo de protocolo, reglas implicitas, gaps e hipotesis blind desde MAP/TRACE/source. |
| `solguard-economic` | Modelar estado economico y sintetizar invariantes economicas tipadas. |
| `solguard-invariant` | Construir invariantes tipadas desde MAP/TRACE/economic/knowledge. |
| `solguard-validate` | Evaluar candidatos canonicos contra invariantes y evidencia estatica. |

## Regla de interpretacion

Ninguna herramienta individual confirma un bug pagable por si sola.

- MAP, TRACE, DIFF, DISCOVER y ECONOMIC producen senales o modelos.
- INVARIANT produce propiedades que deberian mantenerse.
- VALIDATE produce veredictos estaticos: `supported`, `refuted` o
  `inconclusive`.
- El backend decide que entra en `findings.md` usando
  `validation_results.json`.

Un finding real para bug bounty exige mas que una senal: evidencia, alcance,
impacto material, explotabilidad realista, PoC o plan reproducible y exclusiones
revisadas.
