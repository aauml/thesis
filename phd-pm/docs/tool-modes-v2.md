# Modos de herramientas y cuándo usarlos
**Versión:** v2 · **Fecha:** 2026-03-14
_Referencia rápida para orquestación multi-LLM. Al actualizar, crear tool-modes-v3.md — nunca sobrescribir este archivo._

---

## Claude / Cowork (este proyecto)

| Capacidad | Cuándo usar | Cuándo NO usar |
|---|---|---|
| **Consolidación** | Sintetizar outputs de múltiples herramientas, resolver contradicciones | Como primera fuente de búsqueda bibliográfica |
| **Redacción final** | Borradores de capítulos, fichas, análisis con fuentes ya recopiladas | Búsqueda exploratoria de literatura nueva |
| **Verificación** | Contrastar citas contra PDFs del proyecto, validar datos | Búsqueda de fuentes no descargadas |
| **Dashboard** | Actualizar `dashboard.html`, Obsidian Digest, Registro de Decisiones | — |
| **Obsidian vault** | Leer notas, sugerir reorganización, identificar notas maduras | Escribir en el vault sin instrucción explícita |
| **KB API** | Verificar si una fuente está catalogada, buscar por capa/importancia/tema | Búsqueda general de literatura |
| **GitHub** | Commit y push de `dashboard.html` | Modificar `index.html` o scripts GAS |

---

## ChatGPT Pro

| Modo | Cuándo usar | Cuándo NO usar |
|---|---|---|
| **Reasoning** | Evaluación multi-criterio, razonamiento paso a paso, comparaciones sistemáticas con justificación | Tareas simples, síntesis rápida |
| **Standard** | Síntesis rápida, análisis de datos, generación de contenido | Cuando se necesita razonamiento profundo |
| **Deep Search** | Fuentes específicas que otros modelos no encontraron | Ya tienes fuentes suficientes de Perplexity |
| **Agent** | Tarea multi-paso con planificación dinámica | Cuando ya tienes workflow estructurado |
| **Reasoning + Deep Search** | Análisis complejo que requiere buscar fuentes nuevas durante el razonamiento | Ya tienes todas las fuentes |

---

## Perplexity Pro

| Modo | Cuándo usar |
|---|---|
| **Pro Search** | Búsqueda exhaustiva, fuentes académicas, citación precisa |
| **Quick Search** | Verificación rápida, preguntas simples |

---

## Gemini Pro

| Modo | Cuándo usar |
|---|---|
| **Deep Research** | Informe exhaustivo sobre un tema, tiempo no crítico (10-15 min). SIEMPRE verificar outputs. |
| **Búsqueda estándar** | Verificación rápida, búsqueda dirigida |

---

## NotebookLM

| Método | Cuándo usar |
|---|---|
| **Deep Research** | No sabes qué documentos buscar, tema amplio |
| **Subir docs manualmente** | Ya tienes los PDFs, control total sobre fuentes |

REGLA: Siempre DOS prompts. Prompt A (búsqueda/agregación de fuentes) + Prompt B (análisis con preguntas específicas).

---

## Asta (Semantic Scholar)

| Uso | Cuándo |
|---|---|
| **Síntesis multi-paper** | Necesitas panorama de literatura académica con citas trazables |
| **Descubrimiento** | Buscar papers relacionados a partir de uno conocido |

Limitación: Sesgo STEM/CS. Cobertura débil en derecho europeo. Fuerte en gobernanza IA y ciencia forense.

---

## Decisión rápida por tipo de tarea

| Tarea | Herramienta principal | Modo |
|---|---|---|
| Buscar literatura académica | Perplexity + Asta | Pro Search |
| Evaluar algo con criterios | ChatGPT | Reasoning |
| Analizar corpus documental | NotebookLM | Dos prompts |
| Verificar fuentes citadas | Claude | PDFs del proyecto |
| Sintetizar outputs contradictorios | Claude | Análisis directo |
| Búsqueda exhaustiva oficial | NotebookLM | Deep Research |
| Generar framework/rúbrica | ChatGPT | Reasoning |
| Informe extenso exploratorio | Gemini | Deep Research (verificar todo) |
| Actualizar dashboard / vault | Claude / Cowork | — |
| Consolidar multi-fuente → manuscrito | Claude / Cowork | — |

---

## Historial de versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| v1 | 2026-03-14 | Versión inicial: ChatGPT, Perplexity, Gemini, NotebookLM, Asta. |
| v2 | 2026-03-14 | Sección Claude/Cowork añadida. Dos filas nuevas en tabla de decisión rápida. Aviso de no sobrescribir en encabezado. |
