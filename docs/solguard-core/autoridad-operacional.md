# Autoridad operacional de Core

Esta pagina describe las fronteras endurecidas durante la macroauditoria de
julio de 2026. Son contratos de integridad y operacion; no son evidencia de que
el motor detecte mas vulnerabilidades.

## Responsabilidad cerrada

`solguard-pipeline-core` es el unico propietario de:

- preparacion y estado de proyectos;
- orden, ejecucion y journal de las fases;
- seleccion de herramientas y perfil de analisis;
- candidatos, binding, VALIDATE y reconciliacion FILTER;
- admision de EXPLOIT y fases posteriores;
- publicacion de artefactos y respuesta `AnalyzeOutputs`.

`solguard-backend` autentica y valida el transporte, construye `CoreConfig`,
invoca esta API y serializa la respuesta. No interpreta journals, no decide
veredictos y no reimplementa el pipeline.

## Roots con permisos diferentes

Core configura por separado:

| Root | Autoridad |
|---|---|
| `projects_dir` | Estado y artefactos de proyectos gestionados por Core. |
| `local_source_roots` | Lectura de targets locales permitidos. |
| `ingest_roots` | Lectura de informes admitidos por ingesta. |
| staging/journal internos | Estado transaccional privado; no autorizan nuevas fuentes. |

Declarar una ruta en una categoria no le concede permisos en las otras. Un
target local debe resolver fisicamente bajo uno de `local_source_roots`; un
informe debe resolver bajo `ingest_roots`; `projects_dir` no actua como un root
universal de lectura.

La frontera comun de filesystem exige componentes UTF-8/NFC canonicos,
contencion lexical y fisica, identidad estable y el tipo de fichero esperado.
Rechaza escapes, `.`/`..`, aliases, symlinks, reparse points, hardlinks cuando
se exige una autoridad fisica unica y drift antes/despues de la operacion.

## Identidad y ciclo de vida del proyecto

El nombre de proyecto se acepta en su forma canonica o se rechaza. Core no
sanea una request invalida para convertirla silenciosamente en otra identidad.

`init` es create-only:

1. valida nombre, root y destino ausente;
2. prepara `program.json`, `program.md` y roots iniciales en staging hermano;
3. verifica la estructura;
4. publica mediante rename atomico.

Un destino preexistente no se adopta ni se sobrescribe. El lease OS por
proyecto permanece activo hasta que Backend termina de serializar la respuesta,
de modo que dos requests no puedan resetear o sustituir el mismo proyecto a la
vez.

## Autoridad segun el tipo de target

- Un target local necesita pertenecer a `local_source_roots`.
- Un ZIP necesita `solguard-source-authority-handoff.v1` y la verificacion del
  transporte y arbol materializado documentada en
  [Integridad de fuentes](integridad-de-fuentes.md).
- Un target Git usa URL canonica y commit exacto, entorno Git aislado, hooks y
  submodulos desactivados, checkout efimero y receipt de identidad.

Estas modalidades no intercambian autoridad. El handoff ZIP no autoriza una
ruta local o Git y una ruta local no puede adquirir autoridad de archive.

## Publicacion durable

Las publicaciones autoritativas usan un destino ausente, miembros create-new,
staging hermano y rename final. El fallo valida y elimina solo el staging que
pertenece a la operacion; no borra ni repara un root ajeno o preexistente.

Core conserva por separado:

- `tool_phase.json`, receipt emitido por la herramienta;
- `phase.json`, journal de orquestacion de Core;
- `tool-outputs/pipeline.json`, secuencia global `pipeline.v0.10`.

Un exit code no sustituye la validacion del schema, hashes, membership,
contadores y politica de la fase.

## Ingesta con journal y recovery

La ingesta documental cierra primero un plan de inputs bajo `ingest_roots`.
Despues usa una transaccion durable con:

- ID de transaccion y journal create-only;
- hashes y estado cerrado antes de publicar;
- staging separado de la base y artefactos finales;
- commit y cleanup idempotentes;
- reconciliacion de journals pendientes al arrancar Backend;
- conservacion conjunta del error operacional y del error de cleanup.

Recovery no convierte una transaccion ambigua en exito. Un journal truncado,
reescrito, desconocido, stale, escapado o fisicamente sustituido bloquea el
arranque hasta que el estado se resuelva de forma autorizada.

## Ejecucion de herramientas

Cada fase liga un ejecutable canonico, argumentos cerrados, cwd, roots de
lectura/escritura, entorno allowlisted, timeout, terminacion del arbol de
procesos y output bounded. En runs gestionados se usan los binarios release
sellados por prebuild; no se recompila mediante `cargo run` durante el analisis.

El contrato de una fase se verifica antes de publicar. Una salida parcial,
malformada, fuera de root, enlazada, stale o con identidad fisica cambiante
falla cerrada y no se convierte en artefacto autoritativo.

## Perfil TRACE y origen de senales

`analysis_profile` es un enum transportado de extremo a extremo:

- `compatibility`: compatibilidad explicita con canales existentes;
- `generic_blind`: perfil general que excluye del output puntuado las senales
  con origen `known_pattern`.

TRACE sella `analysis_profile` y la capability `trace.signal_origins.v1`. Los
origenes son `structural_generic`, `generic_rule` o `known_pattern`; copiar un
ID o texto entre artefactos no cambia su procedencia. Core exige coherencia
entre indice, primarios y consumidores. `generic_blind` reduce contaminacion
por catalogo conocido, pero no demuestra por si mismo separacion fisica de
oracle ni generalizacion.

## Lo que aun no esta demostrado

Los tests locales de Core cerraron sus contratos, paths, recovery y fallos
simulados. No se ejecutaron en esta ronda los ocho canarios, v1-v8, los 90 labs
ni un holdout independiente. Por tanto, no existe una medicion nueva de recall,
precision, ruido, tiempo, memoria o deteccion blind atribuible a estos cambios.
