import React from "react";
import { C } from "./lib/engine";
import { Card, Chip } from "./ui";

// ============================================================
// Detalles constructivos de Steel Framing — diagramas propios
// (esquemas originales que codifican las reglas PMD / práctica
// argentina tipo CONSUL Steel · AD Barbieri). Sin imágenes de terceros.
// ============================================================

const ink = C.ink, blue = C.blue, soft = C.blueSoft, gray = C.gray, osb = C.osb, orange = C.orange, line = C.line, green = C.green;

function Lbl({ x, y, children, color = gray, anchor = "middle", size = 7 }) {
  return <text x={x} y={y} fontSize={size} textAnchor={anchor} fill={color} fontFamily="'JetBrains Mono', monospace">{children}</text>;
}
function Dim({ x1, y1, x2, y2, children, color = blue, off = 0 }) {
  // cota simple con ticks
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={0.6} />
      <line x1={x1} y1={y1 - 2} x2={x1} y2={y1 + 2} stroke={color} strokeWidth={0.6} />
      <line x1={x2} y1={y2 - 2} x2={x2} y2={y2 + 2} stroke={color} strokeWidth={0.6} />
      <text x={(x1 + x2) / 2} y={y1 - 2 + off} fontSize={6.5} textAnchor="middle" fill={color} fontFamily="'JetBrains Mono', monospace">{children}</text>
    </g>
  );
}

function Detail({ title, tag, children, notes }) {
  return (
    <Card className="p-3.5 flex flex-col gap-2 fade-in">
      <div className="flex items-center gap-2">
        {tag && <Chip color={blue} soft={false} className="text-[10px] px-2 py-0.5">{tag}</Chip>}
        <h3 className="text-sm font-bold" style={{ color: ink }}>{title}</h3>
      </div>
      <div className="rounded-lg overflow-hidden" style={{ background: "#FCFCFD", border: `1px solid ${line}` }}>
        <svg viewBox="0 0 240 170" style={{ width: "100%", display: "block" }}>{children}</svg>
      </div>
      <ul className="text-xs flex flex-col gap-1" style={{ color: ink }}>
        {notes.map((n, i) => (
          <li key={i} className="flex gap-1.5"><span style={{ color: blue }}>›</span><span>{n}</span></li>
        ))}
      </ul>
    </Card>
  );
}

// ---- diagramas ----

function PerfilesSVG() {
  return (
    <g>
      {/* PGC (C / Galera) */}
      <Lbl x={60} y={18} color={ink} size={8}>PGC 100×1,2 (montante)</Lbl>
      <path d="M55 35 L55 120 M55 35 L95 35 M55 120 L95 120 M95 35 L95 45 M95 120 L95 110" fill="none" stroke={ink} strokeWidth={3} strokeLinejoin="round" />
      <Dim x1={55} y1={132} x2={95} y2={132}>100</Dim>
      <Lbl x={42} y={80} anchor="end">alma</Lbl>
      <Lbl x={100} y={40} anchor="start">ala</Lbl>
      <Lbl x={100} y={114} anchor="start">labio</Lbl>
      {/* PGU (U / Solera) */}
      <Lbl x={175} y={18} color={ink} size={8}>PGU 100×0,9 (solera)</Lbl>
      <path d="M150 35 L150 120 L210 120 L210 35" fill="none" stroke={blue} strokeWidth={3} strokeLinejoin="round" />
      <Dim x1={150} y1={132} x2={210} y2={132} color={blue}>~102</Dim>
      <Lbl x={180} y={150} color={gray}>La solera abraza al montante</Lbl>
    </g>
  );
}

