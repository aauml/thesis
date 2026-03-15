# KB Pending Issues & Known Bugs
_Actualizar al cierre de cada sesión. Este archivo es la memoria técnica del sistema._

---

## Bugs conocidos (sin resolver)

### BUG-001 — 84 items stuck en PerplexityQueue
- **Estado:** Abierto
- **Descripción:** 84 rows duplicados en PerplexityQueue con status "pending" que no se actualizan con `updatePerplexityRow url=X`. Son duplicados de runs anteriores (mismo URL, distintos run_ids). El lookup por URL + pending solo procesa el primero; los duplicados restantes quedan atascados.
- **Impacto:** Bajo — son duplicados de contenido ya procesado. No afectan el NewsLog.
- **Fix posible:** Correr script Python que llame `updatePerplexityRow` múltiples veces por URL hasta que no queden pending. O purgar manualmente desde el sheet.
- **Fecha detectado:** 2026-03-13

### BUG-003 — 77 entradas degradadas en NewsLog (context window compression)
- **Estado:** Abierto
- **Descripción:** Sesión `update perplexity` del 2026-03-13 procesó 198 items (run `2026-03-13-205`). Al agotarse el contexto, 77 entradas fueron promovidas con `thesis_relevance` degradada: empiezan con "This content addresses [X]." y terminan con texto boilerplate genérico. Longitud promedio: 433ch vs. 1074ch de las entradas limpias.
- **Impacto:** Medio — 77 entradas en NewsLog tienen evaluación de tesis incompleta. Las entradas existen y no son duplicados, pero su valor analítico es mínimo.
- **Fix:** En sesión fresca: (1) filtrar NewsLog por `run_id=2026-03-13-205` y `thesis_relevance` corta, (2) recuperar síntesis originales de PerplexityQueue (aún existen, marcadas `promoted`), (3) re-evaluar y actualizar via `updateByUrl`. Priorizar las marcadas `importance=ALTA`.
- **Prevención:** SKILL-KB-v11 introduce límite hard de 50 items por sesión y quality gate (bloquea posts con thesis_relevance < 600ch o con boilerplate detectado).
- **Fecha detectado:** 2026-03-13

### BUG-002 — sweep_index architectural bug en AcademicOrchestrator
- **Estado:** Abierto
- **Descripción:** El índice `sweep_index` avanza más allá del array de queries elegibles cuando el array se reduce entre runs. Causa que algunas queries se salten en el historical sweep.
- **Impacto:** Medio — algunas queries académicas no se barren en el historical sweep.
- **Fix posible:** Resetear sweep_index cuando supere el tamaño del array elegible, o usar un cursor diferente.
- **Fecha detectado:** Sesión anterior a 2026-03-13

---

## Tareas técnicas pendientes

### TASK-001 — Limpiar 3 entradas TEST en NewsLog
- **Estado:** Pendiente
- **Descripción:** Durante debugging el 2026-03-13 se añadieron 3 entradas con `notes: "TEST - DELETE"`. URLs: `techcrunch.com/2026/03/01/nist-ai-framework-test-entry`, `nist.gov` (variante no-www), `diligent.com`.
- **Acción:** Llamar `updateByUrl` o `updateRow` para cada una con `notes: "DELETE"` y luego borrarlas manualmente del sheet, o añadir un action=deleteRow al WebApp.
- **Prioridad:** Baja

### TASK-002 — Desplegar WebApp-v32 en GAS
- **Estado:** ✅ Completado 2026-03-13
- **Descripción:** WebApp-v32 desplegado. Corrige normalizeUrl (strip www.), updatePerplexityRow/updateAcademicRow pending-first lookup.

### TASK-003 — Reemplazar NewsSearch.gs con GoogleNewsRSS.gs
- **Estado:** ✅ Completado 2026-03-13
- **Descripción:** GoogleNewsRSS-v1 desplegado y verificado. quickTestNewsAPI() devuelve 15 resultados relevantes. NewsAPI (426) reemplazado completamente.

