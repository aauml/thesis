# CHANGELOG — Log Unificado Cross-Contexto

Todos los contextos (Chat, Cowork, Code, Dispatch) escriben aquí al cerrar sesión.
PM lee este archivo al inicio de cada sesión para tener visibilidad total.

**Regla:** Solo append. Nunca editar ni borrar entradas anteriores.

**Formato:**
```
## YYYY-MM-DD | contexto | componente(s) | resumen
- Detalle 1
- Detalle 2
```

---

## 2026-03-24 | cowork | SKILL-PM, SKILL-KB, SYSTEM-ARCHITECTURE, PM-LessonsLog | Connector integration (Scholar Gateway, Consensus, Google Calendar)
- SKILL-PM v20: §21 añadido (integración de connectors). §1 interfaz actualizada. §6 startup paso 6b (pickup connector tasks) + closing paso 7b (queue connector tasks). §12 infraestructura actualizada. §14 prohibiciones actualizadas.
- SKILL-KB v20: Pipelines 5-6 (Scholar Gateway, Consensus) añadidos. Trigger commands `update scholar_gw` y `update consensus`. Secciones de ejecución completas con batch limits (20/sesión) y criterios de preferencia.
- SYSTEM-ARCHITECTURE: §10 añadido (Claude.ai Connectors) — diagrama de flujo, diferencias con pipelines GAS, Google Calendar read-only.
- PM-LessonsLog: PR-020 (connector-sourced items requieren pm_task previo + evaluación completa + queries en Queries tab). Session History actualizado.
- Decisión arquitectónica: connectors son herramientas mid-workflow (no pipelines independientes). Resultados pasan por evaluación completa. Tasks rastreados en pm_tasks. Queries en Queries tab del Sheet.
- Afecta otros contextos: cualquier sesión PM ahora puede usar connectors si hay gaps. KB hereda source_pipeline values ya existentes.

## 2026-03-24 | cowork | dashboard, reading_plan, Supabase | Changelog dinámico + limpieza dashboard_work
- Creada tabla `reading_plan_changelog` en Supabase con trigger `fn_reading_plan_audit` que auto-registra INSERT/UPDATE/DELETE en reading_plan
- Trigger captura: added, removed, modified (status/level/title), reordered (position/quarter/year)
- Dashboard: changelog HTML estático reemplazado por `fetchChangelog()` que carga desde Supabase
- Corregidas posiciones duplicadas (position=0) en C3 (Kroll ids 44,46,47,49) y Año 1 C1 (ids 45,50,51)
- Eliminado `dashboard_work.html` — redundante, git maneja versionado
- Afecta otros contextos: cualquier sesión que modifique reading_plan ahora genera log automático en Supabase

## 2026-03-24 | chat | KB, reading_plan, advisories | Kroll author deep dive — 8 KB entries + 8 reading plan + advisory
- 8 nuevas entradas Kroll en evaluated_items (4 ALTA, 4 MEDIA): Outlining Traceability, Lessons Learned NIST, Fallacy of Inscrutability, Trust But Verify, ACM TechBrief Facial Recognition, Responsible AI Management Problem, This Thing Called Fairness, Plane Crashes to Algorithmic Harm
- Kroll KB total: 3→11 entradas
- Advisory #8 creada: seguimiento trimestral de Kroll (próx revisión jun-24-2026)
- 8 lecturas añadidas al reading plan (#44-51). 3 lecturas corregidas (#35 N2→N1+Ch5, #46 +Ch5, #47 N3→N2+Ch5)
- Reading plan: 42→50 lecturas
- SessionLog v12→v13

## 2026-03-23 | code | dashboard, sw.js | Dashboard v12.2 — UX fixes
- Panorama siempre al abrir (ya no restaura última vista desde localStorage)
- Refresh automático de datos Panorama al navegar a esa vista (throttled 60s)
- Eliminada referencia "sin Registro" del footer
- Swipe mejorado: threshold 40px, detección de flick por velocidad, lock de dirección, animación CSS fade+slide
- News: 25 items visibles (antes 10), usa date_published en vez de created_at, muestra año si no es actual
- Service worker bumped a thesis-v7

## 2026-03-23 | cowork | dashboard, reading_plan | Plan lecturas: consistencia visual
- CSS .lec-lens igualado a .lec-objective (mismo fondo, borde, tamaño)
- Poblados reading_objective para las 29 lecturas de C3-C9 en Supabase
- Ahora todas las lecturas muestran caja de objetivo consistente en todos los cuatrimestres y años

## 2026-03-23 | cowork | dashboard, sistema | Dashboard v12.0 + git workflow
- Dashboard v12.0: Panorama slim (alerts, advisor, lectura activa, próximo hito, riesgos)
- Nuevo tab Novedades (desarrollos + advisories + noticias — sacados de Panorama)
- Operativo limpio: solo checklist pm_tasks (sin lecturas, milestones, riesgos)
- KB gaps: ahora muestra todos incluyendo OK (verde)
- Regenerado PAT `claude-thesis` y guardado en `09_Sistema/.secrets/github-pat.txt`
- CLAUDE.md actualizado con flujo de git push desde Cowork (sin navegador)
- Decisión: GDrive es backup de GitHub, no al revés. GitHub es fuente de verdad.

## 2026-03-23 | cowork | sistema | CHANGELOG.md y CLAUDE.md creados
- Creado CHANGELOG.md como log unificado cross-contexto
- Creado CLAUDE.md como entry point para Claude Code
- Actualizado SKILL-PM y SKILL-KB para incluir CHANGELOG en sus protocolos de sesión
- Creada tabla system_heartbeats en Supabase para tracking de Dispatch
- Decisión: jerarquía de memoria formalizada (pm_decisions > CHANGELOG > SessionLogs)

## 2026-03-24 | chat-kb | KB, Queries | David Sacks research — 3 items + query Q140
- 3 items added to Supabase (run 212): Morrison Foerster AI Action Plan analysis (ALTA), Mondaq DOJ AI Litigation Task Force (MEDIA), NPR preemption EO Sacks scope (MEDIA)
- Query Q140 added: David Sacks (type=government, tier=1, monthly). Pipelines: q_semantic, q_fullweb, q_news
- Decision: Sacks tracked as government actor, not scholar — no peer-reviewed output, relevance is as policy architect (NIST RMF revision directive, state preemption, DOJ Task Force)
- Afecta otros contextos: PM should note Sacks as key actor in Ch4/Ch5 analysis; existing KB entries on AI Action Plan and preemption EO already cover the policies, Q140 captures the actor specifically

## 2026-04-05 | cowork-kb | PerplexityQueue, Supabase, embeddings | queue-review automatizado
- 14 items PerplexityQueue evaluados: 11 promovidos, 3 descartados
- NewsLog: 1352 → 1361 (+9 nuevos; 2 ya existían)
- Supabase: 1396 total (+9 nuevos insertados, 0 sin embedding tras generate-embeddings)
- ALTA: retirada AILD CE, Opinión BCE CON/2026/10, directrices GPAI+Ómnibus, COM(2025) 868
- Dashboard pusheado (e96359f)
- Lecciones: no-cors GAS POST no funciona desde browser para promoteToNewsLog; usar curl; action_tag válidos Supabase = REFERENCE/CONTEXT/FOLLOW-UP/URGENT
