# 10. SolGuard Filter

`solguard-filter` es el gate de admision independiente entre VALIDATE y
EXPLOIT. No busca candidatos nuevos y no modifica
`validation_results.json`.

```text
VALIDATE supported -> FILTER pass -> EXPLOIT eligible
                   -> review/reject/duplicate -> bloqueado
```

## Responsabilidad

FILTER reabre solo los resultados `supported` y vuelve a comprobar source,
hashes, binding, regla semantica, ruta causal, protecciones y duplicados.

- `pass` exige todos los hard gates y `exploit_eligibility.eligible=true`.
- Falta, ambiguedad o evidencia MAY produce `review`; la ausencia no demuestra
  que el bug sea falso.
- `reject` necesita contradiccion concreta, proteccion efectiva, input stale o
  inseguro, efecto imposible o duplicado demostrado.
- El score no sobreescribe gates y dedupe no eleva autoridad.

Ground truth, labels de benchmark, IDs esperados, nombres de protocolo y
matching post-hoc estan prohibidos como inputs de producto.

## Modos cerrados

El modo `orchestrated` requiere `--source-integrity`,
`--trace-source-integrity` y un directorio TRACE fisico. Publica el contrato
autoritativo `filter.v0.1`.

El modo local debe declararse como `--standalone-untrusted`. Publica
`filter.untrusted.v0.1`, fuerza cero PASS y cero candidatos elegibles para
EXPLOIT. La CLI no hace fallback silencioso de producto a diagnostico.

## Inputs de producto

Core entrega exactamente:

- source root;
- candidatos canonicos;
- `validation_results.json` byte-exacto;
- invariantes seleccionadas (runtime y source cuando son bounded);
- MAP;
- el arbol TRACE exacto consumido por VALIDATE y sus receipts de integridad.

DISCOVER, ECONOMIC, VALUE, attack paths y ground truth no son inputs semanticos
de la invocacion productiva actual.

## TRACE manifest-first

FILTER abre primero `index.json` con un cap propio de 100 MiB. Ese indice fija
orden y membresia; FILTER sella el arbol antes y despues y rechaza JSON extra,
companions ausentes, links, reparse points, hardlinks, escapes o drift.

Una decision terminal dependiente de TRACE necesita simultaneamente:

- `trace.contract_manifest.v2` recomputado desde los primarios;
- `trace.claim_authority.v2` del productor;
- `trace.claim_authority.v1` de la decision VALIDATE/FILTER;
- un replay exacto `trace.evidence_verification.v2` bajo policy v3;
- perfil y signal origins coherentes.

Un primario suelto, v1/v2 diagnostico, receipt ausente/legacy, seleccion parcial,
coverage debt o `known_pattern` dentro de `generic_blind` no puede autorizar una
decision terminal.

La adquisicion esta bounded: hasta 100.000 primarios, 64 GiB fisicos agregados,
512 MiB de proyeccion, 768 MiB de heap retenido estimado y 8.000.000 nodos
retenidos. Los primarios conservan su cap wire de 4 GiB. Superar un limite
falla cerrado; no se interpreta como ausencia de evidencia.

## INVARIANT bounded

Cuando Core usa `invariant.bounded_runtime.v1`, FILTER rehidrata autoridad desde
el primario `invariant.v0.8` y `attack_paths.json` y recomputa
`invariant.selection_manifest.v1`. Cualquier omision coherente obliga a que
VALIDATE sea inconclusive y deja a FILTER sin decisiones terminales. Tamper,
overflow o relaciones colgantes son errores de input.

## Output

El root debe estar ausente. FILTER escribe miembros create-new en staging,
valida la membresia completa y publica con un rename:

- `filter_results.json` / `filter_results.md` en modo orquestado;
- variantes `.untrusted` en modo standalone;
- `summary.txt`, `phase.json` y, en producto, `source_integrity.json`.

Cada review se clasifica como `checker_missing`, `proof_inconclusive` o
`probe_required`. Un probe plan sigue siendo review y nunca concede
`exploit_eligibility`.

## Limites de la evidencia

Los tests de FILTER cubren contratos, controles vulnerables/seguros, paths,
hashes, oversized inputs y fallos simulados. Durante esta macroauditoria no se
ejecutaron canarios, protocolos, benchmarks, labs ni holdout. No se ha medido
una mejora de precision, recall, ruido o velocidad.
