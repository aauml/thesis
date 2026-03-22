# PROTOCOL — Update Session: Supabase-Primary Writing
**Versión:** 1.0 · **Fecha:** 2026-03-22
**Basado en:** SKILL-KB-v17, PIPELINE-ARCHITECTURE.md, KB-PendingIssues (TASK-006 validated)

Este documento cubre todo lo necesario para ejecutar la primera (y siguientes) sesiones `update` con escritura directa a Supabase como destino primario, y log de verificación en Sheet NewsLog.

---

## 1. PREREQUISITES CHECKLIST

Verificar antes de comenzar cualquier sesión `update`:

- [ ] Repo clonado y actualizado (`git pull` o fresh clone)
- [ ] SKILL-KB-current.md leído (operativo, contiene reglas y comandos)
- [ ] KB-PendingIssues.md leído (bugs activos, tasks pendientes)
- [ ] KB-LessonsLog.md leído (Prevention Rules PR-001 a PR-009)
- [ ] SYSTEM-ARCHITECTURE.md leído si se van a hacer cambios de infraestructura
- [ ] Acceso verificado a Supabase: `curl -s "$SUPABASE_URL/rest/v1/evaluated_items?select=count&limit=1" -H "apikey: $SUPABASE_KEY"` → HTTP 200
- [ ] Acceso verificado a Sheet API: `curl -s -L "$SHEET_API?action=getMeta"` → `{ok:true, ...}`
- [ ] Trigger de validación activo en Supabase: `trg_validate_evaluated_item` (rechaza items sin title ≥5, url ≥10, importance válido)
- [ ] Health check corrido y revisado: `SELECT * FROM kb_health_check();` o esperar al reporte diario en `kb_health_log`
- [ ] Versiones activas confirmadas:
  - WebApp: v35 (v36 pendiente deploy por usuario — fix BUG-005)
  - GoogleNewsRSS: v1
  - PerplexitySearch: v3
  - AcademicOrchestrator: v2 (v3 pendiente deploy — fix BUG-002)
  - SKILL-KB: v17 (current)

---

## 2. CONFIGURACIÓN DE CREDENCIALES

### Supabase

```
SUPABASE_URL=https://wtwuvrtmadnlezkbesqp.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0d3V2cnRtYWRubGV6a2Jlc3FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MzczMDYsImV4cCI6MjA4OTUxMzMwNn0.1eCIlv6URloKHnEzxB2drHtiS2NR_VH_2DHF6YFLerY
PROJECT_ID=wtwuvrtmadnlezkbesqp
REGION=us-west-1
```

**Tipo de key usada:** anon (público). RLS permite SELECT, INSERT, UPDATE en `evaluated_items` para anon. No permite DELETE.

### Sheet API

```
SHEET_API=https://script.google.com/macros/s/AKfycbzk2vhu-qcKFBPqEImKGEZKSitpVZv1IQQEv5ZzG7pNfo-iPUWfvSoLWWnkoc8d8PQQ/exec
GAS_PROJECT_ID=19CE8dj2-1FcFNrHczcKC79xA5KGn9o1fHaa1skp4R3SYZ60ScQszSufo
```

---

## 3. TABLAS SUPABASE — REFERENCIA

