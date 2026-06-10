// ============================================================
// PANELIZADOR STEEL FRAMING — PMD ARQUITECTURA
// Reglas constructivas PMD:
//  - Montantes PGC 100x1.2 @ 400 mm
//  - Soleras PGU 100x0.9 (sup + inf por panel)
//  - Panel de muro: largo máx 3.00 m, altura 3.00 m
//  - Panel de techo inclinado: hasta 6.00 m (con chapa)
//  - Esquinas: montante en caja (2 PGC)
//  - Encuentro en T: montante adicional
//  - Dintel: PGC en caja (2 PGC), apoyo 100 mm por lado
//  - Banda superior opcional: viga tubo + vincha 0.50 m
//  - Placas OSB 1.22 x 2.44 m (cara exterior)
//  - Barras de compra: 6.00 m
// ============================================================

// engine.js — orquestador + barrel. Re-exporta el motor modularizado
// (rules, geometry, dxf, panelize, osb) para que la UI importe desde un solo lugar.

import { FIXTYPES, PGC, PGU } from "./rules";
import type { Rules } from "./rules";
import { dist, detectJoints } from "./geometry";
import { panelizeWall } from "./panelize";
import { packOsbSheets } from "./osb";
import type { Wall, Opening, Roof, Fixture } from "./types";

// --- barrel: re-exporta los submódulos ---
export { C, RULES, FIXTYPES, PGC, PGU, TUBO, SNAP_PX } from "./rules";
export { dist, projectOnSegment, detectJoints } from "./geometry";
export { parseDxf } from "./dxf";
export { panelizeWall } from "./panelize";
export { osbLayoutForPanel, osbPiecesForPanel, packOsbSheets } from "./osb";

