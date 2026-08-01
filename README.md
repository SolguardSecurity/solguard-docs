# Solguard Security - Documentacion

![logo](./assets/logo.png)

Documentacion tecnica de la infraestructura local de auditoria Solguard. El
motor de producto vive en `solguard-core`; `solguard-backend` es su adaptador
HTTP y las herramientas especializadas producen los artefactos que Core
orquesta y reconcilia.

## Indice principal

- [Core: arquitectura, pipeline y autoridad operacional](docs/solguard-core/README.md)
- [Backend HTTP](docs/solguard-backend/README.md)
- [Herramientas MAP, TRACE, DISCOVER, VALIDATE, FILTER y EXPLOIT](docs/solguard-tools/README.md)
- [Deploy, ejecucion sellada y fronteras de release](docs/solguard-deploy/README.md)
- [Benchmarks y medicion](docs/solguard-benchmarks/README.md)
- [Labs](docs/solguard-labs/README.md)
- [Database e ingesta documental](docs/solguard-database/README.md)
- [CLI local](docs/solguard-cli/README.md)
- [Gobierno: diccionario canónico de claims](docs/governance/product-claim-dictionary.md)
- [Notas de versiones historicas](releases/tabla.md)

## Estado de evidencia

La macroauditoria de julio de 2026 endurecio contratos, limites, inputs,
outputs, publicacion y CI local. Eso demuestra comportamiento de software bajo
los tests ejecutados en cada repositorio; no demuestra que la deteccion tenga
mejor recall, precision, velocidad o generalizacion.

Los ocho canarios de aceptacion, el replay release v1-v8, los 90 labs y el
holdout independiente permanecen pendientes y temporalmente congelados. Hasta
conservar sus artefactos y receipts validos, v1-v8 y labs siguen siendo solo
corpora de regresion conocida y no existe evidencia blind nueva.