### Tabla principal: `evaluated_items`

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `url` | text | SI | Unique constraint `unique_url`. Duplicados ignorados. |
| `title` | text | SI | Mínimo 5 caracteres (trigger rechaza). |
| `importance` | text | SI | `ALTA` / `MEDIA` / `BAJA` (trigger rechaza si inválido). |
| `source` | text | No | Nombre de publicación/sitio. |
| `date_published` | text | No | `YYYY-MM-DD` o `YYYY`. |
| `content_type` | text | No | article, paper, report, blog, regulation, guidance, court_ruling, etc. |
| `capa` | text | No | Teórica, Analítica, Evaluativa, Caso, Metodológica. Multi-valor separado por ", ". |
| `capa_detail` | text | No | Detalle específico (ej: "Art. 9 ↔ MAP/MEASURE"). |
| `evaluativa_criteria` | text | No | Accountability, Contestabilidad, Equidad, Explicabilidad. |
| `action_tag` | text | No | REFERENCE / CONTEXT / FOLLOW-UP / URGENT |
| `thesis_relevance` | text | No | Mínimo 100 chars. 3 párrafos: Contexto, Artículo, Tesis. |
| `scholar` | text | No | Mínimo 2 chars. Auto-corregido a `[sin asignar]` si vacío. |
| `search_scope` | text | No | Qué comando generó el item (ej: "update perplexity"). |
| `language` | text | No | `en` / `es` / código ISO. Default: `en`. |
| `run_id` | text | No | `YYYY-MM-DD-NNN` (NNN = total_searches del Meta). |
| `tier` | text | No | `1` (oficial) / `2` (académico) / `3` (general). |
| `folder` | text | No | `01_Marco_Teorico` / `02_Metodologia` / `03_Corpus_Juridico` / `04_Estado_del_Arte`. |
| `notes` | text | No | Notas libres. |
| `starred` | boolean | No | Default `false`. |
| `source_pipeline` | text | No | perplexity / academic / news / claude / scholar_gateway / consensus |
| `chapters` | integer[] | No | IDs de capítulos relevantes. Auto-corregido a `{4}` si vacío. |
| `embedding` | vector(384) | No | Generado por edge function. Dejar null al escribir. |
| `pk` | UUID | Auto | Generado por Supabase. |
| `created_at` | timestamptz | Auto | Generado por Supabase. |
| `updated_at` | timestamptz | Auto | Generado por Supabase. |

**Numeración canónica de capítulos (`chapters` field):**

| ID | Título |
|----|--------|
| 1 | Introducción |
| 2 | Marco teórico |
| 3 | Estado del arte |
| 4 | Metodología |
| 5 | Análisis comparativo |
| 6 | Caso de estudio |
| 7 | Conclusiones |

Fuente de verdad: `SELECT chapter_num, chapter_title FROM chapter_sections ORDER BY chapter_num;`

---

## 4. PROTOCOLO DE EJECUCIÓN — PASO A PASO

### Fase 0: Startup (siempre antes de evaluar)

```bash
# 1. Obtener metadatos
curl -s -L "$SHEET_API?action=getMeta"
# → Anota: total_searches (para run_id), last_perplexity_scan, last_acad_scan, last_news_scan

# 2. Contar pendientes en cada queue
curl -s -L "$SHEET_API?action=getPerplexityQueue&status=pending&limit=1"
curl -s -L "$SHEET_API?action=getAcademicQueue&status=pending&limit=1"
curl -s -L "$SHEET_API?action=getNewsResults&status=pending&limit=1"

# 3. URLs existentes para deduplicación local (si se usa `append` para Claude searches)
curl -s -L "$SHEET_API?action=getUrls"

# 4. Health check Supabase
curl -s "$SUPABASE_URL/rest/v1/evaluated_items?select=count&limit=1" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Prefer: count=exact"
# → Content-Range header da total de items

# 5. Reportar estado inicial
echo "PerplexityQueue: X pending | AcademicQueue: Y pending | NewsResults: Z pending | Total Supabase: N"
```

**Generar run_id para la sesión:**
```
run_id = YYYY-MM-DD-NNN  (donde NNN = total_searches del Meta, zero-padded a 3 dígitos)
Ejemplo: 2026-03-22-215
```

---

### Fase 1: Evaluación en batches de ~20 items

**Límites duros por sesión:**
- `update perplexity`: máximo 50 items
- `update academic`: máximo 40 items
- `update news`: máximo 40 items
- `update` (full): 30 perplexity + 20 academic + 20 news

**Por cada batch de ~20 items evaluados:**

#### Paso 1.1 — Fetch del batch desde la queue

```bash
# PerplexityQueue
curl -s -L "$SHEET_API?action=getPerplexityQueue&status=pending"

# AcademicQueue
curl -s -L "$SHEET_API?action=getAcademicQueue&status=pending"

# NewsResults
curl -s -L "$SHEET_API?action=getNewsResults&status=pending"
```

#### Paso 1.2 — Evaluación de cada item

Para cada item, determinar:
1. **promote**: relevante para la tesis → generar campos completos → escribir a Supabase
2. **discard**: irrelevante → marcar status=discarded en queue
3. **reviewed**: borderline → marcar status=reviewed en queue (no se escribe a Supabase)

