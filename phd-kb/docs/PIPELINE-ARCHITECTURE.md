# KB Pipeline Architecture
_Referencia técnica del flujo de datos completo. Leer al inicio de cada sesión de infraestructura._

---

## Diagrama de flujo

```
  [Google News RSS]     [Perplexity Sonar]     [OpenAlex/SemanticScholar/ArXiv/CORE]
        |                      |                           |
   GoogleNewsRSS.gs      PerplexitySearch.gs       AcademicOrchestrator.gs
   (trigger: diario)     (trigger: semanal)        (trigger: bisemanal)
        |                      |                           |
        v                      v                           v
  +-----------+        +----------------+         +----------------+
  |NewsResults|        |PerplexityQueue |         |AcademicQueue   |
  |   (Sheet) |        |    (Sheet)     |         |    (Sheet)     |
  +-----------+        +----------------+         +----------------+
        |                      |                           |
        +----------------------+---------------------------+
                               |
                    Claude (sesión manual)
                    Evalúa, filtra, enriquece
                               |
                    +----------+----------+
                    |                     |
                    v                     v
          +------------------+    +--------------+
          | evaluated_items  |    | NewsLog      |
          |   (Supabase)     |    | (Sheet)      |
          | DESTINO PRIMARIO |    | verification |
          +------------------+    +--------------+
```

---

## Etapa 1: Recolección (automática, GAS triggers)

Los scripts GAS buscan candidatos y los depositan en **staging queues** (tabs del Sheet). Estos items son **crudos y sin evaluar** — contienen mucho ruido.

### GoogleNewsRSS.js (v1)
- **Trigger:** Diario a las 11pm
- **Entrada:** Queries con campo `q_news` en tab Queries
- **Salida:** Tab `NewsResults`
- **Campos producidos:** id, url, title, snippet, source_domain, news_rank, date_found, query_used, q_id, q_name, run_id, status=pending, notes
- **Filtro propio:** Keywords de relevancia (`GNR_RELEVANCE_TERMS`) — reduce noise pero no es suficiente
- **NO produce:** importance, capa, thesis_relevance, scholar, chapters, embedding

### PerplexitySearch.js (v2)
- **Trigger:** Semanal, domingos 3am
- **Entrada:** Queries con campo `q_fullweb` en tab Queries
- **Salida:** Tab `PerplexityQueue`
- **Campos producidos:** id, url, title, synthesis, citations, source_domain, date_found, query_used, q_id, q_name, run_id, status=pending, notes, tokens_used
- **Particularidad:** Perplexity genera una síntesis (no solo un link) — útil para evaluación
- **NO produce:** importance, capa, thesis_relevance, scholar, chapters, embedding

### AcademicOrchestrator.js (v3)
- **Trigger:** Bisemanal, lunes 6am
- **Entrada:** Queries con campos `q_openalex`, `q_semantic`, `q_arxiv`, `q_core` en tab Queries
- **Salida:** Tab `AcademicQueue`
- **Campos producidos:** id, url, title, authors, year, abstract, source_api, query_id, query_name, date_found, status=pending, notes
- **Providers:** OpenAlex, Semantic Scholar, ArXiv (v2 con filtro categorías), CORE
- **NO produce:** importance, capa, thesis_relevance, scholar, chapters, embedding
- **Bug conocido (v2):** sweep_index overflow → fix en v3 (pendiente deploy)

---

## Etapa 2: Evaluación (manual, Claude)

Claude lee las staging queues, evalúa cada item, y decide:
- **Promover:** Item relevante → genera campos completos → escribe a Supabase
- **Descartar:** Item irrelevante → marca status=discarded en la queue
- **Revisar:** Item ambiguo → marca status=reviewed con notas

### Campos que Claude genera (no existen en los scripts):
| Campo | Descripción | Validación |
|-------|-------------|------------|
| `importance` | ALTA / MEDIA / BAJA | Enum estricto |
| `capa` | Teórica, Analítica, Evaluativa, Caso, Metodológica | Multivalue |
| `capa_detail` | Detalle de la capa | Texto libre |
| `thesis_relevance` | Análisis de relevancia para la tesis | >100 chars, sin patrones degradados |
| `scholar` | Autor o fuente | >2 chars |
| `chapters` | Capítulos relevantes (int[]) | Al menos 1 elemento |
| `content_type` | Tipo de contenido | Texto libre |
| `embedding` | Vector 384d (gte-small) | Generado por edge function |