export const slugify = (s) => (s || "").toLowerCase().trim().replace(/[^a-z0-9áéíóúñ]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "proyecto";

// ---------------- motor general ----------------
export function buildAll(
  walls: Wall[],
  openings: Opening[],
  roofs: Roof[],
  fixtures: Fixture[],
  ppm: number,
  vincha: boolean,
  R: Rules,
) {
  const joints = detectJoints(walls);
  let panels = [];
  for (const w of walls) {
    const ops = openings.filter((o) => o.wallId === w.id);
    panels = panels.concat(panelizeWall(w, ops, joints, ppm, vincha, R));
  }
  panels = panels.map((p, i) => ({
    ...p,
    id: `P${String(i + 1).padStart(2, "0")}`,
    fixtures: fixtures
      .filter((f) => f.wallId === p.wallId && f.offset >= p.a - 0.01 && f.offset < p.b + 0.01)
      .map((f) => ({ ...f, lx: f.offset - p.a })),
  }));

  const pieces = [];
  for (const p of panels) for (const pc of p.pieces) pieces.push({ ...pc, panel: p.id });

  // ---- viga tubo + murito: las piezas van dentro de cada panel; acá solo los ml para info
  let tuboML = 0;
  if (vincha) for (const w of walls) tuboML += dist(w.a, w.b) / ppm;

  // ---- techos inclinados (paneles hasta 6 m + chapa)
  const roofInfo = [];
  const chapaAgg = {};
  let osbRoofArea = 0;
  roofs.forEach((r, idx) => {
    const wM = r.w / ppm, hM = r.h / ppm;
    if (wM < 0.3 || hM < 0.3) return;
    const planLen = r.dir === "x" ? wM : hM;
    const width = r.dir === "x" ? hM : wM;
    const ang = Math.atan((r.slope || 0) / 100);
    const slopeLen = planLen / Math.cos(ang);
    const warn = slopeLen > R.roofPanelMaxLen + 0.01;
    const n = Math.max(1, Math.ceil(width / R.roofPanelWidth));
    const pw = width / n;
    const cabios = Math.round(pw / R.studSpacing) + 1;
    const tag = `T${idx + 1}`;
    for (let i = 0; i < n; i++) {
      pieces.push({ perfil: PGC, largo: slopeLen - R.studDeduct, cant: cabios, uso: "Cabio panel techo", panel: tag });
      pieces.push({ perfil: PGU, largo: pw, cant: 2, uso: "Cabezal panel techo", panel: tag });
    }
    const nCh = Math.ceil(width / R.chapaUtil);
    const chL = Math.round((slopeLen + 0.1) * 100) / 100;
    const key = chL.toFixed(2);
    chapaAgg[key] = (chapaAgg[key] || 0) + nCh;
    osbRoofArea += slopeLen * width;
    roofInfo.push({ tag, n, pw, slopeLen, width, planLen, cabios, nCh, warn, slope: r.slope, id: r.id });
  });
  const chapas = Object.entries(chapaAgg)
    .map(([largo, cant]) => ({ largo: parseFloat(largo), cant }))
    .sort((a, b) => b.largo - a.largo);

  // ---- placas OSB
  let wallArea = 0;
  for (const w of walls) wallArea += (dist(w.a, w.b) / ppm) * R.panelHeight;
  if (vincha) for (const w of walls) wallArea += (dist(w.a, w.b) / ppm) * (R.vigaTuboH + R.vinchaHeight);
  let openArea = 0;
  for (const o of openings) openArea += o.width * o.height;
  const sheetArea = R.osbW * R.osbH;
  const osbWallSheets = wallArea > 0 ? Math.ceil(Math.max(0, wallArea - openArea) * (1 + R.osbWaste) / sheetArea) : 0;
  const osbRoofSheets = osbRoofArea > 0 ? Math.ceil(osbRoofArea * (1 + R.osbWaste) / sheetArea) : 0;

  // ---- planilla de corte OSB optimizada (muros)
  const osbPlan = packOsbSheets(panels, vincha, R);

  // ---- lana de vidrio (cavidad de 100 mm)
  const lanaWallM2 = Math.max(0, wallArea - openArea);
  const lanaRoofM2 = osbRoofArea;
  const rollArea = R.lanaRollW * R.lanaRollL;
  const lanaRolls = lanaWallM2 + lanaRoofM2 > 0 ? Math.ceil((lanaWallM2 + lanaRoofM2) * (1 + R.lanaWaste) / rollArea) : 0;

  // ---- previsión de instalaciones (estimado para compra)
  const elecPts = fixtures.filter((f) => FIXTYPES[f.type] && FIXTYPES[f.type].kind === "elec");
  const aguaPts = fixtures.filter((f) => f.type === "agua");
  const desPts = fixtures.filter((f) => f.type === "desague");
  const instal = {
    cajas: elecPts.length,
    corrugadoML: elecPts.reduce((s, f) => s + (R.panelHeight - Math.min(f.height, R.panelHeight)) + 1.0, 0),
    aguaPts: aguaPts.length,
    pexML: aguaPts.length * 3,
    desagues: desPts.length,
    pvcML: desPts.length * 2,
  };

  // ---- lista de corte agregada
  const agg: Record<string, { perfil: string; largo: number; cant: number; usos: Set<string> }> = {};
  for (const pc of pieces) {
    const lg = Math.round(pc.largo * 100) / 100;
    if (lg < 0.03) continue;
    const key = `${pc.perfil}|${lg.toFixed(2)}`;
    if (!agg[key]) agg[key] = { perfil: pc.perfil, largo: lg, cant: 0, usos: new Set() };
    agg[key].cant += pc.cant;
    agg[key].usos.add(pc.uso);
  }
  const cutList = Object.values(agg).sort((a, b) => a.perfil.localeCompare(b.perfil) || b.largo - a.largo);

  // ---- optimización en barras de 6 m (FFD)
  const packing = {};
  for (const perfil of [PGC, PGU]) {
    const items = [];
    for (const r of cutList.filter((c) => c.perfil === perfil)) {
      for (let i = 0; i < r.cant; i++) items.push(r.largo);
    }
    items.sort((a, b) => b - a);
    const bars = [];
    for (const it of items) {
      let placed = false;
      for (const bar of bars) {
        if (bar.rest >= it - 1e-9) { bar.rest -= it; bar.cuts.push(it); placed = true; break; }
      }
      if (!placed) {
        if (it > R.barLen) bars.push({ rest: 0, cuts: [it], oversize: true });
        else bars.push({ rest: R.barLen - it, cuts: [it] });
      }
    }
    const totalML = items.reduce((s, v) => s + v, 0);
    packing[perfil] = {
      bars: bars.length,
      totalML,
      scrap: bars.length ? Math.max(0, (1 - totalML / (bars.length * R.barLen)) * 100) : 0,
    };
  }

  return { panels, cutList, packing, tuboML, joints, roofInfo, chapas, osbWallSheets, osbRoofSheets, osbPlan, wallArea, openArea, osbRoofArea, lanaWallM2, lanaRoofM2, lanaRolls, instal };
}
