import type { DxfSegment } from "./types";

// ---------------- parser DXF: extrae LINE y LWPOLYLINE de la sección ENTITIES ----------------
export function parseDxf(text: string): DxfSegment[] {
  const lines = text.split(/\r\n|\r|\n/);
  const pairs: Array<[number, string]> = [];
  for (let i = 0; i + 1 < lines.length; i += 2) {
    pairs.push([parseInt(lines[i].trim(), 10), lines[i + 1]]);
  }
  const segs: DxfSegment[] = [];
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
