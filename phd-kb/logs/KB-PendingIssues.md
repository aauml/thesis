# KB Pending Issues & Known Bugs
_Actualizar al cierre de cada sesión. Este archivo es la memoria técnica del sistema._

---

## Bugs conocidos (sin resolver)

### BUG-001 — 84 items stuck en PerplexityQueue
- **Estado:** ✅ Resuelto 2026-03-22
- **Descripción:** 84 rows duplicados en PerplexityQueue con status "pending". Verificación via `getPerplexityQueue?status=pending` muestra 0 items pending — todos fueron procesados (125 promoted, 61 reviewed, 14 discarded).
- **Fecha resuelto:** 2026-03-22

### BUG-003 — 77 entradas degradadas en NewsLog (context window compression)
- **Estado:** ✅ Resuelto 2026-03-22
- **Descripción:** Sesión `update perplexity` del 2026-03-13 procesó 198 items (run `2026-03-13-205`). Al agotarse el contexto, 77 entradas fueron promovidas con `thesis_relevance` degradada.
- **Resolución:** Auditoría de 2026-03-22 confirmó 0 entradas con patrón degradado ("This content addresses...") en Supabase. Las entradas fueron re-evaluadas en sesiones intermedias o durante el backfill a Supabase.
- **Fecha resuelto:** 2026-03-22

