import React, { useState, useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import {
  C, RULES, FIXTYPES, PGC, PGU, TUBO, SNAP_PX,
  slugify, parseDxf, dist, projectOnSegment, detectJoints,
  panelizeWall, osbLayoutForPanel, osbPiecesForPanel, packOsbSheets, buildAll,
} from "./lib/engine";
import { Card, Btn, ToolButton, IconBtn, Stat, SectionTitle, Chip, Field, NumInput, EmptyState } from "./ui";
import DetallesView from "./DetallesView";
// ---------------- componente principal ----------------
export default function PanelizadorSF() {
  const [tab, setTab] = useState("plano");
  const [mode, setMode] = useState("muro"); // muro | vano | techo | goma | calibrar
  const [walls, setWalls] = useState([]);
  const [openings, setOpenings] = useState([]);
  const [roofs, setRoofs] = useState([]);
  const [ppm, setPpm] = useState(50);
  const [pending, setPending] = useState(null);
  const [pendingRoof, setPendingRoof] = useState(null);
  const [hover, setHover] = useState(null);
  const [calPts, setCalPts] = useState([]);
  const [calInput, setCalInput] = useState("");
  const [bg, setBg] = useState(null);
  const [bgOpacity, setBgOpacity] = useState(0.55);
  const [vincha, setVincha] = useState(true);
  const [showOsb, setShowOsb] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [exactLen, setExactLen] = useState("");
  const [editWall, setEditWall] = useState(null); // { id, value } — cota editable en el canvas
  const [showHelp, setShowHelp] = useState(false); // panel de atajos y ayuda
  const [autoRoof, setAutoRoof] = useState({ tipo: "2aguas-h", pendiente: 30, alero: 0.3 });
  const svgRef = useRef(null);
  const idRef = useRef(1);
  const [view3d, setView3d] = useState("esquema");
  const [osb3d, setOsb3d] = useState(true);
  const [roof3d, setRoof3d] = useState(true);
  const [lana3d, setLana3d] = useState(false);
  const [fixtures, setFixtures] = useState([]);
  const [projName, setProjName] = useState("");
  const [savedProjects, setSavedProjects] = useState([]);
  const [storageMsg, setStorageMsg] = useState("");
  const [dxfData, setDxfData] = useState(null);
  const mount3d = useRef(null);

  const VB_W = 1000, VB_H = 640;

  const result = useMemo(
    () => buildAll(walls, openings, roofs, fixtures, ppm, vincha, RULES),
    [walls, openings, roofs, fixtures, ppm, vincha]
  );

  // ================= DESHACER / REHACER (historial de escena) =================
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const sceneSnapRef = useRef(null);
  const skipHistoryRef = useRef(false);

  useEffect(() => {
    const snap = JSON.stringify({ walls, openings, roofs, fixtures });
    if (sceneSnapRef.current === null) { sceneSnapRef.current = snap; return; }
    if (skipHistoryRef.current) { skipHistoryRef.current = false; sceneSnapRef.current = snap; return; }
    if (snap !== sceneSnapRef.current) {
      const prev = sceneSnapRef.current;
      setHistory((h) => [...h.slice(-60), prev]);
      setFuture([]);
      sceneSnapRef.current = snap;
    }
  }, [walls, openings, roofs, fixtures]);

  function applyScene(snapStr) {
    const s = JSON.parse(snapStr);
    skipHistoryRef.current = true;
    setWalls(s.walls || []); setOpenings(s.openings || []); setRoofs(s.roofs || []); setFixtures(s.fixtures || []);
    setPending(null); setPendingRoof(null);
  }
  function undo() {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setFuture((f) => [JSON.stringify({ walls, openings, roofs, fixtures }), ...f].slice(0, 60));
    setHistory((h) => h.slice(0, -1));
    applyScene(prev);
  }
  function redo() {
    if (!future.length) return;
    const next = future[0];
    setHistory((h) => [...h.slice(-60), JSON.stringify({ walls, openings, roofs, fixtures })]);
    setFuture((f) => f.slice(1));
    applyScene(next);
  }

  // ================= ATAJOS DE TECLADO =================
  const keyHandlerRef = useRef(null);
  keyHandlerRef.current = (e) => {
    const tag = (e.target && e.target.tagName) || "";
    const typing = tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA";
    const mod = e.ctrlKey || e.metaKey;
    if (mod && (e.key === "z" || e.key === "Z")) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && (e.key === "y" || e.key === "Y")) { e.preventDefault(); redo(); return; }
    if (typing) return;
    if (e.key === "Escape") { setPending(null); setPendingRoof(null); setEditWall(null); setShowHelp(false); return; }
    if (tab !== "plano") return;
    const toolKeys = { m: "muro", v: "vano", t: "techo", i: "instal", e: "editar", g: "goma", h: "mover", c: "calibrar" };
    const k = e.key.toLowerCase();
    if (toolKeys[k]) { setMode(toolKeys[k]); setPending(null); setPendingRoof(null); if (k === "c") setCalPts([]); return; }
    if (e.key === "+" || e.key === "=") { setZoom((z) => Math.min(4, z * 1.25)); return; }
    if (e.key === "-" || e.key === "_") { setZoom((z) => Math.max(0.4, z / 1.25)); return; }
    if (e.key === "0") { setZoom(1); setPan({ x: 0, y: 0 }); return; }
  };
  useEffect(() => {
    const fn = (e) => keyHandlerRef.current && keyHandlerRef.current(e);
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  // ================= PERSISTENCIA DE PROYECTOS =================
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("sfp-index");
        if (res && res.value) setSavedProjects(JSON.parse(res.value));
      } catch (_) { /* todavía no hay proyectos guardados */ }
    })();
  }, []);

  async function saveProject() {
    const name = projName.trim();
    if (!name) { setStorageMsg("Poné un nombre para guardar el proyecto."); return; }
    const slug = slugify(name);
    const data = { walls, openings, roofs, fixtures, ppm, vincha, bg, savedAt: Date.now(), nextId: idRef.current };
    let msg = `Proyecto "${name}" guardado.`;
    try {
      try {
        await window.storage.set(`sfp:${slug}`, JSON.stringify(data));
      } catch (e) {
        // probablemente la imagen del plano excede el límite: reintentar sin fondo
        await window.storage.set(`sfp:${slug}`, JSON.stringify({ ...data, bg: null }));
        msg = `"${name}" guardado sin la imagen del plano (era muy pesada). El trazado quedó completo.`;
      }
      const idx = savedProjects.filter((p) => p.slug !== slug).concat([{ slug, name, date: Date.now() }]);
      await window.storage.set("sfp-index", JSON.stringify(idx));
      setSavedProjects(idx);
      setStorageMsg(msg);
    } catch (e) {
      setStorageMsg("No se pudo guardar el proyecto. Probá de nuevo.");
    }
  }

  async function loadProject(slug) {
    try {
      const res = await window.storage.get(`sfp:${slug}`);
      const d = JSON.parse(res.value);
      setWalls(d.walls || []);
      setOpenings(d.openings || []);
      setRoofs(d.roofs || []);
      setFixtures(d.fixtures || []);
      setPpm(d.ppm || 50);
      setVincha(d.vincha !== false);
      setBg(d.bg || null);
      idRef.current = Math.max(d.nextId || 1, 1000);
      const found = savedProjects.find((p) => p.slug === slug);
      setProjName(found ? found.name : "");
      setPending(null);
      setPendingRoof(null);
      setStorageMsg("Proyecto cargado.");
    } catch (e) {
      setStorageMsg("No se pudo cargar ese proyecto.");
    }
  }

  async function deleteProject(slug) {
    try { await window.storage.delete(`sfp:${slug}`); } catch (_) {}
    const idx = savedProjects.filter((p) => p.slug !== slug);
    try { await window.storage.set("sfp-index", JSON.stringify(idx)); } catch (_) {}
    setSavedProjects(idx);
    setStorageMsg("Proyecto borrado.");
  }

  // ================= VISTA 3D =================
  useEffect(() => {
    if (tab !== "v3d" || !mount3d.current) return;
    const mount = mount3d.current;
    const W = mount.clientWidth || 360;
    const Hpx = Math.min(520, Math.max(340, Math.round(window.innerHeight * 0.55)));
    const realistic = view3d === "realista";

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, Hpx);
    if (realistic) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(realistic ? 0xbfd6ea : 0xfcfbf8);
    if (realistic) scene.fog = new THREE.Fog(0xbfd6ea, 45, 130);

    scene.add(new THREE.AmbientLight(0xffffff, realistic ? 0.45 : 0.8));
    const sun = new THREE.DirectionalLight(0xfff2dd, realistic ? 1.15 : 0.7);
    sun.position.set(14, 20, 9);
    if (realistic) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      const d = 22;
      sun.shadow.camera.left = -d; sun.shadow.camera.right = d;
      sun.shadow.camera.top = d; sun.shadow.camera.bottom = -d;
    }
    scene.add(sun);
    if (realistic) scene.add(new THREE.HemisphereLight(0xcfe4f7, 0x6b7a5a, 0.5));

    // materiales
    const mSteel = realistic
      ? new THREE.MeshStandardMaterial({ color: 0xb9c0c7, metalness: 0.85, roughness: 0.38 })
      : new THREE.MeshLambertMaterial({ color: 0x5b6b7c });
    const mBox = realistic ? mSteel : new THREE.MeshLambertMaterial({ color: 0x2e6fd8 });
    const mHeader = realistic ? mSteel : new THREE.MeshLambertMaterial({ color: 0x7da3df });
    let mOsb;
    if (realistic) {
      const c = document.createElement("canvas"); c.width = c.height = 256;
      const g = c.getContext("2d");
      g.fillStyle = "#c9a86a"; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 900; i++) {
        const x = Math.random() * 256, y = Math.random() * 256;
        const wch = 4 + Math.random() * 16, hch = 1.5 + Math.random() * 4, a = Math.random() * Math.PI;
        g.save(); g.translate(x, y); g.rotate(a);
        const t = 150 + Math.random() * 90;
        g.fillStyle = `rgb(${t | 0},${(t * 0.74) | 0},${(t * 0.42) | 0})`;
        g.globalAlpha = 0.45 + Math.random() * 0.45;
        g.fillRect(-wch / 2, -hch / 2, wch, hch); g.restore();
      }
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      mOsb = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, metalness: 0 });
    } else {
      mOsb = new THREE.MeshLambertMaterial({ color: 0xd8b36a, transparent: true, opacity: 0.82 });
    }
    const mChapa = realistic
      ? new THREE.MeshStandardMaterial({ color: 0xc7ccd1, metalness: 0.9, roughness: 0.28 })
      : new THREE.MeshLambertMaterial({ color: 0x9aa3a8 });
    const mSlab = realistic
      ? new THREE.MeshStandardMaterial({ color: 0xb6b3aa, roughness: 0.95 })
      : new THREE.MeshLambertMaterial({ color: 0xdad7ce });
    const mLana = realistic
      ? new THREE.MeshStandardMaterial({ color: 0xe8c84a, roughness: 1, metalness: 0 })
      : new THREE.MeshLambertMaterial({ color: 0xe8c84a, transparent: true, opacity: 0.9 });
    const mElec = realistic
      ? new THREE.MeshStandardMaterial({ color: 0xd14545, roughness: 0.6 })
      : new THREE.MeshLambertMaterial({ color: 0xd14545 });
    const mAgua = realistic
      ? new THREE.MeshStandardMaterial({ color: 0x2ba3b8, roughness: 0.6 })
      : new THREE.MeshLambertMaterial({ color: 0x2ba3b8 });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x15222f });

    const root = new THREE.Group();
    scene.add(root);
    const addBox = (parent, w2, h2, d2, x, y, z, mat) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w2, h2, d2), mat);
      mesh.position.set(x, y, z);
      if (realistic) { mesh.castShadow = true; mesh.receiveShadow = true; }
      parent.add(mesh);
      if (!realistic) {
        const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), edgeMat);
        e.position.copy(mesh.position);
        parent.add(e);
      }
      return mesh;
    };

    const H = RULES.panelHeight;
    const topH = H + (vincha ? 0.6 : 0);

    let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
    const consider = (x, z) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); };
    for (const w2 of walls) { consider(w2.a.x / ppm, w2.a.y / ppm); consider(w2.b.x / ppm, w2.b.y / ppm); }
    for (const r of roofs) { consider(r.x / ppm, r.y / ppm); consider((r.x + r.w) / ppm, (r.y + r.h) / ppm); }
    if (minX > maxX) { minX = 0; maxX = 8; minZ = 0; maxZ = 6; }
    const cx0 = (minX + maxX) / 2, cz0 = (minZ + maxZ) / 2;
    const span = Math.max(maxX - minX, maxZ - minZ, 6);

    // platea / terreno
    addBox(root, span + 3, 0.12, span + 3, cx0, -0.06, cz0, mSlab);
    if (realistic) {
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshStandardMaterial({ color: 0x8aa06b, roughness: 1 }));
      ground.rotation.x = -Math.PI / 2; ground.position.y = -0.121; ground.receiveShadow = true;
      scene.add(ground);
    }

    // muros con su estructura
    for (const w2 of walls) {
      const ax = w2.a.x / ppm, az = w2.a.y / ppm;
      const L = dist(w2.a, w2.b) / ppm;
      if (L < 0.1) continue;
      const ux = (w2.b.x - w2.a.x) / (L * ppm), uz = (w2.b.y - w2.a.y) / (L * ppm);
      const g2 = new THREE.Group();
      g2.position.set(ax, 0, az);
      g2.rotation.y = -Math.atan2(uz, ux);
      root.add(g2);

      addBox(g2, L, 0.1, 0.1, L / 2, 0.05, 0, mSteel);
      addBox(g2, L, 0.1, 0.1, L / 2, H - 0.05, 0, mSteel);

      const wallPanels = result.panels.filter((p) => p.wallId === w2.id);
      for (const p of wallPanels) {
        for (const s of p.studs) {
          const gx = p.a + s.x;
          addBox(g2, s.qty > 1 ? 0.1 : 0.045, H - 0.2, 0.1, gx, H / 2, 0, s.qty > 1 ? mBox : mSteel);
        }
        for (const o of p.ops) {
          if (!(o.x1 >= p.a - 0.01)) continue;
          const cxo = (o.x1 + o.x2) / 2, wo = o.x2 - o.x1;
          addBox(g2, wo + 0.2, 0.1, 0.1, cxo, o.sill + o.height + 0.05, 0, mHeader);
          if (o.sill > 0.05) addBox(g2, wo, 0.08, 0.1, cxo, o.sill - 0.04, 0, mSteel);
        }
        // cripples: los verticales siguen sobre el dintel y bajo el antepecho
        const g0p = Math.ceil((p.a + 0.001) / RULES.studSpacing) * RULES.studSpacing;
        for (const o of p.ops) {
          for (let gx = g0p; gx < p.b - 0.05; gx += RULES.studSpacing) {
            if (gx > o.x1 + 0.03 && gx < o.x2 - 0.03) {
              const topLen = H - (o.headBot + RULES.headerDepth);
              if (topLen > 0.06) addBox(g2, 0.045, topLen, 0.1, gx, o.headBot + RULES.headerDepth + topLen / 2, 0, mSteel);
              if (o.sill > 0.1) addBox(g2, 0.045, o.sill - 0.05, 0.1, gx, (o.sill - 0.05) / 2, 0, mSteel);
            }
          }
        }
      }

      if (vincha) {
        // viga tubo (cajón) + murito de carga con sus montantes verticales a modulación completa
        addBox(g2, L, RULES.vigaTuboH, 0.1, L / 2, H + RULES.vigaTuboH / 2, 0, realistic ? mSteel : mHeader);
        const y0 = H + RULES.vigaTuboH;
        addBox(g2, L, 0.05, 0.1, L / 2, y0 + 0.025, 0, mSteel);
        addBox(g2, L, 0.05, 0.1, L / 2, y0 + RULES.vinchaHeight - 0.025, 0, mSteel);
        for (let gx = 0; ; gx += RULES.studSpacing) {
          const x = Math.min(gx, L - 0.025);
          addBox(g2, 0.045, RULES.vinchaHeight - 0.1, 0.1, Math.max(0.025, x), y0 + RULES.vinchaHeight / 2, 0, mSteel);
          if (gx >= L) break;
        }
      }

      // OSB con los vanos calados
      if (osb3d) {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0); shape.lineTo(L, 0); shape.lineTo(L, H); shape.lineTo(0, H); shape.lineTo(0, 0);
        const wallOps = openings.filter((o) => o.wallId === w2.id);
        for (const o of wallOps) {
          const sill = o.type === "puerta" ? 0 : o.sill;
          const x1 = Math.max(0.01, o.offset - o.width / 2), x2 = Math.min(L - 0.01, o.offset + o.width / 2);
          if (x2 - x1 < 0.05) continue;
          const hole = new THREE.Path();
          hole.moveTo(x1, sill); hole.lineTo(x2, sill); hole.lineTo(x2, sill + o.height); hole.lineTo(x1, sill + o.height); hole.lineTo(x1, sill);
          shape.holes.push(hole);
        }
        const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: false });
        const skin = new THREE.Mesh(geo, mOsb);
        skin.position.set(0, 0, 0.052);
        if (realistic) { skin.castShadow = true; skin.receiveShadow = true; }
        g2.add(skin);
      }

      // lana de vidrio en la cavidad
      if (lana3d) {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0); shape.lineTo(L, 0); shape.lineTo(L, H); shape.lineTo(0, H); shape.lineTo(0, 0);
        const wallOps = openings.filter((o) => o.wallId === w2.id);
        for (const o of wallOps) {
          const sill = o.type === "puerta" ? 0 : o.sill;
          const x1 = Math.max(0.01, o.offset - o.width / 2), x2 = Math.min(L - 0.01, o.offset + o.width / 2);
          if (x2 - x1 < 0.05) continue;
          const hole = new THREE.Path();
          hole.moveTo(x1, sill); hole.lineTo(x2, sill); hole.lineTo(x2, sill + o.height); hole.lineTo(x1, sill + o.height); hole.lineTo(x1, sill);
          shape.holes.push(hole);
        }
        const geoL = new THREE.ExtrudeGeometry(shape, { depth: 0.085, bevelEnabled: false });
        const lana = new THREE.Mesh(geoL, mLana);
        lana.position.set(0, 0, -0.0425);
        g2.add(lana);
      }

      // instalaciones
      for (const f of fixtures.filter((x) => x.wallId === w2.id)) {
        const ft = FIXTYPES[f.type];
        if (!ft) continue;
        const matF = ft.kind === "elec" ? mElec : mAgua;
        const fx = Math.max(0.06, Math.min(L - 0.06, f.offset));
        const fh = Math.max(0.05, Math.min(H - 0.05, f.height));
        addBox(g2, 0.12, 0.12, 0.05, fx, fh, -0.08, matF);
        if (ft.kind === "elec") {
          addBox(g2, 0.025, Math.max(0.05, H - fh), 0.025, fx, fh + (H - fh) / 2, -0.08, matF);
        } else {
          addBox(g2, 0.03, fh, 0.03, fx, fh / 2, -0.08, matF);
        }
      }
    }

    // techos inclinados
    if (roof3d) {
      roofs.forEach((r) => {
        const info = result.roofInfo.find((x) => x.id === r.id);
        if (!info) return;
        const x0 = r.x / ppm, z0 = r.y / ppm, wM = r.w / ppm, hM = r.h / ppm;
        const ang = Math.atan((r.slope || 0) / 100);
        const outer = new THREE.Group();
        if (r.dir === "x") { outer.position.set(x0, topH, z0 + hM / 2); }
        else { outer.position.set(x0 + wM / 2, topH, z0); outer.rotation.y = -Math.PI / 2; }
        const inner = new THREE.Group();
        inner.rotation.z = ang;
        outer.add(inner); root.add(outer);

        const nCab = Math.floor(info.width / RULES.studSpacing) + 1;
        for (let i = 0; i < nCab; i++) {
          const z = -info.width / 2 + (i * info.width) / Math.max(1, nCab - 1);
          addBox(inner, info.slopeLen, 0.1, 0.045, info.slopeLen / 2, 0.05, z, mSteel);
        }
        if (lana3d) addBox(inner, info.slopeLen, 0.085, info.width, info.slopeLen / 2, 0.05, 0, mLana);
        if (osb3d) addBox(inner, info.slopeLen, 0.012, info.width, info.slopeLen / 2, 0.106, 0, mOsb);
        addBox(inner, info.slopeLen + 0.15, 0.02, info.width + 0.1, info.slopeLen / 2, 0.125, 0, mChapa);
      });
    }

    // cámara + órbita táctil
    const camera = new THREE.PerspectiveCamera(45, W / Hpx, 0.1, 400);
    const ctrl = { theta: Math.PI / 4, phi: 1.05, radius: span * 1.7 + 6 };
    const target = new THREE.Vector3(cx0, topH / 2, cz0);
    const applyCam = () => {
      camera.position.set(
        target.x + ctrl.radius * Math.sin(ctrl.phi) * Math.cos(ctrl.theta),
        target.y + ctrl.radius * Math.cos(ctrl.phi),
        target.z + ctrl.radius * Math.sin(ctrl.phi) * Math.sin(ctrl.theta)
      );
      camera.lookAt(target);
    };
    applyCam();

    const pointers = new Map();
    let lastPinch = 0;
    const el = renderer.domElement;
    el.style.touchAction = "none";
    const onDown = (e) => { pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { el.setPointerCapture(e.pointerId); } catch (_) {} };
    const onMove = (e) => {
      if (!pointers.has(e.pointerId)) return;
      const prev = pointers.get(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        ctrl.theta += (e.clientX - prev.x) * 0.008;
        ctrl.phi = Math.min(1.5, Math.max(0.15, ctrl.phi - (e.clientY - prev.y) * 0.006));
      } else if (pointers.size === 2) {
        const pts = [...pointers.values()];
        const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (lastPinch > 0) ctrl.radius = Math.min(span * 6, Math.max(3, ctrl.radius * (lastPinch / d)));
        lastPinch = d;
      }
      applyCam();
    };
    const onUp = (e) => { pointers.delete(e.pointerId); lastPinch = 0; };
    const onWheel = (e) => { e.preventDefault(); ctrl.radius = Math.min(span * 6, Math.max(3, ctrl.radius * (1 + e.deltaY * 0.001))); applyCam(); };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });

    let raf;
    const loop = () => { renderer.render(scene, camera); raf = requestAnimationFrame(loop); };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
      renderer.dispose();
      if (el.parentNode === mount) mount.removeChild(el);
    };
  }, [tab, view3d, osb3d, roof3d, lana3d, fixtures, walls, openings, roofs, ppm, vincha, result]);

  function ptFromEvent(e) {
    const svg = svgRef.current;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    const cx = (e.clientX - r.left) / r.width;
    const cy = (e.clientY - r.top) / r.height;
    const w = VB_W / zoom, h = VB_H / zoom;
    const x0 = (VB_W - w) / 2 + pan.x, y0 = (VB_H - h) / 2 + pan.y;
    return { x: x0 + cx * w, y: y0 + cy * h };
  }

  function snapPoint(p, base) {
    for (const w of walls) {
      for (const ep of [w.a, w.b]) {
        if (dist(p, ep) < SNAP_PX) return { ...ep };
      }
    }
    const g = 0.05 * ppm; // grilla de 5 cm: cotas redondas
    if (base) {
      const dx = Math.abs(p.x - base.x), dy = Math.abs(p.y - base.y);
      if (dx > dy) return { x: base.x + Math.round((p.x - base.x) / g) * g, y: base.y };
      return { x: base.x, y: base.y + Math.round((p.y - base.y) / g) * g };
    }
    return { x: Math.round(p.x / g) * g, y: Math.round(p.y / g) * g };
  }

  function eraseAt(raw) {
    // 0) instalaciones
    let bestF = null;
    for (const f of fixtures) {
      const w2 = walls.find((x) => x.id === f.wallId);
      if (!w2) continue;
      const L = dist(w2.a, w2.b);
      const ux = (w2.b.x - w2.a.x) / L, uy = (w2.b.y - w2.a.y) / L;
      const px2 = w2.a.x + ux * f.offset * ppm, py2 = w2.a.y + uy * f.offset * ppm;
      const d = Math.hypot(raw.x - px2, raw.y - py2);
      if (d < 14 && (!bestF || d < bestF.d)) bestF = { id: f.id, d };
    }
    if (bestF) { setFixtures((fs) => fs.filter((x) => x.id !== bestF.id)); return; }
    // 1) vanos
    let bestO = null;
    for (const o of openings) {
      const w2 = walls.find((x) => x.id === o.wallId);
      if (!w2) continue;
      const L = dist(w2.a, w2.b);
      const ux = (w2.b.x - w2.a.x) / L, uy = (w2.b.y - w2.a.y) / L;
      const p1 = { x: w2.a.x + ux * (o.offset - o.width / 2) * ppm, y: w2.a.y + uy * (o.offset - o.width / 2) * ppm };
      const p2 = { x: w2.a.x + ux * (o.offset + o.width / 2) * ppm, y: w2.a.y + uy * (o.offset + o.width / 2) * ppm };
      const pr = projectOnSegment(raw, p1, p2);
      if (pr.d < 16 && (!bestO || pr.d < bestO.d)) bestO = { id: o.id, d: pr.d };
    }
    if (bestO) { setOpenings((os) => os.filter((x) => x.id !== bestO.id)); return; }
    // 2) muros
    let bestW = null;
    for (const w2 of walls) {
      const pr = projectOnSegment(raw, w2.a, w2.b);
      if (pr.d < 14 && (!bestW || pr.d < bestW.d)) bestW = { id: w2.id, d: pr.d };
    }
    if (bestW) {
      setWalls((ws) => ws.filter((x) => x.id !== bestW.id));
      setOpenings((os) => os.filter((x) => x.wallId !== bestW.id));
      setFixtures((fs) => fs.filter((x) => x.wallId !== bestW.id));
      return;
    }
    // 3) techos
    for (const r of roofs) {
      if (raw.x >= r.x && raw.x <= r.x + r.w && raw.y >= r.y && raw.y <= r.y + r.h) {
        setRoofs((rs) => rs.filter((x) => x.id !== r.id));
        return;
      }
    }
  }

  function handleTap(raw) {
    if (mode === "calibrar") {
      setCalPts((p) => [...p, raw].slice(-2));
      return;
    }
    if (mode === "goma") { eraseAt(raw); return; }

    if (mode === "muro") {
      if (!pending) {
        setPending(snapPoint(raw, null));
      } else {
        const b = snapPoint(raw, pending);
        if (dist(pending, b) <= 15) { setPending(null); setHover(null); return; } // tocar el mismo punto termina el tramo
        setWalls((ws) => [...ws, { id: idRef.current++, a: pending, b }]);
        setPending(b); // encadena: el final es el inicio del próximo muro
        setHover(null);
      }
      return;
    }

    if (mode === "techo") {
      if (!pendingRoof) {
        setPendingRoof(raw);
      } else {
        const x = Math.min(pendingRoof.x, raw.x), y = Math.min(pendingRoof.y, raw.y);
        const w = Math.abs(raw.x - pendingRoof.x), h = Math.abs(raw.y - pendingRoof.y);
        if (w > 20 && h > 20) {
          setRoofs((rs) => [...rs, { id: idRef.current++, x, y, w, h, slope: 30, dir: w >= h ? "x" : "y" }]);
        }
        setPendingRoof(null);
        setHover(null);
      }
      return;
    }

    if (mode === "instal") {
      let best = null;
      for (const w of walls) {
        const pr = projectOnSegment(raw, w.a, w.b);
        if (pr.d < 25 && (!best || pr.d < best.d)) best = { wall: w, ...pr };
      }
      if (best) {
        const L = dist(best.wall.a, best.wall.b) / ppm;
        const offset = Math.max(0.15, Math.min(L - 0.15, best.t * L));
        setFixtures((fs) => [...fs, { id: idRef.current++, wallId: best.wall.id, type: "toma", offset, height: FIXTYPES.toma.height }]);
      }
      return;
    }

    if (mode === "vano") {
      let best = null;
      for (const w of walls) {
        const pr = projectOnSegment(raw, w.a, w.b);
        if (pr.d < 25 && (!best || pr.d < best.d)) best = { wall: w, ...pr };
      }
      if (best) {
        const L = dist(best.wall.a, best.wall.b) / ppm;
        const offset = Math.max(0.6, Math.min(L - 0.6, best.t * L));
        setOpenings((os) => [
          ...os,
          { id: idRef.current++, wallId: best.wall.id, type: "ventana", offset, width: 1.5, height: 1.1, sill: 1.0 },
        ]);
      }
    }
  }

  function handleMoveHover(e) {
    if ((mode === "muro" && pending) || (mode === "techo" && pendingRoof)) {
      const raw = ptFromEvent(e);
      if (!raw) return;
      setHover(mode === "muro" ? snapPoint(raw, pending) : raw);
    }
  }

  // ---- gestos del canvas: tap al soltar, pan con 1 dedo (modo mover) o 2 dedos, pinch zoom
  const gesture = useRef({ pts: new Map(), multi: false, lastDist: 0, lastMid: null });
  const dragRef = useRef(null);

  function pickElement(raw) {
    // instalaciones (símbolos chicos: prioridad)
    for (const f of fixtures) {
      const w2 = walls.find((x) => x.id === f.wallId);
      if (!w2) continue;
      const L = dist(w2.a, w2.b);
      const ux = (w2.b.x - w2.a.x) / L, uy = (w2.b.y - w2.a.y) / L;
      const px2 = w2.a.x + ux * f.offset * ppm, py2 = w2.a.y + uy * f.offset * ppm;
      if (Math.hypot(raw.x - px2, raw.y - py2) < 16) return { kind: "fixture", id: f.id, wallId: f.wallId };
    }
    // vanos
    for (const o of openings) {
      const w2 = walls.find((x) => x.id === o.wallId);
      if (!w2) continue;
      const L = dist(w2.a, w2.b);
      const ux = (w2.b.x - w2.a.x) / L, uy = (w2.b.y - w2.a.y) / L;
      const p1 = { x: w2.a.x + ux * (o.offset - o.width / 2) * ppm, y: w2.a.y + uy * (o.offset - o.width / 2) * ppm };
      const p2 = { x: w2.a.x + ux * (o.offset + o.width / 2) * ppm, y: w2.a.y + uy * (o.offset + o.width / 2) * ppm };
      if (projectOnSegment(raw, p1, p2).d < 18) return { kind: "opening", id: o.id, wallId: o.wallId };
    }
    // esquinas / extremos de muro: arrastra todos los muros que llegan a ese punto
    for (const w2 of walls) {
      for (const ep of [w2.a, w2.b]) {
        if (dist(raw, ep) < SNAP_PX) return { kind: "corner", pt: { ...ep } };
      }
    }
    return null;
  }

  function applyDrag(raw) {
    const d = dragRef.current;
    if (!d) return;
    if (d.kind === "fixture" || d.kind === "opening") {
      const w2 = walls.find((x) => x.id === d.wallId);
      if (!w2) return;
      const L = dist(w2.a, w2.b) / ppm;
      const pr = projectOnSegment(raw, w2.a, w2.b);
      let off = Math.round((pr.t * L) / 0.05) * 0.05;
      if (d.kind === "fixture") {
        off = Math.max(0.1, Math.min(L - 0.1, off));
        setFixtures((fs) => fs.map((f) => (f.id === d.id ? { ...f, offset: off } : f)));
      } else {
        const o = openings.find((x) => x.id === d.id);
        if (!o) return;
        off = Math.max(o.width / 2 + 0.05, Math.min(L - o.width / 2 - 0.05, off));
        setOpenings((os) => os.map((x) => (x.id === d.id ? { ...x, offset: off } : x)));
      }
    } else if (d.kind === "corner") {
      const g = 0.05 * ppm;
      const np = { x: Math.round(raw.x / g) * g, y: Math.round(raw.y / g) * g };
      if (dist(np, d.pt) < 0.5) return;
      setWalls((ws) => ws.map((w2) => ({
        ...w2,
        a: dist(w2.a, d.pt) < SNAP_PX ? { ...np } : w2.a,
        b: dist(w2.b, d.pt) < SNAP_PX ? { ...np } : w2.b,
      })));
      dragRef.current = { ...d, pt: np };
    }
  }

  function screenScale() {
    const svg = svgRef.current;
    if (!svg) return 1;
    const r = svg.getBoundingClientRect();
    return (VB_W / zoom) / r.width;
  }

  function onCanvasDown(e) {
    const g = gesture.current;
    g.pts.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
    if (g.pts.size === 2) { g.multi = true; g.lastDist = 0; g.lastMid = null; dragRef.current = null; }
    if (mode === "editar" && g.pts.size === 1) {
      const raw = ptFromEvent(e);
      dragRef.current = raw ? pickElement(raw) : null;
    }
    try { svgRef.current.setPointerCapture(e.pointerId); } catch (_) {}
  }

  function onCanvasMove(e) {
    const g = gesture.current;
    const p = g.pts.get(e.pointerId);
    if (!p) { handleMoveHover(e); return; } // hover sin presionar (desktop)
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (g.pts.size === 2) {
      const pts = [...g.pts.values()];
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      if (g.lastMid) {
        const s = screenScale();
        setPan((pv) => ({ x: pv.x - (mid.x - g.lastMid.x) * s, y: pv.y - (mid.y - g.lastMid.y) * s }));
      }
      if (g.lastDist > 0 && d > 0) setZoom((z) => Math.min(4, Math.max(0.4, z * (d / g.lastDist))));
      g.lastDist = d; g.lastMid = mid;
    } else if (g.pts.size === 1) {
      if (mode === "mover") {
        const s = screenScale();
        setPan((pv) => ({ x: pv.x - dx * s, y: pv.y - dy * s }));
      } else if (mode === "editar") {
        if (dragRef.current) {
          const raw = ptFromEvent(e);
          if (raw) applyDrag(raw);
        }
      } else {
        handleMoveHover(e);
      }
    }
  }

  function onCanvasUp(e) {
    const g = gesture.current;
    const p = g.pts.get(e.pointerId);
    g.pts.delete(e.pointerId);
    if (g.pts.size === 0) {
      const moved = p ? Math.hypot(e.clientX - p.sx, e.clientY - p.sy) : 99;
      if (!g.multi && moved < 10 && mode !== "mover" && mode !== "editar") {
        const raw = ptFromEvent(e);
        if (raw) handleTap(raw);
      }
      g.multi = false; g.lastDist = 0; g.lastMid = null;
      dragRef.current = null;
    }
  }

  // ---- muro de largo exacto desde el punto pendiente
  function addExactWall(dx, dy) {
    const m = parseFloat(String(exactLen).replace(",", "."));
    if (!pending || !(m > 0)) return;
    let b = { x: pending.x + dx * m * ppm, y: pending.y + dy * m * ppm };
    for (const w of walls) for (const ep of [w.a, w.b]) if (dist(b, ep) < SNAP_PX) b = { ...ep };
    setWalls((ws) => [...ws, { id: idRef.current++, a: pending, b }]);
    setPending(b);
    setHover(null);
  }

  function setWallLength(id, m) {
    if (!(m > 0.05)) return;
    setWalls((ws) => ws.map((w2) => {
      if (w2.id !== id) return w2;
      const L = dist(w2.a, w2.b);
      if (L < 1) return w2;
      const ux = (w2.b.x - w2.a.x) / L, uy = (w2.b.y - w2.a.y) / L;
      return { ...w2, b: { x: w2.a.x + ux * m * ppm, y: w2.a.y + uy * m * ppm } };
    }));
  }

  // ---- techo automático sobre la planta (idea Planner 5D: no se dibuja, se genera)
  function generateAutoRoof() {
    if (walls.length === 0) { setStorageMsg("Primero trazá los muros: el techo se genera sobre la planta."); return; }
    let minX = 1e12, maxX = -1e12, minY = 1e12, maxY = -1e12;
    for (const w2 of walls) {
      for (const p of [w2.a, w2.b]) {
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
      }
    }
    const m = (autoRoof.alero || 0) * ppm;
    const x = minX - m, y = minY - m, w = maxX - minX + 2 * m, h = maxY - minY + 2 * m;
    const slope = autoRoof.pendiente || 30;
    let rs = [];
    if (autoRoof.tipo === "1agua") {
      rs = [{ id: idRef.current++, x, y, w, h, slope, dir: w >= h ? "x" : "y" }];
    } else if (autoRoof.tipo === "2aguas-h") {
      rs = [
        { id: idRef.current++, x, y, w, h: h / 2, slope, dir: "y" },
        { id: idRef.current++, x, y: y + h / 2, w, h: h / 2, slope, dir: "y" },
      ];
    } else {
      rs = [
        { id: idRef.current++, x, y, w: w / 2, h, slope, dir: "x" },
        { id: idRef.current++, x: x + w / 2, y, w: w / 2, h, slope, dir: "x" },
      ];
    }
    setRoofs(rs);
    setStorageMsg(`Techo ${autoRoof.tipo === "1agua" ? "a un agua" : "a dos aguas"} generado sobre la planta con alero de ${autoRoof.alero} m. Ajustá pendientes en la lista de paños o retocá los rectángulos con la goma y redibujando.`);
  }

  function applyCalibration() {
    const m = parseFloat(calInput.replace(",", "."));
    if (calPts.length === 2 && m > 0) {
      setPpm(dist(calPts[0], calPts[1]) / m);
      setCalPts([]);
      setCalInput("");
      setMode("muro");
    }
  }

  function loadBg(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setBg(reader.result);
    reader.readAsDataURL(f);
  }

  // ---- importación DXF (Revit, AutoCAD, SketchUp, ArchiCAD exportan a este formato)
  function loadDxf(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const segs = parseDxf(String(reader.result));
        if (segs.length === 0) { setStorageMsg("No se encontraron líneas en el DXF (debe ser DXF ASCII; exportá como DXF R12/2000 ASCII)."); return; }
        let minX = 1e12, maxX = -1e12, minY = 1e12, maxY = -1e12;
        for (const s of segs) {
          minX = Math.min(minX, s.x1, s.x2); maxX = Math.max(maxX, s.x1, s.x2);
          minY = Math.min(minY, s.y1, s.y2); maxY = Math.max(maxY, s.y1, s.y2);
        }
        const ext = Math.max(maxX - minX, maxY - minY);
        const factor = ext > 2000 ? 0.001 : ext > 200 ? 0.01 : 1; // heurística mm / cm / m
        const byLayer = {};
        for (const s of segs) byLayer[s.layer] = (byLayer[s.layer] || 0) + 1;
        setDxfData({
          segs, factor,
          layers: Object.entries(byLayer).map(([name, count]) => ({ name, count, checked: true })).sort((a, b) => b.count - a.count),
        });
        setStorageMsg(`DXF leído: ${segs.length} segmentos en ${Object.keys(byLayer).length} capas. Destildá las capas que no son muros (cotas, textos, ejes) e importá.`);
      } catch (err) {
        setStorageMsg("No se pudo leer el DXF.");
      }
    };
    reader.readAsText(f);
    e.target.value = "";
  }

  function importDxf() {
    if (!dxfData) return;
    const f = dxfData.factor;
    const active = new Set(dxfData.layers.filter((l) => l.checked).map((l) => l.name));
    const metric = dxfData.segs
      .filter((s) => active.has(s.layer))
      .map((s) => ({ x1: s.x1 * f, y1: s.y1 * f, x2: s.x2 * f, y2: s.y2 * f }))
      .filter((s) => Math.hypot(s.x2 - s.x1, s.y2 - s.y1) >= 0.3); // descarta ticks de cotas
    if (metric.length === 0) { setStorageMsg("No quedaron segmentos útiles (≥ 0,30 m) en las capas elegidas."); return; }
    let minX = 1e12, maxX = -1e12, minY = 1e12, maxY = -1e12;
    for (const s of metric) {
      minX = Math.min(minX, s.x1, s.x2); maxX = Math.max(maxX, s.x1, s.x2);
      minY = Math.min(minY, s.y1, s.y2); maxY = Math.max(maxY, s.y1, s.y2);
    }
    const ppm2 = Math.max(8, Math.min(60, 820 / Math.max(1, maxX - minX), 520 / Math.max(1, maxY - minY)));
    const ox = 90, oy = 80;
    const ws = metric.map((s) => ({
      id: idRef.current++,
      a: { x: ox + (s.x1 - minX) * ppm2, y: oy + (maxY - s.y1) * ppm2 }, // DXF tiene Y hacia arriba
      b: { x: ox + (s.x2 - minX) * ppm2, y: oy + (maxY - s.y2) * ppm2 },
    }));
    setPpm(ppm2);
    setWalls(ws);
    setOpenings([]); setRoofs([]); setFixtures([]);
    setPending(null); setPendingRoof(null);
    setBg(null);
    setDxfData(null);
    setZoom(1); setPan({ x: 0, y: 0 });
    setStorageMsg(`Importados ${ws.length} muros desde el DXF a escala real. Limpiá líneas sobrantes con la goma y marcá vanos e instalaciones.`);
  }

  function loadExample() {
    const s = 50;
    const ox = 120, oy = 100;
    const P = (mx, my) => ({ x: ox + mx * s, y: oy + my * s });
    let id = idRef.current;
    const ws = [
      { id: id++, a: P(0, 0), b: P(9, 0) },
      { id: id++, a: P(9, 0), b: P(9, 7) },
      { id: id++, a: P(9, 7), b: P(0, 7) },
      { id: id++, a: P(0, 7), b: P(0, 0) },
      { id: id++, a: P(5, 0), b: P(5, 7) },
    ];
    const os = [
      { id: id++, wallId: ws[0].id, type: "ventana", offset: 2.2, width: 1.8, height: 1.1, sill: 1.0 },
      { id: id++, wallId: ws[0].id, type: "ventana", offset: 7.0, width: 1.5, height: 1.1, sill: 1.0 },
      { id: id++, wallId: ws[2].id, type: "puerta", offset: 6.8, width: 0.9, height: 2.05, sill: 0 },
      { id: id++, wallId: ws[4].id, type: "puerta", offset: 3.0, width: 0.8, height: 2.05, sill: 0 },
      { id: id++, wallId: ws[1].id, type: "ventana", offset: 3.5, width: 2.0, height: 1.5, sill: 0.9 },
    ];
    const rf = [
      { id: id++, x: ox - 0.3 * s, y: oy - 0.3 * s, w: 9.6 * s, h: 5.3 * s, slope: 30, dir: "y" },
      { id: id++, x: ox - 0.3 * s, y: oy + 4.6 * s, w: 9.6 * s, h: 2.7 * s, slope: 18, dir: "y" },
    ];
    const fx = [
      { id: id++, wallId: ws[0].id, type: "toma", offset: 1.0, height: 0.3 },
      { id: id++, wallId: ws[0].id, type: "llave", offset: 4.2, height: 1.2 },
      { id: id++, wallId: ws[4].id, type: "toma", offset: 1.5, height: 0.3 },
      { id: id++, wallId: ws[1].id, type: "agua", offset: 5.5, height: 0.5 },
      { id: id++, wallId: ws[1].id, type: "desague", offset: 6.0, height: 0.4 },
    ];
    idRef.current = id;
    setPpm(s);
    setWalls(ws);
    setOpenings(os);
    setRoofs(rf);
    setFixtures(fx);
    setPending(null);
    setPendingRoof(null);
  }

  function updateOpening(id, patch) {
    setOpenings((os) => os.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }
  function updateRoof(id, patch) {
    setRoofs((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function updateFixture(id, patch) {
    setFixtures((fs) => fs.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function exportCSV() {
    let csv = "Perfil;Largo (m);Cantidad;Usos\n";
    for (const r of result.cutList) {
      csv += `${r.perfil};${r.largo.toFixed(2).replace(".", ",")};${r.cant};${[...r.usos].join(" / ")}\n`;
    }
    csv += `\nResumen\n`;
    for (const perfil of [PGC, PGU]) {
      const p = result.packing[perfil];
      csv += `${perfil};${p.totalML.toFixed(1).replace(".", ",")} ml;${p.bars} barras de 6 m;scrap ${p.scrap.toFixed(1).replace(".", ",")}%\n`;
    }
    if (vincha) csv += `${TUBO};${result.tuboML.toFixed(1).replace(".", ",")} ml (perfiles ya incluidos en la lista de corte, junto al murito de carga 0,50 m)\n`;
    csv += `Placas OSB 1,22x2,44 muros;${result.osbPlan.sheets.length} un (plan de corte optimizado, aprovechamiento ${result.osbPlan.util.toFixed(0)}%)\n`;
    if (result.osbRoofSheets > 0) csv += `Placas OSB 1,22x2,44 techo;${result.osbRoofSheets} un (por área, +10% desperdicio)\n`;
    if (result.osbPlan.sheets.length > 0) {
      csv += `\nPlanilla de corte OSB (muros)\n`;
      result.osbPlan.sheets.forEach((sh, i) => {
        csv += `Placa ${i + 1};${sh.pieces.map((pc) => `${pc.code} (${pc.w.toFixed(2).replace(".", ",")}x${pc.h.toFixed(2).replace(".", ",")}${pc.rot ? " rotada" : ""})`).join(" + ")}\n`;
      });
      for (const o of result.osbPlan.oversize) {
        csv += `Fuera de placa estandar;${o.code} (${o.w.toFixed(2).replace(".", ",")}x${o.h.toFixed(2).replace(".", ",")}) - unir 2 placas con junta en el vano\n`;
      }
    }
    csv += `Lana de vidrio 100mm;${result.lanaRolls} rollos 1,20x18,00 (muros ${result.lanaWallM2.toFixed(0)} m2 + techo ${result.lanaRoofM2.toFixed(0)} m2, +5%)\n`;
    if (result.instal.cajas + result.instal.aguaPts + result.instal.desagues > 0) {
      csv += `Instalaciones (previsión);${result.instal.cajas} cajas;${Math.ceil(result.instal.corrugadoML)} ml corrugado;${result.instal.aguaPts} ptos agua / ${result.instal.pexML} ml PEX;${result.instal.desagues} desagues / ${result.instal.pvcML} ml PVC\n`;
    }
    for (const ch of result.chapas) {
      csv += `Chapa techo;largo ${ch.largo.toFixed(2).replace(".", ",")} m;${ch.cant} un\n`;
    }
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lista-corte-pmd.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalMuros = walls.reduce((s, w) => s + dist(w.a, w.b) / ppm, 0);
  const mlPGC = result.packing[PGC].totalML;
  const mlPGU = result.packing[PGU].totalML;
  const totalChapas = result.chapas.reduce((s, c) => s + c.cant, 0);

  const w = VB_W / zoom, h = VB_H / zoom;
  const vbX = (VB_W - w) / 2 + pan.x, vbY = (VB_H - h) / 2 + pan.y;
  const viewBox = `${vbX} ${vbY} ${w} ${h}`;
  // mundo -> % dentro del canvas (sigue zoom/pan; el wrapper tiene el mismo tamaño que el svg)
  const worldToPct = (wx, wy) => ({ left: ((wx - vbX) / w) * 100, top: ((wy - vbY) / h) * 100 });

  const gridLines = [];
  const step = ppm;
  for (let x = 0; x <= VB_W; x += step) gridLines.push(<line key={`gx${x}`} x1={x} y1={0} x2={x} y2={VB_H} stroke={C.grid} strokeWidth={1 / zoom} />);
  for (let y = 0; y <= VB_H; y += step) gridLines.push(<line key={`gy${y}`} x1={0} y1={y} x2={VB_W} y2={y} stroke={C.grid} strokeWidth={1 / zoom} />);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: C.paper, color: C.ink }}>
      {/* ===== App shell: top bar + navegación de vistas (sticky) ===== */}
      <div className="sticky top-0 z-40 no-print">
        <header
          className="px-4 py-2.5 flex items-center gap-3"
          style={{ background: C.chrome, color: "#fff", boxShadow: "0 6px 20px rgba(16,32,43,.18)" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="grid place-items-center rounded-lg font-extrabold"
              style={{ width: 34, height: 34, background: C.blue, color: "#fff", fontSize: 14, letterSpacing: "-.02em" }}>PMD</div>
            <div className="leading-tight">
              <div className="text-[10px] uppercase font-semibold" style={{ color: "#8FA6C9", letterSpacing: ".16em" }}>PMD Arquitectura</div>
              <div className="text-[15px] font-bold">Panelizador Steel Framing</div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 text-[11px] font-mono" style={{ color: "#8FA6C9" }}>
              {["Muro 3×3 m", "Techo 6 m", "OSB 1,22×2,44"].map((s) => (
                <span key={s} className="px-2 py-1 rounded-md" style={{ background: "rgba(255,255,255,.06)" }}>{s}</span>
              ))}
            </div>
            <button
              onClick={() => setShowHelp(true)} data-tip="Atajos y ayuda"
              className="grid place-items-center rounded-lg" style={{ width: 32, height: 32, background: "rgba(255,255,255,.08)", color: "#fff", border: "1px solid rgba(255,255,255,.12)" }}
            >⌨</button>
          </div>
        </header>

        <nav
          className="px-3 py-2 flex gap-1.5 overflow-x-auto"
          style={{ background: "rgba(244,245,247,.88)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", borderBottom: `1px solid ${C.line}` }}
        >
          {[
            ["plano", "Plano", "📐", null],
            ["paneles", "Paneles", "🧱", result.panels.length + result.roofInfo.reduce((s, r) => s + r.n, 0)],
            ["v3d", "Vista 3D", "🧊", null],
            ["corte", "Corte", "✂️", null],
            ["fabricar", "Fabricación", "🏭", null],
            ["detalles", "Detalles", "📚", null],
          ].map(([k, label, icon, badge]) => {
            const on = tab === k;
            return (
              <button
                key={k}
                onClick={() => setTab(k)}
                className="flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold whitespace-nowrap"
                style={{ background: on ? C.ink : "#fff", color: on ? "#fff" : C.ink, border: `1px solid ${on ? C.ink : C.line}`, boxShadow: on ? "0 2px 10px rgba(16,32,43,.16)" : "none" }}
              >
                <span style={{ fontSize: 14 }}>{icon}</span>
                {label}
                {badge != null && (
                  <span className="text-[11px] font-bold px-1.5 rounded-full" style={{ background: on ? "rgba(255,255,255,.18)" : C.blueSoft, color: on ? "#fff" : C.blueDark }}>{badge}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ================= TAB PLANO ================= */}
      {tab === "plano" && (
        <div className="p-3 md:p-4 flex flex-col gap-3 fade-in w-full mx-auto" style={{ maxWidth: 1400 }}>
          {/* ===== Barra de proyecto ===== */}
          <Card className="p-2 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 flex-1" style={{ minWidth: 200 }}>
              <span className="text-base" style={{ color: C.gray }}>🗂️</span>
              <input
                type="text" placeholder="Nombre del proyecto (ej. Casa Talar)" value={projName}
                onChange={(e) => setProjName(e.target.value)}
                className="px-2.5 py-2 rounded-lg flex-1 text-sm font-medium" style={{ minWidth: 150 }}
              />
            </div>
            <Btn variant="dark" onClick={saveProject} data-tip="Guardar proyecto">💾 Guardar</Btn>
            {savedProjects.length > 0 && (
              <select className="px-2.5 py-2 rounded-lg text-sm" style={{ maxWidth: 200 }} value="" onChange={(e) => { if (e.target.value) loadProject(e.target.value); }}>
                <option value="">📂 Abrir proyecto…</option>
                {savedProjects.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
              </select>
            )}
            {projName && savedProjects.some((p) => p.slug === slugify(projName)) && (
              <Btn variant="danger" size="sm" onClick={() => deleteProject(slugify(projName))}>Borrar</Btn>
            )}
            {storageMsg && (
              <span className="text-xs w-full px-1 py-1 rounded-md fade-in" style={{ color: C.blueDark, background: C.blueSoft }}>{storageMsg}</span>
            )}
          </Card>

          {/* ===== Tool dock ===== */}
          <Card className="p-2.5 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-1 hidden sm:inline" style={{ color: C.gray }}>Dibujar</span>
            {[
              { k: "muro", icon: "✏️", label: "Muro", color: C.blue, key: "M" },
              { k: "vano", icon: "▢", label: "Vano", color: C.orange, key: "V" },
              { k: "techo", icon: "⛰", label: "Techo", color: C.gray, key: "T" },
              { k: "instal", icon: "⚡", label: "Instalación", color: C.elec, key: "I" },
            ].map((t) => (
              <ToolButton key={t.k} icon={t.icon} label={t.label} active={mode === t.k} color={t.color}
                hint={`${t.label} · tecla ${t.key}`}
                onClick={() => { setMode(t.k); setPending(null); setPendingRoof(null); }} />
            ))}
            <div className="w-px h-7 mx-1 hidden sm:block" style={{ background: C.line }} />
            <span className="text-[10px] font-bold uppercase tracking-wider px-1 hidden sm:inline" style={{ color: C.gray }}>Editar</span>
            {[
              { k: "editar", icon: "↖", label: "Editar", color: C.green, key: "E" },
              { k: "goma", icon: "🧽", label: "Goma", color: C.red, key: "G" },
              { k: "mover", icon: "✋", label: "Mover", color: C.gray, key: "H" },
              { k: "calibrar", icon: "📏", label: "Calibrar", color: C.blue, key: "C" },
            ].map((t) => (
              <ToolButton key={t.k} icon={t.icon} label={t.label} active={mode === t.k} color={t.color}
                hint={`${t.label} · tecla ${t.key}`}
                onClick={() => { setMode(t.k); setPending(null); setPendingRoof(null); if (t.k === "calibrar") setCalPts([]); }} />
            ))}
            <div className="w-px h-7 mx-1 hidden sm:block" style={{ background: C.line }} />
            <Btn onClick={undo} disabled={!history.length} style={{ opacity: history.length ? 1 : 0.45 }} data-tip="Deshacer · Ctrl+Z">↩</Btn>
            <Btn onClick={redo} disabled={!future.length} style={{ opacity: future.length ? 1 : 0.45 }} data-tip="Rehacer · Ctrl+Shift+Z">↪</Btn>
            <Btn variant="danger" onClick={() => { setWalls([]); setOpenings([]); setRoofs([]); setFixtures([]); setPending(null); setPendingRoof(null); }} data-tip="Vaciar el plano">🗑 Limpiar</Btn>
            <Btn variant="success" onClick={loadExample} className="ml-auto" data-tip="Cargar un proyecto de ejemplo">✨ Ejemplo</Btn>
          </Card>

          {/* ===== Opciones: importar plano + toggles ===== */}
          <Card className="p-2.5 flex flex-wrap items-center gap-2.5 text-sm">
            <label className="rounded-lg cursor-pointer px-3 py-2 font-semibold inline-flex items-center gap-1.5" style={{ background: "#fff", border: `1px solid ${C.line}`, color: C.ink }}>
              📄 Subir plano
              <input type="file" accept="image/*" className="hidden" onChange={loadBg} />
            </label>
            <label className="rounded-lg cursor-pointer px-3 py-2 font-semibold inline-flex items-center gap-1.5" style={{ background: C.blueSoft, border: `1px solid transparent`, color: C.blueDark }}>
              📐 Importar DXF
              <input type="file" accept=".dxf" className="hidden" onChange={loadDxf} />
            </label>
            {bg && (
              <label className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg" style={{ background: C.paper }}>
                <span style={{ color: C.gray }}>Opacidad plano</span>
                <input type="range" min="0.1" max="1" step="0.05" value={bgOpacity} onChange={(e) => setBgOpacity(parseFloat(e.target.value))} />
              </label>
            )}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-medium" style={{ background: vincha ? C.blueSoft : C.paper, color: vincha ? C.blueDark : C.gray, border: `1px solid ${vincha ? "transparent" : C.line}` }}>
                <input type="checkbox" checked={vincha} onChange={(e) => setVincha(e.target.checked)} />
                Viga tubo + murito 0,50 m
              </label>
              <label className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-medium" style={{ background: showOsb ? C.blueSoft : C.paper, color: showOsb ? C.blueDark : C.gray, border: `1px solid ${showOsb ? "transparent" : C.line}` }}>
                <input type="checkbox" checked={showOsb} onChange={(e) => setShowOsb(e.target.checked)} />
                Ver placas OSB
              </label>
            </div>
          </Card>

          {/* largo exacto del tramo en curso */}
          {mode === "muro" && pending && (
            <Card className="flex flex-wrap gap-2 items-center p-2.5 pop-in" style={{ borderColor: C.blue, borderWidth: 1.5 }}>
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: C.blue }}>Largo exacto</span>
              <input type="number" inputMode="decimal" step="0.05" placeholder="m" value={exactLen} onChange={(e) => setExactLen(e.target.value)} className="w-24 px-2.5 py-2 rounded-lg text-sm font-mono" />
              {[["→", 1, 0], ["↓", 0, 1], ["←", -1, 0], ["↑", 0, -1]].map(([s, dx, dy]) => (
                <Btn key={s} variant="soft" onClick={() => addExactWall(dx, dy)} style={{ fontSize: 16, minWidth: 40 }}>{s}</Btn>
              ))}
              <Btn variant="success" className="ml-auto" onClick={() => { setPending(null); setHover(null); }}>✓ Terminar tramo</Btn>
            </Card>
          )}

          {/* techo automático sobre la planta */}
          {mode === "techo" && (
            <Card className="flex flex-wrap gap-2.5 items-center p-2.5 text-xs">
              <span className="font-bold uppercase tracking-wide text-[10px]" style={{ color: C.gray }}>⛰ Techo automático</span>
              <select value={autoRoof.tipo} onChange={(e) => setAutoRoof({ ...autoRoof, tipo: e.target.value })} className="px-2 py-1.5 rounded-lg">
                <option value="2aguas-h">2 aguas — cumbrera ↔</option>
                <option value="2aguas-v">2 aguas — cumbrera ↕</option>
                <option value="1agua">1 agua</option>
              </select>
              <label className="flex items-center gap-1.5" style={{ color: C.gray }}>Pend. %
                <input type="number" inputMode="decimal" value={autoRoof.pendiente} className="w-16 px-2 py-1.5 rounded-lg font-mono" onChange={(e) => setAutoRoof({ ...autoRoof, pendiente: parseFloat(e.target.value) || 0 })} />
              </label>
              <label className="flex items-center gap-1.5" style={{ color: C.gray }}>Alero m
                <input type="number" step="0.1" inputMode="decimal" value={autoRoof.alero} className="w-16 px-2 py-1.5 rounded-lg font-mono" onChange={(e) => setAutoRoof({ ...autoRoof, alero: parseFloat(e.target.value) || 0 })} />
              </label>
              <Btn variant="dark" onClick={generateAutoRoof}>⚡ Generar sobre la planta</Btn>
              <span style={{ color: C.gray }}>…o dibujá un paño a mano con dos toques</span>
            </Card>
          )}

          {/* selección de capas y unidad del DXF */}
          {dxfData && (
            <Card className="p-3 flex flex-col gap-2 text-xs pop-in" style={{ borderColor: C.blue, borderWidth: 1.5 }}>
              <div className="font-bold flex items-center gap-2" style={{ color: C.blueDark }}>📐 Importar DXF <Chip color={C.blue}>{dxfData.segs.length} segmentos</Chip></div>
              <label className="flex items-center gap-2 flex-wrap" style={{ color: C.gray }}>
                Unidad del archivo:
                <select value={String(dxfData.factor)} onChange={(e) => setDxfData({ ...dxfData, factor: parseFloat(e.target.value) })} className="px-2 py-1.5 rounded-lg" style={{ color: C.ink }}>
                  <option value="1">metros</option>
                  <option value="0.01">centímetros</option>
                  <option value="0.001">milímetros</option>
                </select>
                <span>(detectada automáticamente, corregila si hace falta)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {dxfData.layers.map((l, i) => (
                  <label key={l.name} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer font-medium" style={{ border: `1px solid ${l.checked ? "transparent" : C.line}`, background: l.checked ? C.blueSoft : "#fff", color: l.checked ? C.blueDark : C.gray }}>
                    <input type="checkbox" checked={l.checked} onChange={(e) => { const ls = [...dxfData.layers]; ls[i] = { ...l, checked: e.target.checked }; setDxfData({ ...dxfData, layers: ls }); }} />
                    {l.name} ({l.count})
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <Btn variant="primary" onClick={importDxf}>Importar muros (reemplaza el trazado)</Btn>
                <Btn onClick={() => setDxfData(null)}>Cancelar</Btn>
              </div>
            </Card>
          )}

          {/* barra de ayuda contextual */}
          <div className="text-xs px-3 py-2.5 rounded-xl flex items-start gap-2" style={{ background: C.blueSoft, color: C.chrome }}>
            <span className="text-sm leading-none mt-0.5">💡</span>
            <div className="flex flex-col gap-0.5">
              <span style={{ color: C.blueDark, fontWeight: 600 }}>
                {mode === "muro" && (pending ? "Tocá el próximo punto (los muros se encadenan) o tipeá el largo exacto y elegí dirección. Tocá el punto azul o \"Terminar tramo\" para cortar la cadena." : "Tocá el punto inicial. Snap ortogonal, a grilla de 5 cm y a extremos existentes. Con dos dedos movés y hacés zoom.")}
                {mode === "mover" && "Arrastrá con un dedo para mover el plano. Pellizcá para hacer zoom. ⌖ vuelve a centrar."}
                {mode === "vano" && "Tocá sobre un muro para insertar un vano. Después editá medidas en la lista de abajo."}
                {mode === "techo" && (pendingRoof ? "Tocá la esquina opuesta del paño de techo." : "Tocá la primera esquina del paño de techo (en planta). La pendiente se edita abajo.")}
                {mode === "instal" && "Tocá sobre un muro para marcar un punto de instalación (toma por defecto). Cambiá tipo y altura en la lista de abajo."}
                {mode === "editar" && "Agarrá y arrastrá: los vanos e instalaciones se deslizan por su muro; agarrá una esquina y movés todos los muros que llegan a ella. Todo con snap de 5 cm."}
                {mode === "goma" && "Tocá un vano, muro o paño de techo para borrarlo. Primero borra vanos, después muros (con sus vanos) y techos."}
                {mode === "calibrar" && (calPts.length < 2 ? `Tocá ${2 - calPts.length} punto${calPts.length === 1 ? "" : "s"} sobre una cota conocida del plano.` : "Ingresá la distancia real en metros y aplicá.")}
              </span>
              <span style={{ opacity: 0.7 }}>Tip: tocá la cota (los metros) de cualquier muro para editar su largo ahí mismo · atajos M V T I E G H C · Ctrl+Z deshace.</span>
            </div>
          </div>

          {mode === "calibrar" && calPts.length === 2 && (
            <Card className="flex gap-2 items-center p-2.5 pop-in" style={{ borderColor: C.blue, borderWidth: 1.5 }}>
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: C.blue }}>📏 Escala</span>
              <input
                type="number" inputMode="decimal" placeholder="Distancia real (m)"
                className="px-3 py-2 rounded-lg w-40 font-mono"
                value={calInput} onChange={(e) => setCalInput(e.target.value)}
              />
              <Btn variant="primary" onClick={applyCalibration}>Aplicar escala</Btn>
            </Card>
          )}

          {/* canvas */}
          <div className="relative">
          <svg
            ref={svgRef}
            viewBox={viewBox}
            className="w-full rounded-xl"
            style={{ background: "#FCFBF8", border: `1px solid ${C.line}`, boxShadow: "0 1px 2px rgba(16,32,43,.04), 0 6px 22px rgba(16,32,43,.08)", touchAction: "none", aspectRatio: "1000/640", cursor: mode === "goma" ? "not-allowed" : mode === "mover" ? "grab" : "crosshair" }}
            onPointerDown={onCanvasDown}
            onPointerMove={onCanvasMove}
            onPointerUp={onCanvasUp}
            onPointerCancel={onCanvasUp}
          >
            {bg && <image href={bg} x={0} y={0} width={VB_W} opacity={bgOpacity} />}
            {!bg && gridLines}

            {/* techos */}
            {roofs.map((r, idx) => {
              const info = result.roofInfo.find((x) => x.id === r.id);
              const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
              return (
                <g key={r.id}>
                  <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="rgba(46,111,216,0.06)" stroke={C.gray} strokeWidth={2 / zoom} strokeDasharray={`${10 / zoom} ${6 / zoom}`} />
                  {/* flecha de pendiente */}
                  {r.dir === "x" ? (
                    <line x1={r.x + 14 / zoom} y1={cy} x2={r.x + r.w - 14 / zoom} y2={cy} stroke={C.gray} strokeWidth={2 / zoom} markerEnd="" />
                  ) : (
                    <line x1={cx} y1={r.y + 14 / zoom} x2={cx} y2={r.y + r.h - 14 / zoom} stroke={C.gray} strokeWidth={2 / zoom} />
                  )}
                  <text x={cx} y={r.y + 18 / zoom} fontSize={12 / zoom} textAnchor="middle" fill={C.gray} fontFamily="ui-monospace, monospace" fontWeight="bold">
                    {info ? `${info.tag} · ${r.slope}% · pend ${info.slopeLen.toFixed(2)} m` : ""}
                  </text>
                  {info && info.warn && (
                    <text x={cx} y={r.y + 34 / zoom} fontSize={11 / zoom} textAnchor="middle" fill={C.red} fontFamily="ui-monospace, monospace">
                      ⚠ pendiente &gt; 6 m: dividir paño
                    </text>
                  )}
                </g>
              );
            })}

            {/* muros */}
            {walls.map((w2) => {
              const L = dist(w2.a, w2.b) / ppm;
              const mx = (w2.a.x + w2.b.x) / 2, my = (w2.a.y + w2.b.y) / 2;
              return (
                <g key={w2.id}>
                  <line x1={w2.a.x} y1={w2.a.y} x2={w2.b.x} y2={w2.b.y} stroke={C.ink} strokeWidth={8 / zoom} strokeLinecap="square" />
                  {/* cota editable: tocar el número abre el campo para tipear el largo exacto */}
                  <g
                    style={{ cursor: "pointer" }}
                    onPointerDown={(e) => { e.stopPropagation(); setEditWall({ id: w2.id, value: L.toFixed(2) }); }}
                  >
                    {/* halo para legibilidad sobre el plano de fondo + área de toque */}
                    <rect x={mx - 30 / zoom} y={my - 24 / zoom} width={60 / zoom} height={18 / zoom} rx={4 / zoom}
                      fill="#FCFBF8" opacity={0.85} stroke={editWall && editWall.id === w2.id ? C.blue : "transparent"} strokeWidth={1.5 / zoom} />
                    <text x={mx} y={my - 11 / zoom} fontSize={13 / zoom} textAnchor="middle" fill={C.blue} fontFamily="ui-monospace, monospace" fontWeight="bold">
                      {L.toFixed(2)} m
                    </text>
                  </g>
                </g>
              );
            })}

            {/* cortes de panel */}
            {result.panels.map((p) => {
              const w2 = walls.find((x) => x.id === p.wallId);
              if (!w2) return null;
              const L = dist(w2.a, w2.b);
              const ux = (w2.b.x - w2.a.x) / L, uy = (w2.b.y - w2.a.y) / L;
              const px = w2.a.x + ux * p.a * ppm, py = w2.a.y + uy * p.a * ppm;
              const cx = w2.a.x + ux * ((p.a + p.b) / 2) * ppm, cy = w2.a.y + uy * ((p.a + p.b) / 2) * ppm;
              return (
                <g key={p.id}>
                  {p.a > 0.01 && <line x1={px - uy * 12 / zoom} y1={py + ux * 12 / zoom} x2={px + uy * 12 / zoom} y2={py - ux * 12 / zoom} stroke={C.blue} strokeWidth={2.5 / zoom} />}
                  <text x={cx - uy * 20 / zoom} y={cy + ux * 20 / zoom} fontSize={11 / zoom} textAnchor="middle" fill={C.gray} fontFamily="ui-monospace, monospace">{p.id}</text>
                </g>
              );
            })}

            {/* vanos */}
            {openings.map((o) => {
              const w2 = walls.find((x) => x.id === o.wallId);
              if (!w2) return null;
              const L = dist(w2.a, w2.b);
              const ux = (w2.b.x - w2.a.x) / L, uy = (w2.b.y - w2.a.y) / L;
              const x1 = w2.a.x + ux * (o.offset - o.width / 2) * ppm;
              const y1 = w2.a.y + uy * (o.offset - o.width / 2) * ppm;
              const x2 = w2.a.x + ux * (o.offset + o.width / 2) * ppm;
              const y2 = w2.a.y + uy * (o.offset + o.width / 2) * ppm;
              return (
                <line key={o.id} x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.orange} strokeWidth={10 / zoom} strokeLinecap="butt" opacity={0.9} />
              );
            })}

            {/* instalaciones */}
            {fixtures.map((f) => {
              const w2 = walls.find((x) => x.id === f.wallId);
              if (!w2) return null;
              const L = dist(w2.a, w2.b);
              const ux = (w2.b.x - w2.a.x) / L, uy = (w2.b.y - w2.a.y) / L;
              const x = w2.a.x + ux * f.offset * ppm, y = w2.a.y + uy * f.offset * ppm;
              const elec = FIXTYPES[f.type] && FIXTYPES[f.type].kind === "elec";
              return <circle key={f.id} cx={x} cy={y} r={6 / zoom} fill={elec ? C.elec : C.agua} stroke="#fff" strokeWidth={1.5 / zoom} />;
            })}

            {/* esquinas */}
            {result.joints.corners.map((c, i) => (
              <rect key={`c${i}`} x={c.x - 6 / zoom} y={c.y - 6 / zoom} width={12 / zoom} height={12 / zoom} fill="none" stroke={C.blue} strokeWidth={2 / zoom} />
            ))}

            {/* muro en curso */}
            {mode === "muro" && pending && hover && (
              <g>
                <line x1={pending.x} y1={pending.y} x2={hover.x} y2={hover.y} stroke={C.blue} strokeWidth={4 / zoom} strokeDasharray={`${8 / zoom} ${6 / zoom}`} />
                <text x={(pending.x + hover.x) / 2} y={(pending.y + hover.y) / 2 - 10 / zoom} fontSize={13 / zoom} textAnchor="middle" fill={C.blue} fontFamily="ui-monospace, monospace" fontWeight="bold">
                  {(dist(pending, hover) / ppm).toFixed(2)} m
                </text>
              </g>
            )}
            {mode === "muro" && pending && <circle cx={pending.x} cy={pending.y} r={5 / zoom} fill={C.blue} />}

            {/* techo en curso */}
            {mode === "techo" && pendingRoof && hover && (
              <rect
                x={Math.min(pendingRoof.x, hover.x)} y={Math.min(pendingRoof.y, hover.y)}
                width={Math.abs(hover.x - pendingRoof.x)} height={Math.abs(hover.y - pendingRoof.y)}
                fill="rgba(46,111,216,0.08)" stroke={C.gray} strokeWidth={2 / zoom} strokeDasharray="8 5"
              />
            )}
            {mode === "techo" && pendingRoof && <circle cx={pendingRoof.x} cy={pendingRoof.y} r={5 / zoom} fill={C.gray} />}

            {/* calibración */}
            {calPts.map((p, i) => (
              <circle key={`cal${i}`} cx={p.x} cy={p.y} r={6 / zoom} fill={C.red} />
            ))}
            {calPts.length === 2 && <line x1={calPts[0].x} y1={calPts[0].y} x2={calPts[1].x} y2={calPts[1].y} stroke={C.red} strokeWidth={2 / zoom} strokeDasharray="6 4" />}

            {/* barra de escala gráfica + flecha de norte (en coordenadas de mundo) */}
            {(() => {
              const viewM = w / ppm; // metros que abarca el viewBox
              const target = viewM / 5;
              const steps = [0.25, 0.5, 1, 2, 5, 10, 20, 50, 100];
              const nice = steps.filter((s) => s <= target).pop() || steps[0];
              const barW = nice * ppm; // largo de la barra en unidades mundo
              const x0 = vbX + 0.04 * w, y0 = vbY + 0.93 * h;
              const t = 5 / zoom; // alto de ticks
              const nx = vbX + 0.93 * w, ny = vbY + 0.14 * h, na = 0.05 * w; // norte
              return (
                <g style={{ pointerEvents: "none" }}>
                  <line x1={x0} y1={y0} x2={x0 + barW} y2={y0} stroke={C.ink} strokeWidth={2 / zoom} />
                  <line x1={x0} y1={y0 - t} x2={x0} y2={y0 + t} stroke={C.ink} strokeWidth={2 / zoom} />
                  <line x1={x0 + barW} y1={y0 - t} x2={x0 + barW} y2={y0 + t} stroke={C.ink} strokeWidth={2 / zoom} />
                  <rect x={x0} y={y0 - t} width={barW / 2} height={t} fill={C.ink} opacity={0.85} />
                  <text x={x0 + barW / 2} y={y0 + 16 / zoom} fontSize={11 / zoom} textAnchor="middle" fill={C.ink} fontFamily="'JetBrains Mono', monospace" fontWeight="bold">{nice >= 1 ? nice : nice.toFixed(2)} m</text>
                  <g>
                    <line x1={nx} y1={ny + na} x2={nx} y2={ny - na} stroke={C.ink} strokeWidth={2 / zoom} />
                    <path d={`M ${nx} ${ny - na} L ${nx - na * 0.28} ${ny - na * 0.55} L ${nx + na * 0.28} ${ny - na * 0.55} Z`} fill={C.ink} />
                    <text x={nx} y={ny + na + 13 / zoom} fontSize={12 / zoom} textAnchor="middle" fill={C.ink} fontFamily="'JetBrains Mono', monospace" fontWeight="bold">N</text>
                  </g>
                </g>
              );
            })()}
          </svg>

          {/* chip de modo activo (arriba-izquierda) */}
          {(() => {
            const MODE_INFO = {
              muro: { icon: "✏️", label: "Muro", color: C.blue },
              vano: { icon: "▢", label: "Vano", color: C.orange },
              techo: { icon: "⛰", label: "Techo", color: C.gray },
              instal: { icon: "⚡", label: "Instalación", color: C.elec },
              editar: { icon: "↖", label: "Editar", color: C.green },
              goma: { icon: "🧽", label: "Goma", color: C.red },
              mover: { icon: "✋", label: "Mover", color: C.gray },
              calibrar: { icon: "📏", label: "Calibrar", color: C.blue },
            };
            const m = MODE_INFO[mode] || { icon: "•", label: mode, color: C.gray };
            return (
              <div className="absolute flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg pop-in" style={{ left: 10, top: 10, background: "rgba(255,255,255,.92)", border: `1px solid ${C.line}`, boxShadow: "0 2px 10px rgba(16,32,43,.1)", backdropFilter: "blur(6px)" }}>
                <span style={{ fontSize: 14 }}>{m.icon}</span>
                <span className="text-xs font-bold" style={{ color: m.color }}>{m.label}</span>
              </div>
            );
          })()}

          {/* controles de vista (arriba-derecha) */}
          <div className="absolute flex flex-col gap-1.5" style={{ right: 10, top: 10 }}>
            <IconBtn icon="＋" hint="Acercar (+)" onClick={() => setZoom((z) => Math.min(4, z * 1.25))} />
            <IconBtn icon="－" hint="Alejar (−)" onClick={() => setZoom((z) => Math.max(0.4, z / 1.25))} />
            <IconBtn icon="⌖" hint="Centrar y resetear (0)" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} />
          </div>

          {/* indicador de zoom */}
          <div className="absolute px-2 py-1 rounded-md text-[11px] font-mono" style={{ right: 10, bottom: 10, background: "rgba(255,255,255,.9)", color: C.gray, border: `1px solid ${C.line}` }}>{Math.round(zoom * 100)}%</div>

          {/* cotas de la envolvente + superficie en vivo */}
          {walls.length > 0 && (() => {
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (const w2 of walls) for (const p of [w2.a, w2.b]) {
              minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
              minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
            }
            const anchoM = (maxX - minX) / ppm, altoM = (maxY - minY) / ppm;
            if (!(anchoM > 0.05 && altoM > 0.05)) return null;
            return (
              <div className="absolute flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-mono" style={{ left: 10, bottom: 10, background: "rgba(255,255,255,.92)", color: C.ink, border: `1px solid ${C.line}`, boxShadow: "0 2px 10px rgba(16,32,43,.1)" }}>
                <span style={{ color: C.gray }}>▭</span>
                <span className="font-bold">{anchoM.toFixed(2)} × {altoM.toFixed(2)} m</span>
                <span style={{ color: C.gray }}>·</span>
                <span title="superficie de la envolvente (bounding box)">{(anchoM * altoM).toFixed(1)} m²</span>
                <span style={{ color: C.gray }}>·</span>
                <span title="perímetro de muros">{totalMuros.toFixed(1)} ml</span>
              </div>
            );
          })()}

          {/* estado vacío */}
          {walls.length === 0 && roofs.length === 0 && !bg && (
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <div className="text-center px-6 py-5 rounded-2xl pointer-events-auto" style={{ background: "rgba(255,255,255,.86)", border: `1px dashed ${"#C9CFD8"}`, backdropFilter: "blur(4px)" }}>
                <div className="text-3xl mb-1">📐</div>
                <div className="font-bold" style={{ color: C.ink }}>Empezá a trazar tu planta</div>
                <div className="text-xs mb-3" style={{ color: C.gray }}>Elegí <b>Muro</b> y tocá dos puntos, o cargá un ejemplo.</div>
                <Btn variant="success" onClick={loadExample}>✨ Cargar ejemplo</Btn>
              </div>
            </div>
          )}

          {/* cota editable en el canvas: campo flotante sobre el muro elegido */}
          {editWall && (() => {
            const w2 = walls.find((x) => x.id === editWall.id);
            if (!w2) return null;
            const mx = (w2.a.x + w2.b.x) / 2, my = (w2.a.y + w2.b.y) / 2;
            const pos = worldToPct(mx, my);
            const apply = () => {
              const m = parseFloat(String(editWall.value).replace(",", "."));
              if (m > 0.05) setWallLength(editWall.id, m);
              setEditWall(null);
            };
            return (
              <div
                className="absolute flex items-center gap-1 rounded-xl px-1.5 py-1.5 pop-in"
                style={{ left: `${pos.left}%`, top: `${pos.top}%`, transform: "translate(-50%, -130%)", background: "#fff", border: `1.5px solid ${C.blue}`, boxShadow: "0 8px 24px rgba(16,32,43,.18)", zIndex: 20 }}
              >
                <input
                  autoFocus
                  type="number" step="0.05" inputMode="decimal"
                  value={editWall.value}
                  onChange={(e) => setEditWall({ ...editWall, value: e.target.value })}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => { if (e.key === "Enter") apply(); if (e.key === "Escape") setEditWall(null); }}
                  className="w-16 px-2 py-1 text-sm rounded-lg font-mono"
                />
                <span className="text-xs" style={{ color: C.gray }}>m</span>
                <button onClick={apply} className="grid place-items-center rounded-lg text-sm font-bold" style={{ width: 28, height: 28, background: C.blue, color: "#fff" }}>✓</button>
                <button onClick={() => setEditWall(null)} className="grid place-items-center rounded-lg text-sm" style={{ width: 28, height: 28, color: C.gray, border: `1px solid ${C.line}` }}>✕</button>
              </div>
            );
          })()}
          </div>

          {/* resumen rápido */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <Stat value={totalMuros.toFixed(1) + " ml"} label="Muros" accent={C.ink} />
            <Stat value={String(result.panels.length)} label="Paneles muro" accent={C.blue} />
            <Stat value={String(result.roofInfo.reduce((s, r) => s + r.n, 0))} label="Paneles techo" accent={C.gray} />
            <Stat value={String(result.osbWallSheets + result.osbRoofSheets)} label="Placas OSB" accent={C.osb} />
          </div>

          {/* muros editables */}
          {walls.length > 0 && (
            <details className="group">
              <summary className="flex items-center gap-2 cursor-pointer py-1.5 select-none">
                <span className="text-xs transition-transform group-open:rotate-90" style={{ color: C.gray }}>▶</span>
                <SectionTitle count={walls.length}>Muros — editar largos</SectionTitle>
              </summary>
              <div className="flex flex-col gap-1.5 mt-1">
                {walls.map((w2) => {
                  const L = dist(w2.a, w2.b) / ppm;
                  return (
                    <Card key={`${w2.id}-${L.toFixed(2)}`} className="px-3 py-2 flex items-center gap-2.5 text-xs">
                      <Chip color={C.ink}>Muro #{w2.id}</Chip>
                      <NumInput step="0.05" defaultValue={L.toFixed(2)} className="w-24"
                        onBlur={(e) => { const m = parseFloat(e.target.value); if (m > 0.05 && Math.abs(m - L) > 0.005) setWallLength(w2.id, m); }} />
                      <span style={{ color: C.gray }}>m · mueve el extremo final</span>
                      <Btn variant="danger" size="sm" className="ml-auto"
                        onClick={() => { setWalls((ws) => ws.filter((x) => x.id !== w2.id)); setOpenings((os) => os.filter((x) => x.wallId !== w2.id)); setFixtures((fs) => fs.filter((x) => x.wallId !== w2.id)); }}>Borrar</Btn>
                    </Card>
                  );
                })}
              </div>
            </details>
          )}

          {/* techos editables */}
          {roofs.length > 0 && (
            <div>
              <SectionTitle count={roofs.length}>Paños de techo</SectionTitle>
              <div className="flex flex-col gap-2">
                {roofs.map((r, idx) => {
                  const info = result.roofInfo.find((x) => x.id === r.id);
                  return (
                    <Card key={r.id} className="p-2.5 flex flex-wrap items-end gap-3 text-xs">
                      <Chip color={C.gray}>T{idx + 1}</Chip>
                      <Field label="Pendiente (%)">
                        <NumInput step="1" value={r.slope} className="w-20"
                          onChange={(e) => updateRoof(r.id, { slope: parseFloat(e.target.value) || 0 })} />
                      </Field>
                      <Field label="Sentido pendiente">
                        <select value={r.dir} className="px-2 py-1.5 rounded-lg" onChange={(e) => updateRoof(r.id, { dir: e.target.value })}>
                          <option value="x">↔ horizontal</option>
                          <option value="y">↕ vertical</option>
                        </select>
                      </Field>
                      {info && (
                        <span className="font-mono pb-1.5" style={{ color: info.warn ? C.red : C.gray }}>
                          pend {info.slopeLen.toFixed(2)} m · {info.n} paneles de {info.pw.toFixed(2)} m · {info.nCh} chapas
                        </span>
                      )}
                      <Btn variant="danger" size="sm" className="ml-auto" onClick={() => setRoofs((rs) => rs.filter((x) => x.id !== r.id))}>Borrar</Btn>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* instalaciones editables */}
          {fixtures.length > 0 && (
            <div>
              <SectionTitle count={fixtures.length}>Instalaciones</SectionTitle>
              <div className="flex flex-col gap-2">
                {fixtures.map((f) => {
                  const elec = FIXTYPES[f.type] && FIXTYPES[f.type].kind === "elec";
                  return (
                    <Card key={f.id} className="p-2.5 flex flex-wrap items-end gap-3 text-xs">
                      <span className="mb-2" style={{ width: 12, height: 12, borderRadius: 6, background: elec ? C.elec : C.agua }} />
                      <Field label="Tipo">
                        <select value={f.type} className="px-2 py-1.5 rounded-lg"
                          onChange={(e) => updateFixture(f.id, { type: e.target.value, height: FIXTYPES[e.target.value].height })}>
                          {Object.entries(FIXTYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </Field>
                      <Field label="Altura (m)">
                        <NumInput step="0.05" value={f.height} className="w-20"
                          onChange={(e) => updateFixture(f.id, { height: parseFloat(e.target.value) || 0 })} />
                      </Field>
                      <Field label="Desde inicio (m)">
                        <NumInput step="0.05" value={f.offset} className="w-20"
                          onChange={(e) => updateFixture(f.id, { offset: parseFloat(e.target.value) || 0 })} />
                      </Field>
                      <Btn variant="danger" size="sm" className="ml-auto" onClick={() => setFixtures((fs) => fs.filter((x) => x.id !== f.id))}>Borrar</Btn>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* vanos editables */}
          {openings.length > 0 && (
            <div>
              <SectionTitle count={openings.length}>Vanos</SectionTitle>
              <div className="flex flex-col gap-2">
                {openings.map((o) => (
                  <Card key={o.id} className="p-2.5 flex flex-wrap items-end gap-3 text-xs">
                    <Field label="Tipo">
                      <select value={o.type} className="px-2 py-1.5 rounded-lg"
                        onChange={(e) => updateOpening(o.id, { type: e.target.value, sill: e.target.value === "puerta" ? 0 : o.sill || 1.0, height: e.target.value === "puerta" ? 2.05 : o.height })}>
                        <option value="ventana">Ventana</option>
                        <option value="puerta">Puerta</option>
                      </select>
                    </Field>
                    {[
                      ["Ancho", "width"],
                      ["Alto", "height"],
                      ...(o.type === "ventana" ? [["Antepecho", "sill"]] : []),
                      ["Desde inicio", "offset"],
                    ].map(([lbl, key]) => (
                      <Field key={key} label={`${lbl} (m)`}>
                        <NumInput step="0.05" value={o[key]} className="w-20"
                          onChange={(e) => updateOpening(o.id, { [key]: parseFloat(e.target.value) || 0 })} />
                      </Field>
                    ))}
                    <Btn variant="danger" size="sm" className="ml-auto" onClick={() => setOpenings((os) => os.filter((x) => x.id !== o.id))}>Borrar</Btn>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB PANELES ================= */}
      {tab === "paneles" && (
        <div className="p-3 md:p-4 flex flex-col gap-3 fade-in w-full mx-auto" style={{ maxWidth: 1400 }}>
          {result.panels.length === 0 && result.roofInfo.length === 0 && (
            <EmptyState icon="🧱" title="Todavía no hay paneles" hint='Trazá muros y techos en la pestaña Plano (o cargá un ejemplo) y acá aparecen las fichas de fábrica.'
              action={<Btn variant="success" onClick={() => { loadExample(); setTab("plano"); }}>✨ Cargar ejemplo</Btn>} />
          )}

          {result.panels.map((p) => {
            const sc = 46;
            const H = RULES.panelHeight;
            const pw = p.len * sc, ph = H * sc;
            const extra = vincha ? (RULES.vigaTuboH + RULES.vinchaHeight) * sc : 0;
            const totalH = vincha ? H + RULES.vigaTuboH + RULES.vinchaHeight : H;
            const osbRows = showOsb ? osbLayoutForPanel(p, vincha, RULES) : [];
            const lapW = showOsb && !p.last ? RULES.osbLap * sc : 0;
            return (
              <Card key={p.id} className="p-3.5 fade-in">
                <div className="flex items-center justify-between mb-2.5">
                  <Chip color={C.blue} soft={false} className="text-xs px-2.5 py-1">{p.id}</Chip>
                  <div className="text-xs font-mono" style={{ color: C.gray }}>
                    {p.len.toFixed(2)} × {totalH.toFixed(2)} m{vincha ? " · 3,00 + VT + MC 0,50" : ""} · muro #{p.wallId}
                  </div>
                </div>
                {p.warnings.map((wn, i) => (
                  <div key={i} className="text-xs mb-1.5 px-2 py-1 rounded-md inline-flex items-center gap-1" style={{ color: C.red, background: `${C.red}12` }}>⚠ {wn}</div>
                ))}
                <div className="overflow-x-auto">
                  <svg viewBox={`-6 ${-(extra + 18)} ${pw + lapW + 14} ${ph + extra + 38}`} style={{ width: Math.min(pw + lapW + 14, 700), maxWidth: "100%" }}>
                    <rect x={0} y={0} width={pw} height={ph} fill="#FAFAF7" stroke={C.ink} strokeWidth={3} />
                    {/* viga tubo + murito de carga, dentro del mismo panel */}
                    {vincha && (
                      <g>
                        <rect x={0} y={-RULES.vigaTuboH * sc} width={pw} height={RULES.vigaTuboH * sc} fill={C.blueSoft} stroke={C.blue} strokeWidth={2} />
                        <rect x={0} y={-(RULES.vigaTuboH + RULES.vinchaHeight) * sc} width={pw} height={RULES.vinchaHeight * sc} fill="#FAFAF7" stroke={C.ink} strokeWidth={2} />
                        {(() => {
                          // murito: modulación PROPIA cada 40 desde su borde, continua sobre los vanos
                          const xs = [];
                          for (let gx = 0; gx < p.len - 0.05; gx += RULES.studSpacing) xs.push(gx);
                          xs.push(p.len);
                          return xs.map((lx, i) => (
                            <line key={`mc${i}`} x1={lx * sc} y1={-(RULES.vigaTuboH + RULES.vinchaHeight) * sc + 2} x2={lx * sc} y2={-RULES.vigaTuboH * sc - 2} stroke={C.ink} strokeWidth={1.4} />
                          ));
                        })()}
                        <text x={pw + 3} y={-RULES.vigaTuboH * sc + 8} fontSize={8} fill={C.blue} fontFamily="ui-monospace, monospace">VT</text>
                        <text x={pw + 3} y={-(RULES.vigaTuboH + RULES.vinchaHeight) * sc + 10} fontSize={8} fill={C.gray} fontFamily="ui-monospace, monospace">MC</text>
                      </g>
                    )}
                    {/* montantes */}
                    {p.studs.map((s, i) => (
                      <line key={i} x1={s.x * sc} y1={2} x2={s.x * sc} y2={ph - 2} stroke={s.qty > 1 ? C.blue : C.ink} strokeWidth={s.qty > 1 ? 4 : 1.6} />
                    ))}
                    {/* vanos */}
                    {p.ops.map((o, i) => {
                      const oy = ph - (o.sill + o.height) * sc;
                      return (
                        <g key={i}>
                          <rect x={o.lx1 * sc} y={oy} width={(o.lx2 - o.lx1) * sc} height={o.height * sc} fill="#fff" stroke={C.orange} strokeWidth={2.5} />
                          <rect x={Math.max(0, o.lx1 * sc - 4)} y={oy - RULES.headerDepth * sc} width={(o.lx2 - o.lx1) * sc + 8} height={RULES.headerDepth * sc} fill={C.blueSoft} stroke={C.blue} strokeWidth={1.5} />
                        </g>
                      );
                    })}
                    {/* cripples: los verticales siguen sobre el dintel y bajo el antepecho */}
                    {(() => {
                      const g0 = Math.ceil((p.a + 0.001) / RULES.studSpacing) * RULES.studSpacing;
                      const out = [];
                      for (const o of p.ops) {
                        for (let gx = g0; gx < p.b - 0.05; gx += RULES.studSpacing) {
                          const lx = gx - p.a;
                          if (lx > o.lx1 + 0.03 && lx < o.lx2 - 0.03) {
                            const yDintel = ph - (o.headBot + RULES.headerDepth) * sc;
                            if (yDintel > 4) out.push(<line key={`ct${o.id}-${gx.toFixed(2)}`} x1={lx * sc} y1={2} x2={lx * sc} y2={yDintel} stroke={C.ink} strokeWidth={1.4} />);
                            if (o.sill > 0.1) out.push(<line key={`cb${o.id}-${gx.toFixed(2)}`} x1={lx * sc} y1={ph - (o.sill - 0.05) * sc} x2={lx * sc} y2={ph - 2} stroke={C.ink} strokeWidth={1.4} />);
                          }
                        }
                      }
                      return out;
                    })()}
                    {/* placas OSB trabadas + corte en martillo en vanos */}
                    {showOsb && (
                      <g>
                        {osbRows.map((row, ri) => {
                          const yTop = ph - row.y2 * sc, yBot = ph - row.y1 * sc;
                          return row.joints.map((x, i) => {
                            let segs = [[yTop, yBot]];
                            for (const o of p.ops) {
                              if (x > o.lx1 + 0.02 && x < o.lx2 - 0.02) {
                                const oT = ph - (o.sill + o.height) * sc, oB = ph - o.sill * sc;
                                const next = [];
                                for (const [s1, s2] of segs) {
                                  if (oT > s1 + 1) next.push([s1, Math.min(s2, oT)]);
                                  if (oB < s2 - 1) next.push([Math.max(s1, oB), s2]);
                                }
                                segs = next;
                              }
                            }
                            return segs.map(([s1, s2], k) => (
                              <line key={`o${ri}-${i}-${k}`} x1={x * sc} y1={s1} x2={x * sc} y2={s2} stroke={C.osb} strokeWidth={1.8} strokeDasharray="7 5" />
                            ));
                          });
                        })}
                        {osbRows.length > 1 && (
                          <line x1={0} y1={ph - RULES.osbH * sc} x2={pw} y2={ph - RULES.osbH * sc} stroke={C.osb} strokeWidth={1.8} strokeDasharray="7 5" />
                        )}
                        {/* marcas de martillo en esquinas de vanos */}
                        {p.ops.map((o, i) => {
                          const m = 0.18 * sc;
                          const yT = ph - (o.sill + o.height) * sc, yB = ph - o.sill * sc;
                          const corners = [
                            [o.lx1 * sc, yT, 1, 1],
                            [o.lx2 * sc, yT, -1, 1],
                          ];
                          if (o.sill > 0.05) {
                            corners.push([o.lx1 * sc, yB, 1, -1], [o.lx2 * sc, yB, -1, -1]);
                          }
                          return corners.map(([cx2, cy2, sx, sy], k) => (
                            <path key={`h${i}-${k}`} d={`M ${cx2 - sx * m} ${cy2} L ${cx2} ${cy2} L ${cx2} ${cy2 - sy * m}`} fill="none" stroke={C.osb} strokeWidth={2.4} />
                          ));
                        })}
                      </g>
                    )}
                    {/* solape de OSB con el panel vecino */}
                    {showOsb && !p.last && (
                      <g>
                        <rect x={pw} y={-extra} width={lapW} height={ph + extra} fill="rgba(184,134,11,0.16)" stroke={C.osb} strokeWidth={1.5} strokeDasharray="4 3" />
                        <text x={pw + lapW / 2} y={ph + 14} fontSize={9.5} textAnchor="middle" fill={C.osb} fontFamily="ui-monospace, monospace">solape 0,30 →</text>
                      </g>
                    )}
                    {showOsb && !p.first && (
                      <g>
                        <line x1={RULES.osbLap * sc} y1={-extra} x2={RULES.osbLap * sc} y2={ph} stroke={C.osb} strokeWidth={1.2} strokeDasharray="2 4" />
                        <text x={2} y={-(extra + 6)} fontSize={9.5} textAnchor="start" fill={C.osb} fontFamily="ui-monospace, monospace">← recibe solape (fijar en obra)</text>
                      </g>
                    )}
                    {/* instalaciones: símbolo + cañería (eléctrica sube, agua/desagüe baja) */}
                    {p.fixtures && p.fixtures.map((f, i) => {
                      const fx = f.lx * sc, fy = ph - f.height * sc;
                      const elec = FIXTYPES[f.type] && FIXTYPES[f.type].kind === "elec";
                      const col = elec ? C.elec : C.agua;
                      return (
                        <g key={`fx${i}`}>
                          <line x1={fx} y1={fy} x2={fx} y2={elec ? 3 : ph - 3} stroke={col} strokeWidth={1.5} strokeDasharray="3 3" />
                          {f.type === "llave" ? (
                            <circle cx={fx} cy={fy} r={5} fill="#fff" stroke={col} strokeWidth={2.2} />
                          ) : (
                            <rect x={fx - 5} y={fy - 5} width={10} height={10} fill="#fff" stroke={col} strokeWidth={2.2} />
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
                <div className="mt-2 text-xs flex flex-wrap gap-3" style={{ fontFamily: "ui-monospace, monospace", color: C.gray }}>
                  <span>
                    {(() => {
                      const pgc = p.pieces.filter((x) => x.perfil === PGC).reduce((s, x) => s + x.cant, 0);
                      const pgu = p.pieces.filter((x) => x.perfil === PGU).reduce((s, x) => s + x.cant, 0);
                      return `${pgc} pzas PGC · ${pgu} pzas PGU`;
                    })()}
                  </span>
                  {showOsb && <span style={{ color: C.osb }}>— — OSB trabado · ∟ martillo en vanos · ▨ solape 0,30 m sobre panel vecino</span>}
                </div>
              </Card>
            );
          })}

          {/* paneles de techo */}
          {result.roofInfo.map((r) => {
            const sc = 40;
            const pw = Math.min(r.slopeLen, 8) * sc, ph = r.pw * sc;
            const nCab = r.cabios;
            return (
              <Card key={r.tag} className="p-3.5 fade-in">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <Chip color={C.gray} soft={false} className="text-xs px-2.5 py-1">{r.tag}</Chip>
                    <span className="text-sm font-bold" style={{ color: C.ink }}>Techo inclinado {r.slope}%</span>
                  </div>
                  <div className="text-xs font-mono" style={{ color: C.gray }}>
                    {r.n} paneles de {r.slopeLen.toFixed(2)} × {r.pw.toFixed(2)} m
                  </div>
                </div>
                {r.warn && <div className="text-xs mb-1.5 px-2 py-1 rounded-md inline-flex items-center gap-1" style={{ color: C.red, background: `${C.red}12` }}>⚠ Pendiente {r.slopeLen.toFixed(2)} m &gt; 6 m — dividir el paño</div>}
                <div className="overflow-x-auto">
                  <svg viewBox={`-6 -6 ${pw + 12} ${ph + 12}`} style={{ width: Math.min(pw + 12, 700), maxWidth: "100%" }}>
                    <rect x={0} y={0} width={pw} height={ph} fill="#FAFAF7" stroke={C.ink} strokeWidth={3} />
                    {Array.from({ length: nCab }).map((_, i) => {
                      const y = nCab > 1 ? (i * ph) / (nCab - 1) : ph / 2;
                      return <line key={i} x1={2} y1={y} x2={pw - 2} y2={y} stroke={C.ink} strokeWidth={1.6} />;
                    })}
                    {showOsb && Array.from({ length: Math.ceil(r.slopeLen / RULES.osbH) - 1 }).map((_, i) => (
                      <line key={`o${i}`} x1={((i + 1) * RULES.osbH / r.slopeLen) * pw} y1={0} x2={((i + 1) * RULES.osbH / r.slopeLen) * pw} y2={ph} stroke={C.osb} strokeWidth={1.8} strokeDasharray="7 5" />
                    ))}
                  </svg>
                </div>
                <div className="mt-2 text-xs font-mono" style={{ color: C.gray }}>
                  {nCab} cabios PGC de {(r.slopeLen - RULES.studDeduct).toFixed(2)} m por panel · {r.nCh} chapas de {(r.slopeLen + 0.1).toFixed(2)} m
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ================= TAB 3D ================= */}
      {tab === "v3d" && (
        <div className="p-3 md:p-4 flex flex-col gap-3 fade-in w-full mx-auto" style={{ maxWidth: 1400 }}>
          <Card className="p-2.5 flex flex-wrap gap-2 items-center">
            <div className="inline-flex rounded-lg p-0.5" style={{ background: C.paper, border: `1px solid ${C.line}` }}>
              {[["esquema", "◻ Esquemático"], ["realista", "◼ Realista"]].map(([k, label]) => (
                <button key={k} onClick={() => setView3d(k)} className="px-3 py-1.5 rounded-md text-sm font-semibold"
                  style={{ background: view3d === k ? "#fff" : "transparent", color: view3d === k ? C.ink : C.gray, boxShadow: view3d === k ? "0 1px 3px rgba(16,32,43,.12)" : "none" }}>{label}</button>
              ))}
            </div>
            <div className="w-px h-6 mx-1" style={{ background: C.line }} />
            {[["OSB", osb3d, setOsb3d], ["Lana", lana3d, setLana3d], ["Techo", roof3d, setRoof3d]].map(([label, val, set]) => (
              <label key={label} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer text-xs font-medium"
                style={{ background: val ? C.blueSoft : C.paper, color: val ? C.blueDark : C.gray, border: `1px solid ${val ? "transparent" : C.line}` }}>
                <input type="checkbox" checked={val} onChange={(e) => set(e.target.checked)} /> {label}
              </label>
            ))}
          </Card>
          {walls.length === 0 && (
            <EmptyState icon="🧊" title="Sin modelo para mostrar" hint='Trazá muros en la pestaña Plano (o cargá un ejemplo) para ver el modelo 3D.'
              action={<Btn variant="success" onClick={() => { loadExample(); setTab("plano"); }}>✨ Cargar ejemplo</Btn>} />
          )}
          <div ref={mount3d} className="w-full rounded-xl overflow-hidden" style={{ border: `1px solid ${C.line}`, boxShadow: "0 1px 2px rgba(16,32,43,.04), 0 6px 22px rgba(16,32,43,.08)", minHeight: 340, background: view3d === "realista" ? "#bfd6ea" : "#FCFBF8" }} />
          <div className="text-xs px-3 py-2.5 rounded-xl" style={{ color: C.gray, background: "#fff", border: `1px solid ${C.line}` }}>
            <b style={{ color: C.ink }}>Cómo navegar:</b> arrastrá para orbitar · rueda/pellizco para acercar. <b style={{ color: C.ink }}>Esquemático</b>: estructura con cajas de esquina y dinteles en azul, OSB translúcido, instalaciones en rojo (eléctrica) y celeste (agua). <b style={{ color: C.ink }}>Realista</b>: acero galvanizado, OSB con textura, chapa, lana amarilla y sombras.
          </div>
        </div>
      )}

      {/* ================= TAB CORTE ================= */}
      {tab === "corte" && (
        <div className="p-3 md:p-4 flex flex-col gap-4 fade-in w-full mx-auto" style={{ maxWidth: 1400 }}>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
            {[
              [PGC, mlPGC, result.packing[PGC].bars, mlPGC * RULES.kgPGC, result.packing[PGC].scrap],
              [PGU, mlPGU, result.packing[PGU].bars, mlPGU * RULES.kgPGU, result.packing[PGU].scrap],
            ].map(([perfil, ml, bars, kg, scrap]) => (
              <Card key={perfil} className="p-3.5" style={{ borderTop: `3px solid ${C.blue}` }}>
                <div className="text-xs font-bold uppercase tracking-wide" style={{ color: C.gray }}>{perfil}</div>
                <div className="text-2xl font-extrabold font-mono mt-0.5" style={{ color: C.ink }}>{ml.toFixed(1)} <span className="text-sm font-bold" style={{ color: C.gray }}>ml</span></div>
                <div className="text-xs font-mono mt-1" style={{ color: C.ink }}>{bars} barras 6 m · {kg.toFixed(0)} kg</div>
                <Chip color={scrap > 12 ? C.red : C.green} className="mt-1.5">scrap {scrap.toFixed(1)}%</Chip>
              </Card>
            ))}
            <Card className="p-3.5" style={{ borderTop: `3px solid ${C.osb}` }}>
              <div className="text-xs font-bold uppercase tracking-wide" style={{ color: C.osb }}>Placas OSB 1,22 × 2,44</div>
              <div className="text-2xl font-extrabold font-mono mt-0.5" style={{ color: C.ink }}>{result.osbPlan.sheets.length + result.osbRoofSheets} <span className="text-sm font-bold" style={{ color: C.gray }}>un</span></div>
              <div className="text-xs font-mono mt-1" style={{ color: C.ink }}>Muros: {result.osbPlan.sheets.length} · Techo: {result.osbRoofSheets}</div>
              <Chip color={C.green} className="mt-1.5">aprov. {result.osbPlan.util.toFixed(0)}%</Chip>
            </Card>
            <Card className="p-3.5" style={{ borderTop: `3px solid ${C.gray}` }}>
              <div className="text-xs font-bold uppercase tracking-wide" style={{ color: C.gray }}>Chapa de techo</div>
              <div className="text-2xl font-extrabold font-mono mt-0.5" style={{ color: C.ink }}>{totalChapas} <span className="text-sm font-bold" style={{ color: C.gray }}>un</span></div>
              {result.chapas.map((ch, i) => (
                <div key={i} className="text-xs font-mono" style={{ color: C.ink }}>{ch.cant} × {ch.largo.toFixed(2)} m (a medida)</div>
              ))}
              {totalChapas === 0 && <div className="text-xs mt-1" style={{ color: C.gray }}>Sin paños de techo</div>}
            </Card>
            <Card className="p-3.5" style={{ borderTop: `3px solid ${C.lana}` }}>
              <div className="text-xs font-bold uppercase tracking-wide" style={{ color: C.lana }}>Lana de vidrio 100 mm</div>
              <div className="text-2xl font-extrabold font-mono mt-0.5" style={{ color: C.ink }}>{result.lanaRolls} <span className="text-sm font-bold" style={{ color: C.gray }}>rollos</span></div>
              <div className="text-xs font-mono mt-1" style={{ color: C.ink }}>Muros: {result.lanaWallM2.toFixed(0)} m² · Techo: {result.lanaRoofM2.toFixed(0)} m²</div>
              <div className="text-[11px] mt-0.5" style={{ color: C.gray }}>Rollo 1,20 × 18,00 m · +5% desperdicio</div>
            </Card>
            <Card className="p-3.5" style={{ borderTop: `3px solid ${C.elec}` }}>
              <div className="text-xs font-bold uppercase tracking-wide" style={{ color: C.elec }}>Instalaciones (previsión)</div>
              <div className="text-xs font-mono mt-1.5 flex flex-col gap-0.5" style={{ color: C.ink }}>
                <span>⚡ {result.instal.cajas} cajas · ~{Math.ceil(result.instal.corrugadoML)} ml corrugado</span>
                <span>💧 {result.instal.aguaPts} ptos agua · ~{result.instal.pexML} ml PEX</span>
                <span>🕳 {result.instal.desagues} desagües · ~{result.instal.pvcML} ml PVC</span>
              </div>
              <div className="text-[11px] mt-1" style={{ color: C.gray }}>Estimado — verificar con plano de instalaciones</div>
            </Card>
          </div>

          {vincha && walls.length > 0 && (
            <div className="rounded-xl p-3 text-sm flex items-start gap-2" style={{ background: C.blueSoft }}>
              <span className="text-base leading-none mt-0.5">🏗️</span>
              <div style={{ color: C.chrome }}>
                <span className="font-bold" style={{ color: C.blueDark }}>{TUBO}:</span>{" "}
                <span className="font-mono font-bold">{result.tuboML.toFixed(1)} ml</span>
                {" "}— armada como cajón (2 PGU + 2 PGC por tramo) y murito de carga de 0,50 m, ambos incluidos en el despiece.
              </div>
            </div>
          )}

          <div>
            <SectionTitle count={result.cutList.length} right={<Btn variant="primary" size="sm" onClick={exportCSV}>⬇ Exportar CSV</Btn>}>Lista de corte</SectionTitle>
            <Card className="overflow-hidden" style={{ padding: 0 }}>
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr style={{ background: C.chrome, color: "#fff" }}>
                    <th className="text-left px-3 py-2.5 font-semibold">Perfil</th>
                    <th className="text-right px-3 py-2.5 font-semibold">Largo</th>
                    <th className="text-right px-3 py-2.5 font-semibold">Cant.</th>
                    <th className="text-left px-3 py-2.5 font-semibold">Uso</th>
                  </tr>
                </thead>
                <tbody>
                  {result.cutList.map((r, i) => (
                    <tr key={i} style={{ background: i % 2 ? "#fff" : "#F7F8FA" }}>
                      <td className="px-3 py-1.5">{r.perfil}</td>
                      <td className="px-3 py-1.5 text-right font-bold" style={{ color: C.blue }}>{r.largo.toFixed(2)} m</td>
                      <td className="px-3 py-1.5 text-right font-bold">{r.cant}</td>
                      <td className="px-3 py-1.5" style={{ color: C.gray }}>{[...r.usos].join(" / ")}</td>
                    </tr>
                  ))}
                  {result.cutList.length === 0 && (
                    <tr><td colSpan={4} className="px-3 py-4 text-center" style={{ color: C.gray }}>Sin piezas todavía — trazá muros en el Plano.</td></tr>
                  )}
                </tbody>
              </table>
            </Card>
            <div className="text-xs mt-2" style={{ color: C.gray }}>
              Optimización por First-Fit Decreasing en barras de 6,00 m. Pesos estimados: PGC {RULES.kgPGC} kg/ml · PGU {RULES.kgPGU} kg/ml. OSB por superficie neta (descontando vanos) + 10% desperdicio. Verificar despiece de dinteles, nudos y solapes de chapa con la documentación de obra antes de cortar.
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB FABRICACIÓN ================= */}
      {tab === "fabricar" && (
        <div className="p-3 md:p-4 flex flex-col gap-4 fade-in w-full mx-auto" style={{ maxWidth: 1400 }}>
          {result.panels.length === 0 && result.roofInfo.length === 0 ? (
            <EmptyState icon="🏭" title="Todavía no hay fichas" hint='Trazá muros y techos en la pestaña Plano para generar las fichas de fábrica y la secuencia de montaje.'
              action={<Btn variant="success" onClick={() => { loadExample(); setTab("plano"); }}>✨ Cargar ejemplo</Btn>} />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold" style={{ color: C.ink }}>Fichas de fábrica + montaje en obra</h2>
                <Btn variant="primary" onClick={() => window.print()}>🖨 Imprimir</Btn>
              </div>

              {/* secuencia de montaje */}
              <Card className="p-3.5" style={{ borderLeft: `3px solid ${C.chrome}` }}>
                <SectionTitle>🪜 Secuencia de montaje en obra</SectionTitle>
                <ol className="text-sm flex flex-col gap-1.5" style={{ listStyle: "decimal", paddingLeft: "1.2rem", color: C.ink }}>
                  <li>Replanteo sobre platea: marcar ejes de muros, verificar escuadras y niveles.</li>
                  <li>Montar paneles en orden {result.panels.length > 0 ? `${result.panels[0].id} → ${result.panels[result.panels.length - 1].id}` : ""}, comenzando por una esquina. Aplomar y apuntalar cada panel antes de fijar el siguiente.</li>
                  <li>Vincular esquinas (montante en caja) y encuentros en T según marcas azules del plano.</li>
                  <li>Montar tabiques interiores y verificar plomo, nivel y escuadra general.</li>
                  {vincha && <li>Armar la <b>viga tubo</b> sobre la solera superior: solera PGU con alas hacia arriba, dos PGC adentro y solera PGU cerrando con alas hacia abajo, atornillada como cajón continuo. Encima montar el <b>murito de carga de 0,50 m</b> (solera + montantes + solera) que recibe los cabios.</li>}
                  <li>Fijar placas OSB según fichas: <b>trabadas</b> (fila superior corrida media placa, juntas nunca alineadas) y <b>corte en martillo</b> en todos los vanos — ninguna junta sobre la esquina de un vano.</li>
                  <li><b>Solape entre paneles:</b> el OSB de cada panel vuela 0,30 m sobre el panel siguiente — ese vuelo sale de fábrica sin atornillar y se fija en obra con ambos paneles ya aplomados, cosiendo la junta. En esquinas, la placa del muro continuo cubre el canto y el montante en caja del muro que remata.</li>
                  {fixtures.length > 0 && <li><b>Instalaciones:</b> los pases vienen perforados de fábrica con pasacables protegidos y las cajas fijadas según fichas. La eléctrica sube por la cavidad hasta la vincha; agua y desagües bajan a platea. En obra solo se cablea, cañea y conexiona — nunca perforar perfiles en obra sin protección.</li>}
                  <li><b>Lana de vidrio 100 mm:</b> colocar en la cavidad entre montantes después del conexionado de instalaciones y antes de cerrar la cara interior, sin comprimir y sin dejar huecos en esquinas y dinteles.</li>
                  {result.roofInfo.length > 0 && <li>Montar paneles de techo ({result.roofInfo.map((r) => r.tag).join(", ")}) con apuntalamiento, colocar OSB de techo trabado entre paneles y fijar chapa respetando solapes según pendiente.</li>}
                  <li>Control final: plomos, anclajes a platea y rigidización completa antes de retirar puntales.</li>
                </ol>
              </Card>

              {/* planilla de corte OSB optimizada */}
              {result.osbPlan.sheets.length > 0 && (
                <Card className="p-3.5" style={{ borderLeft: `3px solid ${C.osb}` }}>
                  <div className="flex items-baseline justify-between mb-2 flex-wrap gap-1">
                    <div className="font-bold text-sm" style={{ color: C.osb }}>🪵 Planilla de corte OSB — muros</div>
                    <div className="text-xs font-mono" style={{ color: C.ink }}>
                      {result.osbPlan.sheets.length} placas 1,22×2,44 · {result.osbPlan.totalPieces} piezas · aprov. {result.osbPlan.util.toFixed(0)}%
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.osbPlan.sheets.map((sh, i) => {
                      const sc3 = 38;
                      const sw = RULES.osbW * sc3, shh = RULES.osbH * sc3;
                      return (
                        <div key={i} className="flex flex-col items-center">
                          <svg viewBox={`-1 -1 ${sw + 2} ${shh + 2}`} style={{ width: sw + 2 }}>
                            <rect x={0} y={0} width={sw} height={shh} fill="#FAF3E0" stroke={C.osb} strokeWidth={1.5} />
                            {sh.pieces.map((pc, k) => (
                              <g key={k}>
                                <rect x={pc.x * sc3} y={pc.y * sc3} width={pc.w * sc3} height={pc.h * sc3} fill="#F0DCAE" stroke={C.ink} strokeWidth={0.8} />
                                <text x={(pc.x + pc.w / 2) * sc3} y={(pc.y + pc.h / 2) * sc3 + 2.5} fontSize={6.5} textAnchor="middle" fill={C.ink} fontFamily="ui-monospace, monospace" fontWeight="bold">{pc.code}{pc.rot ? "↻" : ""}</text>
                              </g>
                            ))}
                          </svg>
                          <div className="text-xs" style={{ fontFamily: "ui-monospace, monospace", color: C.gray }}>#{i + 1}</div>
                        </div>
                      );
                    })}
                  </div>
                  {result.osbPlan.oversize.length > 0 && (
                    <div className="text-xs mt-2" style={{ color: C.red }}>
                      ⚠ Piezas que exceden la placa estándar — unir dos placas con la junta cayendo dentro del vano: {result.osbPlan.oversize.map((o) => `${o.code} (${o.w.toFixed(2)}×${o.h.toFixed(2)})`).join(" · ")}
                    </div>
                  )}
                  <div className="text-xs mt-2" style={{ color: C.gray }}>
                    Cada rectángulo es una placa estándar y muestra qué piezas salen de ella, con el código que pide cada panel ({"P01-A, P02-C…"}). ↻ = pieza rotada 90°. El recorte de martillo se hace después, sobre la pieza ya cortada, según el instructivo de cada ficha. El OSB de techo se compra por área aparte ({result.osbRoofSheets} placas). La lista completa sale en el CSV de la pestaña Corte.
                  </div>
                </Card>
              )}

              {/* fichas por panel de muro */}
              {result.panels.map((p) => {
                const agg = {};
                for (const pc of p.pieces) {
                  const key = `${pc.perfil}|${pc.largo.toFixed(2)}|${pc.uso}`;
                  if (!agg[key]) agg[key] = { ...pc, cant: 0 };
                  agg[key].cant += pc.cant;
                }
                const rows = Object.values(agg).sort((a, b) => a.perfil.localeCompare(b.perfil) || b.largo - a.largo);
                return (
                  <Card key={p.id} className="p-3.5 fade-in">
                    <div className="flex items-center justify-between mb-2">
                      <Chip color={C.ink} soft={false} className="text-xs px-2.5 py-1">FICHA {p.id}</Chip>
                      <div className="text-xs font-mono" style={{ color: C.gray }}>{p.len.toFixed(2)} × {(vincha ? RULES.panelHeight + RULES.vigaTuboH + RULES.vinchaHeight : RULES.panelHeight).toFixed(2)} m{vincha ? " · panel + viga tubo + murito" : ""} · muro #{p.wallId}</div>
                    </div>
                    <table className="w-full text-xs font-mono">
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${C.line}`, color: C.gray }}>
                          <th className="text-left py-1">Pieza</th>
                          <th className="text-left py-1">Perfil</th>
                          <th className="text-right py-1">Largo</th>
                          <th className="text-right py-1">Cant.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={i} style={{ borderBottom: `1px solid ${C.line}` }}>
                            <td className="py-1">{r.uso}</td>
                            <td className="py-1">{r.perfil}</td>
                            <td className="py-1 text-right font-bold">{r.largo.toFixed(2)} m</td>
                            <td className="py-1 text-right">{r.cant}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {/* instructivo de corte OSB */}
                    {(() => {
                      const cut = osbPiecesForPanel(p, vincha, RULES);
                      if (cut.pieces.length === 0) return null;
                      const sc2 = 42;
                      const dw = (cut.end - cut.start) * sc2, dh = (RULES.panelHeight + (vincha ? RULES.vigaTuboH + RULES.vinchaHeight : 0)) * sc2;
                      return (
                        <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${C.grid}` }}>
                          <div className="text-xs font-semibold mb-1" style={{ color: C.osb }}>Instructivo de corte OSB — {cut.pieces.length} placas</div>
                          <div className="overflow-x-auto">
                            <svg viewBox={`-4 -4 ${dw + 8} ${dh + 8}`} style={{ width: Math.min(dw + 8, 700), maxWidth: "100%" }}>
                              {cut.pieces.map((pc, i) => {
                                const x = (pc.x1 - cut.start) * sc2, y = dh - pc.y2 * sc2;
                                const w2 = pc.w * sc2, h2 = pc.h * sc2;
                                return (
                                  <g key={i}>
                                    <rect x={x} y={y} width={w2} height={h2} fill="#F0DCAE" stroke={C.osb} strokeWidth={1.8} />
                                    {pc.notches.map((n, k) => (
                                      <rect key={k} x={x + n.dx * sc2} y={y + h2 - (n.dy + n.h) * sc2} width={n.w * sc2} height={n.h * sc2} fill="#fff" stroke={C.orange} strokeWidth={1.5} strokeDasharray="4 3" />
                                    ))}
                                    {pc.lap && <rect x={x + w2 - RULES.osbLap * sc2} y={y} width={RULES.osbLap * sc2} height={h2} fill="rgba(184,134,11,0.28)" />}
                                    <text x={x + w2 / 2} y={y + h2 / 2 - 3} fontSize={11} fontWeight="bold" textAnchor="middle" fill={C.ink} fontFamily="ui-monospace, monospace">{pc.tag}</text>
                                    <text x={x + w2 / 2} y={y + h2 / 2 + 10} fontSize={8.5} textAnchor="middle" fill={C.ink} fontFamily="ui-monospace, monospace">{pc.w.toFixed(2)}×{pc.h.toFixed(2)}</text>
                                  </g>
                                );
                              })}
                            </svg>
                          </div>
                          <table className="w-full text-xs mt-1" style={{ fontFamily: "ui-monospace, monospace" }}>
                            <thead>
                              <tr style={{ borderBottom: `1px solid ${C.grid}`, color: C.gray }}>
                                <th className="text-left py-1">Placa</th>
                                <th className="text-left py-1">Corte (an × al)</th>
                                <th className="text-left py-1">Recorte de vano (martillo)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cut.pieces.map((pc, i) => (
                                <tr key={i} style={{ borderBottom: `1px solid ${C.line}` }}>
                                  <td className="py-1 font-bold">{p.id}-{pc.tag}{pc.lap ? " ▨" : ""}</td>
                                  <td className="py-1">{pc.w.toFixed(2)} × {pc.h.toFixed(2)} m</td>
                                  <td className="py-1" style={{ color: pc.notches.length ? C.orange : C.gray }}>
                                    {pc.notches.length === 0 ? "—" : pc.notches.map((n) => `${n.w.toFixed(2)} × ${n.h.toFixed(2)} a ${n.dx.toFixed(2)} del borde izq. y ${n.dy.toFixed(2)} de la base`).join(" · ")}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="text-xs mt-1" style={{ color: C.gray }}>
                            ▨ = la pieza incluye el solape de 0,30 m (no atornillar ese tramo en fábrica). Rotular cada placa con su código ({p.id}-A, {p.id}-B…) en la cara interior. Las piezas con recorte se cortan en martillo: el hueco del vano sale de la placa entera, nunca de juntas en la esquina.
                          </div>
                        </div>
                      );
                    })()}
                    {p.fixtures && p.fixtures.length > 0 && (
                      <div className="text-xs mt-1" style={{ color: C.elec }}>
                        Instalaciones: {p.fixtures.map((f) => `${FIXTYPES[f.type].label} a ${f.height.toFixed(2)} m (x=${f.lx.toFixed(2)})`).join(" · ")} — perforar montantes con pasacables protegidos y fijar cajas/grampas en fábrica.
                      </div>
                    )}
                    <div className="text-xs mt-1" style={{ color: C.osb }}>
                      OSB: trabado, ½ placa de corrimiento en fila superior{p.ops.length > 0 ? " · corte en martillo en vanos" : ""}.
                      {!p.last ? " Dejar vuelo de 0,30 m hacia el panel siguiente (sin atornillar en fábrica)." : ""}
                      {!p.first ? " El borde inicial recibe el solape del panel anterior: dejar esa franja libre." : ""}
                      {" "}Rotular "{p.id}" en la solera superior antes de despachar.
                    </div>
                  </Card>
                );
              })}

              {/* fichas de techo */}
              {result.roofInfo.map((r) => (
                <Card key={r.tag} className="p-3.5 fade-in" style={{ borderLeft: `3px solid ${C.gray}` }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Chip color={C.gray} soft={false} className="text-xs px-2.5 py-1">FICHA {r.tag}</Chip>
                    <span className="text-sm font-bold" style={{ color: C.ink }}>Techo {r.slope}%</span>
                  </div>
                  <div className="text-xs font-mono" style={{ color: C.ink }}>
                    {r.n} paneles de {r.slopeLen.toFixed(2)} × {r.pw.toFixed(2)} m · {r.cabios} cabios PGC de {(r.slopeLen - RULES.studDeduct).toFixed(2)} m + 2 cabezales PGU de {r.pw.toFixed(2)} m por panel · {r.nCh} chapas de {(r.slopeLen + 0.1).toFixed(2)} m
                  </div>
                  <div className="text-xs mt-1.5" style={{ color: C.osb }}>OSB de techo: trabar juntas entre paneles adyacentes y dejar vuelo de 0,30 m para coser las uniones en obra. Rotular paneles {r.tag}-1 a {r.tag}-{r.n}.</div>
                </Card>
              ))}
            </>
          )}
        </div>
      )}

      {/* ================= TAB DETALLES ================= */}
      {tab === "detalles" && <DetallesView />}

      {/* ===== Footer ===== */}
      <footer className="no-print mt-auto px-4 py-3 flex items-center justify-between flex-wrap gap-2 text-[11px]" style={{ borderTop: `1px solid ${C.line}`, color: C.gray }}>
        <span>PMD Arquitectura SRL · Panelizador Steel Framing</span>
        <span className="font-mono">Montantes PGC @400 · paneles 3,00 m · OSB trabado 1,22×2,44</span>
      </footer>

      {/* ===== Modal de atajos y ayuda ===== */}
      {showHelp && (
        <div className="no-print fixed inset-0 z-50 grid place-items-center p-4" style={{ background: "rgba(16,32,43,.45)", backdropFilter: "blur(2px)" }} onClick={() => setShowHelp(false)}>
          <Card className="p-5 pop-in w-full" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold" style={{ color: C.ink }}>⌨ Atajos y ayuda</h3>
              <button onClick={() => setShowHelp(false)} className="grid place-items-center rounded-lg" style={{ width: 30, height: 30, color: C.gray, border: `1px solid ${C.line}` }}>✕</button>
            </div>
            <div className="text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: C.gray }}>Herramientas</div>
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {[["M", "Muro"], ["V", "Vano"], ["T", "Techo"], ["I", "Instalación"], ["E", "Editar"], ["G", "Goma"], ["H", "Mover"], ["C", "Calibrar"]].map(([k, label]) => (
                <div key={k} className="flex items-center gap-2 text-sm">
                  <kbd className="grid place-items-center rounded-md font-mono text-xs font-bold" style={{ minWidth: 24, height: 24, padding: "0 6px", background: C.paper, border: `1px solid ${C.line}`, color: C.ink }}>{k}</kbd>
                  <span style={{ color: C.ink }}>{label}</span>
                </div>
              ))}
            </div>
            <div className="text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: C.gray }}>Acciones</div>
            <div className="flex flex-col gap-1.5">
              {[["Ctrl + Z", "Deshacer"], ["Ctrl + ⇧ + Z", "Rehacer"], ["+  /  −  /  0", "Acercar · alejar · centrar"], ["Esc", "Cancelar trazo en curso"], ["Tocar la cota", "Editar el largo del muro"]].map(([k, label]) => (
                <div key={k} className="flex items-center gap-2 text-sm">
                  <kbd className="grid place-items-center rounded-md font-mono text-xs font-bold" style={{ height: 24, padding: "0 8px", background: C.paper, border: `1px solid ${C.line}`, color: C.ink }}>{k}</kbd>
                  <span style={{ color: C.ink }}>{label}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
