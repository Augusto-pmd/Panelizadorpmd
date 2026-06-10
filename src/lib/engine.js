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

export const slugify = (s) => (s || "").toLowerCase().trim().replace(/[^a-z0-9áéíóúñ]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "proyecto";

// ---------------- parser DXF: extrae LINE y LWPOLYLINE de la sección ENTITIES ----------------
export function parseDxf(text) {
  const lines = text.split(/\r\n|\r|\n/);
  const pairs = [];
  for (let i = 0; i + 1 < lines.length; i += 2) {
    pairs.push([parseInt(lines[i].trim(), 10), lines[i + 1]]);
  }
  const segs = [];
  let i = 0;
  while (i < pairs.length && !(pairs[i][0] === 2 && String(pairs[i][1]).trim() === "ENTITIES")) i++;
  while (i < pairs.length) {
    const [c, v] = pairs[i];
    if (c === 0) {
      const type = String(v).trim();
      if (type === "ENDSEC") break;
      if (type === "LINE") {
        let x1, y1, x2, y2, layer = "0";
        i++;
        while (i < pairs.length && pairs[i][0] !== 0) {
          const [cc, vv] = pairs[i];
          if (cc === 8) layer = String(vv).trim();
          if (cc === 10) x1 = parseFloat(vv);
          if (cc === 20) y1 = parseFloat(vv);
          if (cc === 11) x2 = parseFloat(vv);
          if (cc === 21) y2 = parseFloat(vv);
          i++;
        }
        if ([x1, y1, x2, y2].every((n) => isFinite(n))) segs.push({ x1, y1, x2, y2, layer });
        continue;
      }
      if (type === "LWPOLYLINE") {
        let layer = "0", closed = false, curX = null;
        const vs = [];
        i++;
        while (i < pairs.length && pairs[i][0] !== 0) {
          const [cc, vv] = pairs[i];
          if (cc === 8) layer = String(vv).trim();
          if (cc === 70) closed = (parseInt(vv, 10) & 1) === 1;
          if (cc === 10) curX = parseFloat(vv);
          if (cc === 20 && curX !== null && isFinite(curX)) { vs.push({ x: curX, y: parseFloat(vv) }); curX = null; }
          i++;
        }
        for (let k = 0; k < vs.length - 1; k++) segs.push({ x1: vs[k].x, y1: vs[k].y, x2: vs[k + 1].x, y2: vs[k + 1].y, layer });
        if (closed && vs.length > 2) segs.push({ x1: vs[vs.length - 1].x, y1: vs[vs.length - 1].y, x2: vs[0].x, y2: vs[0].y, layer });
        continue;
      }
    }
    i++;
  }
  return segs;
}

// ---------------- helpers geométricos ----------------
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function projectOnSegment(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const L2 = dx * dx + dy * dy;
  if (L2 === 0) return { t: 0, d: dist(p, a) };
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2;
  t = Math.max(0, Math.min(1, t));
  const q = { x: a.x + t * dx, y: a.y + t * dy };
  return { t, d: dist(p, q), q };
}

// ---------------- detección de nudos ----------------
export function detectJoints(walls) {
  const corners = [];
  const tees = [];
  for (let i = 0; i < walls.length; i++) {
    const w = walls[i];
    for (const ep of [w.a, w.b]) {
      for (let j = 0; j < walls.length; j++) {
        if (i === j) continue;
        const o = walls[j];
        if (dist(ep, o.a) < SNAP_PX || dist(ep, o.b) < SNAP_PX) {
          if (!corners.some((c) => dist(c, ep) < SNAP_PX)) corners.push({ ...ep });
        }
        const pr = projectOnSegment(ep, o.a, o.b);
        if (pr.d < SNAP_PX && pr.t > 0.04 && pr.t < 0.96) {
          tees.push({ wallId: o.id, t: pr.t });
        }
      }
    }
  }
  return { corners, tees };
}

// ---------------- motor: paneles de muro ----------------
export function panelizeWall(wall, wallOps, joints, ppm, vincha, R) {
  const L = dist(wall.a, wall.b) / ppm;
  if (L < 0.1) return [];

  const ops = wallOps
    .map((o) => ({
      ...o,
      x1: Math.max(0, o.offset - o.width / 2),
      x2: Math.min(L, o.offset + o.width / 2),
    }))
    .sort((a, b) => a.x1 - b.x1);

  const cuts = [0];
  let pos = 0;
  let guard = 0;
  while (L - pos > R.panelMaxLen + 1e-6 && guard++ < 100) {
    let cut = pos + R.panelMaxLen;
    for (const op of ops) {
      if (cut > op.x1 + 0.05 && cut < op.x2 - 0.05) {
        cut = op.x1 - pos >= 0.3 ? op.x1 : op.x2;
      }
    }
    cut = Math.min(cut, L);
    if (cut <= pos + 0.05) cut = Math.min(pos + R.panelMaxLen, L);
    cuts.push(cut);
    pos = cut;
  }
  if (cuts[cuts.length - 1] < L - 1e-6) cuts.push(L);

  const teesHere = joints.tees.filter((t) => t.wallId === wall.id).map((t) => t.t * L);
  const isCorner = (pt) => joints.corners.some((c) => dist(c, pt) < SNAP_PX);
  const cornerStart = isCorner(wall.a);
  const cornerEnd = isCorner(wall.b);

  const panels = [];
  for (let k = 0; k < cuts.length - 1; k++) {
    const a = cuts[k], b = cuts[k + 1];
    const len = b - a;
    if (len < 0.02) continue;

    const H = R.panelHeight;
    const studLen = H - R.studDeduct;
    const pieces = [];
    const warnings = [];
    if (len > R.panelMaxLen + 0.01) warnings.push(`Panel de ${len.toFixed(2)} m supera el máximo de 3 m (vano ancho)`);

    const studs = [];
    const addStud = (x, qty, lng, tipo) => {
      const ex = studs.find((s) => Math.abs(s.x - x) < 0.03 && s.tipo === tipo);
      if (ex) { ex.qty = Math.max(ex.qty, qty); return; }
      studs.push({ x, qty, len: lng, tipo });
    };

    const opsIn = ops.filter((o) => o.x2 > a + 0.01 && o.x1 < b - 0.01);
    const insideOpening = (gx) => opsIn.some((o) => gx > o.x1 + 0.03 && gx < o.x2 - 0.03);

    addStud(0, k === 0 && cornerStart ? 2 : 1, studLen, k === 0 && cornerStart ? "caja" : "montante");
    addStud(len, k === cuts.length - 2 && cornerEnd ? 2 : 1, studLen, k === cuts.length - 2 && cornerEnd ? "caja" : "montante");

    const g0 = Math.ceil((a + 0.001) / R.studSpacing) * R.studSpacing;
    for (let gx = g0; gx < b - 0.05; gx += R.studSpacing) {
      const lx = gx - a;
      if (lx < 0.05 || lx > len - 0.05) continue;
      if (insideOpening(gx)) continue;
      addStud(lx, 1, studLen, "montante");
    }

    for (const tx of teesHere) {
      if (tx > a + 0.03 && tx < b - 0.03) addStud(tx - a, 2, studLen, "T");
    }

    const opDraw = [];
    for (const op of opsIn) {
      const x1 = Math.max(op.x1, a) - a;
      const x2 = Math.min(op.x2, b) - a;
      const w = op.x2 - op.x1;
      const sill = op.type === "puerta" ? 0 : op.sill;
      const headBot = sill + op.height;
      opDraw.push({ ...op, lx1: x1, lx2: x2, sill, headBot });

      const opStartsHere = op.x1 >= a - 0.01;
      const opEndsHere = op.x2 <= b + 0.01;

      if (opStartsHere) addStud(x1, 1, studLen, "king");
      if (opEndsHere) addStud(x2, 1, studLen, "king");

      const jackLen = Math.min(headBot, studLen);
      if (opStartsHere) pieces.push({ perfil: PGC, largo: jackLen, cant: 1, uso: "Jack vano" });
      if (opEndsHere) pieces.push({ perfil: PGC, largo: jackLen, cant: 1, uso: "Jack vano" });

      if (opStartsHere) {
        pieces.push({ perfil: PGC, largo: w + 2 * R.headerBearing, cant: 2, uso: "Dintel en caja" });
      }

      const cripTopLen = H - headBot - R.headerDepth;
      if (cripTopLen > 0.06) {
        let n = 0;
        for (let gx = g0; gx < b - 0.05; gx += R.studSpacing) {
          if (gx > op.x1 + 0.03 && gx < op.x2 - 0.03 && gx > a && gx < b) n++;
        }
        if (n > 0) pieces.push({ perfil: PGC, largo: cripTopLen, cant: n, uso: "Cripple sup." });
      }

      if (sill > 0.05) {
        if (opStartsHere) pieces.push({ perfil: PGU, largo: w, cant: 1, uso: "Antepecho" });
        const cripBotLen = sill - 0.05;
        let n = 0;
        for (let gx = g0; gx < b - 0.05; gx += R.studSpacing) {
          if (gx > op.x1 + 0.03 && gx < op.x2 - 0.03 && gx > a && gx < b) n++;
        }
        if (n > 0 && cripBotLen > 0.06) pieces.push({ perfil: PGC, largo: cripBotLen, cant: n, uso: "Cripple inf." });
      }
    }

    for (const s of studs) {
      const uso = s.tipo === "caja" ? "Montante en caja (esquina)" : s.tipo === "T" ? "Montante T (doble)" : s.tipo === "king" ? "King vano" : "Montante";
      pieces.push({ perfil: PGC, largo: s.len, cant: s.qty, uso });
    }

    pieces.push({ perfil: PGU, largo: len, cant: 1, uso: "Solera superior" });
    const doorSpans = opDraw.filter((o) => o.sill < 0.05).map((o) => [o.lx1, o.lx2]).sort((p, q) => p[0] - q[0]);
    let cursor = 0;
    for (const [d1, d2] of doorSpans) {
      if (d1 - cursor > 0.03) pieces.push({ perfil: PGU, largo: d1 - cursor, cant: 1, uso: "Solera inferior" });
      cursor = Math.max(cursor, d2);
    }
    if (len - cursor > 0.03) pieces.push({ perfil: PGU, largo: len - cursor, cant: 1, uso: "Solera inferior" });

    // viga tubo + murito de carga: integrados al mismo panel (sale completo de fábrica)
    if (vincha) {
      pieces.push({ perfil: PGU, largo: len, cant: 2, uso: "Viga tubo: alas PGU" });
      pieces.push({ perfil: PGC, largo: len, cant: 2, uso: "Viga tubo: almas PGC" });
      pieces.push({ perfil: PGU, largo: len, cant: 2, uso: "Solera murito de carga" });
      // murito: modulación PROPIA cada 40 desde su borde (descarga sobre la viga tubo, no sigue los montantes de abajo)
      const nMC = Math.floor((len - 0.01) / R.studSpacing) + 2;
      pieces.push({ perfil: PGC, largo: R.vinchaHeight, cant: nMC, uso: "Montante murito 0,50" });
    }

    panels.push({ wallId: wall.id, a, b, len, studs, ops: opDraw, pieces, warnings, first: k === 0, last: k === cuts.length - 2 });
  }
  return panels;
}

// ---------------- juntas OSB: trabadas + martillo en vanos ----------------
export function osbLayoutForPanel(p, vincha, R) {
  const totalH = R.panelHeight + (vincha ? R.vigaTuboH + R.vinchaHeight : 0); // la placa superior cose panel + viga tubo + murito
  const rows = [
    { y1: 0, y2: Math.min(R.osbH, totalH), offset: 0 },
    { y1: Math.min(R.osbH, totalH), y2: totalH, offset: R.osbW / 2 }, // fila superior corrida ½ placa
  ].filter((r) => r.y2 - r.y1 > 0.03);

  const out = [];
  for (const row of rows) {
    let joints = [];
    const start = (Math.floor((p.a - row.offset) / R.osbW) + 1) * R.osbW + row.offset;
    for (let gx = start; gx < p.b - 0.03; gx += R.osbW) {
      const lx = gx - p.a;
      if (lx > 0.15 && lx < p.len - 0.15) joints.push(lx); // nunca junta sobre la unión de paneles
    }
    // martillo: ninguna junta a menos de 20 cm del borde de un vano -> se corre al centro del vano
    for (const o of p.ops) {
      const c = (o.lx1 + o.lx2) / 2;
      joints = joints.map((j) => (Math.abs(j - o.lx1) < 0.2 || Math.abs(j - o.lx2) < 0.2 ? c : j));
    }
    joints = [...new Set(joints.map((j) => Math.round(j * 100) / 100))];
    out.push({ ...row, joints });
  }
  return out;
}

// ---------------- piezas de OSB por panel (instructivo de corte) ----------------
export function osbPiecesForPanel(p, vincha, R) {
  const rows = osbLayoutForPanel(p, vincha, R);
  const start = p.first ? 0 : R.osbLap;          // el inicio lo cubre el solape del panel anterior
  const end = p.len + (p.last ? 0 : R.osbLap);   // la última pieza incluye el vuelo sobre el siguiente
  const raw = [];
  for (const row of rows) {
    const js = row.joints.filter((j) => j > start + 0.03 && j < end - 0.03);
    const cuts = [start, ...js, end];
    for (let i = 0; i < cuts.length - 1; i++) {
      let segs = [[cuts[i], cuts[i + 1]]];
      // si un vano atraviesa toda la altura de la fila, la pieza se divide en dos
      for (const o of p.ops) {
        const oy1 = Math.max(o.sill, row.y1), oy2 = Math.min(o.sill + o.height, row.y2);
        if (oy2 - oy1 >= row.y2 - row.y1 - 0.02) {
          const next = [];
          for (const [s1, s2] of segs) {
            const ox1 = Math.max(o.lx1, s1), ox2 = Math.min(o.lx2, s2);
            if (ox2 - ox1 > 0.03) {
              if (ox1 - s1 > 0.05) next.push([s1, ox1]);
              if (s2 - ox2 > 0.05) next.push([ox2, s2]);
            } else next.push([s1, s2]);
          }
          segs = next;
        }
      }
      for (const [x1, x2] of segs) {
        if (x2 - x1 < 0.05) continue;
        const piece = { x1, x2, y1: row.y1, y2: row.y2, w: x2 - x1, h: row.y2 - row.y1, notches: [] };
        // recortes parciales (martillo): el vano entra en la pieza sin atravesarla
        for (const o of p.ops) {
          const ox1 = Math.max(o.lx1, x1), ox2 = Math.min(o.lx2, x2);
          const oy1 = Math.max(o.sill, row.y1), oy2 = Math.min(o.sill + o.height, row.y2);
          if (ox2 - ox1 > 0.03 && oy2 - oy1 > 0.03 && oy2 - oy1 < row.y2 - row.y1 - 0.02) {
            piece.notches.push({ dx: ox1 - x1, dy: oy1 - row.y1, w: ox2 - ox1, h: oy2 - oy1 });
          }
        }
        piece.lap = !p.last && Math.abs(x2 - end) < 0.02;
        raw.push(piece);
      }
    }
  }
  const LET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  raw.forEach((pc, i) => { pc.tag = LET[i] || `Z${i - 25}`; });
  return { pieces: raw, start, end };
}

// ---------------- planilla de corte OSB: optimización en placas 1,22×2,44 ----------------
export function packOsbSheets(panels, vincha, R) {
  const items = [];
  for (const p of panels) {
    const cut = osbPiecesForPanel(p, vincha, R);
    for (const pc of cut.pieces) {
      let w = pc.w, h = pc.h, rot = false;
      // rotar si no entra por ancho pero sí acostada
      if (w > R.osbW + 0.001 && h <= R.osbW + 0.001) { const t = w; w = h; h = t; rot = true; }
      items.push({
        code: `${p.id}-${pc.tag}`, w, h, rot,
        oversize: w > R.osbW + 0.001 || h > R.osbH + 0.001,
        notch: pc.notches.length > 0, lap: pc.lap,
      });
    }
  }
  const fit = items.filter((i) => !i.oversize).sort((a, b) => b.h - a.h || b.w - a.w);
  const oversize = items.filter((i) => i.oversize);
  const sheets = [];
  for (const it of fit) {
    let placed = false;
    for (const sh of sheets) {
      for (const shelf of sh.shelves) {
        if (it.h <= shelf.h + 0.001 && shelf.x + it.w <= R.osbW + 0.001) {
          sh.pieces.push({ ...it, x: shelf.x, y: shelf.y });
          shelf.x += it.w;
          placed = true; break;
        }
      }
      if (placed) break;
      const usedH = sh.shelves.reduce((s, v) => Math.max(s, v.y + v.h), 0);
      if (usedH + it.h <= R.osbH + 0.001) {
        sh.shelves.push({ y: usedH, h: it.h, x: it.w });
        sh.pieces.push({ ...it, x: 0, y: usedH });
        placed = true; break;
      }
    }
    if (!placed) {
      sheets.push({ shelves: [{ y: 0, h: it.h, x: it.w }], pieces: [{ ...it, x: 0, y: 0 }] });
    }
  }
  const usedArea = items.filter((i) => !i.oversize).reduce((s, i) => s + i.w * i.h, 0);
  const util = sheets.length ? (usedArea / (sheets.length * R.osbW * R.osbH)) * 100 : 0;
  return { sheets, util, oversize, totalPieces: items.length };
}

// ---------------- motor general ----------------
export function buildAll(walls, openings, roofs, fixtures, ppm, vincha, R) {
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
  const agg = {};
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