### TASK-004 — Reemplazar SKILL-KB en proyecto phd-kb
- **Estado:** ✅ Completado 2026-03-13
- **Descripción:** SKILL-KB-v10.md activo en el proyecto phd-kb. Incluye Session Closing Protocol, protocolo de versioning, y correcciones de bugs.

### TASK-005 — Corregir duplicate function warning en GAS
- **Estado:** ✅ Completado 2026-03-13
- **Descripción:** `PerplexitySearch.gs` y `AcademicOrchestrator.gs` ambos definían `_advanceNextRunDate`, `_isQueryDue`, `_fmtDate`. GAS lanzaba warning "functions with same name" en todos los triggers. `PerplexitySearch-v3.txt` desplegado — duplicados eliminados de PerplexitySearch, quedan en AcademicOrchestrator.

---

## Decisiones técnicas registradas

| Fecha | Decisión |
|-------|----------|
| 2026-03-13 | Dedup en `action=append` es por URL normalizado (no por ID). Para promover desde queues usar `action=promoteToNewsLog`. |
| 2026-03-13 | `updatePerplexityRow` y `updateAcademicRow` deben usar `url` como lookup key, nunca `id`. |
| 2026-03-13 | `normalizeUrl` debe quitar `www.` para evitar que `www.domain.com` y `domain.com` sean tratados como URLs distintas. |
| 2026-03-13 | NewsAPI free tier devuelve 426 desde GAS. Reemplazado por Google News RSS (sin key, sin límite). |
| 2026-03-13 | Versiones activas: WebApp-v32, GoogleNewsRSS-v1, PerplexitySearch-v3, SKILL-KB-v11. |
| 2026-03-13 | Google News RSS reemplaza NewsAPI (426 en free tier). Sin API key, sin límite de requests. |
| 2026-03-13 | Duplicate function names resuelto: `_advanceNextRunDate`, `_isQueryDue`, `_fmtDate` eliminadas de PerplexitySearch-v3. Solo viven en AcademicOrchestrator. |
| 2026-03-15 | AcademicQueue first full review: 200 pending → 24 promoted, 156 discarded, 17 reviewed, 3 skipped (dupes). ArXiv queries return massive noise (quantum physics, biology) — needs query refinement or pre-staging filters. |
| 2026-03-15 | Confirmado: `action=append` dedup contra 4 tabs incluye la queue de origen. Para promover desde AcademicQueue usar `action=promoteToNewsLog` (ya documentado, pero se re-confirmó con AcademicQueue). |

---

### BUG-004 — AcademicOrchestrator arXiv noise: massive off-topic returns
- **Estado:** Abierto
- **Descripción:** ArXiv queries retornan papers completamente off-topic (quantum physics, coral larvae, Hawking radiation) para queries de AI Act, Forensic AI, etc. La query construction en `q_arxiv` no filtra por categoría o subject. De 200 items pendientes, 79 fueron obviamente off-topic por keywords, y ~77 adicionales fueron tangenciales.
- **Impacto:** Alto — la mayoría de los items en AcademicQueue son noise, desperdiciando tiempo de evaluación.
- **Fix posible:** (1) Añadir `cat:cs.*` o filtro de categoría a las queries arXiv en AcademicOrchestrator, (2) Implementar pre-screening por abstract keywords antes de staging, (3) Revisar `q_arxiv` fields en Queries tab para queries más precisas.
- **Fecha detectado:** 2026-03-15

---

## Próxima sesión

- **Prioridad 1:** BUG-004 — Reducir noise en AcademicQueue (filtros arXiv o pre-screening)
- **Prioridad 2:** BUG-003 — re-evaluar 77 entradas degradadas (priorizar ALTA, usar synthesis de PerplexityQueue)
- **Prioridad 3:** Resolver BUG-001 (84 stuck en PerplexityQueue) — script Python de limpieza
- **Prioridad 4:** TASK-001 — limpiar 3 entradas TEST en NewsLog
- **Prioridad 5:** `update academic` — remaining ~6 pending items if any after today's processing

_Última actualización: 2026-03-15_