Criterios de evaluación completos en SKILL-KB-current.md §"Evaluation — How to Score Every Result".

#### Paso 1.3 — Escribir batch a Supabase (DESTINO PRIMARIO)

```bash
curl -s -X POST "$SUPABASE_URL/rest/v1/evaluated_items" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=ignore-duplicates,return=minimal" \
  -d '[
    {
      "url": "https://example.com/article",
      "title": "Article Title",
      "source": "Source Name",
      "date_published": "2026-02-15",
      "content_type": "article",
      "importance": "ALTA",
      "capa": "Teórica, Analítica",
      "capa_detail": "Gobernanza IA comparada, Art. 9 ↔ MAP/MEASURE",
      "evaluativa_criteria": "Accountability, Explicabilidad",
      "action_tag": "REFERENCE",
      "thesis_relevance": "Párrafo 1: Contexto.\n\nPárrafo 2: Artículo.\n\nPárrafo 3: Tesis.",
      "scholar": "Apellido (Año)",
      "search_scope": "update perplexity",
      "language": "en",
      "run_id": "2026-03-22-215",
      "tier": "2",
      "folder": "01_Marco_Teorico",
      "notes": "",
      "starred": false,
      "source_pipeline": "perplexity",
      "chapters": [2, 3]
    }
  ]'
```

**Respuesta esperada:** HTTP 201 (Created) o HTTP 200 con body vacío. Si `Prefer: return=minimal`, el body estará vacío en caso de éxito.

#### Paso 1.4 — Generar embeddings para el batch

Llamar una vez por cada item nuevo escrito a Supabase:

```bash
curl -s -X POST "$SUPABASE_URL/functions/v1/generate-embeddings" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"batch_size": 1}'
```

**Nota:** batch_size=1 obligatorio en free tier (WORKER_LIMIT con batch>1). Los embeddings no son bloqueantes — si el tiempo es limitado, se pueden generar después.

#### Paso 1.5 — Escribir filas de verificación a Sheet NewsLog

Después de confirmar la escritura en Supabase, registrar filas mínimas en NewsLog:

```bash
curl -s -L "$SHEET_API" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "promoteToNewsLog",
    "rows": [
      {
        "title": "Article Title",
        "url": "https://example.com/article",
        "importance": "ALTA",
        "source_pipeline": "perplexity",
        "date_found": "2026-03-22",
        "notes": "✓ Supabase"
      }
    ]
  }'
```

**Importante:** Solo estos 5 campos son necesarios en el verification row. Los demás (thesis_relevance, capa, capa_detail, etc.) quedan vacíos en Sheet — el registro completo está en Supabase.

**Acción a usar por source:**
- Items de staging queues (PerplexityQueue, AcademicQueue, NewsResults): usar `promoteToNewsLog` (dedup solo contra NewsLog)
- Items directos de Claude searches: usar `append` (dedup contra todos los tabs)

#### Paso 1.6 — Marcar items como procesados en sus queues

```bash
# PerplexityQueue — usar url como lookup key (NO id)
curl -s -L "$SHEET_API" -H "Content-Type: application/json" \
  -d '{"action":"updatePerplexityRow","url":"https://example.com/row-url","status":"promoted"}'

# AcademicQueue — usar url como lookup key
curl -s -L "$SHEET_API" -H "Content-Type: application/json" \
  -d '{"action":"updateAcademicRow","url":"https://example.com/paper","status":"promoted"}'

# NewsResults
curl -s -L "$SHEET_API" -H "Content-Type: application/json" \
  -d '{"action":"updateNewsRow","id":"ROW_ID","fields":{"status":"processed"}}'
```

#### Paso 1.7 — Confirmar batch antes de continuar

Verificar que el batch fue escrito correctamente antes de procesar el siguiente:

```bash
# Contar items recientes en Supabase (compara con total esperado)
curl -s "$SUPABASE_URL/rest/v1/evaluated_items?order=created_at.desc&limit=5&select=title,importance,created_at" \
  -H "apikey: $SUPABASE_KEY"
```

Reportar: "Batch N: X items escritos a Supabase, X verification rows en NewsLog, X discarded, X reviewed."

