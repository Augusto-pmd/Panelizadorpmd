// Reglas constructivas y constantes PMD. Sin dependencias.
// NO cambiar valores sin confirmación de Augusto (ver CLAUDE.md).

export const C = {
  ink: "#15222F",
  chrome: "#1B2A3A",
  blue: "#2E6FD8",
  blueSoft: "#E3EDFB",
  paper: "#F7F6F2",
  grid: "#E2E0D8",
  orange: "#E0762E",
  green: "#2F8F5B",
  red: "#C24A3A",
  gray: "#7C8794",
  osb: "#B8860B",
  elec: "#D14545",
  agua: "#2BA3B8",
  lana: "#C9A227",
};

export const RULES = {
  studSpacing: 0.4,
  panelMaxLen: 3.0,
  panelHeight: 3.0,
  roofPanelMaxLen: 6.0,   // largo máx panel de techo (pendiente)
  roofPanelWidth: 1.2,    // ancho de panel de techo
  studDeduct: 0,          // montantes de 3,00 m EXACTOS (media barra de 6 m, cero desperdicio)
  headerBearing: 0.1,
  headerDepth: 0.1,
  vinchaHeight: 0.5,
  vigaTuboH: 0.1,         // altura del cajón viga tubo (PGU+2PGC+PGU)
  barLen: 6.0,
  kgPGC: 2.16,
  kgPGU: 1.3,
  osbW: 1.22,
  osbH: 2.44,
  osbWaste: 0.1,          // 10% desperdicio
  osbLap: 0.3,            // vuelo de OSB sobre el panel vecino (m)
  chapaUtil: 1.0,         // ancho útil de chapa (m)
  lanaRollW: 1.2,         // ancho rollo lana de vidrio (m)
  lanaRollL: 18.0,        // largo rollo (m)
  lanaWaste: 0.05,        // 5% desperdicio
};

export const FIXTYPES = {
  toma: { label: "Toma", height: 0.3, kind: "elec" },
  llave: { label: "Llave/Int.", height: 1.2, kind: "elec" },
  agua: { label: "Agua F/C", height: 0.5, kind: "agua" },
  desague: { label: "Desagüe", height: 0.4, kind: "agua" },
};

export const PGC = "PGC 100×1.2";
export const PGU = "PGU 100×0.9";
export const TUBO = "Viga tubo (PGU + 2 PGC + PGU armada)";

export const SNAP_PX = 14;

// Tipo derivado de la constante RULES: se mantiene siempre en sincronía.
export type Rules = typeof RULES;
