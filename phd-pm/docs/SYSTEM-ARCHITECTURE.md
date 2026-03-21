---
name: thesis-system
description: "Arquitectura completa del sistema de tesis doctoral (Supabase + GitHub Pages + scheduled tasks + Obsidian). USAR SIEMPRE que se trabaje con cualquier componente del sistema: dashboard, index/KB, Supabase tables, scheduled tasks, alertas, chapter sections, reading plan, advisory cycle, o pipelines de datos. Imprescindible leer antes de hacer cualquier modificación para entender qué afecta qué. Triggering: dashboard, supabase, kb, index.html, tesis, thesis, advisory, pipeline, embedding, lecturas, milestone, riesgo, alerta, chapter, redacción, director meeting, evaluación."
---

# Thesis System — Arquitectura y Flujo Completo
**Última actualización:** 2026-03-20

Este documento es la referencia técnica del sistema completo. Léelo antes de modificar cualquier componente para entender las dependencias y evitar romper algo.

---

## 1. VISIÓN GENERAL

El sistema gestiona una tesis doctoral sobre AI governance / RegTech. Tiene tres capas:

```
┌─────────────────────────────────────────────────────┐
│  FRONTEND — GitHub Pages (estático, solo lectura)   │
│  dashboard.html  ·  index.html                      │
│  Ambos leen de Supabase vía REST API (anon key)     │
└───────────────────┬─────────────────────────────────┘
                    │ fetch()
┌───────────────────▼─────────────────────────────────┐
│  BACKEND — Supabase (source of truth)               │
│  11 tablas · 2 edge functions · pgvector embeddings  │
│  RLS: anon=read+some update · service_role=all      │
└───────────────────┬─────────────────────────────────┘
                    │ scheduled tasks write via service_role
┌───────────────────▼─────────────────────────────────┐
│  AUTOMATION — Cowork Scheduled Tasks                │
│  Daily ingesta · Monthly sweep · Monthly advisory   │
│  Manual: director meeting prep                      │
└─────────────────────────────────────────────────────┘
```

**Source of truth:** Supabase. Todo lo que el dashboard muestra viene de ahí. No hay Google Sheets en el flujo actual.

---

## 2. SUPABASE — Proyecto `wtwuvrtmadnlezkbesqp`

### 2.1 Tablas y sus relaciones

| Tabla | Filas aprox. | Propósito | Quién escribe |
|-------|-------------|-----------|---------------|
| `evaluated_items` | 1,502 | KB principal: fuentes evaluadas con embeddings pgvector (384d, gte-small) | Pipeline ingesta (service_role), anon puede UPDATE (starred) |
| `reading_plan` | 33 | Asignaciones de lectura por año/cuatrimestre | Advisory (service_role) |
| `pm_tasks` | ~6 | Tareas con tipos y ciclo de revisión | Advisory (service_role), anon UPDATE (done, review_status) |
| `pm_milestones` | 8 | Hitos institucionales/académicos | Advisory (service_role), anon UPDATE (completed) |
| `pm_risks` | 4 | Registro de riesgos | Advisory/sweep (service_role) |
| `pm_developments` | 9 | Desarrollos regulatorios clave | Advisory (service_role) |
| `pm_advisories` | 6 | Análisis y recomendaciones estratégicas. Campos de seguimiento: `next_review`, `review_interval` (weekly/biweekly/monthly/quarterly/on_trigger), `search_queries` (jsonb), `last_checked`, `check_notes`, `resolved_at`, `resolved_reason`. Status: active/resolved/parked. | Advisory (service_role), PM sessions |
| `pm_decisions` | 5 | Registro de decisiones de investigación | PM sessions (service_role) |
| `pm_alerts` | variable | Alertas urgentes entre advisories | Sweep/advisory (service_role), anon UPDATE (dismissed) |
| `chapter_sections` | 24 | Tracker de redacción por sección de capítulo | Advisory (service_role), anon UPDATE (status, word_count) |
| `reading_conversations` | 0 | Conversaciones de aprendizaje: dudas de lectura y reflexiones sobre la tesis. Tipos: `reading` (ligada a fuente) y `reflection` (sobre estructura/argumento). FK a `evaluated_items`. | PM sessions (service_role) |
| `_temp_file_transfer` | 1 | Utilidad temporal para transferir datos | service_role |

### 2.2 Relaciones entre tablas (foreign keys)

