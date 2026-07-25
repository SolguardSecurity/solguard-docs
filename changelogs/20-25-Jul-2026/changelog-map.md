# Changelog

Este documento registra cambios comprobables de `solguard-map`. No es una
declaración de recall, precisión, velocidad ni capacidad de generalización.

## 2026-07-24 - Autoridad MAP cerrada y bindings callables exactos

Commit funcional: `7103016389dd74abae0e9afadf989e0c3f99acba`.

### Qué se ha modificado

- MAP publica y valida un ledger físico de evidencia. Solo un `EvidenceItem`
  canónico, con el wire exacto `id,file,line,kind,parser_mode,detail`, puede
  crear autoridad. El consumidor interno recompone el `ev-<fnv64>` y rechaza
  IDs de owner sin membresía, objetos semánticos anidados, campos desconocidos,
  enums no admitidos, descriptores vacíos y colisiones.
- Las aristas callables resueltas quedan ligadas a identidades exactas de
  función y símbolo en ambos extremos. Un nombre visible duplicado o un target
  ambiguo ya no puede convertirse en una arista exacta por coincidencia de
  texto.
- El merge de aliases produce un inventario único, determinista y con
  aritmética de cobertura coherente; prioriza la procedencia canónica frente a
  una proyección generada.
- El agotamiento del presupuesto CFG se registra como deuda semántica y no como
  una falsa omisión física de fuentes.
- En Windows, la autoridad del repositorio diferencia disco local, rutas UNC,
  dispositivos, drives mapeados y formas drive-relative. La cadena física de
  directorios se bloquea y revalida para detectar sustituciones del root.
- El contrato compartido `source-integrity.v1` incorpora el verificador de un
  receipt TRACE ya publicado y de su upstream MAP físico. Las copias de MAP,
  TRACE y FILTER vuelven a ser byte-idénticas; MAP expone el helper común pero
  no lo convierte en autoridad de finding.

### Por qué

Los consumidores downstream estaban obligados a confiar en IDs o nombres que
podían parecer correctos sin demostrar la existencia del objeto físico exacto.
Este cierre convierte MAP en la fuente explícita de autoridad física y evita
que una copia semántica, un alias o una sobrecarga homónima se promocionen como
evidencia exacta.

### Evidencia de validación disponible

Se añadieron regresiones para el golden del ID MAP, forma cerrada del item,
membresía de owners, colisiones, bindings de funciones sobrecargadas, merge de
aliases, frontera CFG y clasificación física de paths Windows. El canario real
Compound `r6` consumió este MAP y la evaluación posterior clasificó la fase MAP
como completa. Es un único caso de regresión conocida, no una medición global.

### Límites y riesgos residuales

- Los parsers y fallbacks heurísticos siguen sin equivaler a un AST completo.
- Los techos físicos pueden rechazar legítimamente repositorios mayores.
- El modo standalone sin `--source-integrity` conserva menos autoridad que la
  ejecución orquestada.
- MAP no confirma vulnerabilidades, impacto o explotabilidad.
- No existe todavía aceptación 8/8, replay v1-v8/labs, CI remoto ni holdout
  para este árbol sin commit.

## 2026-07-22 - Macroauditoría de madurez, límites y autoridad física

### Alcance y evidencia

La entrada agrupa los commits funcionales `dfe544cbe360807704d9fa13c3ecc5693bbdebf1`,
`aa212976f5d5920890afa502a47a6a7f8a85fa11` y
`ba409b639e97ad19ad00017a2024c96d3ad7ee0a`. La revisión se hizo sobre esos
commits y sobre el árbol resultante; no se añadieron familias de detección para
protocolos concretos.

### Responsabilidad cerrada

MAP queda limitado a analizar una instantánea local y física de fuentes,
enumerar superficies y producir contratos deterministas. La adquisición de
repositorios remotos, la ejecución de toolchains, el razonamiento LLM, la
validación de vulnerabilidades y la persistencia pertenecen a otras capas.

