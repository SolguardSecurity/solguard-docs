# SolGuard Tools

Documentacion tecnica de las herramientas deterministas coordinadas por
`solguard-pipeline-core`.

## Indice

1. [SolGuard Map](01-solguard-map.md)
2. [SolGuard Trace](02-solguard-trace.md)
3. [SolGuard Diff](03-solguard-diff.md)
4. [Los dos componentes llamados Core](04-solguard-core.md)
5. [SolGuard Invariant](05-solguard-invariant.md)
6. [SolGuard Validate](06-solguard-validate.md)
7. [SolGuard Discover](07-solguard-discover.md)
8. [SolGuard Economic](08-solguard-economic.md)
9. [SolGuard Value](09-solguard-value.md)

## Pipeline actual

```text
solguard-pipeline-core
  -> map -> diff -> trace -> discover -> economic -> value -> invariant
  -> candidates -> validate -> filter -> historical-enrichment
  -> impact -> poc-plan -> exploit -> report
```

`candidates` y las fases de producto no son herramientas autonomas: viven en
el motor `solguard-pipeline-core`. El backend no decide ni ejecuta esta cadena;
solo invoca el core desde HTTP.

## Autoridad por fase

- MAP, TRACE, DIFF, DISCOVER, ECONOMIC y VALUE producen senales, modelos o
  evidencia candidata.
- INVARIANT produce propiedades tipadas.
- VALIDATE emite `supported`, `refuted` o `inconclusive`.
- FILTER conserva una admision independiente y fail-closed en `filter.v0.1`.
- EXPLOIT solo consume candidatos admitidos y emite `exploit.v0.2`.
- Core reconcilia y journaliza; no cambia la autoridad de cada herramienta.

Ninguna afirmacion de rendimiento, recall o pagabilidad se deriva de esta
topologia. Esos resultados requieren medicion y revision separadas.

En particular, los packs open-world de DISCOVER v2 y la segunda pasada
`candidate_value` endurecen el grounding y el cierre de evidencia, pero no
constituyen una mejora de recall medida hasta repetir los 90 labs y los
holdouts independientes.