```
reading_plan.source_kb_id  →  evaluated_items.pk
reading_conversations.source_kb_id  →  evaluated_items.pk
reading_conversations.superseded_by  →  reading_conversations.id
reading_plan.advisory_id   →  pm_advisories.id
pm_tasks.reading_plan_id   →  reading_plan.id
```

### 2.3 Permisos (RLS)

Patrón consistente en todas las tablas:
- **anon:** SELECT en todas. UPDATE en: `evaluated_items`, `pm_tasks`, `pm_milestones`, `pm_alerts`, `chapter_sections`
- **service_role:** ALL en todas (usado por scheduled tasks)
- **anon NO puede INSERT ni DELETE** en tablas PM (solo service_role)

Esto significa: el dashboard puede marcar tareas como completadas y descartar alertas, pero no crear ni borrar datos.

### 2.4 Constraint importante en `pm_alerts`

```sql
alert_type IN ('urgent_item', 'deadline_risk', 'stalled_task')
```
**NO incluye `nueva_alta`** — los items ALTA nuevos se reportan en el advisory mensual, no generan alertas entre ciclos (decisión del usuario: evitar distracciones).

### 2.5 Constraint en `pm_tasks`

```sql
task_type IN ('lectura', 'ficha', 'busqueda', 'redaccion', 'revision', 'action', 'admin')
review_status IN ('none', 'pending_review', 'reviewed')
```

Ciclo de revisión: cuando el usuario marca `done=true`, el dashboard pone `review_status='pending_review'`. El advisory mensual revisa el output en Obsidian y pone `review_status='reviewed'` con `review_notes`.

### 2.6 Edge Functions

| Función | JWT | Propósito |
|---------|-----|-----------|
| `semantic-search` | NO (público) | Busca por similaridad coseno en embeddings. POST con `{query, match_count, match_threshold, filters}`. Usa `Supabase.ai.Session("gte-small")` para generar embedding del query y `match_items` RPC para buscar. |
| `generate-embeddings` | SÍ | Genera embeddings para items sin embedding. Actualmente deshabilitada (backfill completado). Se reactiva si hay items nuevos sin embedding. |

### 2.7 SQL function `match_items`

```sql
match_items(query_embedding vector(384), match_count int, match_threshold float)
→ RETURNS TABLE (pk, url, title, ..., similarity float)
```
Ordena por similaridad coseno descendente. Threshold default 0.3.

### 2.8 Supabase API keys

- **anon key** (público, usado en dashboard/index): `eyJhbG...1eCIlv6URlo...` (iat: 1773937306)
- **service_role key**: solo en scheduled tasks, nunca en frontend

---

## 3. GITHUB PAGES — `aauml.github.io/thesis/`

### 3.1 Archivos servidos

| Archivo | URL | Propósito |
|---------|-----|-----------|
| `dashboard.html` | /thesis/dashboard.html | Dashboard del PM — 7 vistas en sidebar |
| `index.html` | /thesis/index.html | KB Index — búsqueda keyword + semántica |
| `sw.js` | /thesis/sw.js | Service worker PWA |
| `pwa/` | /thesis/pwa/ | Manifest, iconos PWA |

### 3.2 Dashboard (dashboard.html) — v11.0

**7 vistas en sidebar:**
1. **Panorama** — Alerts banner, advisor, actividad actual, desarrollos, advisories, noticias recientes
2. **Operativo** — Tareas (checklist interactivo), lecturas C1, milestones, riesgos
3. **KB Report** — Stats del KB, distribución por capa/importancia, gaps, estado pipeline
4. **Mapa** — Mapa conceptual (estático)
5. **Plan Lecturas** — Plan de lectura dinámico desde Supabase + plan estático legacy + gaps + bibliografía
6. **Redacción** — Tracker de progreso por capítulo/sección con barras de progreso
7. **Registro** — Decisiones de investigación (colapsable)

**Todo es dinámico desde Supabase excepto:**
- Mapa conceptual (HTML estático)
- Advisor contextual (renderizado desde config JS estático)
- Plan de lecturas estático legacy (HTML hardcoded, se irá eliminando)
- Timeline Q1-Q4 (estático)

**Funciones init (DOMContentLoaded):** renderAdvisor, renderQ1Progress, renderOps, updateOpsBadge, fetchAlerts, fetchChapterSections, fetchPipelineStatus, fetchRecentNews, fetchKbStats, fetchSupabaseStatus, fetchAdvisories, fetchDevelopments, fetchActividadActual, fetchOpLecturas, fetchMilestones, fetchRisks, fetchDecisions, fetchReadingPlan