- Una URL, una referencia SCP/Git o una ruta de red no es una entrada válida.
  CORE debe materializar previamente una instantánea local acotada.
- `--branch` se conserva únicamente como argumento de compatibilidad y se
  rechaza para entradas locales; MAP no clona ni cambia revisiones.
- `--build-probe` se rechaza antes de analizar o publicar. MAP infiere contexto
  de build desde archivos, pero no ejecuta scripts, compiladores ni hooks del
  repositorio auditado.
- `--source-integrity` sigue siendo obligatorio para autoridad orquestada. Su
  ausencia permite el uso standalone deliberado, pero no crea un recibo de
  integridad ni una señal de salud orquestada.

### `dfe544c` - análisis acotado y modularización

Antes de este commit, la lectura de fuentes estaba repartida entre productores
y `src/semantic/economic_flows.rs` concentraba 7.471 líneas. El cambio introdujo
una frontera común de lectura física y separó las responsabilidades del motor
de flujos sin cambiar deliberadamente su catálogo de reglas conocidas.

- `src/source_reader.rs` centraliza resolución relativa, lectura y
  revalidación física. Rechaza traversal, enlaces simbólicos, reparse points,
  hardlinks, cambios de ruta canónica, cambios de identidad y drift de tamaño o
  metadatos durante el acceso.
- Una fuente puede tener hasta 8 MiB para la inspección física. La proyección
  indexada utilizada por analizadores está limitada a 1.500.000 bytes; superar
  esa proyección no autoriza una lectura silenciosamente truncada.
- Las rutas relativas se limitan a 16 KiB, 256 componentes y 255 bytes por
  componente.
- Discovery quedó acotado a 200.000 entradas observadas, 100.000 fuentes
  indexadas, 1 GiB agregado y 120 segundos. El primer exceso termina antes de
  publicar `audit_map.json`.
- Los CFG heurísticos quedaron acotados por función a 2.048 líneas, 512 nodos y
  512 aristas proyectadas. Un exceso publica deuda tipada/incompletitud; no
  presenta la ausencia de un nodo o ruta como conocimiento exacto.
- La lógica de flujos económicos se distribuyó entre el coordinador,
  `branching.rs`, `route_identity.rs` y pruebas dedicadas. En el árbol final son
  4.297, 895, 817 y 1.368 líneas respectivamente; ningún archivo de producción
  de esta extracción supera 6.000 líneas.
- `known_patterns.rs` separa datos de compatibilidad del motor estructural. Esta
  extracción fue organizativa: no demuestra nueva generalización ni introduce
  una familia específica de protocolo.
- Las colecciones acotadas conservan recibos de cobertura y distinguen llegar
  exactamente al límite de observar una identidad adicional. El segundo caso
  produce deuda explícita.

### `aa21297` - gates reproducibles

- Rust está fijado en `1.96.0`, perfil `minimal`, con `rustfmt` y `clippy`.
- CI ejecuta una matriz `ubuntu-24.04` / `windows-2025`.
- Las dependencias se resuelven con `Cargo.lock` mediante `--locked`.
- El workflow comprueba formato, Clippy con warnings como error, todos los
  tests/targets/features y build release de todos los targets/features.
- `actions/checkout` y `dtolnay/rust-toolchain` están fijados por SHA y checkout
  no persiste credenciales.
- El workflow tiene `contents: read`, timeout de 60 minutos y cancelación por
  concurrencia.

La configuración de CI fue validada localmente, pero esta entrada no afirma que
GitHub Actions remoto haya sido ejecutado tras estos commits.

### `ba409b6` - autoridad de entrada y publicación de bundle

- El root de entrada debe ser un directorio físico local. Se inspecciona antes
  y después de canonizarlo y se rechazan symlinks y reparse points.
