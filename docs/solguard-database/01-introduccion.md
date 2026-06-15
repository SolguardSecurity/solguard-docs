# Introducción

`solguard-database` es la base de conocimiento local de Solguard para reportes de auditoría, patrones de findings y evidencia documental estructurada. No es un backend de usuario final ni una API conversacional. Su responsabilidad es convertir documentos de seguridad en datos indexados, persistentes y reutilizables para que otras capas del sistema, especialmente `solguard-backend`, puedan consultarlos durante búsquedas y análisis.

## Rol dentro del ecosistema

La función de este repositorio es doble. Por un lado, ofrece una biblioteca Rust reutilizable para procesar documentos. Por otro, mantiene el almacenamiento SQLite local y el conector técnico que inserta payloads en esa base. Esto significa que `solguard-database` actúa como memoria estructurada del sistema, no como motor de orquestación.

En términos operativos, la pregunta que responde este componente es: cómo se transforma un informe PDF, Markdown o texto plano en un conjunto de findings, taxonomías, chunks y snippets consultables por otras herramientas.

## Qué hace y qué no hace

Sí hace:

- procesar documentos de auditoría,
- extraer texto y normalizarlo,
- perfilar el tipo de documento,
- detectar findings y clasificarlos,
- construir taxonomía auditable,
- guardar datos estructurados en SQLite,
- mantener FTS, embeddings locales y métricas de calidad de parsing.

No hace:

- hablar directamente con Ollama,
- decidir prompts o hipótesis de auditoría,
- ejecutar `solguard-map`, `solguard-trace` o `solguard-diff`,
- servir como interfaz interactiva al usuario,
- orquestar auditorías por sí solo.

Esta frontera es esencial. La base de datos no es el sistema de IA. Es la fuente estructurada de conocimiento que alimenta a la capa que sí se comunica con la IA.

## Flujo conceptual

El flujo base del repositorio es:

```text
PDF / Markdown / TXT
        -> texto bruto
        -> detección de perfil documental
        -> Markdown normalizado
        -> findings candidatos
        -> snippets de código clasificados
        -> payload JSON
        -> inserción transaccional en SQLite
```

Ese pipeline deja dos cosas claras. Primero, la base no guarda documentos sin procesar como blobs opacos para que un LLM los “entienda después”. Segundo, el conocimiento se estructura antes de entrar en la base, no durante la consulta.

## Componentes principales

El repositorio está dividido en tres capas técnicas:

- `crates/solguard-core`, que contiene la lógica Rust de ingesta, normalización, perfilado y extracción;
- `apps/db-connector`, que contiene el conector TypeScript responsable de la escritura en SQLite;
- `migrations/001_init.sqlite.sql`, que define el esquema relacional y los índices de la base.

La carpeta `data/` es el espacio persistente local donde se almacena la base SQLite y donde pueden quedar artefactos derivados como payloads o texto normalizado.

## Por qué existe como pieza separada

La razón de separar `solguard-database` de `solguard-backend` es de responsabilidad y reutilización. La lógica de parsing documental y persistencia estructurada puede evolucionar como biblioteca y dataset sin quedar acoplada a la API externa, al pipeline de auditoría o a la capa de IA. A la vez, el backend puede consumir esta base como conocimiento estable y consultable sin duplicar el trabajo de extracción documental.
