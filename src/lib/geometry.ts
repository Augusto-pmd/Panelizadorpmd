import { SNAP_PX } from "./rules";
import type { Vec2, Wall, Joints } from "./types";

// ---------------- helpers geométricos ----------------
export const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);

export function projectOnSegment(p: Vec2, a: Vec2, b: Vec2) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const L2 = dx * dx + dy * dy;
  if (L2 === 0) return { t: 0, d: dist(p, a) };
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2;
  t = Math.max(0, Math.min(1, t));
  const q = { x: a.x + t * dx, y: a.y + t * dy };
  return { t, d: dist(p, q), q };
}

// ---------------- detección de nudos ----------------
export function detectJoints(walls: Wall[]): Joints {
  const corners: Vec2[] = [];
  const tees: Joints["tees"] = [];
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
