# PM Session Log
**Versión:** v5 · **Fecha:** 2026-03-15
_Registro técnico del proyecto phd-pm. Actualizar al cierre de cada sesión. Al actualizar, crear PM-SessionLog-v6.md — nunca sobrescribir este archivo._

---

## Arquitectura del sistema

### Componentes activos
| Componente | Ubicación | Versión | Última actualización |
|------------|-----------|---------|---------------------|
| Dashboard | `thesis/dashboard.html` → GitHub Pages | v4.0 | 2026-03-15 |
| Knowledge Base webapp | `thesis/index.html` → GitHub Pages | — | gestionado por phd-kb |
| Sheet API (WebApp) | Google Apps Script | v33 | 2026-03-15 |
| GitHubSync | Google Apps Script | v1 | 2026-03-15 |
| PerplexitySearch | Google Apps Script | v3 | 2026-03-13 |
| AcademicOrchestrator | Google Apps Script | — | gestionado por phd-kb |
| GoogleNewsRSS | Google Apps Script | v1 | 2026-03-13 |
| SKILL-KB | `phd-kb/docs/` (repo) | v13 | 2026-03-15 |
| SKILL-PM | `phd-pm/docs/` (repo) | v4 | 2026-03-15 |

### Endpoints
- **SHEET_API:** `https://script.google.com/macros/s/AKfycbzk2vhu-qcKFBPqEImKGEZKSitpVZv1IQQEv5ZzG7pNfo-iPUWfvSoLWWnkoc8d8PQQ/exec`
- **GitHub Pages:** `https://aauml.github.io/thesis/`
- **Repo:** `https://github.com/aauml/thesis`
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
| SKILL-PM | `phd-pm/docs/SKILL-PM-v4.md` | v4 |
| PM-SessionLog | `phd-pm/logs/PM-SessionLog-v5.md` | v5 |
| PM-LessonsLog | `phd-pm/logs/PM-LessonsLog.md` | v1 |
| context-blocks | `phd-pm/docs/context-blocks-v2.md` | v2 |
| tool-modes | `phd-pm/docs/tool-modes-v2.md` | v2 |

---

## Registro de sesiones

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

### 2026-03-15 (sesión 3) — Trigger diario + context compaction recovery

**Contexto:** Sesión continuada tras context compaction. Tarea pendiente de sesión 2.

**Cambios realizados:**
- **Trigger diario configurado** para `syncGitHubToDrive`: Time-driven → Day timer → 6am–7am (GMT-7). Ahora hay 4 triggers en el proyecto GAS.
- PM-BUG-001 revisado y explicado: bloqueador para automatización del KB Intelligence Report en el dashboard. Solución identificada: extraer schema del WebApp.gs.

**Decisiones:**
- Trigger diario a las 6–7am para que el mirror en Drive esté actualizado antes de la jornada de trabajo.

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
- **Estado:** Abierto
- **Descripción:** El endpoint SHEET_API acepta actions pero no hay schema documentado accesible desde phd-pm. El skill phd-kb usa `action=getPage`, `action=append`, `action=promoteToNewsLog`, etc.
- **Impacto:** Medio — no puedo generar el KB Intelligence Report automáticamente hasta confirmar las actions disponibles.
- **Fix:** Coordinar con phd-kb para documentar API schema aquí o en archivo compartido.
- **Fecha detectado:** 2026-03-14

---

_Última actualización: 2026-03-15_