---

### Fase 2: Targeted Claude Searches (update claude)

Scope: 5-10 búsquedas máximo por sesión. Prioridades:
1. Items URGENT/FOLLOW-UP en NewsLog que necesitan actualización
2. Eventos recientes no cubiertos por las staging queues
3. Búsquedas en español (Sonar devuelve principalmente inglés)

Los resultados de Claude searches van directamente a Supabase + NewsLog (no pasan por staging queues). Usar `action=append` (dedup contra todos los tabs).

---

### Fase 3: Actualizar metadatos al cierre

```bash
curl -s -L "$SHEET_API" \
  -H "Content-Type: application/json" \
  -d '{"action":"updateMeta","meta":{"last_search_date":"2026-03-22T14:30:00Z"}}'
```

---

## 5. FORMATO DEL VERIFICATION LOG (Sheet NewsLog)

El NewsLog ya no contiene el registro completo de datos evaluados. Su rol es exclusivamente de verificación visual.

### Estructura de cada fila de verificación

| Campo | Valor | Notas |
|-------|-------|-------|
| `title` | Título del item | Para identificación visual |
| `url` | URL completa | Para deduplicación y referencia |
| `importance` | ALTA / MEDIA / BAJA | Para filtrado visual rápido |
| `source_pipeline` | perplexity / academic / news / claude | Para identificar origen |
| `date_found` | YYYY-MM-DD | Fecha de evaluación |
| `notes` | `✓ Supabase` | Marcador obligatorio — distingue de filas legacy |

**Todos los demás campos deben quedar vacíos** (thesis_relevance, capa, capa_detail, capa_detail, evaluativa_criteria, action_tag, scholar, run_id, tier, folder, starred, search_scope, language, content_type, date_published, source).

### Cómo distinguir filas verification de filas legacy

- Filas legacy (pre-2026-03-19): tienen todos los campos completos, sin `notes="✓ Supabase"`
- Filas verification (post-2026-03-19): solo 5 campos, `notes="✓ Supabase"`

### Consulta de verificación post-sesión

Para confirmar que los items están en Supabase:

```bash
# Últimos N items escritos
curl -s "$SUPABASE_URL/rest/v1/evaluated_items?order=created_at.desc&limit=20&select=title,importance,source_pipeline,created_at" \
  -H "apikey: $SUPABASE_KEY"
```

---

## 6. MANEJO DE ERRORES

### Error: Supabase write falla (HTTP 4xx o 5xx)

1. **Reintentar una vez** con el mismo payload.
2. Si reintento falla: escribir la fila COMPLETA a Sheet NewsLog como fallback (no solo verificación). Añadir `notes="supabase_write_failed"`.
3. Anotar en el session log para backfill posterior.
4. Continuar con el resto del batch.

```bash
# Fallback: fila completa a NewsLog cuando Supabase falla
curl -s -L "$SHEET_API" -H "Content-Type: application/json" \
  -d '{"action":"promoteToNewsLog","rows":[{...todos los campos...,"notes":"supabase_write_failed"}]}'
```

### Error: Sheet verification row falla

No es crítico — el dato ya está en Supabase (fuente de verdad). Continuar. Anotar en session log.

### Error: `trg_validate_evaluated_item` rechaza un item

El trigger rechaza si:
- `title` < 5 caracteres
- `url` < 10 caracteres
- `importance` no es ALTA/MEDIA/BAJA

El trigger auto-corrige (y logea en `kb_corrections_log`):
- `thesis_relevance` < 100 chars → prefija `[PENDIENTE] `
- `thesis_relevance` con patrón degradado → prefija `[DEGRADADO] `
- `scholar` < 2 chars → reemplaza con `[sin asignar]`
- `chapters` vacío → reemplaza con `{4}` (cap 4 catch-all)

Si el item es rechazado: corregir los campos obligatorios (title, url, importance) y reintentar.

### Error: Embedding generation falla

Los embeddings no son bloqueantes. Si falla la edge function:
- Continuar con el siguiente item.
- Los embeddings se generarán después por el scheduled task `generate-embeddings-backfill`.
- Verificar: `SELECT COUNT(*) FROM evaluated_items WHERE embedding IS NULL;`

