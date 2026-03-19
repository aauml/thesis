# RECOVERY-KB — Reconstrucción completa del Knowledge Base

**Última actualización:** 2026-03-19
**Propósito:** Si Claude pierde la memoria o se inicia una sesión sin contexto, este archivo permite reconstruir todo el sistema KB desde cero.

---

## 1. IDENTIDAD

Eres el gestor del Knowledge Base de una tesis doctoral sobre interoperabilidad EU AI Act / NIST AI RMF, Universidad de Salamanca. Tu trabajo: mantener un corpus curado de fuentes evaluadas que alimenta la investigación.

---

## 2. ARCHIVOS CRÍTICOS — leer en este orden

| # | Archivo | Ruta en repo | Para qué |
|---|---------|-------------|----------|
| 1 | **Este archivo** | `phd-kb/docs/RECOVERY-KB.md` | Contexto de emergencia |
| 2 | **SKILL-KB-current.md** | `phd-kb/docs/SKILL-KB-current.md` | Instrucciones operativas completas (900+ líneas). **Leer obligatorio antes de hacer cualquier cosa.** |
| 3 | **KB-PendingIssues.md** | `phd-kb/logs/KB-PendingIssues.md` | Bugs abiertos, tasks pendientes, prioridades |
| 4 | **KB-LessonsLog.md** | `phd-kb/logs/KB-LessonsLog.md` | Prevention Rules (PR-001 a PR-009), errores pasados |
| 5 | **KB-Config.txt** | `phd-kb/docs/KB-Config.txt` | Config básica |
| 6 | **KB-SystemReference-v1.txt** | `phd-kb/docs/KB-SystemReference-v1.txt` | Referencia técnica detallada del sistema |

**Para arrancar:** `git clone https://x-access-token:<token>@github.com/aauml/thesis.git thesis-repo` → leer SKILL-KB-current.md → leer KB-PendingIssues → leer KB-LessonsLog → listo.

---

## 3. CONEXIONES

### Google Sheets (control plane + staging)

```
SHEET_API = https://script.google.com/macros/s/AKfycbzk2vhu-qcKFBPqEImKGEZKSitpVZv1IQQEv5ZzG7pNfo-iPUWfvSoLWWnkoc8d8PQQ/exec
GAS_PROJECT_ID = 19CE8dj2-1FcFNrHczcKC79xA5KGn9o1fHaa1skp4R3SYZ60ScQszSufo
GCP_PROJECT = thesis-kb-deploy (number: 90318015894)
```

**Tabs activas:**

| Tab | Rol | Quién escribe | Quién lee |
|-----|-----|---------------|-----------|
| **Queries** | Control plane — define qué buscar | Usuario/Claude | Apps Script |
| **PerplexityQueue** | Staging — resultados crudos Perplexity | PerplexitySearch.gs (auto, domingos) | Claude (evalúa) |
| **AcademicQueue** | Staging — resultados OpenAlex/ArXiv/etc. | AcademicOrchestrator.gs | Claude (evalúa) |
| **NewsResults** | Staging — resultados Google News RSS | GoogleNewsRSS.gs | Claude (evalúa) |
| **NewsLog** | Verificación — recibos de escritura a Supabase | Claude (fila mínima: title, url, importance, `notes="✓ Supabase"`) | Usuario (visual) |

### Supabase (almacén de datos evaluados — primario)

```
SUPABASE_URL = https://wtwuvrtmadnlezkbesqp.supabase.co
SUPABASE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0d3V2cnRtYWRubGV6a2Jlc3FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MzczMDYsImV4cCI6MjA4OTUxMzMwNn0.1eCIlv6URloKHnEzxB2drHtiS2NR_VH_2DHF6YFLerY
PROJECT_ID = wtwuvrtmadnlezkbesqp
REGION = us-west-1
ORG = ademas.ai
```

**Tabla:** `evaluated_items` — 1,494+ items evaluados
- 27 columnas: 21 del NewsLog original + `embedding` (pgvector 384d, gte-small) + `source_pipeline` + `migrated_from_sheet` + `pk` (UUID) + `created_at` + `updated_at`
- RLS habilitado: SELECT, INSERT, UPDATE para anon key
- Constraint: `unique_url` (dedup por URL normalizada)
- Índices: ivfflat cosine (embeddings), btree (importance, capa, tier, action_tag, folder, run_id, created_at)
- Función: `search_evaluated_items(query_embedding, match_threshold, match_count, filter_importance)` — búsqueda semántica

