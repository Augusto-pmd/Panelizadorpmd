import type { Rules } from "./rules";
import type { Panel } from "./types";

// ---------------- juntas OSB: trabadas + martillo en vanos ----------------
export function osbLayoutForPanel(p: Panel, vincha: boolean, R: Rules) {
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
export function osbPiecesForPanel(p: Panel, vincha: boolean, R: Rules) {
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
        const piece = { x1, x2, y1: row.y1, y2: row.y2, w: x2 - x1, h: row.y2 - row.y1, notches: [], lap: false };
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
export function packOsbSheets(panels: Panel[], vincha: boolean, R: Rules) {
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
