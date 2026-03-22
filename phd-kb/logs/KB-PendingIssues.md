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

### TASK-001 — Limpiar entradas TEST en NewsLog
- **Estado:** ✅ Completado 2026-03-22
- **Descripción:** Eliminadas 2 entradas TEST (`doi.org/ssrn_TEST`, `nist.gov/announcing-ai-agent-standards`) + 1 GAO duplicado + 1 test-unique-url. Total: 5 entradas basura eliminadas de Sheet y Supabase.

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
| 2026-03-21 | WebApp-v35 desplegado (GAS Version 44). Añade `deleteByUrl` action para eliminar rows por URL normalizado en cualquier tab. Soporta single y batch. |
| 2026-03-21 | Limpieza run 2026-03-15-005: 20 registros off-topic eliminados de NewsLog via `deleteByUrl`. NewsLog (116) y Supabase (116) ahora sincronizados para run 005. |
| 2026-03-21 | Versiones activas: WebApp-v35, GoogleNewsRSS-v1, PerplexitySearch-v3, SKILL-KB-v17. |
| 2026-03-22 | Auditoría completa Sheet↔Supabase: 5 junk entries eliminadas, 6 orphans corregidos (5 JPG→PDF, 1 NAP2023), 19 archivos académicos indexados de 01_Marco_Teorico y 04_Estado_del_Arte. |
| 2026-03-22 | Inventario PhD folders: carpetas 01-04 completamente indexadas. Carpetas 00, 05-09 no indexadas (admin/herramientas/sistema — decisión intencional). |
| 2026-03-22 | Sync final verificado: Sheet = Supabase = 1,502 items (1,044 web + 458 gdrive://). |
| 2026-03-22 | `append` de WebApp requiere `"rows": [...]` (array), no `"row": {...}`. PR-013 registrado. |
| 2026-03-13 | Google News RSS reemplaza NewsAPI (426 en free tier). Sin API key, sin límite de requests. |
| 2026-03-13 | Duplicate function names resuelto: `_advanceNextRunDate`, `_isQueryDue`, `_fmtDate` eliminadas de PerplexitySearch-v3. Solo viven en AcademicOrchestrator. |
| 2026-03-15 | AcademicQueue first full review: 200 pending → 24 promoted, 156 discarded, 17 reviewed, 3 skipped (dupes). ArXiv queries return massive noise (quantum physics, biology) — needs query refinement or pre-staging filters. |
| 2026-03-15 | Confirmado: `action=append` dedup contra 4 tabs incluye la queue de origen. Para promover desde AcademicQueue usar `action=promoteToNewsLog` (ya documentado, pero se re-confirmó con AcademicQueue). |
| 2026-03-15 | ArXiv_v2.gs creado: inyecta filtro de categorías (cs.AI, cs.CY, cs.LG, etc.) automáticamente en todas las queries arXiv. Reemplaza ArXiv.gs (v1). Versiones activas actualizadas: ArXiv_v2 (pendiente deploy). |
| 2026-03-19 | Supabase proyecto `phd-kb` creado (ID: wtwuvrtmadnlezkbesqp). Tabla `evaluated_items` con 21 cols NewsLog + pgvector embedding + metadata. Reemplazará NewsLog tab como destino de datos evaluados. Sheets se mantiene como control plane (Queries) y staging. Decisión coordinada KB ↔ PM. |
| 2026-03-19 | TRUMP AMERICA AI Act (discussion draft, ~300 pages) es el evento de monitoreo más crítico para la tesis. Requiere análisis detallado urgente — mapear provisiones NIST/risk management contra Arts. 9-15. Si se promulga, transforma el argumento de interoperabilidad. TASK-007 creado. |
| 2026-03-19 | Colorado AI Act enforcement date moved to June 30, 2026 (SB25B-004). NIST RMF affirmative defense unchanged. TASK-008 para actualizar entradas existentes. |
| 2026-03-19 | Digital Omnibus: IMCO/LIBE votaron 101-9-8 el Mar 18. Plenary vote March 26. Fixed dates Dec 2027 (Annex III), Aug 2028 (Annex I). TASK-009 para monitorear. |

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
- **Estado:** Operativo (fase 3 de 4)
- **Descripción:** Supabase es ahora el **destino primario** de items evaluados. NewsLog recibe solo filas de verificación (title, url, importance, source_pipeline, notes="✓ Supabase"). Datos completos solo en Supabase.
- **Progreso:**
  1. ✅ Tabla creada, RLS configurado, función de búsqueda semántica creada
  2. ✅ Backfill completado: 1,489 items migrados desde NewsLog
  3. ✅ SKILL-KB-v16: Supabase-only con batch writes (~20 items) + verification log en Sheet
  4. ✅ Edge function `generate-embeddings` desplegada (gte-small, 384d)
  5. ✅ Embeddings: 1,489/1,489 completados
  6. ✅ SKILL-PM-v7 actualizado con Supabase en §8 y §12
  7. ✅ Dashboard: indicador Supabase live en KB Report + decisión actualizada
- **Próximos pasos:**
  1. Primera sesión `update` con protocolo v16 (Supabase-primary + verification log)
  2. Eventualmente modificar WebApp para que Apps Script escriba directo a Supabase post-evaluación
- **Coordinación:** Decisión compartida KB ↔ PM. PM registra en Dashboard y actualiza §12 (infraestructura).
- **Prioridad:** Media — no bloquea operaciones actuales, pero habilita búsqueda semántica sobre corpus curado
- **Fecha creado:** 2026-03-19

---

### TASK-007 — Análisis detallado del TRUMP AMERICA AI Act (discussion draft)
- **Estado:** ✅ Completado 2026-03-19
- **Descripción:** Análisis de mapeo producido: 10 provisiones del bill mapeadas contra Arts. 9-15 RIA y funciones NIST RMF. Documento en `phd-pm/docs/TASK007_TRUMP_AI_Act_Analisis.docx`. Hallazgos: 4 coincidencias sustanciales, 2 complementos, 2 coincidencias parciales, 2 diferencias. Rol NIST/CAISI legislativamente mandatado es el hallazgo más relevante. Texto completo (~300 pp) pendiente de análisis línea por línea.
- **Impacto:** ALTO — evento de monitoreo crítico para la tesis. Si se promulga, transforma el argumento de interoperabilidad.
- **Prioridad:** URGENTE
- **Fecha detectado:** 2026-03-19

### TASK-008 — Actualizar entrada Colorado AI Act con nueva fecha enforcement
- **Estado:** Pendiente
- **Descripción:** Colorado AI Act enforcement date moved from Feb 1, 2026 to June 30, 2026 via SB25B-004. Existing NewsLog entries about Colorado AI Act need notes updated to reflect the delay. NIST RMF affirmative defense provisions unchanged.
- **Prioridad:** Baja
- **Fecha detectado:** 2026-03-19

### TASK-009 — Monitorear voto plenario Digital Omnibus (March 26, 2026)
- **Estado:** Pendiente
- **Descripción:** IMCO/LIBE adoptaron posición conjunta 101-9-8 el 2026-03-18. Voto plenario scheduled for March 26. Después: trilogues con Council. Rastrear resultado y posiciones del Council.
- **Prioridad:** URGENTE — run `update claude` on or after March 27
- **Fecha detectado:** 2026-03-19

### TASK-010 — Backfill run 210 items to Supabase + update meta
- **Estado:** ✅ Completado 2026-03-19
- **Descripción:** 5 items backfilled to Supabase (HTTP 201). Meta updated to total_searches=210.
- **Prioridad:** Media — data is safe in Sheet, just needs Supabase sync
- **Fecha detectado:** 2026-03-19

### TASK-011 — Agregar columna `chapters` (int[]) a evaluated_items
- **Estado:** Pendiente
- **Descripción:** Agregar columna `chapters` tipo `integer[]` a `evaluated_items` en Supabase. Permitiría asignar capítulos de la tesis (1-7) a cada item para construir una matriz de cobertura por capítulo. Habilitaría queries como "¿qué items ALTA cubren Cap. 5?" y gap analysis a nivel de capítulo. Requiere: (1) ALTER TABLE, (2) batch UPDATE para items existentes basado en capa/tags, (3) actualizar SKILL-KB para incluir chapters en el protocolo de evaluación.
- **Impacto:** Medio — mejora significativa para el PM al planificar redacción por capítulo.
- **Prioridad:** Media — no bloquea operaciones actuales
- **Fecha detectado:** 2026-03-19

---

## Próxima sesión

- **Prioridad 1:** TASK-009 — Post March 26 plenary vote: check Digital Omnibus outcome
- **Prioridad 2:** TASK-007 follow-up — Análisis línea por línea del texto completo (~300 pp) cuando esté disponible en formato procesable
- **Prioridad 3:** BUG-004 — Reducir noise en AcademicQueue (filtros arXiv o pre-screening)
- **Prioridad 4:** BUG-003 — re-evaluar 77 entradas degradadas (priorizar ALTA, usar synthesis de PerplexityQueue)
- **Prioridad 5:** Resolver BUG-001 (84 stuck en PerplexityQueue) — script Python de limpieza
- **Prioridad 6:** TASK-008 — Update Colorado AI Act entries with new June 30 enforcement date
- **Prioridad 7:** TASK-006 — Verificar Supabase end-to-end en sesión con queues activas
- **Prioridad 8:** TASK-011 — Agregar columna `chapters` a Supabase

_Última actualización: 2026-03-22_
