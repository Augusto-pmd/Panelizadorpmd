# Panelizador Steel Framing — PMD Arquitectura

Del plano a la fábrica: trazado de muros sobre plano municipal o importación DXF, panelización automática con las reglas constructivas de PMD, fichas de fábrica, instructivo y planilla de corte de OSB optimizada, cómputo de materiales (perfiles, OSB, lana, chapa, instalaciones) y vista 3D esquemática/realista.

## Correr en local
```bash
npm install
npm run dev      # servidor de desarrollo
npm test         # tests del motor (reglas constructivas PMD)
npm run build    # build de producción
```

## Estructura
- `src/lib/engine.js` — motor puro (panelización, corte de OSB, cómputo). Sin React ni DOM.
- `src/lib/__tests__/` — tests Vitest que blindan las reglas PMD.
- `src/PanelizadorSF.jsx` — UI (canvas del plano, fichas, 3D, planillas).

## Documentación
Ver `CLAUDE.md`: reglas constructivas PMD, reglas de trabajo y roadmap.
