# PM Session Log
**Versión:** v11 · **Fecha:** 2026-03-23
_Registro técnico del proyecto phd-pm. Actualizar al cierre de cada sesión. Al actualizar, crear PM-SessionLog-v12.md — nunca sobrescribir este archivo._

---

## Arquitectura del sistema

### Componentes activos
| Componente | Ubicación | Versión | Última actualización |
|------------|-----------|---------|---------------------|
| Dashboard | `thesis/dashboard.html` → GitHub Pages | v9.1 (M2) | 2026-03-19 |
| Knowledge Base webapp | `thesis/index.html` → GitHub Pages | — | gestionado por phd-kb |
| Sheet API (WebApp) | Google Apps Script | v33 | 2026-03-15 |
| GitHubSync | Google Apps Script | v1 | 2026-03-15 |
| PerplexitySearch | Google Apps Script | v3 | 2026-03-13 |
| AcademicOrchestrator | Google Apps Script | — | gestionado por phd-kb |
| GoogleNewsRSS | Google Apps Script | v1 | 2026-03-13 |
| SKILL-KB | `phd-kb/docs/` (repo) | v15 | 2026-03-19 |
| SKILL-PM | `phd-pm/docs/` (repo) | v13 | 2026-03-21 |
| Supabase (evaluated_items) | Supabase · proyecto `wtwuvrtmadnlezkbesqp` | — | 2026-03-19 |

### Endpoints
- **SHEET_API:** `https://script.google.com/macros/s/AKfycbzk2vhu-qcKFBPqEImKGEZKSitpVZv1IQQEv5ZzG7pNfo-iPUWfvSoLWWnkoc8d8PQQ/exec`
- **GitHub Pages:** `https://aauml.github.io/thesis/`
- **Repo:** `https://github.com/aauml/thesis`
- **Supabase (phd-kb):** proyecto `wtwuvrtmadnlezkbesqp` · `db.wtwuvrtmadnlezkbesqp.supabase.co` · tabla `evaluated_items`
- **GAS Project ID:** `19CE8dj2-1FcFNrHczcKC79xA5KGn9o1fHaa1skp4R3SYZ60ScQszSufo`
- **GCP Project:** `thesis-kb-deploy` (number: `90318015894`)
- **Drive parent folder:** `1KvWGLwbXxrNzpmBuFU6od4HJeH-IGXBY` (09_Sistema)

### GAS Deployment
- **Current deployment:** Version 41 (deployed 2026-03-15 1:40 PM)
- **WebApp URL:** Same as SHEET_API above (preserved across deployments)
- **OAuth scopes:** spreadsheets, script.external_request, script.scriptapp, drive

### Coordinación con phd-kb
- phd-kb gestiona: index.html, SKILL-KB, scripts GAS, pipelines de datos
- phd-pm gestiona: dashboard.html, PM-SessionLog, decisiones de investigación
- Interfaz compartida: Sheet API para consultar KB desde el dashboard
- Regla: PM no modifica scripts GAS ni index.html sin coordinar con KB. KB no modifica dashboard.html.

### Archivos del PM
**Ubicación canónica:** `phd-pm/` en repo `aauml/thesis`
| Archivo | Ruta | Versión activa |
|---------|------|---------------|
| SKILL-PM | `phd-pm/docs/SKILL-PM-v13.md` | v13 |
| PM-SessionLog | `phd-pm/logs/PM-SessionLog-v9.md` | v9 |
| PM-LessonsLog | `phd-pm/logs/PM-LessonsLog.md` | v1 |
| context-blocks | `phd-pm/docs/context-blocks-v2.md` | v2 |
| tool-modes | `phd-pm/docs/tool-modes-v2.md` | v2 |

---

## Registro de sesiones

### 2026-03-22 — Dashboard Advisor + deploys GAS + auditoría capítulos (Dispatch)

**Tipo de sesión:** Dispatch (automatizada)

**Dashboard:**
- Diseñada e implementada sección Advisor con dos capas: PM Briefing (manual) + Señales KB (dinámica vía API Sheet)
- Fix overflow móvil en sección Redacción (flex-wrap)
- Fix títulos de capítulo truncados en móvil
- Eliminada etiqueta "Pendiente" de tarjetas de capítulo (el contador de palabras es suficiente)
- Cap 3 renombrado a "Estado del Arte" vía CHAPTER_TITLE_OVERRIDE
- Meta de palabras más clara: "Palabras escritas / meta" en un solo stat

**Sistema / GAS:**
- TASK-014 completada: SKILL-KB actualizado a v18 con 7 capítulos canónicos
- TASK-006 preparada: protocolo Supabase-primary documentado y listo (PROTOCOL-UPDATE-SUPABASE.md)
- 3 deploys GAS ejecutados vía Chrome (Version 48): WebApp-v36 (BUG-005), ArXiv-v2 (BUG-004), AcademicOrchestrator-v3 (BUG-002)
- TASK-009 programada como tarea automática para 2026-03-27 (Digital Omnibus post-plenary)
- Push pendiente de sesión desktop completado (commit 9afc3d2)

**Diagnóstico Supabase:**
- Auditoría completa del campo `chapters`: 1,495 items, 100% asignados, remapeo a 7 caps confirmado
- Cap 7 (Conclusiones): 0 items — backfill pendiente de decisión del usuario
- Cap 4 (Metodología): escaso con 37 items
- Diagnóstico 09_Sistema: mockups y versiones obsoletas identificados, limpieza diferida

**Decisiones:**
- Cap 3 = "Estado del Arte" (por el momento, sujeto a revisión)
- Limpieza de 09_Sistema diferida
- Backfill Cap 7 pendiente de decisión del usuario

**Versiones activas tras esta sesión:**
- WebApp: v36 · ArXiv: v2 · AcademicOrchestrator: v3 · SKILL-KB: v18 · SKILL-PM: v13 · GAS Version 48

**Pendiente para próxima sesión:**
- Advisory #6 (TASK-009): verificar resultado del voto plenario Digital Omnibus del 26 de marzo
- Decisión sobre backfill Cap 7 (Conclusiones)
- Primera sesión `update` real con protocolo Supabase-primary

---

### 2026-03-21 — Seguimiento proactivo de advisories (SKILL v13)