### Protocolo de escritura (SKILL-KB-v17, Supabase-primary):
1. Claude escribe item completo a **Supabase** (evaluated_items)
2. Claude llama edge function `generate-embeddings` para el vector
3. Claude escribe fila de verificación a **NewsLog** (Sheet): solo title, url, importance, source_pipeline, notes="✓ Supabase"

---

## Etapa 3: Protecciones

### Trigger de auto-corrección SQL (`trg_validate_evaluated_item`)
En vez de rechazar items con datos incompletos, **corrige automáticamente** lo que puede y logea cada corrección en `kb_corrections_log`.

**Solo rechaza** (no hay default razonable):
- `title` < 5 chars — no se puede inventar un título
- `url` < 10 chars — no se puede inventar una URL

**Auto-corrige** (con defaults razonables):
| Campo | Condición | Corrección |
|-------|-----------|------------|
| `importance` | NULL o valor inválido | → `'MEDIA'` |
| `thesis_relevance` | < 100 chars | → `'[PENDIENTE] ' + texto original` |
| `thesis_relevance` | Patrón degradado BUG-003 | → `'[DEGRADADO] ' + texto original` |
| `scholar` | NULL o < 2 chars | → `'[sin asignar]'` |
| `chapters` | NULL o vacío | → `'{4}'` (Cap 4 = Estado del Arte catch-all) |

Cada item auto-corregido recibe en `notes`: `[autocorrected:N fields]`.
Cada corrección se logea en `kb_corrections_log` con: url, campo, valor original, valor nuevo, timestamp.

### Health check (`kb_health_check()`)
Función SQL que reporta 13 checks de calidad:
- Campos faltantes o vacíos
- Items con `[PENDIENTE]` (necesitan evaluación completa)
- Items con `[DEGRADADO]` (patrón BUG-003)
- Items con `[sin asignar]` scholar
- Auto-correcciones recientes (últimos 7 días)
- URLs duplicadas
- Distribución de chapters e importance

**Uso:** `SELECT * FROM kb_health_check();`
**Cuándo ejecutar:** Al inicio y cierre de cada sesión de datos.

### Cron automático (`kb-daily-health-check`)
- pg_cron ejecuta health check diario a las 7am UTC
- Resultados en tabla `kb_health_log` (retención 90 días)
- **Consultar historial:** `SELECT * FROM kb_health_log ORDER BY run_at DESC LIMIT 7;`
- Si `fails > 0` o `warns > 0`, revisar `details` jsonb para diagnóstico

---

## Qué NO está automatizado (y por qué)

| Gap | Razón | Consecuencia |
|-----|-------|--------------|
| Scripts GAS no escriben a Supabase | Los items crudos no tienen los campos evaluados — serían basura en Supabase | Requiere sesión manual de Claude |
| No hay notificación de items pendientes | GAS no tiene forma de alertar que hay N items en queues | Hay que revisar queues manualmente |
| Embeddings no se generan en batch | Free tier de Supabase limita a batch_size=1 | Lento pero funcional |
| Sheet↔Supabase sync no es automática | Cualquier cambio manual en Sheet no se refleja en Supabase | Verificar en cada sesión |

---

## Prevention Rules relevantes al pipeline

- **PR-001:** Usar `promoteToNewsLog` para items de staging queues, nunca `append`
- **PR-003:** Max 50 items por sesión de evaluación (context window compression)
- **PR-004:** Quality gate antes de cada post a NewsLog
- **PR-009:** Testear Supabase al inicio de sesión; si falla, modo Sheet-only
- **PR-013:** WebApp `append` espera `rows` (array), no `row` (singular)
- **PR-014:** Comparación de URLs siempre en lowercase

---

_Última actualización: 2026-03-22_
