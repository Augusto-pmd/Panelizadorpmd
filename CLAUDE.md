# Panelizador Steel Framing — PMD Arquitectura SRL

Herramienta de panelización: del plano (municipal, DXF o croquis) a paneles de fábrica con fichas, instructivo de corte de OSB, planilla optimizada y cómputo de materiales.

## Stack
- React 18 + Vite. Componente único en `src/PanelizadorSF.jsx` (~2.400 líneas, a modularizar).
- Three.js r128 (vista 3D, sin OrbitControls: órbita propia con pointer events).
- Tailwind por CDN (en `index.html`). Colores custom van por `style` inline (paleta en const `C`).
- Persistencia: `window.storage` (shim sobre localStorage en `src/main.jsx`). En producción migrará a Firestore (pmdsystem).

## Reglas constructivas PMD (NO cambiar sin confirmación de Augusto)
- Montantes PGC 100×1,2 cada 400 mm. Largo EXACTO 3,00 m (media barra de 6 m, cero desperdicio).
- Soleras PGU 100×0,9. Inferior con alas hacia arriba contra platea; superior con alas hacia abajo.
- Panel: largo máx 3,00 m. Panel de techo inclinado: hasta 6,00 m.
- Esquinas: montante en caja (2 PGC). Encuentros en T: montante adicional.
- Dintel: PGC en caja (2 PGC), apoyo 100 mm por lado. Los cripples (verticales) SIGUEN sobre el dintel y bajo el antepecho, a la misma modulación.
- Viga tubo: ARMADA (no comprada): solera PGU + 2 PGC + solera PGU como cajón, integrada a cada panel.
  - PENDIENTE definir: almas PGC enfrentadas (~10 cm) o apiladas (~20 cm); cómo se empalma en la junta entre paneles.
- Murito de carga 0,50 m sobre la viga tubo: modulación PROPIA cada 40 desde su borde (no sigue los montantes de abajo), continua sobre los vanos. Total panel de fábrica: 3,00 + VT + 0,50 ≈ 3,60.
- OSB 1,22×2,44: SIEMPRE trabado (fila superior corrida ½ placa, juntas nunca alineadas). Corte en martillo en vanos (ninguna junta en la esquina de un vano). Solape de 0,30 m sobre el panel vecino, sin atornillar en fábrica. La fila superior (1,16 m con vincha) cose panel + viga tubo + murito. Altura total emplacada: 3,60.
- Barras de compra: 6,00 m (PGC también a medida).
- Techo: paneles con cabios @400, chapa a medida (ancho útil 1,00 m).

## Reglas de trabajo con Augusto (obligatorias)
1. NUNCA escribir código sin confirmación explícita.
2. SIEMPRE ofrecer backup antes de modificar.
3. NUNCA refactorizar ni agrupar código sin instrucción explícita.
4. Responder en español rioplatense.

## Roadmap
- **Fase UX/UI (actual)**: modularizar `PanelizadorSF.jsx` (motor puro en `src/lib/`, UI en componentes), mejorar dibujo (referencia: Planner 5D — techo automático ya implementado; evaluar habitaciones arrastrables, cotas editables en el canvas), exportar fichas a PDF con membrete PMD.
- **Fase pmdsystem**: migrar como módulo de pmdsystem.com.ar (Next.js App Router + Firestore), proyectos vinculados a obras, roles (Dirección/Supervisor editan, Pañolero ve fichas), cómputo alimenta cotizador y pedidos de Fabrizio.
- **Fase IA**: pre-trazado automático de muros desde el plano (visión), integración con flujo de presupuestación.

## Motor (funciones puras, candidatas a `src/lib/` con tests)
`panelizeWall`, `buildAll`, `osbLayoutForPanel`, `osbPiecesForPanel`, `packOsbSheets` (shelf packing 2D), `parseDxf`, `detectJoints`.