**Cambios realizados:**
- Migración Supabase `add_advisory_followup_fields`: 7 nuevos campos en `pm_advisories` — `next_review`, `review_interval`, `search_queries` (jsonb), `last_checked`, `check_notes`, `resolved_at`, `resolved_reason`
- Migración Supabase `add_advisory_check_count`: campo `check_count` para escalamiento progresivo
- 6 advisories existentes pobladas con intervalos y queries iniciales
- SKILL-PM v13: nueva §18 (Seguimiento de Advisories) con protocolo de escalamiento — el PM debe cambiar algo en cada check vacío (reformular queries → cambiar fuentes → proponer estrategia alternativa → justificar y ajustar target)
- §6 Session Startup actualizado: paso 5 verifica advisories vencidas antes de reportar readiness
- SYSTEM-ARCHITECTURE.md actualizado con nuevos campos de `pm_advisories`

**Decisión:**
- El PM es dueño del seguimiento, no el doctorando. No es punitivo — el valor es que el PM verificó, intentó algo diferente si no encontró nada, y puede justificar. Intervalos adaptativos según clima político/regulatorio (ej: AMERICA AI Act → monthly porque proceso legislativo es lento; gap procesal español → biweekly porque es CRITICAL). Queries dinámicos que el PM modifica según resultados.

**Intervalos asignados:**
- #6 IMCO/LIBE voto 26 mar → on_trigger, review 27 mar
- #2 Lecturas Kaminski & Selbst → biweekly, review 1 abr
- #3 Gap procesal español → biweekly, review 7 abr
- #1 Convergencia paradójica → monthly, review 21 abr
- #5 AMERICA AI Act → monthly, review 21 abr
- #4 Trump EO + Omnibus → monthly, review 21 abr

**Pendiente para próxima sesión:**
- Advisory #6: verificar resultado del voto plenario del 26 de marzo
- Continuar con trabajo de la sesión (lo que estuviera en curso)

---

### 2026-03-19 — Supabase como almacén de datos evaluados (decisión arquitectónica KB ↔ PM)

**Contexto:**
Revisión de conectores/extensiones activos en Cowork (Supabase, Google Drive, Scholar Gateway, Vercel, Chrome). Evaluación de límites de Google Sheets + Apps Script para el KB. Conclusión: Sheets funciona como control plane y staging, pero no escala como almacén del corpus evaluado (sin SQL complejo, sin búsqueda semántica, límite 50k chars/celda, lentitud >50k filas).

**Cambios realizados:**
- Proyecto Supabase `phd-kb` creado (ID: `wtwuvrtmadnlezkbesqp`, región: us-west-1, org: ademas.ai)
- Tabla `evaluated_items`: 21 columnas NewsLog + `embedding` (pgvector 384d, gte-small) + `source_pipeline` + `migrated_from_sheet` + `pk`/`created_at`/`updated_at`
- Índices: ivfflat cosine para búsqueda semántica, btree para importance/capa/tier/action_tag/folder/run_id
- Constraint unique_url para dedup (igual que Sheet)
- Registrado en KB-PendingIssues.md como TASK-006
- KB-LessonsLog.md actualizado con entrada de sesión

**Decisión arquitectónica:**
- Google Sheets se mantiene como control plane (Queries tab) y staging (PerplexityQueue, AcademicQueue, NewsResults)
- Supabase reemplaza NewsLog tab como destino de datos evaluados por Claude
- Transición: dual-write (Sheet + Supabase) hasta validar integridad
- Apps Script no cambia todavía — sigue orquestando fetch → staging
- El cambio es en el destino de escritura post-evaluación de Claude, no en el pipeline de ingesta

**Conectores validados:**
- Scholar Gateway (semantic search académico) — activo, útil para búsqueda on-demand en sesión
- Consensus (búsqueda científica por claims) — sugerido para instalación, complementa Scholar Gateway
- Google Drive — activo, acceso a archivos pero no a celdas de Sheets
- Supabase — activo, ahora con proyecto dedicado para tesis

**Impacto PM:**
- §8 KB Intelligence Report podrá consultar Supabase directamente (SQL + semántico)
- §12 Estado del proyecto necesita actualización (nueva infraestructura)
- Dashboard Registro de Decisiones: entrada pendiente para próxima sesión PM

**Componentes actualizados:**

| Componente | Versión | Cambio |
|-----------|---------|--------|
| Supabase phd-kb | — | Proyecto creado, tabla evaluated_items con pgvector 384d, RLS, search function, edge function |
| SKILL-KB | v15 | Dual-write protocol, embeddings pipeline docs, semantic search examples |
| SKILL-PM | v7 | §8 Supabase queries, §12 infra updated (1,489 items + pgvector) |
| KB-PendingIssues | — | TASK-006 fase 2/4, backfill done, embeddings in progress |
| KB-LessonsLog | — | Full session scope |
| PM-SessionLog | v7 | Esta entrada + continuación post-compaction |
| Dashboard | — | Decisión arquitectónica en Registro de Decisiones |

**Continuación (misma sesión, post-compaction):**
- ✅ Backfill completado: 1,489/1,490 items migrados de NewsLog a Supabase
- ✅ SKILL-KB-v15 creado: dual-write protocol, field mapping, error handling, query examples
- ✅ Dashboard: entrada en Registro de Decisiones agregada
- ✅ Embedding dimension migrada: 1536d → 384d (gte-small, free via Supabase AI)
- ✅ RLS habilitado + función `search_evaluated_items` para búsqueda semántica
- ✅ Edge function `generate-embeddings` desplegada (v2, ACTIVE)
- ✅ ~1,000+ embeddings generados de 1,489 (proceso en curso)
- ✅ Búsqueda semántica verificada end-to-end (NIST query → AI Act, risk management papers @ 0.92+)
- ✅ SKILL-PM-v7 creado: §8 con Supabase queries, §12 con infra actualizada
- ✅ KB-PendingIssues actualizado: TASK-006 fase 2/4
- ✅ KB-LessonsLog actualizado con scope completo

**Pendientes para próximas sesiones:**
1. Completar embeddings restantes (~500 items)
2. Primera sesión `update` con dual-write activo (Sheet + Supabase)
3. Instalar Consensus connector
4. Eventual migración de Apps Script para escribir directamente a Supabase

---

### 2026-03-19 (sesión 2) — Dashboard M2 redesign + vigilancia queries + refinements

**Contexto:** Sesión vía Cowork. Continúa trabajo de la sesión anterior (que se compactó). Usuario solicitó rediseño visual del Panorama → 9 mockups + 3 mixes → M2 seleccionado y aplicado. Luego refinamientos: fechas en desarrollos, rename secciones, novedades 10 items, vigilancia al Sheet.

