# SolGuard Database

Documentacion tecnica de `solguard-database`, la base de conocimiento local de
reportes de auditoria.

## Nota de nombres

La ruta `crates/solguard-core` dentro de este repositorio designa la crate de
ingesta documental. En esta documentacion se la denomina
`solguard-database::solguard-core` para distinguirla de
`solguard-pipeline-core`, el motor de auditoria ubicado en el repositorio
hermano `solguard-core`.

La crate documental no ejecuta MAP, TRACE ni el pipeline de auditoria. Produce
payloads de documentos que el pipeline core puede consultar mediante los
servicios de conocimiento.

## Indice

1. [Introduccion](./01-introduccion.md)
2. [Arquitectura General](./02-arquitectura-general.md)
3. [Modelo de Datos SQLite](./03-modelo-de-datos-sqlite.md)
4. [Pipeline de Ingesta y Normalizacion](./04-pipeline-de-ingesta-y-normalizacion.md)
5. [Conector SQLite y Escritura Transaccional](./05-conector-sqlite-y-escritura.md)
6. [Relacion con la IA y Uso en Cada Escaneo](./06-relacion-con-la-ia-y-uso-en-cada-escaneo.md)

## Frontera operacional actual

### Ingesta fisica y acotada

- Los documentos y payloads JSON deben ser archivos fisicos regulares y
  estables durante su lectura. Se rechazan symlinks y, en Windows, reparse
  points.
- El documento y cada JSON tienen un limite inclusivo de 256 MiB; el texto
  extraido tiene un limite separado de 128 MiB.
- Un lote admite como maximo 2048 payloads. La lectura exige UTF-8 valido donde
  corresponde y verifica identidad, ruta real, tamano y modificacion alrededor
  de la lectura.

Estas comprobaciones detectan sustituciones ordinarias de ruta y cambios
concurrentes. No prometen inmutabilidad frente a un host o kernel comprometido.

### SQLite y recuperacion historica

SQLite se abre sin extensiones y con claves foraneas, WAL,
`trusted_schema=OFF` y `busy_timeout=10000`. La secuencia de migraciones es
atomica y revierte completa si falla un paso tardio.

La recuperacion conserva modos con autoridad distinta:

- `blind` devuelve cero patrones historicos;
- `leave-one-protocol-out`, `leave-one-report-out` y `assisted` exigen y vuelven
  a comprobar las exclusiones declaradas;
- `full-assisted` puede ver el corpus completo, pero es solo investigacion y no
  puede respaldar claims de benchmark o generalizacion.

El conocimiento recuperado es enriquecimiento historico. No concede autoridad
a INVARIANT, VALIDATE o FILTER ni puede cambiar por si solo un verdict.

### OCR externo

El OCR opcional se configura como programa absoluto y array estructurado de
argumentos, nunca como una cadena interpretada por shell. Debe contener
exactamente un argumento `{pdf}`; se rechazan shells, symlinks y reparse points.
El timeout permitido es 100-600000 ms, con 120000 ms por defecto; stdout queda
limitado a 32 MiB y stderr a 1 MiB. El ejecutable configurado sigue siendo
codigo local de confianza: esta frontera no es un sandbox.

## Estado de evidencia

Los tests locales del repositorio validan ingesta, limites, migraciones y
recuperacion. No se midieron con ellos recall, precision, latencia, throughput,
RAM ni generalizacion; tampoco sustituyen GitHub Actions remoto.
