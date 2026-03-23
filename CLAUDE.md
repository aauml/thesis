# Thesis System — Entry Point para Claude Code

Este repositorio gestiona una tesis doctoral sobre interoperabilidad EU AI Act ↔ NIST AI RMF.
Hay dos subsistemas con dominios separados. **No cruzar sin coordinar.**

## Secuencia de Inicialización (obligatoria, en este orden)

### 1. Lee CHANGELOG.md (contexto cross-contexto)
```
Ruta: CHANGELOG.md (raíz del repo)
```
Últimas entradas = qué pasó en sesiones recientes de Cowork, Chat, Code, o Dispatch.

### 2. Identifica qué componente vas a tocar

| Componente | Dominio | Skill a leer |
|---|---|---|
| `dashboard.html`, `pwa/`, `sw.js` | **PM** | `phd-pm/docs/SKILL-PM-current.md` |
| `index.html` | **KB** | `phd-kb/docs/SKILL-KB-current.md` |
| tablas `pm_*`, `chapter_sections`, `reading_plan` | **PM** | SKILL-PM |
| `evaluated_items`, pipelines, GAS scripts | **KB** | SKILL-KB |
| Ambos o no está claro | Preguntar al usuario | — |

### 3. Lee el SKILL del dominio correspondiente
El SKILL contiene todas las reglas operativas, gotchas, y protocolos. No hacer cambios sin leerlo.

### 4. Lee SYSTEM-ARCHITECTURE.md (dependencias técnicas)
```
Ruta: phd-pm/docs/SYSTEM-ARCHITECTURE.md
```
Tablas Supabase, relaciones, RLS, edge functions, flujo de deploy, trampas conocidas.

### 5. Trabaja

### 6. Al terminar — escribe en CHANGELOG.md
Formato (append-only, nunca editar entradas anteriores):
```
## YYYY-MM-DD | code | componente(s) | resumen
- Qué se hizo
- Qué decisiones se tomaron (si aplica)
- Qué afecta a otros contextos (si aplica)
```
Commit y push incluyendo CHANGELOG.md.

---

## Reglas de frontera

- **PM no toca:** index.html, scripts GAS, `phd-kb/`
- **KB no toca:** dashboard.html, `phd-pm/`
- **Antes de modificar cualquier componente:** lee SYSTEM-ARCHITECTURE.md (checklist §9)
- **Deploy dashboard:** editar copia de trabajo → copiar a repo → commit → push → verificar con `?v=N`
- **Git identity:**
```bash
git config user.email "claude@thesis.local"
git config user.name "Claude Code"
```

## Jerarquía de memoria

1. **pm_decisions** (Supabase) — decisiones de investigación curadas, pocas e importantes
2. **CHANGELOG.md** (repo) — log operativo diario, todos los contextos escriben aquí
3. **PM-SessionLog / KB-LessonsLog** (repo) — detalle técnico por proyecto
