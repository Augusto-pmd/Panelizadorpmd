// Tipos de dominio del motor de panelización. Compartidos por todos los módulos.

export interface Vec2 {
  x: number;
  y: number;
}

export interface Wall {
  id: string | number;
  a: Vec2;
  b: Vec2;
}

// Vano (puerta/ventana). El motor agrega props derivadas (x1, x2, lx1, lx2, headBot).
export interface Opening {
  id: string | number;
  wallId: string | number;
  type: string; // "puerta" | "ventana"
  offset: number; // centro del vano sobre el muro (m)
  width: number; // ancho (m)
  height: number; // alto del vano (m)
  sill: number; // antepecho (m); 0 en puertas
  [k: string]: unknown; // props derivadas que agrega panelizeWall
}

export interface Fixture {
  id: string | number;
  wallId: string | number;
  type: string; // toma | llave | agua | desague
  offset: number; // posición sobre el muro (m)
  height: number; // altura de instalación (m)
  lx?: number; // posición local dentro del panel (m), la agrega buildAll
}

export interface Roof {
  id: string | number;
  w: number; // ancho en px
  h: number; // alto en px
  dir: "x" | "y"; // dirección de la pendiente
  slope: number; // pendiente en %
}

export interface Tee {
  wallId: string | number;
  t: number; // posición paramétrica (0..1) sobre el muro
}

export interface Joints {
  corners: Vec2[];
  tees: Tee[];
}

export interface Stud {
  x: number; // posición local en el panel (m)
  qty: number; // cantidad de PGC (2 = en caja)
  len: number; // largo del montante (m)
  tipo: string; // montante | caja | T | king
}

export interface Piece {
  perfil: string; // PGC | PGU
  largo: number; // m
  cant: number;
  uso: string;
  panel?: string;
}

export interface Panel {
  id?: string;
  wallId: string | number;
  a: number; // inicio del panel sobre el muro (m)
  b: number; // fin del panel sobre el muro (m)
  len: number; // largo del panel (m)
  studs: Stud[];
  ops: Array<Opening & { lx1: number; lx2: number; headBot: number }>;
  pieces: Piece[];
  warnings: string[];
  first: boolean; // primer panel del muro
  last: boolean; // último panel del muro
  fixtures?: Array<Fixture & { lx: number }>;
}

export interface DxfSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  layer: string;
}