function ModulacionSVG() {
  const xs = [30, 70, 110, 150, 190];
  return (
    <g>
      {/* soleras */}
      <rect x={24} y={28} width={172} height={6} fill={soft} stroke={blue} strokeWidth={1} />
      <rect x={24} y={120} width={172} height={6} fill={soft} stroke={blue} strokeWidth={1} />
      {/* montantes */}
      {xs.map((x, i) => <rect key={i} x={x - 2} y={34} width={4} height={86} fill={ink} />)}
      <Dim x1={30} y1={140} x2={70} y2={140}>400</Dim>
      <Dim x1={70} y1={140} x2={110} y2={140}>400</Dim>
      <Lbl x={110} y={158} color={gray}>montantes cada 400 mm · largo 3,00 m exacto</Lbl>
      <Lbl x={206} y={80} anchor="start" color={blue}>solera</Lbl>
      <Lbl x={14} y={80} anchor="start" color={ink}>PGC</Lbl>
    </g>
  );
}

function EsquinaSVG() {
  return (
    <g>
      <Lbl x={120} y={16} color={ink} size={8}>Esquina: montante en caja (2 PGC)</Lbl>
      {/* dos muros en L (planta) */}
      <rect x={40} y={40} width={120} height={12} fill="#EEF1F5" stroke={ink} strokeWidth={1} />
      <rect x={40} y={40} width={12} height={110} fill="#EEF1F5" stroke={ink} strokeWidth={1} />
      {/* caja en esquina */}
      <rect x={40} y={40} width={14} height={14} fill={soft} stroke={blue} strokeWidth={1.5} />
      <rect x={43} y={43} width={8} height={8} fill="none" stroke={blue} strokeWidth={1} />
      <Lbl x={120} y={50} color={gray}>muro</Lbl>
      <Lbl x={70} y={70} anchor="start" color={blue}>2 PGC en cajón</Lbl>
      <Lbl x={120} y={160} color={gray}>rigidiza el encuentro y recibe el OSB de ambas caras</Lbl>
    </g>
  );
}

function TeeSVG() {
  return (
    <g>
      <Lbl x={120} y={16} color={ink} size={8}>Encuentro en T: montante adicional</Lbl>
      <rect x={30} y={70} width={180} height={12} fill="#EEF1F5" stroke={ink} strokeWidth={1} />
      <rect x={114} y={82} width={12} height={70} fill="#EEF1F5" stroke={ink} strokeWidth={1} />
      <rect x={112} y={70} width={16} height={12} fill={soft} stroke={blue} strokeWidth={1.5} />
      <Lbl x={150} y={66} anchor="start" color={blue}>montante extra (doble)</Lbl>
      <Lbl x={120} y={166} color={gray}>el tabique descarga sobre un montante reforzado del muro</Lbl>
    </g>
  );
}

function DintelSVG() {
  return (
    <g>
      <Lbl x={120} y={14} color={ink} size={8}>Vano: dintel en caja + jack/king + cripples</Lbl>
      {/* marco panel */}
      <rect x={30} y={24} width={180} height={120} fill="none" stroke={gray} strokeWidth={1} />
      {/* king studs (full height) */}
      <rect x={70} y={24} width={4} height={120} fill={ink} />
      <rect x={166} y={24} width={4} height={120} fill={ink} />
      {/* jack studs */}
      <rect x={76} y={70} width={4} height={74} fill={blue} />
      <rect x={160} y={70} width={4} height={74} fill={blue} />
      {/* dintel (header) en caja */}
      <rect x={74} y={62} width={92} height={9} fill={soft} stroke={blue} strokeWidth={1.2} />
      {/* cripples sobre dintel */}
      {[92, 110, 128, 146].map((x, i) => <rect key={i} x={x} y={24} width={3} height={38} fill={ink} opacity={0.7} />)}
      {/* antepecho + cripples bajo */}
      <rect x={80} y={120} width={80} height={6} fill={soft} stroke={blue} strokeWidth={1} />
      {[92, 110, 128, 146].map((x, i) => <rect key={`b${i}`} x={x} y={126} width={3} height={18} fill={ink} opacity={0.7} />)}
      {/* hueco */}
      <rect x={84} y={72} width={72} height={46} fill="#fff" stroke={orange} strokeWidth={1.5} />
      <Lbl x={120} y={98} color={orange}>vano</Lbl>
      <Lbl x={66} y={20} anchor="end" color={ink}>king</Lbl>
      <Lbl x={120} y={60} color={blue}>dintel (2 PGC, apoyo 100 mm/lado)</Lbl>
      <Lbl x={120} y={162} color={gray}>cripples siguen la modulación sobre el dintel y bajo el antepecho</Lbl>
    </g>
  );
}