### 3.3 Index / KB (index.html)

- Carga TODOS los items de `evaluated_items` (paginado en batches de 1000 — Supabase tiene límite de 1000 por request)
- Dos modos de búsqueda: keyword (filtro local) y semántico (via edge function)
- Filtros: importancia, capa, acción, contenido
- Stars: toggle via PATCH a Supabase
- Deep links: `?url=encoded_url` → navega a la página correcta, expande la tarjeta, scroll + highlight amarillo

### 3.4 Flujo de despliegue

```
Editar dashboard_work.html (copia de trabajo local)
      ↓
Copiar a thesis-push-tmp/dashboard.html
      ↓
git add, commit, push → GitHub Pages se actualiza (~30-60s)
      ↓
GitHub Pages CDN puede cachear — usar ?v=N para forzar refresh
```

**IMPORTANTE:** Siempre editar `dashboard_work.html` como copia de trabajo, nunca directamente el repo. Copiar al repo push solo para desplegar.

**Push command pattern:**
```bash
cd /sessions/friendly-vibrant-goodall/thesis-push-tmp
cp /sessions/friendly-vibrant-goodall/dashboard_work.html dashboard.html
cp /sessions/friendly-vibrant-goodall/mnt/PhD/09_Sistema/thesis-repo/index.html index.html
git add dashboard.html index.html
git commit -m "message"
git push https://<PAT>@github.com/aauml/thesis.git main
```

---

## 4. SCHEDULED TASKS

| Task ID | Frecuencia | Qué hace |
|---------|-----------|----------|
| `thesis-queue-review` | Diario 7:05am | **Ingesta:** revisa colas pendientes → evalúa → inserta en `evaluated_items` → genera embeddings → actualiza dashboard |
| `monthly-kb-reading-sweep` | 1° del mes 9:00am | **Técnico:** evalúa upgrades MEDIA→ALTA, identifica gaps, actualiza `reading_plan` y `pm_risks` |
| `weekly-pm-advisory` | 1° del mes 10:00am | **Advisory mensual:** revisa tareas completadas, lee output en Obsidian, escribe feedback, genera nuevas tareas. Actualiza `pm_tasks`, `pm_developments`, `pm_advisories`, `pm_milestones` |
| `director-meeting-prep` | Manual | **On-demand:** genera briefing .docx para reunión con director desde datos Supabase |
| `generate-embeddings-backfill` | Deshabilitado | Backfill completado (1489 embeddings). Reactivar si hay items sin embedding |

### 4.1 Ciclo advisory mensual (el más importante)

```
                 ┌──────────────────────┐
                 │  Advisory mensual    │
                 │  (1° del mes)        │
                 └──────┬───────────────┘
                        │ genera tareas
                        ▼
              ┌──────────────────────┐
              │  pm_tasks            │
              │  (review_status:none)│
              └──────┬───────────────┘
                     │ usuario trabaja en Obsidian
                     ▼
              ┌──────────────────────┐
              │  Usuario marca done  │
              │  → pending_review    │
              └──────┬───────────────┘
                     │ siguiente advisory
                     ▼
              ┌──────────────────────┐
              │  Advisory revisa     │
              │  → review_notes      │
              │  → reviewed          │
              │  → genera más tareas │
              └──────────────────────┘
```

### 4.2 Flujo de ingesta diario

```
Fuentes (RSS, manual, queries)
      ↓
thesis-queue-review (daily)
      ↓
Evalúa: importance, capa, thesis_relevance, action_tag
      ↓
INSERT en evaluated_items
      ↓
Genera embedding (gte-small 384d)
      ↓
Disponible en KB index + semantic search
```

---

## 5. OBSIDIAN VAULT

**Ruta:** `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Tesis iCloud`

| Carpeta | Para qué |
|---------|----------|
| 00_Inbox | Notas de trabajo activas |
| 01_Bibliografia | Notas de lectura (fichas) |
| 02_Permanent | Notas maduras |
| 03_Sintesis | Documentos de síntesis |
| 04_Thesis | Borradores de capítulos |

El advisory revisa las notas en Obsidian para evaluar el trabajo del usuario cuando una tarea se marca como completada.

---

## 6. SKILLS EXISTENTES Y SU DOMINIO

