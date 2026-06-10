# Panelizador Steel Framing — PMD Arquitectura

Del plano a la fábrica: trazado de muros sobre plano municipal o importación DXF, panelización automática con las reglas constructivas de PMD, fichas de fábrica, instructivo y planilla de corte de OSB optimizada, cómputo de materiales (perfiles, OSB, lana, chapa, instalaciones) y vista 3D esquemática/realista.

## Correr en local
```bash
npm install
npm run dev        # servidor de desarrollo
npm test           # tests del motor (reglas constructivas PMD)
npm run typecheck  # chequeo de tipos (TypeScript)
npm run build      # build de producción
```

## Estructura
Motor puro (TypeScript, sin React ni DOM) en `src/lib/`:
- `rules.ts` — constantes y reglas PMD.
- `geometry.ts` — `dist`, `projectOnSegment`, `detectJoints`.
- `dxf.ts` — `parseDxf`.
- `panelize.ts` — `panelizeWall`.
- `osb.ts` — layout, piezas y planilla de corte de OSB.
- `engine.ts` — `buildAll` (cómputo integral) + barrel que re-exporta el motor.
- `types.ts` — tipos de dominio compartidos.
- `__tests__/` — tests Vitest que blindan las reglas PMD.

UI en `src/PanelizadorSF.jsx` (canvas del plano, fichas, 3D, planillas).

## Documentación
Ver `CLAUDE.md`: reglas constructivas PMD, reglas de trabajo y roadmap.