function VigaTuboSVG() {
  return (
    <g>
      <Lbl x={120} y={14} color={ink} size={8}>Viga tubo armada + murito de carga 0,50 m</Lbl>
      {/* murito arriba */}
      <rect x={40} y={28} width={160} height={4} fill={soft} stroke={blue} strokeWidth={1} />
      {[52, 72, 92, 112, 132, 152, 172, 188].map((x, i) => <rect key={i} x={x} y={32} width={3} height={24} fill={ink} />)}
      <rect x={40} y={56} width={160} height={4} fill={soft} stroke={blue} strokeWidth={1} />
      <Lbl x={210} y={46} anchor="start" color={gray}>murito 0,50</Lbl>
      {/* cajón viga tubo: PGU + 2 PGC + PGU */}
      <rect x={40} y={62} width={160} height={5} fill={soft} stroke={blue} strokeWidth={1} />
      <rect x={40} y={67} width={160} height={9} fill="#fff" stroke={ink} strokeWidth={1} />
      <rect x={44} y={68} width={152} height={3} fill={ink} />
      <rect x={44} y={72} width={152} height={3} fill={ink} />
      <rect x={40} y={76} width={160} height={5} fill={soft} stroke={blue} strokeWidth={1} />
      <Lbl x={210} y={72} anchor="start" color={blue}>PGU+2PGC+PGU</Lbl>
      {/* panel debajo */}
      <rect x={40} y={84} width={160} height={4} fill={soft} stroke={blue} strokeWidth={1} />
      {[52, 92, 132, 172].map((x, i) => <rect key={`p${i}`} x={x} y={88} width={3} height={40} fill={ink} />)}
      <Lbl x={120} y={150} color={gray}>cajón continuo integrado al panel; el murito descarga sobre la viga</Lbl>
      <Lbl x={120} y={162} color={gray}>total de fábrica ≈ 3,00 + VT + 0,50 = 3,60 m</Lbl>
    </g>
  );
}

function ArriostraSVG() {
  return (
    <g>
      <Lbl x={120} y={14} color={ink} size={8}>Arriostramiento: cruz de San Andrés (flejes)</Lbl>
      <rect x={40} y={26} width={160} height={110} fill="none" stroke={gray} strokeWidth={1} />
      {[40, 80, 120, 160, 200].map((x, i) => <rect key={i} x={x - 1.5} y={26} width={3} height={110} fill={ink} opacity={0.6} />)}
      {/* flejes en X */}
      <line x1={40} y1={26} x2={200} y2={136} stroke={green} strokeWidth={2.4} />
      <line x1={200} y1={26} x2={40} y2={136} stroke={green} strokeWidth={2.4} />
      <Lbl x={120} y={150} color={green}>fleje galvanizado a 45° atornillado a montantes y soleras</Lbl>
      <Lbl x={120} y={162} color={gray}>alternativa: el OSB estructural trabaja como diafragma rigidizador</Lbl>
    </g>
  );
}

function OsbSVG() {
  return (
    <g>
      <Lbl x={120} y={14} color={ink} size={8}>OSB trabado + corte en martillo</Lbl>
      {/* fila inferior */}
      {[40, 95, 150].map((x, i) => <rect key={i} x={x} y={70} width={52} height={66} fill="#F0DCAE" stroke={osb} strokeWidth={1} />)}
      {/* fila superior corrida 1/2 placa */}
      {[14, 67, 122, 177].map((x, i) => <rect key={`t${i}`} x={x} y={26} width={52} height={44} fill="#F4E6C2" stroke={osb} strokeWidth={1} />)}
      {/* vano con martillo */}
      <rect x={95} y={88} width={40} height={34} fill="#fff" stroke={orange} strokeWidth={1.5} />
      <path d="M95 88 L88 88 M95 88 L95 81 M135 88 L142 88 M135 88 L135 81" stroke={orange} strokeWidth={1.6} fill="none" />
      <Lbl x={120} y={150} color={gray}>juntas nunca alineadas · fila superior corrida ½ placa</Lbl>
      <Lbl x={120} y={162} color={orange}>ninguna junta cae en la esquina de un vano (corte en martillo)</Lbl>
    </g>
  );
}