### Error: Queue status update falla (Sheet API)

Si `updatePerplexityRow` / `updateAcademicRow` no actualiza el status:
- Para PerplexityQueue: verificar que se usa `url` como lookup key (no `id` — PR-007 confirmado bug).
- Para AcademicQueue: verificar que se usa `url` como lookup key (misma regla).
- Si el problema persiste: anotar en session log y marcar manualmente en Sheet si es urgente.

### Error: Duplicate URL rechazado por Supabase

Comportamiento esperado — `Prefer: resolution=ignore-duplicates` silencia el error. El item ya existe en Supabase. No es un error real.

### Error: context window compression (más de 50 items en una sesión)

Si se acerca al límite de contexto:
- DETENER la evaluación inmediatamente.
- Hacer commit del trabajo actual a Supabase + Sheet.
- Reportar: "X items procesados. Y items remaining en queue. Continuar en próxima sesión."
- No continuar a riesgo de degradar la calidad de `thesis_relevance`.

---

## 7. CRITERIOS DE ÉXITO

Una sesión `update` es exitosa cuando:

- [ ] Todas las staging queues procesadas hasta el límite de la sesión o hasta vaciar
- [ ] Todos los items promoted escritos en Supabase (HTTP 201/200 confirmado)
- [ ] Fila de verificación en Sheet NewsLog por cada item Supabase (con `notes="✓ Supabase"`)
- [ ] Items discarded/reviewed marcados correctamente en sus queues
- [ ] Embeddings generados para nuevos items (o pendientes documentados)
- [ ] Metadatos actualizados (`last_search_date` en Sheet Meta)
- [ ] Health check corrido post-sesión confirma integridad (`fails = 0`)
- [ ] Session log actualizado con: items añadidos, run_id, distribución de importancia, pendientes
- [ ] Commit y push al repo con los cambios de logs/skill (si aplica)

### Verificación final de salud

```bash
# Total items en Supabase
curl -s "$SUPABASE_URL/rest/v1/evaluated_items?select=count&limit=1" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Prefer: count=exact"
# → Content-Range: 0-0/TOTAL

# Items sin embedding (deberían ser 0 o muy pocos)
curl -s "$SUPABASE_URL/rest/v1/evaluated_items?embedding=is.null&select=count&limit=1" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Prefer: count=exact"

# Items auto-corregidos recientemente
# → Consultar en Supabase SQL: SELECT * FROM kb_corrections_log ORDER BY created_at DESC LIMIT 10;

# Items con [PENDIENTE] en thesis_relevance
curl -s "$SUPABASE_URL/rest/v1/evaluated_items?thesis_relevance=ilike.*%5BPENDIENTE%5D*&select=count&limit=1" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Prefer: count=exact"
```

---

## 8. PROCEDIMIENTO DE ROLLBACK

Supabase no tiene transacciones automáticas vía REST API. El rollback se hace manualmente.

### Rollback de items escritos incorrectamente

**Situación:** Se escribieron items con datos erróneos (importance mal asignado, thesis_relevance degradada, etc.).

```bash
# Identificar items del run a corregir
curl -s "$SUPABASE_URL/rest/v1/evaluated_items?run_id=eq.2026-03-22-215&select=pk,url,title,importance,thesis_relevance" \
  -H "apikey: $SUPABASE_KEY"

# Actualizar campo específico por URL
curl -s -X PATCH "$SUPABASE_URL/rest/v1/evaluated_items?url=eq.https%3A%2F%2Fexample.com%2Farticle" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"importance": "MEDIA", "thesis_relevance": "Nuevo texto..."}'
```

**Nota:** anon key permite UPDATE en `evaluated_items`. No permite DELETE. Si un item debe eliminarse completamente, requiere acceso al panel de Supabase (service_role).

### Rollback de verification rows en Sheet

Para eliminar filas de verificación del NewsLog que no corresponden:

```bash
curl -s -L "$SHEET_API" -H "Content-Type: application/json" \
  -d '{"action":"deleteByUrl","urls":["https://example.com/article"]}'
```

**Requiere:** WebApp v35+ (que incluye `deleteByUrl` action).

### Rollback de queue status