- El inventario discovery usa presupuestos inclusivos: 100.000 fuentes, 1 GiB,
  200.000 entradas y 120 segundos. Un corpus que exceda cualquiera de ellos
  falla cerrado; no se publica un mapa parcial como completo.
- Todos los reportes se construyen dentro de un directorio staging privado y
  hermano del destino. El bundle esperado se enumera y cada miembro debe ser un
  fichero físico, no vacío y declarado.
- `audit_map.json` y `audit_map.coverage.json` se crean sin reemplazo y se
  revalidan por identidad, bytes, SHA-256 y contenido contractual.
- Cuando se usa integridad orquestada, `source_integrity.json` debe vincular el
  descriptor del `audit_map.json` staged y, antes del commit, se valida contra
  el path físico final que tendrá el primario.
- La publicación es un único rename del directorio staged. Un destino no vacío,
  enlazado o creado concurrentemente se rechaza. Un fallo previo elimina solo
  el staging propio y no expone un conjunto parcial de reportes.
- Se añadieron pruebas de publicación completa, fallo inyectado, destino no
  vacío/enlazado, rechazo de adquisición remota, rechazo de `--branch`, rechazo
  de `--build-probe` y exclusión de rutas no seleccionadas.

### Antes y después

| Área | Antes de la macroauditoría | Estado tras estos commits |
| --- | --- | --- |
| Adquisición | MAP podía aceptar una referencia remota y asumir trabajo de clonación | Solo instantánea física local; adquisición remota pertenece a CORE |
| Toolchain del auditado | Existía un camino de build probe | El argumento se rechaza; ningún toolchain del auditado se ejecuta |
| Lectura de fuentes | Lecturas distribuidas y con autoridad desigual | Lector físico compartido, acotado y revalidado |
| Límites | Parte del trabajo podía terminar sin una frontera global clara | Inventario, bytes, tiempo, CFG y rutas tienen límites y deuda/fallo explícitos |
| Publicación | Primario y sidecar podían instalarse como unidades parciales | Bundle completo staged, validado y publicado create-only en una transacción |
| Mantenibilidad | Motor económico monolítico de 7.471 líneas | Branching, identidad y tests separados; coordinador final de 4.297 líneas |

### Validación local de cierre

Ejecutada el 22 de julio de 2026 sobre Windows y el árbol exacto descrito:

```text
cargo test --locked --all-targets --all-features
resultado: 179 passed; 0 failed; 0 ignored

cargo fmt --all -- --check
resultado: correcto

cargo clippy --locked --all-targets --all-features -- -D warnings
resultado: correcto

cargo build --locked --release --all-targets --all-features
resultado: correcto

git diff --check
resultado: correcto
```

Los 179 tests son la suma de los ejecutables de prueba que Cargo reportó por
separado. No son 179 protocolos ni 179 vulnerabilidades.

### Riesgos y límites residuales

- Los parsers heurísticos y fallbacks siguen siendo aproximaciones. Una deuda
  de cobertura impide autoridad de ausencia, pero no convierte la aproximación
  en AST completo.
- Los límites físicos son defensas operativas; un repositorio legítimo que los
  exceda fallará cerrado y requerirá una decisión explícita de producto.
- El modo standalone sin `--source-integrity` no ofrece la misma autoridad que
  el pipeline orquestado.
- MAP enumera y estructura evidencia. No confirma explotabilidad, impacto ni
  vulnerabilidades y no debe presentarse como auditor final.
- No se ejecutó CI remoto, un replay v1-v8, los 90 labs, canarios ni un holdout
  blind durante este cierre documental.

### Afirmaciones deliberadamente no realizadas

Estos cambios no prueban mejor recall, precisión, velocidad, memoria,
generalización ni descubrimiento de bugs nuevos. Solo prueban, mediante código y
tests locales, límites más explícitos, aislamiento de responsabilidades,
publicación transaccional y una estructura más mantenible.
