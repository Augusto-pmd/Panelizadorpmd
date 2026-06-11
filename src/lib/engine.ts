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

import { FIXTYPES, CATALOGO_PGC, CATALOGO_PGU } from "./rules";
import type { Rules } from "./rules";
import { dist, detectJoints } from "./geometry";
import { panelizeWall } from "./panelize";
import { packOsbSheets } from "./osb";
import type { Wall, Opening, Roof, Fixture } from "./types";

// --- barrel: re-exporta los submódulos ---
export { C, RULES, FIXTYPES, PGC, PGU, TUBO, SNAP_PX, CATALOGO_PGC, CATALOGO_PGU } from "./rules";
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
  // viga tubo + murito por muro: solo en muros portantes (cfg.portante). Default = global.
  const wVincha = (w: Wall): boolean => {
    const cfg = (w as any).cfg;
    return cfg && cfg.portante !== undefined ? !!cfg.portante : vincha;
  };
  const joints = detectJoints(walls);
  let panels = [];
  for (const w of walls) {
    const ops = openings.filter((o) => o.wallId === w.id);
    // tipología por muro: la config del muro (w.cfg) pisa la global
    const cfg = (w as any).cfg;
    const wr = cfg ? { ...R, ...cfg } : R;
    const wp = panelizeWall(w, ops, joints, ppm, wVincha(w), wr);
    panels = panels.concat(wp.map((p) => ({ ...p, placa: cfg?.placa || (R as any).placa || "OSB" })));
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

  // ---- montantes de tímpano/parapeto: el muro crece hasta el techo → suman al cómputo
  const roofHeightEng = (wx: number, wz: number, topH: number): number => {
    let h = topH;
    for (const r of roofs as any[]) {
      const rx = r.x / ppm, rz = r.y / ppm, rw = r.w / ppm, rh = r.h / ppm;
      if (wx < rx - 0.05 || wx > rx + rw + 0.05 || wz < rz - 0.05 || wz > rz + rh + 0.05) continue;
      if (r.parapeto) continue; // el murito de carga ya tapa la chapa: no suma montantes extra
      const ang = Math.atan((r.slope || 0) / 100), rise = r.rise || 1;
      const d = r.dir === "x" ? (rise > 0 ? wx - rx : rx + rw - wx) : (rise > 0 ? wz - rz : rz + rh - wz);
      h = Math.max(h, topH + Math.max(0, d) * Math.tan(ang));
    }
    return h;
  };
  if (roofs.length) {
    for (const w of walls) {
      const topH = R.panelHeight + (wVincha(w) ? R.vigaTuboH + R.vinchaHeight : 0);
      const L = dist(w.a, w.b) / ppm;
      if (L < 0.2) continue;
      const ax = w.a.x / ppm, az = w.a.y / ppm;
      const ux = (w.b.x - w.a.x) / (L * ppm), uz = (w.b.y - w.a.y) / (L * ppm);
      for (let gx = 0; gx <= L + 1e-3; gx += R.studSpacing) {
        const gxl = Math.min(gx, L);
        const rH = roofHeightEng(ax + ux * gxl, az + uz * gxl, topH);
        if (rH > topH + 0.06) pieces.push({ perfil: R.perfilMontante, largo: rH - topH, cant: 1, uso: "Montante tímpano/parapeto", panel: "T" });
      }
      const rA = roofHeightEng(ax, az, topH), rB = roofHeightEng(ax + ux * L, az + uz * L, topH);
      if (rA > topH + 0.06 && Math.abs(rA - rB) < 0.02) pieces.push({ perfil: R.perfilSolera, largo: L, cant: 1, uso: "Solera de coronamiento (parapeto)", panel: "T" });
    }
  }

  // ---- viga tubo + murito: las piezas van dentro de cada panel; acá solo los ml para info
  let tuboML = 0;
  for (const w of walls) if (wVincha(w)) tuboML += dist(w.a, w.b) / ppm;

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
      pieces.push({ perfil: R.perfilMontante, largo: slopeLen - R.studDeduct, cant: cabios, uso: "Cabio panel techo", panel: tag });
      pieces.push({ perfil: R.perfilSolera, largo: pw, cant: 2, uso: "Cabezal panel techo", panel: tag });
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
  for (const w of walls) if (wVincha(w)) wallArea += (dist(w.a, w.b) / ppm) * (R.vigaTuboH + R.vinchaHeight);
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

  // ---- membranas/aislación exterior por muro: EPS y Tyvek (cfg del muro)
  let epsM2 = 0, tyvekM2 = 0;
  for (const w of walls) {
    const cfg = (w as any).cfg || {};
    const area = (dist(w.a, w.b) / ppm) * R.panelHeight;
    if (cfg.eps) epsM2 += area;
    if (cfg.tyvek) tyvekM2 += area;
  }

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

  // ---- optimización en barras de 6 m (FFD), por cada perfil presente
  const kgDe = (perfil: string): number => {
    const c = [...CATALOGO_PGC, ...CATALOGO_PGU].find((p) => p.nombre === perfil);
    if (c) return c.kg;
    return perfil.startsWith("PGU") ? R.kgPGU : R.kgPGC;
  };
  const perfilesPresentes = [...new Set(cutList.map((c) => c.perfil))];
  const packing: Record<string, { bars: number; totalML: number; scrap: number; kg: number }> = {};
  for (const perfil of perfilesPresentes) {
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
      kg: totalML * kgDe(perfil),
      scrap: bars.length ? Math.max(0, (1 - totalML / (bars.length * R.barLen)) * 100) : 0,
    };
  }

  // ---- P3: tornillería y anclajes a fundación (estimado de compra)
  let totalStuds = 0;
  for (const p of panels) for (const s of p.studs) totalStuds += s.qty;
  const osbSheetsTot = osbPlan.sheets.length + osbRoofSheets;
  const tornOsbPorPlaca = Math.ceil(
    (2 * (R.osbW + R.osbH)) / R.tornilloOsbBorde + (R.osbW / R.studSpacing) * (R.osbH / R.tornilloOsbCampo)
  );
  let anclajes = 0;
  for (const p of panels) anclajes += Math.max(2, Math.ceil(p.len / R.anclajePaso) + 1);
  const fijaciones = {
    tornillosEstructura: totalStuds * 4,          // Nº8, ~2 por unión × 2 soleras
    tornillosOsb: osbSheetsTot * tornOsbPorPlaca, // Nº8 @150 borde / 300 campo
    anclajes,                                     // varilla química o fleje, esquinas + cada 1,2–1,5 m
  };

  // ---- P4: arriostramiento en cruz de San Andrés (opcional)
  let flejeML = 0;
  if (R.arriostrar) {
    for (const p of panels) flejeML += 2 * Math.hypot(p.len, R.panelHeight); // dos diagonales por paño
  }
  const arriostre = {
    activo: !!R.arriostrar,
    panes: panels.length,
    flejeML,
    flejeAncho: R.flejeAncho,
  };

  return { panels, cutList, packing, perfiles: { montante: R.perfilMontante, solera: R.perfilSolera }, tuboML, joints, roofInfo, chapas, osbWallSheets, osbRoofSheets, osbPlan, wallArea, openArea, osbRoofArea, lanaWallM2, lanaRoofM2, lanaRolls, epsM2, tyvekM2, instal, fijaciones, arriostre };
}