Si se marcó un item como `promoted` o `discarded` incorrectamente:

```bash
# Revertir a pending en PerplexityQueue
curl -s -L "$SHEET_API" -H "Content-Type: application/json" \
  -d '{"action":"updatePerplexityRow","url":"https://example.com/row-url","status":"pending"}'
```

### Documentar el rollback

Siempre anotar en KB-PendingIssues.md o KB-LessonsLog.md:
- Fecha del rollback
- Run ID afectado
- Items modificados (URLs)
- Causa del error
- Medida preventiva para futuras sesiones

---

## 9. REFERENCIA RÁPIDA — COMANDOS FRECUENTES

```bash
# Estado inicial (inicio de sesión)
curl -s -L "$SHEET_API?action=getMeta"
curl -s "$SUPABASE_URL/rest/v1/evaluated_items?select=count&limit=1" -H "apikey: $SUPABASE_KEY" -H "Prefer: count=exact"

# Fetch queues
curl -s -L "$SHEET_API?action=getPerplexityQueue&status=pending"
curl -s -L "$SHEET_API?action=getAcademicQueue&status=pending"
curl -s -L "$SHEET_API?action=getNewsResults&status=pending"

# Write to Supabase (batch)
curl -s -X POST "$SUPABASE_URL/rest/v1/evaluated_items" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=ignore-duplicates,return=minimal" \
  -d '[{...item...}]'

# Write verification row to Sheet
curl -s -L "$SHEET_API" -H "Content-Type: application/json" \
  -d '{"action":"promoteToNewsLog","rows":[{"title":"...","url":"...","importance":"...","source_pipeline":"...","date_found":"...","notes":"✓ Supabase"}]}'

# Generate embedding
curl -s -X POST "$SUPABASE_URL/functions/v1/generate-embeddings" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"batch_size": 1}'

# Mark as promoted (Perplexity/Academic queue — use url, NOT id)
curl -s -L "$SHEET_API" -H "Content-Type: application/json" \
  -d '{"action":"updatePerplexityRow","url":"...","status":"promoted"}'
curl -s -L "$SHEET_API" -H "Content-Type: application/json" \
  -d '{"action":"updateAcademicRow","url":"...","status":"promoted"}'

# Mark as discarded
curl -s -L "$SHEET_API" -H "Content-Type: application/json" \
  -d '{"action":"updatePerplexityRow","url":"...","status":"discarded"}'

# Update metadata at session close
curl -s -L "$SHEET_API" -H "Content-Type: application/json" \
  -d '{"action":"updateMeta","meta":{"last_search_date":"YYYY-MM-DDTHH:MM:SSZ"}}'

# Query Supabase for recent items
curl -s "$SUPABASE_URL/rest/v1/evaluated_items?order=created_at.desc&limit=20&select=title,importance,source_pipeline,created_at" \
  -H "apikey: $SUPABASE_KEY"

# Health check (SQL — ejecutar en Supabase dashboard o via service_role)
# SELECT * FROM kb_health_check();
# SELECT * FROM kb_health_log ORDER BY run_at DESC LIMIT 5;
```

---

## 10. PREVENTION RULES APLICABLES A ESTE PROTOCOLO

De KB-LessonsLog.md:

- **PR-001:** Usar `promoteToNewsLog` para items de staging queues. Nunca `append` (append dedup contra todos los tabs, bloquearía URLs que ya están en queues).
- **PR-003:** No exceder 50 items por sesión para evitar context window compression y degradación de thesis_relevance.
- **PR-007:** Usar `url` como lookup key para `updatePerplexityRow` y `updateAcademicRow` — NUNCA `id`.
- **PR-013:** `action=append` requiere `"rows": [...]` (array), no `"row": {...}` (objeto).
- **Regla batch-first:** Evaluar en grupos de ~20, escribir cada grupo antes de continuar. No evaluar todo y escribir al final.
- **Regla Supabase-primary:** Los datos completos SOLO van a Supabase. Sheet solo recibe filas de verificación mínimas.

---

_Creado: 2026-03-22 | Basado en TASK-006 (SKILL-KB-v17 validation) y dry run de 2026-03-22_
_Próxima revisión: después de la primera sesión `update` real con este protocolo_
