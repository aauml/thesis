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

## 2026-03-23 | cowork | sistema | CHANGELOG.md y CLAUDE.md creados
- Creado CHANGELOG.md como log unificado cross-contexto
- Creado CLAUDE.md como entry point para Claude Code
- Actualizado SKILL-PM y SKILL-KB para incluir CHANGELOG en sus protocolos de sesión
- Creada tabla system_heartbeats en Supabase para tracking de Dispatch
- Decisión: jerarquía de memoria formalizada (pm_decisions > CHANGELOG > SessionLogs)
