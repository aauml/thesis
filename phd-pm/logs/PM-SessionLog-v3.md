# PM Session Log
**Versión:** v3 · **Fecha:** 2026-03-14
_Registro técnico del proyecto phd-pm. Actualizar al cierre de cada sesión. Al actualizar, crear PM-SessionLog-v4.md — nunca sobrescribir este archivo._

---

## Arquitectura del sistema

### Componentes activos
| Componente | Ubicación | Versión | Última actualización |
|------------|-----------|---------|---------------------|
| Dashboard | `thesis/dashboard.html` → GitHub Pages | v2.1 | 2026-03-14 |
| Knowledge Base webapp | `thesis/index.html` → GitHub Pages | — | gestionado por phd-kb |
| Sheet API (WebApp) | Google Apps Script | v32 | 2026-03-13 |
| PerplexitySearch | Google Apps Script | v3 | 2026-03-13 |
| AcademicOrchestrator | Google Apps Script | — | gestionado por phd-kb |
| GoogleNewsRSS | Google Apps Script | v1 | 2026-03-13 |
| SKILL-KB | phd-kb project docs | v11 | 2026-03-13 |
| SKILL-PM | `09_Sistema/phd-pm/` (Google Drive) | v3 | 2026-03-14 |

### Endpoints
- **SHEET_API:** `https://script.google.com/macros/s/AKfycbzk2vhu-qcKFBPqEImKGEZKSitpVZv1IQQEv5ZzG7pNfo-iPUWfvSoLWWnkoc8d8PQQ/exec`
- **GitHub Pages:** `https://aauml.github.io/thesis/`
- **Repo:** `https://github.com/aauml/thesis`

### Coordinación con phd-kb
- phd-kb gestiona: index.html, SKILL-KB, scripts GAS, pipelines de datos
- phd-pm gestiona: dashboard.html, PM-SessionLog, decisiones de investigación
- Interfaz compartida: Sheet API para consultar KB desde el dashboard
- Regla: PM no modifica scripts GAS ni index.html sin coordinar con KB. KB no modifica dashboard.html.

### Archivos del PM
**Ubicación:** `09_Sistema/phd-pm/` · Ruta Cowork: `/mnt/PhD/09_Sistema/phd-pm/` · [Google Drive](https://drive.google.com/drive/folders/1YRxhs-Y_DtoseHdy1zD_8hKauApGYGHB)
**REGLA:** NUNCA guardar archivos PM en la raíz de `/mnt/PhD/` — siempre en `09_Sistema/phd-pm/`
| Archivo | Versión activa |
|---------|---------------|
| SKILL-PM-v3.md | v3 |
| PM-SessionLog-v3.md | v3 |
| context-blocks-v2.md | v2 |
| tool-modes-v2.md | v2 |
| phd-pm-project-instructions-v2.md | v2 |
| phd-kb-instructions-update-v1.md | v1 |

---

## Registro de sesiones

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

**Clases CSS nuevas:**
- `.timeline`, `.timeline-node`, `.timeline-fill` — contenedor y nodos del timeline
- `.tl-dot` (`.done`, `.current`, `.future`) — estados de los nodos
- `.tl-label` (`.active`, `.done-label`) — etiquetas de período
- `.tl-phase` (`.active-phase`) — nombre de fase
- `.next-steps`, `.next-steps-header`, `.ns-item` — caja de siguientes pasos
- `.ns-icon` (`.ns-read`, `.ns-decide`, `.ns-build`, `.ns-gap`) — iconos por tipo de paso

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

**Pendiente para próxima sesión:**
- Integrar actualización automática del KB Intelligence Report en skill phd-kb
- Poblar KB Intelligence Report con datos reales del Sheet
- Primer Obsidian Digest basado en notas actuales del vault
- Usuario debe:
  - Subir a Cowork phd-pm Knowledge: SKILL-PM-v2.md, PM-SessionLog-v2.md, context-blocks-v2.md, tool-modes-v2.md
  - Actualizar phd-pm Instructions con contenido de phd-pm-project-instructions-v2.md
  - Actualizar phd-kb Instructions con cambio de phd-kb-instructions-update-v1.md
  - Borrar archivos sin versión en nombre (PM-SessionLog.md, context-blocks.md, tool-modes.md, phd-pm-project-instructions.md, phd-kb-instructions-update.md) y archivos viejos de raíz de PhD

---

## Problemas resueltos

| Fecha | Problema | Solución |
|-------|----------|----------|
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

_Última actualización: 2026-03-14_