export default function DetallesView() {
  return (
    <div className="p-3 md:p-4 flex flex-col gap-3 fade-in w-full mx-auto" style={{ maxWidth: 1400 }}>
      <Card className="p-3.5" style={{ borderLeft: `3px solid ${blue}` }}>
        <h2 className="text-base font-bold" style={{ color: ink }}>📚 Detalles constructivos — Steel Framing</h2>
        <p className="text-xs mt-1" style={{ color: gray }}>
          Esquemas de referencia de los nudos y reglas que aplica el panelizador (montantes PGC @400, soleras PGU,
          esquinas y T en caja, dinteles, viga tubo armada, arriostramiento y emplacado OSB). Guía rápida para fábrica y obra.
        </p>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Detail title="Perfiles PGC y PGU" tag="01" notes={["Montante: PGC (galera C) 100×1,2 con labios.", "Solera: PGU (U) 100×0,9, abraza al montante arriba y abajo.", "Inferior con alas hacia arriba contra platea; superior con alas hacia abajo."]}><PerfilesSVG /></Detail>
        <Detail title="Modulación de montantes" tag="02" notes={["Montantes cada 400 mm (eje a eje).", "Largo exacto 3,00 m = media barra de 6 m → cero desperdicio.", "La modulación ordena vanos, instalaciones y emplacado."]}><ModulacionSVG /></Detail>
        <Detail title="Esquina en caja" tag="03" notes={["Encuentro de muros con 2 PGC formando un cajón.", "Rigidiza la esquina y da apoyo al OSB de ambas caras.", "El muro continuo cubre el canto del que remata."]}><EsquinaSVG /></Detail>
        <Detail title="Encuentro en T" tag="04" notes={["Donde un tabique encuentra un muro va un montante adicional.", "Recibe la descarga del tabique y permite atornillar ambas caras.", "El panelizador lo detecta automáticamente en los nudos."]}><TeeSVG /></Detail>
        <Detail title="Dintel de vano" tag="05" notes={["Dintel PGC en caja con apoyo de 100 mm por lado.", "King studs de piso a techo; jack studs sostienen el dintel.", "Cripples siguen la modulación sobre el dintel y bajo el antepecho."]}><DintelSVG /></Detail>
        <Detail title="Viga tubo + murito" tag="06" notes={["Viga tubo armada como cajón: PGU + 2 PGC + PGU.", "Murito de carga de 0,50 m encima, con modulación propia @400.", "Sale integrada al panel; altura total de fábrica ≈ 3,60 m."]}><VigaTuboSVG /></Detail>
        <Detail title="Arriostramiento" tag="07" notes={["Cruz de San Andrés con flejes galvanizados a 45°.", "Atornillados a montantes y soleras, trabajan a tracción.", "El OSB estructural puede actuar como diafragma rigidizador."]}><ArriostraSVG /></Detail>
        <Detail title="Emplacado OSB" tag="08" notes={["Placas 1,22×2,44 siempre trabadas; juntas nunca alineadas.", "Fila superior corrida ½ placa; cose panel + viga tubo + murito.", "Corte en martillo en vanos y solape de 0,30 m sobre el panel vecino."]}><OsbSVG /></Detail>
      </div>
      <Card className="p-3 text-xs" style={{ color: gray }}>
        Diagramas esquemáticos propios de PMD para uso interno. Verificar dimensionado de dinteles, vigas y arriostramiento
        con el cálculo estructural y la documentación del proveedor antes de fabricar.
      </Card>
    </div>
  );
}
