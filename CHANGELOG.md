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
