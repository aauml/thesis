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
- **Deploy dashboard:** editar copia de trabajo → push a GitHub → GDrive sincroniza desde GitHub (GDrive es backup, no fuente)

## Git Push desde Cowork / Claude Code

El repo no está clonado en la carpeta de GDrive. Para hacer push:

```bash
# 1. Leer el PAT guardado
GH_TOKEN=$(cat /sessions/peaceful-cool-faraday/mnt/PhD/09_Sistema/.secrets/github-pat.txt)

# 2. Clonar el repo con auth
git clone "https://x-access-token:${GH_TOKEN}@github.com/aauml/thesis.git" /sessions/peaceful-cool-faraday/thesis-git-repo

# 3. Configurar identidad
cd /sessions/peaceful-cool-faraday/thesis-git-repo
git config user.email "claude@thesis.local"
git config user.name "Claude Code"

# 4. Copiar archivos modificados desde la copia de trabajo
cp /sessions/peaceful-cool-faraday/mnt/PhD/09_Sistema/thesis-repo/<archivo> ./<archivo>

# 5. Commit y push
git add <archivo>
git commit -m "mensaje descriptivo"
git push origin main
```

**Notas:**
- El PAT (fine-grained, sin expiración) está en `09_Sistema/.secrets/github-pat.txt`
- Tiene permisos: Read/Write contents en `aauml/thesis` únicamente
- Si el token falla, regenerar en GitHub → Settings → Developer Settings → Fine-grained tokens → `claude-thesis`
- **NUNCA** usar el navegador para hacer push. Siempre usar git CLI con el PAT
- **SIEMPRE** hacer push después de editar. GDrive es backup, GitHub es la fuente de verdad

## Jerarquía de memoria

1. **pm_decisions** (Supabase) — decisiones de investigación curadas, pocas e importantes
2. **CHANGELOG.md** (repo) — log operativo diario, todos los contextos escriben aquí
3. **PM-SessionLog / KB-LessonsLog** (repo) — detalle técnico por proyecto