### BUG-002 — sweep_index architectural bug en AcademicOrchestrator
- **Estado:** ✅ Resuelto 2026-03-22
- **Descripción:** El índice `sweep_index` avanza más allá del array de queries elegibles cuando el array se reduce entre runs. Causa que algunas queries se salten en el historical sweep.
- **Fix:** AcademicOrchestrator v3 — clamp guard: si `idx >= eligibleQueries.length`, resetea a 0. Script versionado en `scripts/AcademicOrchestrator-v3.txt`. Pendiente deploy por usuario.
- **Fecha detectado:** Sesión anterior a 2026-03-13
- **Fecha resuelto:** 2026-03-22

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
| 2026-03-22 | Sync final verificado: Sheet = Supabase = 1,502 items (1,044 web + 458 gdrive://). Post-cleanup: 1,493 (9 deleted). Post-TRUMP Act: 1,495 (2 new gdrive PDFs). |
| 2026-03-22 | `append` de WebApp requiere `"rows": [...]` (array), no `"row": {...}`. PR-013 registrado. |
| 2026-03-22 | Scholar enrichment masivo: 983 items completados (CrossRef API, Semantic Scholar API, arXiv API, regex, institucional). Total scholar: 1,240/1,493 (83%). |
| 2026-03-22 | 9 items eliminados de Supabase: 8 arXiv PDF duplicados (abs+pdf del mismo paper) + 1 Nancy Guthrie cold case (noise). DB: 1,493 items. Pendiente: eliminar de Sheet vía deleteByUrl. |
| 2026-03-22 | BUG-003 resuelto: 0 entradas con patrón degradado en Supabase. Las 77 entradas originales fueron corregidas en sesiones intermedias. |
| 2026-03-22 | thesis_relevance 100% completo: 1,493/1,493. Embeddings 100% completo: 1,493/1,493. |
| 2026-03-22 | Edge function `generate-embeddings` requiere batch_size=1 en free tier (WORKER_LIMIT con batch>1). |
| 2026-03-22 | Scholar 100%: 1,493/1,493 completado (era 266 al inicio de sesión). APIs: CrossRef, Semantic Scholar, arXiv. |
| 2026-03-22 | `chapters` column creada y poblada: Cap1=748, Cap2=37, Cap3=724, Cap4=818, Cap5=573, Cap6=378. |
| 2026-03-22 | BUG-001 resuelto: 0 items pending en PerplexityQueue (200 total: 125 promoted, 61 reviewed, 14 discarded). |
| 2026-03-22 | WebApp-v36 preparado: fix getUrls tab filtering (BUG-005). Pendiente deploy por usuario. |
| 2026-03-22 | Versiones activas: WebApp-v35 (v36 pendiente deploy), GoogleNewsRSS-v1, PerplexitySearch-v3, AcademicOrchestrator-v2 (v3 pendiente deploy), ArXiv-v1 (v2 pendiente deploy), SKILL-KB-v17. |
| 2026-03-22 | BUG-002 fix: AcademicOrchestrator-v3 con clamp guard para sweep_index. Script en `scripts/AcademicOrchestrator-v3.txt`. |
| 2026-03-22 | TASK-007 completado (fase 2): análisis full-text TRUMP AI Act (~300 pp). 2 PDFs indexados en Supabase + embeddings. DB: 1,495 items. |
| 2026-03-22 | TASK-006 validado: dry run endpoints ok. Supabase-primary protocol listo para primera sesión `update`. |
| 2026-03-22 | Validation trigger `trg_validate_evaluated_item` creado en Supabase. Rechaza INSERT/UPDATE con datos incompletos o degradados. |
| 2026-03-22 | Health check function `kb_health_check()` creada. Reporta 12 checks de calidad de datos. |
| 2026-03-22 | pg_cron habilitado. `kb-daily-health-check` corre diario 7am UTC → logea en `kb_health_log`. Retención: 90 días. |
| 2026-03-22 | Pipeline architecture documentada en `phd-kb/docs/PIPELINE-ARCHITECTURE.md`. |
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
- **Estado:** ✅ Validado 2026-03-22
- **Descripción:** Supabase es ahora el **destino primario** de items evaluados. NewsLog recibe solo filas de verificación (title, url, importance, source_pipeline, notes="✓ Supabase"). Datos completos solo en Supabase.
- **Progreso:**
  1. ✅ Tabla creada, RLS configurado, función de búsqueda semántica creada
  2. ✅ Backfill completado: 1,489 items migrados desde NewsLog
  3. ✅ SKILL-KB-v16: Supabase-only con batch writes (~20 items) + verification log en Sheet
  4. ✅ Edge function `generate-embeddings` desplegada (gte-small, 384d)
  5. ✅ Embeddings: 1,495/1,495 completados
  6. ✅ SKILL-PM-v7 actualizado con Supabase en §8 y §12
  7. ✅ Dashboard: indicador Supabase live en KB Report + decisión actualizada
  8. ✅ Dry run validación: todos los endpoints WebApp verificados (queues vacías, stats correctas, meta ok)
- **Próximos pasos:**
  1. Primera sesión `update` con protocolo v16 (Supabase-primary + verification log) — ya puede ejecutarse
  2. Eventualmente modificar WebApp para que Apps Script escriba directo a Supabase post-evaluación
- **Fecha creado:** 2026-03-19
- **Fecha validado:** 2026-03-22

---

### TASK-007 — Análisis detallado del TRUMP AMERICA AI Act (discussion draft)
- **Estado:** ✅ Completado 2026-03-22 (análisis completo)
- **Descripción:** Análisis completo del texto de ~300 páginas. Dos fases:
  1. **Fase 1 (2026-03-19):** 10 provisiones mapeadas contra Arts. 9-15 RIA y funciones NIST RMF. Doc: `phd-pm/docs/TASK007_TRUMP_AI_Act_Analisis.docx`.
  2. **Fase 2 (2026-03-22):** Análisis línea por línea del discussion draft completo. Cubre 17 títulos, definiciones, mapeo estatutario contra EU AI Act y NIST RMF. 8 hallazgos clave, 10 gaps/omissions. Doc: `phd-pm/docs/TASK007_TRUMP_AI_Act_Full_Analysis.docx`. PDFs fuente en `03_Corpus_Juridico/`.
- **Items indexados:** 2 PDFs nuevos en Supabase (TRUMP_AI_Act_Draft.pdf + SectionBySection.pdf) con embeddings. DB total: 1,495.
- **Impacto:** ALTO — mandato legislativo de NIST/CAISI transforma el argumento de interoperabilidad.
- **Fecha detectado:** 2026-03-19
- **Fecha completado:** 2026-03-22

### TASK-008 — Actualizar entrada Colorado AI Act con nueva fecha enforcement
- **Estado:** ✅ Completado 2026-03-22
- **Descripción:** Colorado AI Act enforcement date moved from Feb 1, 2026 to June 30, 2026 via SB25B-004. Entrada Blank Rome actualizada en Supabase con fecha corregida. Demás entradas (Hunton, Baker Botts) ya mencionaban el delay.
- **Fecha completado:** 2026-03-22

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
- **Estado:** ✅ Completado 2026-03-22
- **Descripción:** Columna `chapters integer[]` añadida. 1,493/1,493 items poblados con keyword heuristics sobre thesis_relevance. Distribución: Cap1=748, Cap2=37, Cap3=724, Cap4=818, Cap5=573, Cap6=378.
- **Fecha completado:** 2026-03-22

---

### TASK-012 — Sincronizar eliminaciones Supabase→Sheet (9 items)
- **Estado:** ✅ Completado 2026-03-22
- **Descripción:** 9 items eliminados de Sheet vía `deleteByUrl`. Sheet y Supabase sincronizados en 1,493.
- **Fecha completado:** 2026-03-22

### TASK-013 — Scholar restante: 253 web items
- **Estado:** ✅ Completado 2026-03-22
- **Descripción:** 188 items enriched vía Semantic Scholar API (84.6%), CrossRef (fallback), domain heuristics. 1,493/1,493 items ahora tienen scholar (100%).
- **Fecha completado:** 2026-03-22

### BUG-005 — getUrls no filtra por tab
- **Estado:** Abierto
- **Descripción:** WebApp `action=getUrls&tab=X` devuelve siempre todas las URLs de toda la Sheet (1,493), ignorando el parámetro tab. Impide leer contenido de tabs específicas (PerplexityQueue, AcademicQueue) remotamente.
- **Impacto:** Medio — bloquea limpieza de BUG-001 y cualquier operación tab-specific.
- **Fix posible:** Actualizar `getUrls` en WebApp para filtrar por tab antes de recopilar URLs.
- **Fecha detectado:** 2026-03-22

---

## Próxima sesión

- **Prioridad 1:** TASK-009 — Post March 26 plenary vote: check Digital Omnibus outcome. Briefing prep en `logs/TASK009-DigitalOmnibus-Prep.md`
- **Prioridad 2:** TASK-006 — Primera sesión `update` con protocolo Supabase-primary (validado, listo para uso)
- **Prioridad 3:** BUG-004 — Deploy ArXiv_v2.gs (usuario copia contenido de `scripts/ArXiv-v2.txt` al editor GAS)
- **Prioridad 4:** BUG-005 — Deploy WebApp-v36 (fix getUrls tab filtering). Usuario redespliega desde `gas/WebApp.js` o `scripts/WebApp-v36.txt`
- **Prioridad 5:** BUG-002 — Deploy AcademicOrchestrator-v3 (usuario copia contenido de `scripts/AcademicOrchestrator-v3.txt` al editor GAS)

### Deploys pendientes (acciones del usuario)
1. **WebApp-v36**: fix getUrls tab filtering (BUG-005). Copiar `gas/WebApp.js` al editor GAS → nueva versión.
2. **ArXiv-v2**: category filtering (BUG-004). Copiar `scripts/ArXiv-v2.txt` reemplazando `ArXiv.gs`.
3. **AcademicOrchestrator-v3**: sweep_index clamp (BUG-002). Copiar `scripts/AcademicOrchestrator-v3.txt` reemplazando `AcademicOrchestrator.gs`.

_Última actualización: 2026-03-22_
