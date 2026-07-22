# 03. SolGuard Diff

`solguard-diff` analiza historial Git y, opcionalmente, PRs de GitHub para
priorizar cambios que merecen revision manual.

No dice que un commit introdujo una vulnerabilidad. Dice que un cambio toca
superficies, patrones o archivos relevantes para auditoria.

## Inputs

Entrada principal:

```text
<repo git local>
```

Inputs opcionales:

- `--map <audit_map.json>` para cruzar cambios con superficies MAP.
- GitHub API para PRs si se activa explicitamente.

## CLI actual

Analizar ultimos commits:

```powershell
cargo run -- <repo> --out solguard-diff-output
```

Analizar rango:

```powershell
cargo run -- <repo> --base main --head HEAD --commits 50
```

Cruzar con MAP:

```powershell
cargo run -- <repo> --map solguard-output/audit_map.json
```

Leer PRs:

```powershell
cargo run -- <repo> --github-api --prs 20
```

Opciones:

| Opcion | Funcion |
| --- | --- |
| `<repo>` | Repo local. Default: `.`. |
| `--out <dir>` | Directorio de salida. Default: `solguard-diff-output`. |
| `--commits <n>` | Numero de commits. Default: `20`. |
| `--base <ref>` | Base del rango. |
| `--head <ref>` | Head del rango. Default: `HEAD`. |
| `--map <path>` | `audit_map.json` para surface hits. |
| `--github-api` | Activa lectura de PRs. |
| `--prs <n>` | Numero de PRs. Default: `20`. |
| `--github-token-env <name>` | Env var del token. Default: `GITHUB_TOKEN`. |

## Salidas

- `recent_commits.json`
- `recent_commits.md`
- `pull_requests.json`
- `pull_requests.md`
- `risky_changes.json`
- `risky_changes.md`
- `changed_surfaces.csv`
- `diff_summary.txt`

## Que puntua

DIFF combina:

- archivos cambiados;
- tamano del diff;
- lenguaje;
- keywords de auditoria;
- cambios en configuracion, permisos, oraculos, accounting, tests o workflows;
- hits contra superficies de `audit_map.json`;
- contexto de commit o PR.

Las prioridades son de revision, no severidad.

## Uso en el pipeline core

DIFF aporta dimension temporal. Ayuda a preguntar:

- que cambio desde el baseline;
- que superficies ya mapeadas fueron tocadas;
- que invariantes o rutas deberian revisarse otra vez.

## Frontera operacional actual

DIFF inspecciona Git con un ejecutable canonico (o
`SOLGUARD_GIT_BIN` absoluto), entorno minimo, home/config aislados y hooks,
textconv y external diff deshabilitados. Los comandos tienen timeout, stdout y
stderr bounded y terminacion del arbol de procesos. Configuracion host o del
repositorio no puede convertirse en ejecucion implicita durante la inspeccion.

La adquisicion publica estado completo o deuda tipada para commits/files; no
presenta una muestra truncada como inventario total. El output requiere un root
fresco o vacio, se vuelve a hashear y publica un manifest. GitHub sigue siendo
opt-in y no cambia la autoridad del historial local.

## Limites

- Necesita repo Git local para historial.
- GitHub API es opcional y no participa si no se activa.
- No valida comportamiento incorrecto ni exploitability.
- Un `risky_change` es una pista de revision, no un finding.
