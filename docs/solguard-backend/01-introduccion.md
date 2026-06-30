# 01. Introduccion

`solguard-backend` es el cerebro operativo local de SolGuard. Su funcion no es
solo exponer endpoints: prepara proyectos, descarga o ubica codigo objetivo,
ejecuta herramientas especializadas, normaliza candidatos, valida evidencias y
publica artefactos que permiten entender por que un candidato fue soportado,
rechazado o enviado a revision.

## Responsabilidades principales

- Exponer la API local que usa el cliente o los runners.
- Levantar y autenticar el servicio interno de IA.
- Coordinar herramientas externas: map, diff, trace, discover, economic,
  invariant y validate.
- Convertir salidas heterogeneas en contratos JSON estables.
- Generar artefactos humanos: `findings.md`, `review_queue.md`,
  `validation_plan.md`, informes tecnicos y planes de PoC.
- Consultar la base de conocimiento para busqueda e ingesta.
- Enriquecer findings ya validados con similitudes historicas sin contaminar la
  decision determinista.

## Modelo de confianza

El backend distingue entre tres niveles:

- Senal: informacion de herramientas, patrones o modelo que sugiere riesgo.
- Candidato: hipotesis normalizada con superficies, invariantes, transiciones y
  evidencia referenciada.
- Finding soportado: candidato que VALIDATE clasifica como `supported_finding`.

La salida publica de findings solo debe venir del tercer nivel. Los candidatos
inconclusos permanecen visibles en `review_queue.md` o como `reviewable_lead`,
pero no se mezclan con findings soportados.

## Flujo de uso

1. `POST /install` crea el workspace local si no existe.
2. `POST /projects/init` crea un proyecto con `program.json`, `program.md`,
   `tool-outputs/` y `reports/`.
3. `POST /analyze` ejecuta el pipeline completo sobre un target local o remoto.
4. `GET /projects/:project/validation-results` permite consultar el contrato de
   validacion y filtrarlo.
5. `POST /search` consulta el modelo local y, segun modo, la base de
   conocimiento.
6. `POST /ingest` incorpora informes externos a la base SQLite.

## Principios actuales

- Preferir evidencia enlazada a artefactos antes que texto libre.
- Conservar diagnosticos de rechazo; no borrar senales solo porque no puedan
  validarse.
- Registrar degradaciones de fase de forma explicita.
- Mantener el modelo fuera de decisiones autoritativas cuando el codigo ya tiene
  una regla determinista.
- Separar enriquecimiento historico posterior a la validacion del analisis ciego
  previo.
