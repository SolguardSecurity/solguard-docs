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
