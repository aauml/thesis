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
| 2026-03-15 | ArXiv_v2.gs creado: inyecta filtro de categorías (cs.AI, cs.CY, cs.LG, etc.) automáticamente en todas las queries arXiv. Reemplaza ArXiv.gs (v1). Versiones activas actualizadas: ArXiv_v2 (pendiente deploy). |
| 2026-03-19 | Supabase proyecto `phd-kb` creado (ID: wtwuvrtmadnlezkbesqp). Tabla `evaluated_items` con 21 cols NewsLog + pgvector embedding + metadata. Reemplazará NewsLog tab como destino de datos evaluados. Sheets se mantiene como control plane (Queries) y staging. Decisión coordinada KB ↔ PM. |

---

### BUG-004 — AcademicOrchestrator arXiv noise: massive off-topic returns
- **Estado:** ✅ Fix preparado — pendiente deploy
- **Descripción:** ArXiv queries retornan papers completamente off-topic (quantum physics, coral larvae, Hawking radiation) para queries de AI Act, Forensic AI, etc. La query construction en `q_arxiv` no filtra por categoría o subject. De 200 items pendientes, 79 fueron obviamente off-topic por keywords, y ~77 adicionales fueron tangenciales.
- **Impacto:** Alto — la mayoría de los items en AcademicQueue son noise, desperdiciando tiempo de evaluación.
- **Fix:** `ArXiv_v2.gs` — inyecta filtro de categorías automáticamente en todas las queries. Categorías permitidas: cs.AI, cs.CY, cs.LG, cs.CR, cs.HC, cs.CL, cs.SE, stat.ML, eess.SP, q-bio.QM. Si `q_arxiv` ya contiene `cat:`, no se inyecta (permite overrides manuales). Archivo disponible en repo (`ArXiv_v2.gs`) y en outputs.
- **Deploy:** Usuario debe copiar contenido de `ArXiv_v2.gs` al editor GAS, reemplazando `ArXiv.gs`. No requiere redesploy del WebApp (es script interno del AcademicOrchestrator).
- **Fecha detectado:** 2026-03-15
- **Fecha fix preparado:** 2026-03-15

### TASK-006 — Integrar Supabase como destino de escritura post-evaluación
- **Estado:** En progreso (fase 2 de 4)
- **Descripción:** Proyecto Supabase `phd-kb` creado (ID: `wtwuvrtmadnlezkbesqp`, región: us-west-1, org: ademas.ai). Tabla `evaluated_items` con 27 columnas: 21 NewsLog + `embedding` (pgvector 384d, gte-small), `source_pipeline`, `migrated_from_sheet`, `pk` (UUID), `created_at`, `updated_at`. Índices: ivfflat para búsqueda semántica, btree para importance/capa/tier/action_tag/folder/run_id/created_at. Constraint `unique_url` para dedup. RLS habilitado con políticas open para anon key. Función `search_evaluated_items` para búsqueda semántica.
- **Progreso:**
  1. ✅ Tabla creada, RLS configurado, función de búsqueda semántica creada
  2. ✅ Backfill completado: 1,489 items migrados desde NewsLog
  3. ✅ SKILL-KB-v15 actualizado con dual-write protocol
  4. ✅ Edge function `generate-embeddings` desplegada (gte-small, 384d)
  5. ✅ Embeddings: ~634+ generados, resto en proceso
  6. ✅ SKILL-PM-v7 actualizado con Supabase en §8 y §12
- **Próximos pasos:**
  1. Completar generación de embeddings para los ~855 items restantes
  2. Verificar búsqueda semántica end-to-end
  3. Primera sesión `update` con dual-write activo (Sheet + Supabase)
  4. Eventualmente modificar WebApp para que Apps Script escriba directo a Supabase post-evaluación
- **Coordinación:** Decisión compartida KB ↔ PM. PM registra en Dashboard y actualiza §12 (infraestructura).
- **Prioridad:** Media — no bloquea operaciones actuales, pero habilita búsqueda semántica sobre corpus curado
- **Fecha creado:** 2026-03-19

---

## Próxima sesión

- **Prioridad 1:** BUG-004 — Reducir noise en AcademicQueue (filtros arXiv o pre-screening)
- **Prioridad 2:** BUG-003 — re-evaluar 77 entradas degradadas (priorizar ALTA, usar synthesis de PerplexityQueue)
- **Prioridad 3:** Resolver BUG-001 (84 stuck en PerplexityQueue) — script Python de limpieza
- **Prioridad 4:** TASK-001 — limpiar 3 entradas TEST en NewsLog
- **Prioridad 5:** `update academic` — remaining ~6 pending items if any after today's processing
- **Prioridad 6:** TASK-006 — Completar embeddings (~855 restantes), verificar semantic search, primera sesión con dual-write activo

_Última actualización: 2026-03-19_
