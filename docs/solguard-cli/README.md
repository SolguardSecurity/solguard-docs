# Solguard CLI

`solguard-cli` es la interfaz local de escritorio. Presenta una consola React
dentro de Tauri, transporta comandos a `solguard-backend` y renderiza sus
respuestas. No audita protocolos, no consulta SQLite, no ejecuta herramientas
del pipeline y no habla con Ollama directamente.

## Responsabilidad cerrada

- Mostrar la consola, el proyecto seleccionado, progreso, resultados y errores.
- Traducir los comandos de usuario a las rutas concretas de Backend.
- Mantener configuracion local minima de la interfaz.
- Conservar el secreto externo exclusivamente en el proceso nativo Tauri.

El frontend web no realiza `fetch` directo. Toda peticion pasa por el comando
nativo `backend_request`; Rust obtiene `EXTERNAL_API_KEY` del entorno y anade
`x-solguard-api-key` sin devolver el secreto al contexto web. La clave debe
tener entre 32 y 256 bytes ASCII imprimibles y no puede contener whitespace.

## Frontera de red

`SOLGUARD_API_URL` es opcional y su valor por defecto es
`http://127.0.0.1:5000`. Si se configura, debe ser un origin HTTP canonico de
loopback: `127.0.0.1`, `localhost` o `::1`, sin usuario, password, path, query ni
fragmento. No se aceptan hosts remotos, redirects ni un proxy HTTP arbitrario.

El proxy nativo:

- admite solo `GET` y `POST` y una allowlist cerrada de rutas usadas por la UI;
- rechaza body en `GET`, rutas desconocidas y queries no previstas;
- limita el request JSON a 1 MiB y la respuesta JSON a 64 MiB;
- exige `application/json` con un objeto como raiz;
- limita el timeout a 100 ms-90 minutos y la conexion a 5 segundos;
- opera bajo una CSP no nula y cerrada a recursos e IPC locales, con
  `style-src 'unsafe-inline'` como excepcion visual documentada.

Estos limites reducen la superficie cliente-backend; no sustituyen la
autorizacion y validacion del propio Backend. El transporte sigue siendo HTTP
sobre loopback y depende de que el launcher entregue la clave al proceso Tauri
de forma segura.

## Comandos de usuario

- `help`
- `install`
- `info`
- `init <nombre> [descripcion]`
- `projects`
- `project <nombre>`
- `search "<consulta>"`
- `ingest <archivo-o-carpeta>`
- `analyze "<target>"`
- `exit`

Son comandos de interfaz. La ejecucion efectiva pertenece a Backend y Core; un
fallo de red o un payload invalido no se convierte en una respuesta simulada de
auditoria.

## Estado de evidencia

Los tests locales del repositorio comprueban delegacion al proxy nativo,
allowlists, limites y CSP. No miden recall, precision, velocidad ni
generalizacion, y no sustituyen una prueba E2E con Backend ni la ejecucion
remota de GitHub Actions.
