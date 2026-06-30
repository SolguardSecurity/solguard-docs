# SolGuard Benchmarks

Esta carpeta documenta los tres benchmarks reales que existen en
`solguard-deploy`. Cada benchmark es un corpus local de protocolos vulnerables
conocidos, snapshots definidos y un archivo de ground truth asociado.

## Indice

1. [Benchmark 1: 24 protocolos v1](01-benchmark-1.md)
2. [Benchmark 2: 20 protocolos v2](02-benchmark-2.md)
3. [Benchmark 3: 20 protocolos v3](03-benchmark-3.md)

## Resumen

| Benchmark | Ruta | Protocolos | Expected declarados | Enfoque |
| --- | --- | ---: | ---: | --- |
| 1 | `solguard-deploy/scripts/24-protocols-v1` | 24 | 397 | Corpus amplio DeFi/DLT. |
| 2 | `solguard-deploy/scripts/20-protocols-2` | 20 | 20 | Corpus multi-lenguaje de un bug por protocolo. |
| 3 | `solguard-deploy/scripts/20-protocols-3` | 20 | 23 | Corpus DeFi/cross-chain mas reciente. |
