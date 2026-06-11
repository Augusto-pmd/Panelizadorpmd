// Reglas constructivas y constantes PMD. Sin dependencias.
// NO cambiar valores sin confirmación de Augusto (ver CLAUDE.md).

export const C = {
  ink: "#16202B",
  chrome: "#1E2A38",
  chrome2: "#27384A",
  blue: "#2F6FE0",
  blueDark: "#1F56B8",
  blueSoft: "#E8F0FD",
  paper: "#F4F5F7",
  panel: "#FFFFFF",
  line: "#E4E7EC",
  grid: "#E7E9ED",
  orange: "#E0762E",
  green: "#2E9E63",
  red: "#D4483B",
  gray: "#6B7785",
  osb: "#C68A12",
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
  // perfiles seleccionables (P6): por defecto los de PMD. El motor usa estos
  // nombres en las piezas, así el cómputo y las fichas reflejan el perfil elegido.
  perfilMontante: "PGC 100×1.2",
  perfilSolera: "PGU 100×0.9",
  // arriostramiento en cruz de San Andrés (P4): off por defecto (PMD rigidiza con OSB)
  arriostrar: false,
  flejeAncho: 0.032,      // ancho del fleje (m) — mín. norma 32 mm
  // tornillería y anclajes (P3)
  tornilloOsbBorde: 0.15, // paso de tornillos en bordes de OSB (m)
  tornilloOsbCampo: 0.30, // paso de tornillos en el campo (m)
  anclajePaso: 1.35,      // separación de anclajes a platea (m)
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

// Catálogo de perfiles para el selector (P6). kg/m galvanizado Z275.
export const CATALOGO_PGC = [
  { nombre: "PGC 90×0.89", kg: 1.50 },
  { nombre: "PGC 100×0.89", kg: 1.50 },
  { nombre: "PGC 100×1.2", kg: 2.16 },
  { nombre: "PGC 140×1.24", kg: 2.60 },
];
export const CATALOGO_PGU = [
  { nombre: "PGU 100×0.89", kg: 1.22 },
  { nombre: "PGU 100×0.9", kg: 1.30 },
];

export const SNAP_PX = 14;

// Tipo derivado de la constante RULES: se mantiene siempre en sincronía.
export type Rules = typeof RULES;
