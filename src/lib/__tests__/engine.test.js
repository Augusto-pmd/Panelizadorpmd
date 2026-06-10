import { describe, it, expect } from "vitest";
import {
  RULES,
  panelizeWall,
  osbLayoutForPanel,
  packOsbSheets,
  buildAll,
} from "../engine.js";

// ppm = pixels por metro. Usamos 100 para que 1 m = 100 px (números redondos).
const PPM = 100;
const wallOf = (id, lenM) => ({ id, a: { x: 0, y: 0 }, b: { x: lenM * PPM, y: 0 } });
const noJoints = { corners: [], tees: [] };

describe("panelizeWall — corte en paneles", () => {
  it("un muro de 6 m se parte en 2 paneles de 3 m (máximo PMD)", () => {
    const panels = panelizeWall(wallOf("M1", 6), [], noJoints, PPM, false, RULES);
    expect(panels).toHaveLength(2);
    for (const p of panels) expect(p.len).toBeCloseTo(3.0, 2);
  });

  it("un muro de 2,4 m queda en un solo panel", () => {
    const panels = panelizeWall(wallOf("M1", 2.4), [], noJoints, PPM, false, RULES);
    expect(panels).toHaveLength(1);
    expect(panels[0].len).toBeCloseTo(2.4, 2);
  });

  it("ningún panel supera el largo máximo de 3,00 m", () => {
    const panels = panelizeWall(wallOf("M1", 8.5), [], noJoints, PPM, false, RULES);
    for (const p of panels) expect(p.len).toBeLessThanOrEqual(RULES.panelMaxLen + 1e-6);
  });
});

describe("Reglas constructivas PMD (NO cambiar sin confirmación de Augusto)", () => {
  it("montantes con largo EXACTO de 3,00 m (media barra de 6 m, cero desperdicio)", () => {
    const panels = panelizeWall(wallOf("M1", 3), [], noJoints, PPM, false, RULES);
    const studs = panels[0].pieces.filter((pc) => pc.uso === "Montante");
    expect(studs.length).toBeGreaterThan(0);
    for (const s of studs) expect(s.largo).toBeCloseTo(3.0, 5);
  });

  it("montantes modulados @400 mm (0,40 m)", () => {
    const panels = panelizeWall(wallOf("M1", 3), [], noJoints, PPM, false, RULES);
    expect(RULES.studSpacing).toBe(0.4);
    const xs = panels[0].studs.map((s) => s.x).sort((a, b) => a - b);
    // extremos 0 y 3,00 + grilla 0,40 … 2,80 → 9 montantes
    expect(xs[0]).toBeCloseTo(0, 5);
    expect(xs[xs.length - 1]).toBeCloseTo(3.0, 5);
    for (let i = 1; i < xs.length - 1; i++) {
      const pasos = xs[i] / RULES.studSpacing; // debe caer en una posición múltiplo de 0,40
      expect(pasos).toBeCloseTo(Math.round(pasos), 5);
    }
  });

  it("esquina: montante en caja (2 PGC)", () => {
    const corner = { x: 0, y: 0 }; // coincide con wall.a
    const panels = panelizeWall(wallOf("M1", 3), [], { corners: [corner], tees: [] }, PPM, false, RULES);
    const caja = panels[0].pieces.find((pc) => pc.uso === "Montante en caja (esquina)");
    expect(caja).toBeDefined();
    expect(caja.cant).toBe(2);
  });

  it("encuentro en T: montante adicional (doble)", () => {
    const panels = panelizeWall(wallOf("M1", 3), [], { corners: [], tees: [{ wallId: "M1", t: 0.5 }] }, PPM, false, RULES);
    const tee = panels[0].pieces.find((pc) => pc.uso === "Montante T (doble)");
    expect(tee).toBeDefined();
    expect(tee.cant).toBe(2);
  });

  it("dintel: PGC en caja (2 piezas) con apoyo de 0,10 m por lado", () => {
    const op = { id: 1, wallId: "M1", type: "puerta", offset: 1.5, width: 0.9, height: 2.0, sill: 0 };
    const panels = panelizeWall(wallOf("M1", 3), [op], noJoints, PPM, false, RULES);
    const dintel = panels[0].pieces.find((pc) => pc.uso === "Dintel en caja");
    expect(dintel).toBeDefined();
    expect(dintel.cant).toBe(2);
    expect(dintel.largo).toBeCloseTo(op.width + 2 * RULES.headerBearing, 5);
  });

  it("viga tubo ARMADA: cajón PGU + 2 PGC + PGU integrado al panel", () => {
    const panels = panelizeWall(wallOf("M1", 3), [], noJoints, PPM, true, RULES);
    const alas = panels[0].pieces.find((pc) => pc.uso === "Viga tubo: alas PGU");
    const almas = panels[0].pieces.find((pc) => pc.uso === "Viga tubo: almas PGC");
    const murito = panels[0].pieces.find((pc) => pc.uso === "Solera murito de carga");
    expect(alas?.cant).toBe(2);
    expect(almas?.cant).toBe(2);
    expect(murito?.cant).toBe(2);
  });
});

describe("OSB — siempre trabado", () => {
  it("la fila superior está corrida ½ placa (juntas nunca alineadas)", () => {
    const panels = panelizeWall(wallOf("M1", 3), [], noJoints, PPM, false, RULES);
    const rows = osbLayoutForPanel(panels[0], false, RULES);
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows[0].offset).toBe(0);
    expect(rows[1].offset).toBeCloseTo(RULES.osbW / 2, 5);
  });

  it("la planilla de corte usa al menos una placa y reporta % de aprovechamiento", () => {
    const panels = panelizeWall(wallOf("M1", 6), [], noJoints, PPM, false, RULES);
    const plan = packOsbSheets(panels, false, RULES);
    expect(plan.sheets.length).toBeGreaterThan(0);
    expect(plan.util).toBeGreaterThan(0);
    expect(plan.util).toBeLessThanOrEqual(100);
  });
});

describe("buildAll — cómputo integral", () => {
  it("genera paneles, lista de corte y optimización en barras de 6 m", () => {
    const walls = [wallOf("M1", 6)];
    const r = buildAll(walls, [], [], [], PPM, false, RULES);
    expect(r.panels).toHaveLength(2);
    expect(r.cutList.length).toBeGreaterThan(0);
    // montantes de 3,00 m → 2 por barra de 6,00 m, sin desperdicio
    expect(r.packing[PGC()].bars).toBeGreaterThan(0);
    expect(RULES.barLen).toBe(6.0);
  });
});

// etiqueta del perfil PGC (evita acoplar el test a la cadena exacta dentro del motor)
function PGC() {
  return "PGC 100×1.2";
}
