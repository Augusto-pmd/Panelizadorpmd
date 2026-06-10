import { PGC, PGU, SNAP_PX } from "./rules";
import type { Rules } from "./rules";
import { dist } from "./geometry";
import type { Wall, Opening, Joints } from "./types";

// ---------------- motor: paneles de muro ----------------
export function panelizeWall(
  wall: Wall,
  wallOps: Opening[],
  joints: Joints,
  ppm: number,
  vincha: boolean,
  R: Rules,
) {
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