| Skill | Gestiona | NO toca |
|-------|----------|---------|
| `phd-kb` (bootstrap) | index.html, scripts GAS, pipelines KB, evaluaciones | dashboard.html, PM logs |
| `phd-pm` (bootstrap) | dashboard.html, PM-SessionLog, decisiones, Obsidian | index.html, scripts GAS |
| `thesis-system` (este) | Referencia de arquitectura — no gestiona nada, solo documenta | — |

**Regla de coordinación:** PM no modifica index.html ni scripts GAS sin coordinar con KB. KB no modifica dashboard.html.

---

## 7. GOTCHAS Y TRAMPAS CONOCIDAS

Estas son cosas que ya han causado problemas. Leer antes de hacer cambios.

### 7.1 Supabase REST API devuelve máximo 1000 filas
La KB tiene 1500+ items. `loadAllRows()` en index.html DEBE paginar en batches de 1000 con `limit` + `offset`. Si no, los deep links fallan para items más allá del 1000.

### 7.2 async/await en el dashboard init
Todas las funciones `fetch*` son async. Si una función en el bloque `DOMContentLoaded` lanza error (incluso no-async llamando a async sin await), MATA todo lo que viene después. Ejemplo real: `updateOpsBadge()` era sync pero llamaba a `loadOps()` async → `ops.filter()` on Promise → crash → todas las secciones "Cargando..." para siempre.

### 7.3 GitHub Pages CDN cache
Después de un push, GitHub Pages puede seguir sirviendo la versión anterior durante 30-90 segundos. Usar `?v=N` o `?_cb=timestamp` para forzar. El código nuevo llega antes de que el CDN lo propague — `fetch('url', {cache:'no-store'})` confirma si ya está disponible.

### 7.4 Supabase anon key
El anon key correcto tiene `iat:1773937306` y termina en `...1eCIlv6URlo...`. Ha habido confusión con keys antiguas que devuelven 401. Si algo falla con 401, verificar el key.

### 7.5 dashboard_work.html es la copia de trabajo
NUNCA editar directamente en el repo. Editar `/sessions/friendly-vibrant-goodall/dashboard_work.html`, luego copiar al repo push. Esto evita conflictos con el repo local del usuario.

### 7.6 Git author identity en fresh clones
Al clonar fresh, configurar antes de commit:
```bash
git config user.email "artcx@protonmail.com"
git config user.name "Arturo"
```

### 7.7 Card IDs en index.html
Los IDs de tarjeta son `c-{page}-{index}` y van en el `.card-body` div, no en el `article`. `toggleCard` y `handleDeepLink` usan estos IDs. Para scroll, se hace `el.closest("article").scrollIntoView()`.

### 7.8 Alertas: NO nueva_alta
Las alertas solo se generan para: `urgent_item`, `deadline_risk`, `stalled_task`. Items ALTA nuevos se reportan en el advisory mensual, no generan alertas mid-cycle.

---

## 8. DATOS INSTITUCIONALES

- **Programa:** Doctorado en Administración, Hacienda y Justicia en el Estado Social, Universidad de Salamanca
- **Director:** Dr. Federico Bueno de Mata, Catedrático de Derecho Procesal
- **Fase:** Año 0 (2026) — Inscripción y preparación
- **Pregunta central:** ¿Puede una agencia federal que implementa el NIST AI RMF acreditar cumplimiento sustancial con los requisitos del AI Act (RIA) para sistemas de alto riesgo, sin duplicar estructuras de control?

### Estructura de capítulos (chapter_sections)
1. Introducción (5 secciones)
2. Marco teórico (4 secciones)
3. Revisión de literatura (3 secciones)
4. Metodología (4 secciones)
5. Resultados (3 secciones)
6. Discusión (3 secciones)
7. Conclusiones (2 secciones)

---

## 9. CHECKLIST ANTES DE MODIFICAR

Antes de hacer cualquier cambio al sistema:

- [ ] ¿Estoy editando el archivo correcto? (dashboard_work.html, no el del repo)
- [ ] ¿Entiendo qué tabla de Supabase afecta esto?
- [ ] ¿El cambio respeta los permisos RLS? (anon no puede INSERT en tablas PM)
- [ ] ¿Hay funciones async que puedan romper el init chain si fallan?
- [ ] ¿El cambio afecta algo en el otro skill? (KB vs PM boundary)
- [ ] ¿Necesito paginar la consulta? (>1000 filas = sí)
- [ ] Después de push: verificar con `?v=N` para bypass de CDN cache
