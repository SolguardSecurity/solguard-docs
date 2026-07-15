# 01. Introduccion

`solguard-backend` expone la API local usada por el cliente y los runners. Su
responsabilidad termina en la frontera de transporte: prepara el contexto de la
request, llama a `solguard-core` y serializa el resultado.

## Flujo de uso

1. `POST /install` prepara el workspace local.
2. `POST /projects/init` delega la inicializacion del proyecto.
3. `POST /analyze` valida `project`, `target`, `mode` y `run_exploit`, y delega
   la ejecucion al core.
4. Los endpoints de resultados leen o delegan las consultas sin recalcular
   veredictos.
5. `POST /search` y `POST /ingest` conservan su contrato HTTP y delegan sus
   servicios.

## Principios de la frontera

- Los controllers no conocen el orden del pipeline.
- Ninguna ruta genera candidatos, findings o reportes.
- Los errores del core se traducen de forma estable al contrato HTTP.
- `audit_only` sigue siendo una politica publica de `/analyze`; su ejecucion
  real pertenece al core.
- El backend no modifica artefactos autoritativos despues de recibirlos.

## Terminologia

- Senal: evidencia o modelo producido durante el analisis.
- Candidato: hipotesis estructurada que puede llegar a VALIDATE.
- Finding soportado: candidato que VALIDATE clasifica como soportado.
- Admitido: finding soportado que FILTER permite entregar a EXPLOIT.

Estas distinciones pertenecen a los contratos del core y sus herramientas. El
backend solo las presenta a traves de la API.