**Edge function:** `generate-embeddings` (v2, ACTIVE) — genera embeddings gte-small 384d para items sin embedding. Llamar con `POST SUPABASE_URL/functions/v1/generate-embeddings` + `Authorization: Bearer SUPABASE_KEY` + `{"batch_size": 1}`

### GitHub

```
REPO = https://github.com/aauml/thesis
GITHUB_PAGES = https://aauml.github.io/thesis/
TOKEN_LOCATION = En el campo Instructions del proyecto phd-kb en Claude.ai
```

**Para clonar:**
```bash
git clone https://x-access-token:<token>@github.com/aauml/thesis.git thesis-repo
cd thesis-repo && git config user.email "claude@thesis.local" && git config user.name "Claude KB"
```

### Google Drive

```
DRIVE_PARENT_FOLDER = 1KvWGLwbXxrNzpmBuFU6od4HJeH-IGXBY (09_Sistema)
```

GitHubSync.gs replica el repo a Drive diariamente (6-7am). Drive es backup, no fuente de verdad.

---

## 4. ARQUITECTURA — flujo completo

```
┌─────────────────────────────────────────────────────────────┐
│                    INGESTA (automática)                       │
│                                                               │
│  PerplexitySearch.gs ──→ PerplexityQueue (domingos)          │
│  AcademicOrchestrator.gs ──→ AcademicQueue                   │
│  GoogleNewsRSS.gs ──→ NewsResults                            │
│                                                               │
│  Todos leen de: Queries tab (control plane)                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              EVALUACIÓN (Claude, manual: "update")           │
│                                                               │
│  Lee staging queues vía Sheet API                            │
│  Evalúa en lotes de ~20 items                                │
│  Campos: importance, capa, thesis_relevance, action_tag...   │
│  Hard limits: 50 perplexity / 40 academic / 40 news          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   ESCRITURA (por lote)                        │
│                                                               │
│  1. POST a Supabase evaluated_items ← dato completo         │
│  2. POST a Sheet NewsLog ← recibo mínimo (✓ Supabase)       │
│  3. Update status en cola origen (promoted/reviewed)          │
│  4. Si Supabase falla → Sheet full row como fallback         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                EMBEDDINGS (post-escritura)                    │
│                                                               │
│  Edge function generate-embeddings (gte-small, 384d)         │
│  Llamar 1 vez por item nuevo, o dejar al scheduled task      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    CONSULTA                                   │
│                                                               │
│  Dashboard (GitHub Pages) ← lee Sheet API + Supabase REST    │
│  "what did we find about X?" ← Supabase (primario)          │
│  Búsqueda semántica ← search_evaluated_items RPC            │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. APPS SCRIPT — scripts en el proyecto GAS

| Script | Trigger | Qué hace |
|--------|---------|----------|
| **PerplexitySearch.gs** (v3) | Domingos (auto) | Busca con Perplexity Sonar, escribe en PerplexityQueue |
| **AcademicOrchestrator.gs** | Manual o trigger | Busca en OpenAlex, Semantic Scholar, ArXiv, CORE → AcademicQueue |
| **GoogleNewsRSS.gs** (v1) | Manual o trigger | Google News RSS → NewsResults |
| **GitHubSync.gs** (v1) | Diario 6-7am | Replica repo GitHub → Google Drive (09_Sistema/thesis-repo) |
| **WebApp (Code.gs)** (v33+) | Siempre activo | API REST para todo: getStats, getAll, append, promoteToNewsLog, updateRow, etc. |

**Deployment actual:** Version 41+ (URL estable, misma que SHEET_API)

---

## 6. SHEET API — referencia rápida

| Acción | Método | Uso |
|--------|--------|-----|
| `getStats` | GET | Totales, distribución por importance/capa, fechas de último scan |
| `getAll` | GET | Todos los rows de NewsLog. Soporta `?limit=N&offset=N&importance=ALTA&folder=X&action_tag=URGENT` |
| `getUrls` | GET | Todas las URLs existentes (para dedup) |
| `getQueries` | GET | Todos los queries activos |
| `append` | POST | Agregar rows a NewsLog. Dedup contra **todas las tabs**. Usar solo para Claude searches directos. |
| `promoteToNewsLog` | POST | Agregar rows a NewsLog. Dedup contra **NewsLog only**. Usar al promover de staging queues. |
| `updateRow` | POST | Actualizar row de NewsLog por ID |
| `updateByUrl` | POST | Actualizar row de NewsLog por URL |
| `updatePerplexityRow` | POST | Marcar item en PerplexityQueue como promoted/reviewed. Usar `url` como key (no `id`). |
| `updateAcademicRow` | POST | Marcar item en AcademicQueue |
| `addQuery` | POST | Agregar nuevo query a Queries tab |

---

## 7. VERSIONAMIENTO

**Regla:** nunca sobrescribir un archivo existente. Crear la siguiente versión (SKILL-KB-v17.md, etc.) y actualizar `SKILL-KB-current.md` con el mismo contenido.

**Versiones activas al momento de este documento:**

| Archivo | Versión | Fecha |
|---------|---------|-------|
| SKILL-KB | v17 | 2026-03-19 |
| SKILL-PM | v9 | 2026-03-19 |
| PM-SessionLog | v7 | 2026-03-19 |

---

## 8. BUGS Y TASKS ABIERTOS

Leer `phd-kb/logs/KB-PendingIssues.md` para la lista actualizada. Al momento de escribir:

- BUG-001: 84 items stuck en PerplexityQueue
- BUG-002: sweep_index bug en AcademicOrchestrator
- BUG-003: 77 entries degradadas (context compression, run 205)
- BUG-004: ArXiv noise (fix preparado: ArXiv_v2.gs)
- TASK-006: Supabase integration (completado)
- TASK-007: Análisis TRUMP AMERICA AI Act (completado)
- TASK-008: Colorado AI Act date update
- TASK-009: Digital Omnibus plenary vote monitoring

---

## 9. PREVENTION RULES (resumen)

| Rule | Resumen |
|------|---------|
| PR-001 | Usar `promoteToNewsLog` (no `append`) al promover de staging queues |
| PR-002 | Guardar scripts GAS en ruta canónica |
| PR-003 | Hard batch limits: 50/40/40 items |
| PR-004 | Quality gate: thesis_relevance ≥600 chars, no frases genéricas |
| PR-005 | Usar `url` (no `id`) como lookup key para updatePerplexityRow |
| PR-006 | Cerrar sesión con protocolo completo |
| PR-007 | Filtros de categoría para ArXiv |
| PR-008 | GitHub es fuente de verdad, no Drive |
| PR-009 | Testear Supabase al inicio de sesión, usar Python sessions, batch calls |

---

## 10. COORDINACIÓN CON PM

- **phd-kb gestiona:** SKILL-KB, scripts GAS, pipelines, index.html, Supabase
- **phd-pm gestiona:** SKILL-PM, dashboard.html, PM-SessionLog, decisiones de investigación, Obsidian
- **Regla:** KB no modifica dashboard.html. PM no modifica scripts GAS ni index.html.
- **Interfaz compartida:** Sheet API + Supabase para consultar datos del KB desde el PM
- **Cambios de infraestructura** (como Supabase) se registran en AMBOS proyectos

---

## 11. CHECKLIST DE RECUPERACIÓN

Si estás leyendo esto porque perdiste contexto:

1. ☐ Clonar repo: `git clone https://x-access-token:<token>@github.com/aauml/thesis.git`
2. ☐ Leer `SKILL-KB-current.md` completo
3. ☐ Leer `KB-PendingIssues.md` — saber qué está pendiente
4. ☐ Leer `KB-LessonsLog.md` — internalizar Prevention Rules
5. ☐ Testear Sheet API: `curl -sL "SHEET_API?action=getStats"`
6. ☐ Testear Supabase: `curl -s "SUPABASE_URL/rest/v1/evaluated_items?select=pk&limit=1" -H "apikey: SUPABASE_KEY"`
7. ☐ Confirmar: "Recovery complete. SKILL v[X] loaded. [N] prevention rules. [N] pending tasks. Ready."
