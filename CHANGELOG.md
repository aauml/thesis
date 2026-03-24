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

## 2026-03-23 | chat-pm | SKILL-PM, SKILL-KB, KB-PendingIssues | PM puede procesar colas KB
- SKILL-PM v18: §19 nuevo — PM puede hacer triaje de colas staging (lee SKILL-KB del repo, no duplica protocolo de evaluación)
- SKILL-PM v18: §1 interfaz actualizada (PM escribe en evaluated_items), §6 paso 7 queue check en startup
- SKILL-KB v19: TASK-017 — canonical chapter numbering corregido a estructura híbrida (Ch3=RIA, Ch4=NIST)
- Colas verificadas vacías (0 pending en las 3)

## 2026-03-23 | chat-kb | KB update | Run 211: update all (Supabase-primary)
- All 3 queues empty. 4 Claude targeted searches → 4 items added (2 ALTA, 2 MEDIA)
- ALTA: WH National AI Legislative Framework (Mar 20), Nelson Mullins preemption analysis (99-1 rejection, DOJ Task Force)
- MEDIA: Sullivan & Cromwell framework analysis, AECA gobernanza IA sector público (es)
- First full Supabase-primary session: write + Sheet verification + embeddings all succeeded
- DB: ~1,376 Supabase, ~1,349 Sheet NewsLog. Meta: total_searches=211
- TASK-009 still pending: Digital Omnibus plenary vote Mar 26
