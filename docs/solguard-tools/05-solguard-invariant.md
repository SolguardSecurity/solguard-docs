# 05. SolGuard Invariant

`solguard-invariant` convierte evidencia estructurada de MAP/TRACE y,
opcionalmente, invariantes sintetizadas por ECONOMIC, en propiedades tipadas que
deberian mantenerse.

No detecta bugs por si sola. Define que propiedad es aplicable, sobre que scope,
con que evidencia y que condicion de ruptura debe evaluarse.

## Inputs

Obligatorios:

- `--map <audit_map.json>`
- `--trace <trace.json | trace directory>`

Opcionales:

- `--knowledge <historical_evidence.json>`
- `--synthesized <synthesized_invariants.json>` repetible

## CLI actual

```powershell
cargo run --locked -- `
  --map solguard-output/audit_map.json `
  --trace solguard-trace-output `
  --knowledge historical_evidence.json `
  --synthesized solguard-economic-output/synthesized_invariants.json `
  --out solguard-invariant-output
```

Opciones:

| Opcion | Funcion |
| --- | --- |
| `--map` | MAP JSON. |
| `--trace` | TRACE JSON o carpeta. |
| `--knowledge` | Evidencia historica tipada. Opcional. |
| `--synthesized` | Invariantes generadas por ECONOMIC. Repetible. |
| `--out` | Directorio de salida. Default: `solguard-invariant-output`. |

## Salidas

Schema:

```text
invariant.v0.8
```

Archivos:

- `invariants.json`
- `invariants.md`
- `summary.txt`

## Catalogo

El catalogo v0.8 cubre familias como:

- conservacion de assets;
- consistencia shares/assets;
- solvencia;
- deuda/collateral;
- rewards;
- fees;
- backing de supply;
- validez temporal y transiciones;
- frescura de permisos;
- binding cross-chain;
- ejecucion de gobernanza;
- assumptions externas;
- disponibilidad.

### Autorizacion por actor

Un binding TRACE `trace.actor_authorization_binding.v1` solo se materializa si
esta `resolved`, su status es `violated`, la regla es exactamente
`authorization.caller_must_match_subject_or_allowance_spender` y la ruta
contiene las cuatro superficies source-backed exigidas. INVARIANT lo representa
como familia `permission_freshness`, predicado tipado
`actor_authorization_binding` y operador
`caller_matches_subject_or_allowance_spender`.

El scope conserva por separado caller, subject, allowance owner/spender,
amount y recipient. Un binding satisfecho, una ruta incompleta o evidencia sin
ubicacion exacta no crea una invariante resuelta. Esta propiedad formaliza una
obligacion aplicable; VALIDATE sigue siendo la autoridad del veredicto.

## Determinismo

Los IDs de invariantes dependen de:

- familia;
- version de regla;
- predicado normalizado;
- scope normalizado.

No dependen de timestamps, paths absolutos, orden de evidencia, confianza ni
version de herramienta.

## Knowledge historico

`--knowledge` solo puede alimentar invariantes si el conocimiento ya esta
normalizado con familia, predicado, scope y version de regla. Texto legacy o
similitud textual se conserva como fuente omitida; no crea reglas nuevas.

En el pipeline `v0.8`, el historical retrieval real se difiere hasta despues de
VALIDATE. Por defecto, `historical_evidence.json` es un placeholder
pre-validacion y no debe introducir propiedades nuevas. El enriquecimiento
historico post-candidate sirve para explicar y comparar resultados ya
validados, no para modificar `invariants.json`.

## Limites

- No ejecuta codigo.
- No usa SMT.
- No confirma explotabilidad.
- Una condicion de ruptura es una forma tipada de evaluar una hipotesis, no un
  finding.