**Cambios realizados:**
- **Dashboard v9.0 (M2) → v9.1:** Rediseño visual completo del Panorama
  - Dark sidebar (#1a2332) con accent border azul en item activo
  - Sidebar title: "Thesis Director" → "Thesis PM"
  - Desarrollos clave: ahora con fechas (gris sutil al final), enlaces "ver fuente →", ordenados por fecha descendente. Fuentes verificadas contra Supabase `evaluated_items`.
  - "Interpretación del Director" → "Análisis y recomendaciones"
  - Novedades: de ventana 7 días a 10 más recientes + expandible
  - "ver fuente →" consistente en minúsculas (desarrollos + advisories)
  - CSS M2: variables de sidebar, pills, headings, tipografía limpia
  - Nuevas clases: `m2-dev-date`, `m2-dev-src` para fechas y enlaces en desarrollos

- **Vigilancia queries agregadas al Sheet (Queries tab):**
  - Q125: `Trump AMERICA AI Act — preempción federal` (weekly, q_news + q_fullweb, tier 1)
  - Q079 actualizada: `Digital Omnibus — AI Act Timeline` (monthly → weekly, q_news ampliado con "stop the clock AI")
  - Duplicados limpiados: Q126, Q127, Q129 desactivados

- **Hallazgo técnico:** POST al Sheet API funciona desde Cowork VM — el "Page Not Found" es solo la respuesta del redirect de GAS, no un fallo de escritura. Todas las escrituras se completan en la primera request (pre-redirect). GET funciona normalmente para verificar.

**pm_advisories en Supabase (6 activas):**
- #5: TRUMP AMERICA AI Act Blackburn (high)
- #2: Lecturas prioritarias Kaminski & Selbst (high)
- #3: Gap derecho procesal español (high)
- #1: Convergencia paradójica (high)
- #6: IMCO/LIBE retraso high-risk (medium)
- #4: Vigilancia Trump EO + Omnibus (medium)
- Decisión: no reescribir contenido existente. Tono Greg Allen para futuras advisories.

**Verificación Supabase de desarrollos clave:**
Los 9 items hardcoded en Panorama fueron verificados contra `evaluated_items`. Todos existen con URLs reales. Fechas aproximadas asignadas desde contexto (created_at = bulk upload date, no event date):
- Digital Omnibus: mar 2026, AMERICA AI Act: mar 2026, COSAIS: feb 2026
- NIST rebranding: jul 2025, DOJ: jun 2025, OMB: abr 2025
- EO 14179: ene 2025, CETS 225: sep 2024, Gap estándares: 2024-2025

**Componentes actualizados:**

| Componente | Versión | Cambio |
|-----------|---------|--------|
| Dashboard | v9.1 (M2) | Redesign + refinements |
| KB Queries tab | Q125 new, Q079 updated | Vigilancia weekly queries |
| PM-SessionLog | v8 | Esta entrada |

**Pendiente para próxima sesión:**
1. Desarrollos clave con fechas reales (no aproximadas) — extraer de fuentes
2. Tono Greg Allen en futuras advisories (guidelines en SKILL-PM)
3. File structure cambió en GitHub pero Drive no ha sincronizado — verificar GitHubSync trigger
4. Considerar hacer desarrollos clave dinámicos (desde Supabase) en lugar de hardcoded

---

### 2026-03-18 (sweep) — Monthly KB Reading Sweep (Level 2, automated)

**Contexto:** Primer run del scheduled task `monthly-kb-reading-sweep`. Ejecutado vía Cowork Dispatch.

**KB Snapshot:**
- Total: 1,468 (sin cambios desde la sesión anterior del mismo día)
- ALTA: 439, MEDIA: 816, BAJA: 212, DELETED: 1
- Delta desde última sesión: 0 nuevas entradas

**MEDIA→ALTA candidatos (33 matches, top recomendaciones):**
1. Kaminski — "The EU AI Act: A Tutorial (2025)" → ALTA (pillar author, tutorial directo)
2. Hacker — "Simplifying Europe's AI Regulation" → ALTA (análisis evidence-based del AI Act)
3. Wexler — profile Columbia Law → ALTA (forensic AI y due process expertise)
4. Wachter — "Explainable AI, Counterfactual Explanations, CDD" → ALTA (pillar author)
5. Hildebrandt — "Counter-Profiling: AI Governance and Rule of Law" → ALTA (pillar author)
6. Renda — "EU AI Act Implementation Delays and 15% Conformity Gap" → ALTA (quantitative gap data)
7. Finck — "Constitutional Dimension of AI" (forthcoming) → ALTA when published
8. Narayanan & Kapoor — "AI Agent Reliability (Feb 2026)" → ALTA (governance)

**Gap analysis:**
| Gap | Previous | Current | Status |
|-----|----------|---------|--------|
| NIST entries total | 40 (reported) | 200+ (99 ALTA) | ⚠️ Count was underreported; academic NIST analysis still scarce |
| PATTERN case | ~5 ALTA | 4 ALTA, 26 total | STAGNANT |
| Spanish procedural | 6 ALTA es | 38 ALTA "procesal", 5 Bueno de Mata (all MEDIA) | BETTER COUNTED but Bueno de Mata still weak |
| Equity criterion | 83 | 57 "equidad" (16 ALTA) | REVISED metric |
| Forensic admissibility | ~20 | 73 prob. genotyping entries | IMPROVING |

**Query health (Q120-Q124):** All 5 queries returned 0 results. Expected — they were created today (2026-03-18) and haven't run yet. Monitor next sweep.

**New resources found via web search (NOT added to KB — POST API failed):**
1. **Bueno de Mata (2025)** — "El uso de IA generativa por el agente encubierto informático" (RGDP núm. 66) → ALTA, director's publication
2. **Instrucción CGPJ 2/2026** — BOE-A-2026-2205 → ALTA, first formal AI judicial guidance in Spain
3. **OSPIA Comentario** — Instrucción 2/2026 analysis → MEDIA
4. **Fernández Larrea (2026)** — "La IA en abogacía y judicatura" → MEDIA
5. **Veale et al. (2025)** — "High-risk AI transparency? Qualified transparency mandates under AI Act" (Technology and Regulation) → ALTA, pillar author

**Reading plan:** No structural changes needed. Current month (March 2026) aligns with C1 plan (Kaminski N1 in progress, Bradford next). Gap tracker updated in dashboard.

**API issue:** POST to SHEET_API fails from Cowork VM (GAS redirect chain not followed by curl). GET works fine. Items above need to be added manually or via interactive session.

**Componentes actualizados:**
| Componente | Versión | Cambio |
|-----------|---------|--------|
| Dashboard | v8.1 | Gap tracker updated with current counts |
| PM-SessionLog | v5 | This entry |

---

### 2026-03-18 — Plan de Lecturas Doctoral + KB Analysis + Gap Remediation

**Contexto:** Sesión vía Cowork. Usuario proporcionó el chat anterior como contexto de referencia y el plan de lecturas previo (.docx). Solicitó análisis profundo del KB completo y creación de un plan de lecturas detallado por cuatrimestre/mes en el Dashboard.

**Análisis del KB realizado:**
- Total: 1,468 entradas (439 ALTA, 816 MEDIA, 212 BAJA)
- Distribución por capítulo (ALTA/MEDIA): C1 48/94, C2 159/357, C3 249/274, C4 16/24, C5 76/151, C6 136/176
- 67 fuentes MEDIA de autores clave identificadas como candidatas a upgrade ALTA
- Gap crítico: Cap. 4 (NIST AI RMF) solo tiene 40 fuentes totales
- 101 autores únicos, top: Kaminski (19 ALTA), Kratsios (9), Wachter (8), Veale (7), Kerry (6), Bradford (6)

**Cambios realizados:**
- **Dashboard v8.0:** Nueva vista "Plan Lecturas" con sistema de tabs por año, lecturas por cuatrimestre/mes, niveles N1-N4 + no-texto, gap tracker, tabla de bibliografía proyectada. CSS con prefijo `lec-*`. JS `showLecYear()`.
- **5 queries agregados al KB (Q120-Q124):**
  - Q120: NIST AI RMF academic analysis (tier 1, weekly)
  - Q121: Federal AI case study candidates (tier 1, weekly)
  - Q122: Derecho procesal + IA España (tier 1, monthly)
  - Q123: Forensic algorithm admissibility (tier 2, monthly)
  - Q124: Federico Bueno de Mata publications (tier 1, monthly)
- **PM-LessonsLog:** PR-015 (reading plan as living document), PR-016 (procedural law thread)
- **Decisión registrada en Dashboard:** Plan de lecturas con análisis completo

**Hallazgos clave de la sesión:**
- El eje procesal del director (Bueno de Mata) debe cruzar toda la tesis, no solo C2 y C6
- Instrucción CGPJ 2/2026, R.D. 729/2023, Adan Domènech (2026) identificados como fuentes pendientes de agregar al KB
- Recursos no-texto integrados: podcasts Tabassi/Wiley/Wharton, CSIS AI Policy Podcast, NIST AI RMF Playbook
- Caso de estudio: mantener abierto con monitoring activo (Q121). STRmix mejor documentado que PATTERN.

**Componentes actualizados:**

| Componente | Versión | Cambio |
|-----------|---------|--------|
| Dashboard | v8.0 | Vista Plan Lecturas |
| PM-LessonsLog | — | PR-015, PR-016, session entry |
| PM-SessionLog | v5 | Esta entrada |
| KB Queries tab | Q120-Q124 | 5 nuevos queries |

**Cambios adicionales (misma sesión, continuación):**
- **Dashboard v8.1:** 25 lecturas con links verificados (7 URLs corregidos). Vista Progreso eliminada, timeline integrado en Plan Lecturas.
- **SKILL-PM v6:** Nuevo §16 (Plan de Lecturas — protocolo operativo), §14 actualizado, version bump.
- **PM-LessonsLog:** PR-017 (sweep protocol 3 niveles).
- **Scheduled task `monthly-kb-reading-sweep`:** Corre 1ro de cada mes 9am. Ejecuta Level 2 sweep completo.

**Componentes actualizados (adicionales):**

| Componente | Versión | Cambio |
|-----------|---------|--------|
| Dashboard | v8.1 | Links verificados, Progreso eliminado |
| SKILL-PM | v6 | §16 reading plan protocol |
| PM-LessonsLog | — | PR-017 |
| Scheduled task | monthly-kb-reading-sweep | Nivel 2 mensual |

**Pendiente para próxima sesión:**
- Agregar al KB las fuentes encontradas en búsqueda web: Instrucción CGPJ 2/2026, R.D. 729/2023, Adan Domènech (2026), U.S. v. Ortiz, GAO-23-105139 PATTERN, propuesta FRE 707
- Hacer primer sweep con los queries nuevos (Q120-Q124)
- Evaluar las 67 MEDIA candidatas a upgrade ALTA
- Montar vault Obsidian (PR-014) y verificar estado de fichas
- **Run now** del scheduled task `monthly-kb-reading-sweep` para pre-aprobar permisos

---

### 2026-03-15 (sesión 2) — GitHubSync + WebApp v33 + Drive API fix

**Contexto:** Sesión larga (~2 horas), trabajo realizado vía Claude in Chrome controlando el GAS editor directamente. Sesión dividida por context compaction — los dos contextos cubrieron la misma cadena de trabajo.

**Cambios realizados:**
- **GitHubSync.gs v1** instalado en GAS editor (294 líneas). Mirrors completo del repo `aauml/thesis` a carpeta `thesis-repo` dentro de 09_Sistema en Google Drive. Usa API pública de GitHub (no necesita token para repos públicos). SHA-based change detection para sync eficiente.
- **WebApp.gs v33** instalado en GAS editor (678 líneas). Añade sistema Inbox con 3 nuevas acciones:
  - `getInbox` (GET): Retorna items pendientes del Inbox, soporta `?status=pending`
  - `addInboxItem` (POST): `{ action: "addInboxItem", item: { text, ts, source } }` — auto-crea tab Inbox, auto-asigna IDs (INB001...)
  - `updateInboxItem` (POST): `{ action: "updateInboxItem", id: "INB001", status: "processed", session_notes: "..." }`
  - Schema del tab Inbox: `id | text | ts | source | status | processed_ts | session_notes`
- **appsscript.json** actualizado: añadido scope `https://www.googleapis.com/auth/drive`
- **GAS Deployment:** Version 41 (mismo URL preservado)
- **Google Drive API** habilitada en GCP project `thesis-kb-deploy`
- **Primera sincronización:** 53 archivos synced, 6 skipped, 0 errors (72.7s)
- **Dashboard** actualizado con nueva decisión registrada

**Método técnico — GAS editor automation:**
- El editor GAS usa Monaco (mismo motor que VS Code). Accesible vía `window.monaco` en la consola del navegador.
- Los modelos se obtienen con `monaco.editor.getModels()` — los índices pueden cambiar entre recargas de página.
- Para reemplazar contenido completo: `model.pushEditOperations([], [{ range: fullRange, text: newContent }], () => null)`
- Para encontrar un archivo específico, buscar por contenido: `content.includes('syncGitHubToDrive')`
- **No usar typing actions** en el editor — autocomplete corrompe el texto. Solo usar Monaco API.
- Después de editar, Ctrl+S para guardar.

**Errores encontrados y soluciones:**

| Error | Causa raíz | Solución |
|-------|-----------|----------|
| `DriveApp.getFolderById` → "server error" | Google Drive API no habilitada en GCP project | Navegar a `console.developers.google.com/apis/api/drive.googleapis.com/overview?project=90318015894` → Enable |
| Error genérico "server error" de DriveApp (no "permission denied") | Mismo — API deshabilitada se presenta como server error, no como permission error | Diagnóstico: test function con `UrlFetchApp.fetch` al Drive REST API reveló 403 con mensaje claro de "API not enabled" |
| OAuth consent popup inaccesible | Popup abre fuera del tab group de Claude in Chrome | Usuario debe autorizar manualmente. El popup tiene "This app isn't verified" warning → Advanced → Go to app (unsafe) → Allow |
| Texto corrupto al typing en GAS editor | Autocomplete del editor interfiere con `type` action | Usar Monaco API programáticamente en vez de simular typing |
| Monaco model indexes shifted | Los índices cambian al navegar a Settings y volver | Siempre buscar por contenido del archivo, no por índice fijo |

**Decisiones:**
- GitHubSync usa DRIVE_PARENT_FOLDER_ID para crear `thesis-repo` dentro de 09_Sistema (no en Drive root)
- SKIP_PATTERNS: `.git/`, `pwa//`, `sw.js$` — no sincronizar assets de PWA
- Deployment preserva mismo URL (editar deployment existente, nueva versión, no crear nuevo deployment)

**Pendiente para próxima sesión:**
- ~~(Opcional) Configurar trigger diario para sync automático~~ → **HECHO** (sesión 3, 2026-03-15)
- PM-BUG-001 sigue abierto (KB API schema — solución: extraer schema de WebApp.gs y documentarlo)

---

### 2026-03-15 (sesión 3) — Trigger diario, revisión de colas KB, fix documentación SKILL

**Contexto:** Sesión continuada tras context compaction. Tareas pendientes de sesión 2 + revisión completa de las tres colas del KB.

**Cambios realizados:**
- **Trigger diario configurado** para `syncGitHubToDrive`: Time-driven → Day timer → 6am–7am (GMT-7). Ahora hay 4 triggers en el proyecto GAS.
- PM-BUG-001 revisado y explicado: bloqueador para automatización del KB Intelligence Report en el dashboard. Solución identificada: extraer schema del WebApp.gs.
- **Revisión completa de tres colas del KB** (run_id: 2026-03-15-207):
  - AcademicQueue: 40 procesados → 7 promovidos, 18 descartados, 15 retenidos. Mucho ruido de ArXiv (BUG-004): física cuántica, astronomía, homónimos de scholars.
  - PerplexityQueue: 50 procesados → 32 promovidos (17 nuevos al NewsLog, 15 ya existían), 10 descartados, 8 retenidos.
  - NewsResults: 40 procesados → 21 promovidos, 18 descartados/retenidos.
  - **Total: 45 items nuevos en NewsLog** (7 academic + 17 perplexity + 21 news)
- **SKILL-KB actualizado a v14**: documentación de `updateAcademicRow` corregida — usar `url` como lookup key, no `id` (IDs no son únicos por truncación de base64).
- Dashboard actualizado con decisión de la sesión.

**Items ALTA destacados del NewsLog:**
- NIST COSAIS (Control Overlays for Securing AI Systems) — NIST acercándose a controles prescriptivos
- OMB M-24-10 rescindida → M-25-21 — la brecha de gobernanza EU-US se amplía
- US v. Ortiz — challenge a probabilistic genotyping en corte federal
- CETS 225 ratificada por EEUU — obligaciones vinculantes internacionales
- Selbst & Kaminski "American's Guide to EU AI Act" — source directamente relevante
- Carnegie: regulación entity-based como alternativa US
- EC-Council: comparación AI Act / NIST RMF / ISO 42001 — crosswalk practitioner
- High-risk AI guidelines retrasadas otra vez — gap de estándares persiste
- AI Omnibus: renegociación de requisitos del AI Act por el Parlamento
- National security como escudo contra AI accountability — impacto en caso de estudio

**Error encontrado y resuelto:**
| Error | Causa raíz | Solución |
|-------|-----------|---------|
| `updateAcademicRow` por `id` actualizaba row incorrecto o no encontraba | IDs en AcademicQueue son `base64(url)[:16]` — solo 5 IDs únicos para 247 rows (URLs del mismo dominio producen mismo prefijo truncado) | Usar `url` como lookup key. WebApp.gs ya lo soportaba (línea 434), pero SKILL documentaba `id`. SKILL-KB v14 corrige la documentación. |

**Componentes actualizados:**

| Componente | Versión | Cambio |
|-----------|---------|--------|
| SKILL-KB | v14 | Corrección doc: updateAcademicRow usa url, no id |
| Dashboard | v4.1 | Nueva decisión de sesión 3 |
| PM-SessionLog | v5 | Entrada sesión 3 expandida |
| PM-LessonsLog | — | Nueva entrada PR-005 + session history |

**Decisiones:**
- Trigger diario a las 6–7am para que el mirror en Drive esté actualizado antes de la jornada de trabajo.
- Para `updateAcademicRow`: siempre usar `url` como lookup key, nunca `id`.
- Para `append` desde staging queues: usar `promoteToNewsLog` (dedup solo contra NewsLog), no `append` (dedup contra todas las tabs incluyendo la de origen).

**Pendiente para próxima sesión:**
- ~207 academic, ~34 perplexity, ~136 news items pendientes en las colas.
- PM-BUG-001 sigue abierto (KB API schema).

---

### 2026-03-15 (sesión 1) — Migración a GitHub como fuente única

**Cambios realizados:**
- Migración completa de archivos PM y KB desde Google Drive a repositorio GitHub (`phd-pm/`, `phd-kb/`)
- Estructura estandarizada: `project/{scripts,docs,logs}/` — aplicable a cualquier proyecto nuevo
- SKILL-PM-v4 creado: Session Startup Protocol (clone repo, read LessonsLog + SessionLog), Session Closing Protocol (commit+push), Drive ya no es canónico
- SKILL-KB-v13 creado por phd-kb: mismo patrón GitHub-first
- PM-LessonsLog.md creado en `phd-pm/logs/` con 2 prevention rules iniciales
- KB-LessonsLog.md actualizado con PR-008 (GitHub es fuente única)
- 19 GAS scripts, 10 KB docs, 7 PM docs ahora versionados en Git
- Solo el SKILL file necesita estar en Claude project knowledge — todo lo demás se lee del repo

**Decisiones:**
- GitHub repo es la fuente única de verdad para ambos proyectos (KB y PM)
- Drive es mirror de conveniencia, no fuente canónica
- Patrón extensible: cualquier proyecto nuevo sigue `project-name/{scripts,docs,logs}/`
- Un solo archivo en project knowledge por proyecto (el SKILL)

**Pendiente para próxima sesión:**
- Usuario debe reemplazar SKILL-PM en phd-pm project knowledge con SKILL-PM-v4.md
- Usuario debe reemplazar SKILL-KB en phd-kb project knowledge con SKILL-KB-v13.md
- Puede eliminar todos los demás archivos de project knowledge (SessionLog, context-blocks, tool-modes, config.txt)
- PM-BUG-001 sigue abierto (KB API schema — coordinar con phd-kb)

---

### 2026-03-14 (sesión 2) — Sección «Progreso» añadida al Dashboard

**Cambios realizados:**
- Nueva sección «Progreso» insertada entre Briefing de Estado y Hoja de Ruta en dashboard.html
- Timeline visual horizontal con 6 nodos: Q1–Q4 2026 (trimestral), 2027, 2028 (anual)
- Estados visuales: done (azul relleno), current (borde naranja con glow), future (gris)
- Barra de progreso animada (actualmente ~8%, early Q1)
- Caja «Siguientes Pasos» con 5 items derivados de análisis integral del KB, proyecto y decisiones pendientes
- Cada item tiene criterio de «hecho cuando» para seguimiento
- CSS responsive: en móvil el timeline se convierte en wrap sin línea conectora
- Decisión registrada en el Dashboard
- SKILL-PM actualizado a v3 (tabla de secciones, clases CSS, protocolo de actualización de Progreso)
- PM-SessionLog actualizado a v3

**Decisiones:**
- Timeline por trimestres en 2026, por año en 2027–2028
- Ubicación entre Briefing y Hoja de Ruta (flujo: contexto → progreso → detalle)
- Items de «Siguientes Pasos» basados en análisis integral (no solo milestones manuales)
- Actualización manual cada sesión (no automática)

**Pendiente para próxima sesión:**
- Usuario debe subir a Cowork phd-pm Knowledge: SKILL-PM-v3.md, PM-SessionLog-v3.md (reemplazando v2)

---

### 2026-03-14 (sesión 1) — Rediseño del PM Log → Thesis Dashboard

**Cambios realizados:**
- Rediseño completo de `pmlog.html` → Thesis Dashboard v2.0
- Nuevo tono: experto-mentor (reemplaza notas personales)
- Nuevas secciones: Briefing de Estado, KB Intelligence Report (modal), Hoja de Ruta, Obsidian Digest, Mapa Conceptual (modal), Registro de Decisiones (al final)
- Creada carpeta `09_Sistema/phd-pm/` en Google Drive para archivos del PM
- SKILL-PM-v1 → v2 (ubicación corregida a Google Drive)
- context-blocks y tool-modes añadidos al conjunto de archivos del PM (v2)
- Convención de versionamiento en nombre de archivo establecida para todos los archivos

**Decisiones:**
- Dashboard reemplaza PM Log como documento central
- Tono experto-mentor para Año 0
- KB Intelligence Report se actualiza automáticamente con cada `news`/`update`
- Obsidian Digest: sugerencias basadas en notas del vault
- Todos los archivos del PM: `09_Sistema/phd-pm/` en Google Drive
- Regla: versión en el nombre del archivo (v1, v2, v3...) — nunca sobrescribir

---

## Problemas resueltos

| Fecha | Problema | Solución |
|-------|----------|----------|
| 2026-03-15 | DriveApp "server error" en GitHubSync | Google Drive API no estaba habilitada en GCP project — habilitada vía console.developers.google.com |
| 2026-03-15 | OAuth consent popup inaccesible desde Claude in Chrome | Usuario autoriza manualmente; diagnosticar con UrlFetchApp + Drive REST API si DriveApp da server error |
| 2026-03-15 | GAS editor corrompe texto con typing actions | Usar Monaco API (`model.pushEditOperations`) en vez de simular keyboard input |
| 2026-03-14 | PM Log era notas personales sin orientación | Rediseñado como Thesis Dashboard con voz de mentor |
| 2026-03-14 | pmlog.html renombrado a dashboard.html | Archivo renombrado en repo, pmlog.html eliminado |
| 2026-03-14 | Archivos PM en Obsidian vault (incorrecto) | Recreados en `09_Sistema/phd-pm/` de Google Drive |
| 2026-03-14 | Archivos sin versión en nombre de archivo | Recreados con sufijo de versión (v1, v2...) |
| 2026-03-14 | Dashboard sin vista de progreso global | Nueva sección «Progreso» con timeline y siguientes pasos |

## Problemas conocidos (sin resolver)

### PM-BUG-001 — KB API action names sin documentar
- **Estado:** CERRADO (2026-03-18) — Descubierto en sesión reading-plan: acción correcta es `getAll` (no `getPage`). Parámetros: `search`, `importance`, `folder`, `action_tag`, `limit`, `offset`. Documentado en SKILL-PM §16 y en el scheduled task.
- **Descripción:** El endpoint SHEET_API acepta actions pero no hay schema documentado accesible desde phd-pm. El skill phd-kb usa `action=getPage`, `action=append`, `action=promoteToNewsLog`, etc.
- **Impacto:** Medio — no puedo generar el KB Intelligence Report automáticamente hasta confirmar las actions disponibles.
- **Fix:** Coordinar con phd-kb para documentar API schema aquí o en archivo compartido.
- **Fecha detectado:** 2026-03-14

---

_Última actualización: 2026-03-19 (v8)_

---

## Sesión 2026-03-22 — Unificación canónica de capítulos

**Trigger:** Usuario preguntó sobre el campo `chapters` recién creado en Supabase. Análisis PM reveló inconsistencia triple.

**Problema detectado:** SKILL-PM (6 caps), chapter_sections (7 caps genéricos), y dashboard (8 caps hardcodeados) tenían estructuras incompatibles. Los 1,495 items en `evaluated_items.chapters` usaban la numeración del SKILL-PM. El dashboard aproximaba cobertura vía capas, no usaba el campo `chapters`.

**Cambios (7 bloques):**

| # | Componente | Cambio |
|---|-----------|--------|
| 1 | `chapter_sections` | Reescrita: 7 caps, 29 secciones (fuente única de verdad) |
| 2 | `evaluated_items.chapters` | Remapeado 1,495 items (old 2→4, 3→2, 4→3) |
| 3 | Vista `chapter_coverage` | Creada — cruza KB + writing + reading en una query |
| 4 | `dashboard.html` | chapterCoverage dinámico, lecturas con getChapterMap(), bibliografía dinámica, gap tracker y advisor corregidos |
| 5 | `reading_plan.chapter_ids` | Nueva columna int[] poblada (33 filas) |
| 6 | Docs | SKILL-PM v15, SYSTEM-ARCHITECTURE, PM-LessonsLog PR-018 |
| 7 | KB notification | KB-PendingIssues actualizado + TASK-014 creada |

**Estructura canónica:** 1=Intro, 2=Marco teórico, 3=Estado del arte, 4=Metodología, 5=Análisis comparativo, 6=Caso de estudio, 7=Conclusiones

**KB post-remapeo:** Cap1=748, Cap2=726, Cap3=818, Cap4=37, Cap5=574, Cap6=378, Cap7=0

**Pendiente:** Push a GitHub. TASK-014 (KB actualice SKILL-KB).

_Última actualización: 2026-03-22 (v9)_

---

## Sesión 2026-03-22 (continuación) — Limpieza KB + estructura híbrida + reasignación

**Trigger:** Usuario solicitó análisis profundo de la calidad de los registros en Supabase, comparando asignaciones de capítulos con recomendaciones previas.

**Diagnóstico inicial:** Auditoría completa de 1,495 registros reveló:
- 163 filas duplicadas (115 grupos, misma obra descubierta por diferentes URLs)
- 27 entradas que eran nombres de autor (contenido real, mal titulado)
- 19 capas no-estándar ("Marco Teórico", "Estado del Arte")
- 330 ítems con 4+ capítulos (asignación inflada por agente automatizado)
- Cap 5 y Cap 6 con solo 6 y 3 ítems exclusivos respectivamente

**Fase 1 — Limpieza de datos:**

| Operación | Cantidad | Detalle |
|-----------|----------|---------|
| Duplicados fusionados | 163 eliminados | Winner por gdrive > ALTA > completitud. Alt URLs en notes. |
| Author-names retitulados | 27 | Contenido real: testimonios, podcasts, perfiles → títulos descriptivos |
| Capas normalizadas | 19 | "Marco Teórico"/"Estado del Arte" → "Teórica" |
| Noticias reclasificadas | 2 | ALTA → MEDIA (interviews, rebranding) |
| Importance upgrades | ~10 | Merges donde copia eliminada tenía mayor importancia |

**Fase 2 — Nueva estructura de capítulos (híbrida):**

| Cap | Título | Secciones | Rationale |
|-----|--------|-----------|-----------|
| 1 | Introducción | 5 | Sin cambio |
| 2 | Marco teórico y estado de la cuestión | 6 | Fusiona marco + estado cuestión + metodología (§2.6) |
| 3 | El Reglamento de Inteligencia Artificial | 5 | **NUEVO** — capítulo dedicado RIA |
| 4 | El NIST AI Risk Management Framework | 4 | **NUEVO** — capítulo dedicado NIST |
| 5 | Análisis comparativo | 4 | Matriz + protocolo |
| 6 | Caso de estudio: DOJ | 4 | Sin cambio estructural |
| 7 | Conclusiones | 4 | +1 sección (limitaciones separada) |

Decisión: RIA y NIST como capítulos propios permite análisis normativo profundo. Metodología integrada en Ch2 (no hay trabajo de campo). Flexibilidad para incorporar America AI Act si se aprueba.

**Fase 3 — Reasignación con clasificador v2:**
- Método: title-first con thesis_relevance como fallback
- Regla: máximo 2 capítulos por ítem (score segundo ≥ 60% del primero)
- Resultado: 1,258 single-cap (94.4%), 74 dual-cap (5.6%), 0 triple+

**Estado post-operación:**

| Cap | Total | ALTA | Lecturas planificadas |
|-----|-------|------|-----------------------|
| 2 | 528 | 117 | 16 |
| 3 | 287 | 101 | 6 |
| 4 | 389 | 117 | 7 |
| 5 | 38 | 19 | 8 |
| 6 | 164 | 58 | 7 |

**Correcciones adicionales:**
- `reading_plan.chapter_ids` corregido (NIST items apuntaban a ch3 viejo → ch4 nuevo)
- Milestone #6 actualizado ("corpus jurídico" → "RIA")
- SKILL-PM v16: §8 tabla actualizada, changelog añadido
- Dashboard: 3 tooltips hardcodeados corregidos (Estado del arte → NIST AI RMF, metodología → §2.6)
- `dashboard_work.html`: mismos 3 fixes aplicados
- `kb_cleanup_log` creada con registro de cada decisión

**Gaps identificados:**
1. Ch3 (RIA): solo 6 lecturas para 101 ALTA — necesita 3-4 N2 más
2. Ch4 (NIST): 0 lecturas N2 — gap de literatura académica crítica persiste
3. Ch6 (Caso): solo 2 N1 — se resuelve al confirmar caso con director

---

## Sesión 2026-03-23 — Reading Plan Analysis + Sheet Cleanup

**Tipo:** PM + Infrastructure
**Duración:** Continuación de sesión 2026-03-22

### Reading Plan Analysis (primer análisis periódico)

Cruce completo: KB (1,332 items) × reading plan (33 lecturas) × conocimiento del campo.

**6 lecturas añadidas al `reading_plan` (Supabase):**

| # | Fuente | Nivel | Cuándo | Cap | Razón |
|---|--------|-------|--------|-----|-------|
| 34 | Citron (2008) «Technological Due Process» | N2 | C2/Yr0 | 2 | Ancla procesal para el caso DOJ |
| 35 | Kroll et al. (2017) «Accountable Algorithms» | N2 | C3/Yr0 | 2 | Accountability como mecanismo técnico |
| 36 | Thompson (2019) «Uncertainty in Probabilistic Genotyping» | N2 | C3/Yr0 | 6 | Contraargumento a Buckleton (STRmix) |
| 37 | Hacker (2024) «Robust Governance Architecture for AI Act» | N2 | C4/Yr1 | 3 | Gobernanza operativa del AI Act |
| 38 | Coglianese (2021) «Administrative Law in Automated State» | N2 | C5/Yr1 | 4 | Análisis crítico del NIST como política pública |
| 39 | Husa (2015) «A New Introduction to Comparative Law» | N2 | C3/Yr0 | 2 | Metodología comparada funcional |

**1 lectura movida:** #32 Stoltz/Hacker crosswalks: C7/Yr2 → C4/Yr1
**1 fix en KB:** Kroll «Accountable Algorithms» chapters {4} → {2}
**Total plan:** 33 → 39 lecturas

### Sheet Cleanup (sincronización con Supabase)

**Problema:** Sheet (NewsLog) tenía 1,495 filas vs 1,332 en Supabase post-limpieza.

**Operaciones ejecutadas:**
1. `deleteByUrl` batch via curl (9 batches) → 164 duplicados eliminados
2. `cleanupNewsLog()` via GAS Script Editor (Chrome) → 43 capas normalizadas

**Resultado:** Sheet 1,331 | Supabase 1,332 | ALTA match exacto (386=386)

**Bug descubierto:** BUG-006 — `getStats` encoding (capas acentuadas reportan 0)

**Nota técnica:** La URL del GAS deployment expiró. Re-desplegada por Arturo. Diferencia: `-IPUWfv-` (muerta) vs `-iPUWfv-` (activa). SKILL files ya tenían la URL correcta.

### Colas staging (sin procesar)
- NewsResults: 192 items
- AcademicQueue: 271 items
- PerplexityQueue: 258 items
- **Total: 721 items pendientes de triaje**

### KB additions (continuation)

**Bueno de Mata sweep (3→7 entries):**
- Added: Macrodatos RGDP 2020 (ALTA), Comentarios RIA Barrio 2024 (ALTA), IA generativa agente RGDP 2025 (MEDIA), Necesidad regular IA 2022 (MEDIA)
- Updated: Sistemas gestión procesal → ALTA, scholar=Bueno de Mata
- 3 entries added to reading plan (#40 N1, #41-42 N2)

**Other KB additions:**
- Instrucción CGPJ 2/2026 (BOE) — ALTA, Ch2+Ch3. Primera instrucción del CGPJ sobre IA jurisdiccional.
- Fernández Larrea (2026) blog Hay Derecho — MEDIA, Ch2. Análisis de la Instrucción.

**Tanner dedup:** 4 entries → 2. Deleted 2 brookings duplicates of gdrive version. Retitled "Managed Interdependence" (was misclassified as AI Sovereignty).

**Final KB count:** 1,336 items (was 1,332). ALTA: 389 (was 386). Reading plan: 42 lecturas (was 33).

_Última actualización: 2026-03-23 (v11)_

---

## Sesión 2026-03-23 (PM #2) — PM puede procesar colas KB

**Tipo:** Infrastructure
**Trigger:** Usuario solicitó "update all" y preguntó por qué las colas no se procesaban desde PM.

### Cambios

| # | Componente | Cambio |
|---|-----------|--------|
| 1 | SKILL-PM v18 | §1: PM puede escribir en `evaluated_items`. §6 paso 7: queue check en startup. §19: nuevo protocolo de triaje de colas — lee SKILL-KB del repo (no duplica). |
| 2 | SKILL-KB v19 | TASK-017: canonical chapter numbering actualizado a estructura híbrida (Ch3=RIA, Ch4=NIST). Guías de asignación corregidas. |
| 3 | KB-PendingIssues | TASK-017 completada. Colas staging verificadas vacías (0 pending en las 3). Deuda técnica actualizada. |

### Decisiones

- **PM procesa colas KB sin sesión separada.** El protocolo de evaluación no se duplica — §19 lee `SKILL-KB-current.md` del repo cada vez. Si KB actualiza su skill, PM hereda los cambios automáticamente.
- **Scope del PM al procesar colas:** puede evaluar y escribir a Supabase/Sheet. NO puede modificar scripts GAS, index.html, SKILL-KB, ni Queries tab.

### Hallazgos

- Colas estaban vacías (0 pending) — los 721 reportados en sesión anterior ya fueron procesados por sesiones Cowork intermedias.
- SKILL-KB tenía numeración pre-híbrida en la guía de capítulos — corregido en v19.

### Estado al cierre

- KB: 1,372 items (Supabase), 1,345 (Sheet). ALTA: 407.
- Colas: 0 pending en las 3.
- SKILL-PM: v18. SKILL-KB: v19.
- Reading plan: 42 lecturas. Advisories: 0 vencidas (próxima: #6 el 27 mar).

_Última actualización: 2026-03-23 (v11)_

---

## Sesión 2026-03-23 (PM #3) — CLASP + Supabase Sync + UI updates

**Tipo:** Infrastructure + UI
**Trigger:** Usuario pidió verificar uso de CLASP, habilitarlo para PM, y hacer cambios de UI.

### Cambios

| # | Componente | Cambio |
|---|-----------|--------|
| 1 | SKILL-PM v19 | §20 CLASP CI/CD para PM. §1: GAS scripts compartido. §3: repo muestra `phd-kb/gas/`. §14: prohibición solo index.html + SKILL-KB. §19: GAS restriction eliminada. |
| 2 | SupabaseSync.js (nuevo) | One-way hourly Supabase → Sheet NewsLog mirror. `syncFromSupabase()` full + `syncIncremental()` delta. Requiere Script Properties + `setupSupabaseSync()`. |
| 3 | WebApp v37 | `getStats` ahora devuelve `last_supabase_sync` timestamp. |
| 4 | index.html | Sort simplificado (pub date default, removed found-asc/found-desc). Header muestra backup status. Mobile grid layout para iPhone 14 Pro Max. |
| 5 | Dashboard News | 25 items por date_published (antes 50 ALTA por created_at). Dot rojo en ALTA. |
| 6 | SW | thesis-v18 → thesis-v20 |

### Decisiones

- **CLASP compartido PM+KB.** El PM puede editar y desplegar scripts GAS directamente via push a main. Docs full en KB-SystemReference-v1.txt (no duplicadas en SKILL-PM).
- **Supabase → Sheet one-way sync.** NewsLog deja de recibir verification rows individuales y pasa a ser un mirror completo por hora. Elimina el gap de 27 items.
- **Sort por pub date default.** Fecha de publicación es más útil que fecha de descubrimiento. Filtros found-asc/found-desc eliminados.

### Pendientes para usuario

1. Agregar `SUPABASE_URL` + `SUPABASE_KEY` a Script Properties en GAS editor
2. Ejecutar `setupSupabaseSync()` para initial full sync + trigger horario

### Estado al cierre

- KB: 1,376 Supabase / 1,349 Sheet (gap se cierra al correr setupSupabaseSync)
- SKILL-PM: v19. WebApp: v37. SW: thesis-v20.
- Colas: 0 | 0 | 0. Advisories due: none (next #6 Mar 27).
- Reading plan: 42 lecturas.

_Última actualización: 2026-03-23 (v11)_
