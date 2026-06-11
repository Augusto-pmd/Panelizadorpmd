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

function EncuentrosSVG() {
  return (
    <g>
      <Lbl x={120} y={14} color={ink} size={8}>Tipos de encuentro entre paneles</Lbl>
      {/* Doble */}
      <Lbl x={42} y={40} color={blue}>Doble</Lbl>
      <rect x={28} y={48} width={30} height={6} fill={soft} stroke={blue} strokeWidth={1.2} />
      <rect x={28} y={56} width={30} height={6} fill={soft} stroke={blue} strokeWidth={1.2} />
      <Lbl x={43} y={78} color={gray}>2 PGC</Lbl>
      {/* Triple */}
      <Lbl x={120} y={40} color={blue}>Triple (T)</Lbl>
      <rect x={100} y={48} width={40} height={6} fill={soft} stroke={blue} strokeWidth={1.2} />
      <rect x={100} y={56} width={40} height={6} fill={soft} stroke={blue} strokeWidth={1.2} />
      <rect x={117} y={62} width={6} height={26} fill={soft} stroke={blue} strokeWidth={1.2} />
      <Lbl x={120} y={100} color={gray}>3 PGC · 1 rotado 90°</Lbl>
      {/* Cuádruple */}
      <Lbl x={198} y={40} color={blue}>Cruz</Lbl>
      <rect x={178} y={50} width={40} height={6} fill={soft} stroke={blue} strokeWidth={1.2} />
      <rect x={178} y={64} width={40} height={6} fill={soft} stroke={blue} strokeWidth={1.2} />
      <rect x={189} y={44} width={6} height={32} fill={soft} stroke={blue} strokeWidth={1.2} />
      <rect x={201} y={44} width={6} height={32} fill={soft} stroke={blue} strokeWidth={1.2} />
      <Lbl x={198} y={92} color={gray}>4 PGC</Lbl>
      <Lbl x={120} y={132} color={gray}>el panelizador arma el cajón según el nudo (esquina / T / cruz)</Lbl>
      <Lbl x={120} y={150} color={gray}>conexión con ángulos A1/A2/A3 y tornillos Nº8</Lbl>
    </g>
  );
}

function CorteDiezSVG() {
  return (
    <g>
      <Lbl x={120} y={14} color={ink} size={8}>“Corte de 10” en la solera del vano</Lbl>
      {/* solera larga */}
      <rect x={30} y={64} width={180} height={14} fill={soft} stroke={blue} strokeWidth={1.4} />
      {/* cortes a 10 cm y pliegue */}
      <line x1={58} y1={64} x2={58} y2={78} stroke={ink} strokeWidth={1.4} strokeDasharray="3 2" />
      <line x1={182} y1={64} x2={182} y2={78} stroke={ink} strokeWidth={1.4} strokeDasharray="3 2" />
      <path d="M30 64 L30 50 M30 64 L44 64" stroke={orange} strokeWidth={2} fill="none" />
      <path d="M210 64 L210 50 M210 64 L196 64" stroke={orange} strokeWidth={2} fill="none" />
      <Dim x1={30} y1={96} x2={58} y2={96} color={orange}>10</Dim>
      <Dim x1={58} y1={96} x2={182} y2={96}>ancho vano</Dim>
      <Dim x1={182} y1={96} x2={210} y2={96} color={orange}>10</Dim>
      <Lbl x={120} y={126} color={gray}>largo total = ancho del vano + 20 cm</Lbl>
      <Lbl x={120} y={144} color={orange}>alas plegadas 90° → pestañas que atornillan a jacks/king</Lbl>
    </g>
  );
}

function FijacionesSVG() {
  return (
    <g>
      <Lbl x={120} y={14} color={ink} size={8}>Fijaciones y anclaje a fundación</Lbl>
      {/* tornillo acero-acero */}
      <circle cx={50} cy={45} r={7} fill="none" stroke={ink} strokeWidth={1.6} />
      <line x1={50} y1={38} x2={50} y2={52} stroke={ink} strokeWidth={1.4} />
      <line x1={43} y1={45} x2={57} y2={45} stroke={ink} strokeWidth={1.4} />
      <Lbl x={50} y={68} color={gray}>Nº8 acero-acero</Lbl>
      {/* paso en OSB */}
      <rect x={95} y={36} width={60} height={18} fill="#F0DCAE" stroke={osb} strokeWidth={1.2} />
      {[100, 110, 120, 130, 140, 150].map((x, i) => <circle key={i} cx={x} cy={45} r={1.6} fill={osb} />)}
      <Lbl x={125} y={68} color={gray}>OSB: 150 mm borde / 300 mm campo</Lbl>
      {/* anclaje a platea */}
      <rect x={40} y={120} width={160} height={16} fill="#EEF1F5" stroke={gray} strokeWidth={1} />
      <Lbl x={120} y={132} color={gray}>platea HºAº</Lbl>
      <rect x={70} y={96} width={8} height={24} fill={soft} stroke={blue} strokeWidth={1.2} />
      <line x1={74} y1={104} x2={74} y2={132} stroke={ink} strokeWidth={2} />
      <rect x={160} y={96} width={8} height={24} fill={soft} stroke={blue} strokeWidth={1.2} />
      <line x1={164} y1={104} x2={164} y2={132} stroke={ink} strokeWidth={2} />
      <Lbl x={120} y={154} color={gray}>varilla roscada química o fleje · esquinas y cada 1,2–1,5 m</Lbl>
    </g>
  );
}

// Tabla de perfiles más usados (IRAM-IAS U 500-205, acero ZAR280, galv. Z275)
const PERFILES = [
  ["PGC 90×0,89", "montante / jack / king", "90", "40", "17", "0,89", "1,50"],
  ["PGC 100×0,89", "montante", "100", "40", "17", "0,89", "1,50"],
  ["PGC 100×1,24", "montante de carga", "100", "40", "17", "1,24", "~2,0"],
  ["PGC 140×1,24", "dintel / viga", "140", "40", "17", "1,24", "~2,6"],
  ["PGC 200×2,00", "dintel / viga (luz grande)", "200", "44", "17", "2,00", "4,90"],
  ["PGU 100×0,89", "solera", "102", "35", "—", "0,89", "1,22"],
  ["PGU 100×1,24", "solera de carga", "103", "35", "—", "1,24", "1,68"],
];

function PerfilesTabla() {
  return (
    <Card className="overflow-hidden" style={{ padding: 0 }}>
      <div className="px-3.5 py-2.5 flex items-center gap-2" style={{ borderBottom: `1px solid ${line}` }}>
        <Chip color={blue} soft={false} className="text-[10px] px-2 py-0.5">PGC · PGU</Chip>
        <h3 className="text-sm font-bold" style={{ color: ink }}>Perfiles galvanizados (los más usados)</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr style={{ background: "#F7F8FA", color: gray }}>
              <th className="text-left px-3 py-2">Designación</th>
              <th className="text-left px-3 py-2">Uso típico</th>
              <th className="text-right px-3 py-2">Alma</th>
              <th className="text-right px-3 py-2">Ala</th>
              <th className="text-right px-3 py-2">Labio</th>
              <th className="text-right px-3 py-2">Esp.</th>
              <th className="text-right px-3 py-2">kg/m</th>
            </tr>
          </thead>
          <tbody>
            {PERFILES.map((r, i) => (
              <tr key={i} style={{ borderTop: `1px solid ${line}` }}>
                <td className="px-3 py-1.5 font-bold" style={{ color: r[0].startsWith("PGU") ? blue : ink }}>{r[0]}</td>
                <td className="px-3 py-1.5" style={{ color: gray }}>{r[1]}</td>
                <td className="px-3 py-1.5 text-right">{r[2]}</td>
                <td className="px-3 py-1.5 text-right">{r[3]}</td>
                <td className="px-3 py-1.5 text-right">{r[4]}</td>
                <td className="px-3 py-1.5 text-right">{r[5]}</td>
                <td className="px-3 py-1.5 text-right">{r[6]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-3.5 py-2 text-[11px]" style={{ color: gray, borderTop: `1px solid ${line}` }}>
        Medidas en mm. Acero ZAR280 (fluencia 280 MPa), galvanizado Z275 (275 g/m²). PMD usa PGC 100×1,2 @400 y PGU 100×0,9.
        Perforaciones de paso de instalaciones: primera a 300 mm del extremo, luego cada 600 mm.
      </div>
    </Card>
  );
}

export default function DetallesView() {
  return (
    <div className="p-3 md:p-4 flex flex-col gap-3 fade-in w-full mx-auto" style={{ maxWidth: 1400 }}>
      <Card className="p-3.5" style={{ borderLeft: `3px solid ${blue}` }}>
        <h2 className="text-base font-bold" style={{ color: ink }}>📚 Detalles constructivos — Steel Framing</h2>
        <p className="text-xs mt-1" style={{ color: gray }}>
          Esquemas y datos de referencia de los nudos y reglas que aplica el panelizador. Basado en la
          <b> Enciclopedia del Steel Frame</b> (AD Barbieri) y la norma <b>IRAM-IAS U 500-205</b> (perfiles
          galvanizados conformados en frío). Guía rápida para fábrica y obra.
        </p>
      </Card>

      <PerfilesTabla />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Detail title="Perfiles PGC y PGU" tag="01" notes={["Montante PGC (galera C): alma 100 · ala 40 · labio 17 · esp. 1,2 mm.", "Solera PGU (U): alma ~102 · ala 35; abraza al montante y la carga baja por aplastamiento.", "Inferior con alas hacia arriba contra platea; superior con alas hacia abajo."]}><PerfilesSVG /></Detail>
        <Detail title="Modulación de montantes" tag="02" notes={["Estándar del manual: 400 ó 600 mm eje a eje (submúltiplo de 1,20 m). PMD usa 400.", "Largo exacto 3,00 m = media barra de 6 m → cero desperdicio.", "Perforaciones de paso: primera a 300 mm del extremo, luego cada 600 mm."]}><ModulacionSVG /></Detail>
        <Detail title="Esquina — encuentro Doble" tag="03" notes={["Manual: encuentro Doble (D) = 2 PGC unidos por el alma (caja de esquina).", "Rigidiza la esquina y da apoyo al OSB de ambas caras.", "El muro continuo cubre el canto del que remata."]}><EsquinaSVG /></Detail>
        <Detail title="Encuentro en T — Triple" tag="04" notes={["Manual: encuentro Triple (T) = 3 PGC, uno rotado 90° que ofrece su alma al tabique.", "Encuentro en cruz = Cuádruple (4 PGC) o dos Dobles separados el alma.", "El panelizador detecta el nudo automáticamente."]}><TeeSVG /></Detail>
        <Detail title="Dintel de vano" tag="05" notes={["Dintel: 2 PGC enfrentados (viga cajón) + solera PGU; apoyo 100 mm/lado.", "King = montante + jacks de piso a dintel (cant. ≈ montantes interrumpidos ÷ 2).", "Solera del vano con “corte de 10”: largo = ancho + 20 cm, alas plegadas 90°.", "Cripples siguen la modulación sobre el dintel y bajo el antepecho."]}><DintelSVG /></Detail>
        <Detail title="Viga tubo + murito" tag="06" notes={["Viga tubo armada como cajón: PGU + 2 PGC + PGU.", "Murito de carga de 0,50 m encima, con modulación propia @400.", "Sale integrada al panel; altura total de fábrica ≈ 3,60 m."]}><VigaTuboSVG /></Detail>
        <Detail title="Arriostramiento en X" tag="07" notes={["Cruz de San Andrés con fleje/cinta galvanizada (mín. 32×0,84 mm) a 30–60°.", "Trabaja sólo a tracción: por eso van dos diagonales en X, pretensadas.", "Tf = W / cos α (a 45° ≈ 1,41·W). El OSB ≥15 mm puede actuar como diafragma."]}><ArriostraSVG /></Detail>
        <Detail title="Emplacado OSB" tag="08" notes={["Placas 1,22×2,44 trabadas; juntas nunca alineadas (fila superior ½ placa).", "Fijación Nº8: 150 mm en bordes, 300 mm en el interior (campo).", "Corte en martillo en vanos y solape de 0,30 m sobre el panel vecino."]}><OsbSVG /></Detail>
        <Detail title="Encuentros: D · T · X" tag="09" notes={["Doble (esquina): 2 PGC unidos por el alma.", "Triple (T): 3 PGC, el central rotado 90° da apoyo al tabique.", "Cuádruple (cruz): 4 PGC; el panelizador arma cada nudo según su tipo."]}><EncuentrosSVG /></Detail>
        <Detail title="Corte de 10 (solera de vano)" tag="10" notes={["La solera del vano se corta con largo = ancho del vano + 20 cm.", "Se cortan las alas a 10 cm de cada extremo y se pliegan 90° hacia adentro.", "Esas pestañas atornillan a los jacks/king: unión articulada y estable."]}><CorteDiezSVG /></Detail>
        <Detail title="Fijaciones y anclajes" tag="11" notes={["Tornillos autoperforantes Nº8 (Ø 3,8 mm) acero-acero; mín. 2 por unión.", "OSB: Nº8 @150 mm bordes / 300 mm campo. Yeso: Nº6 @300 mm.", "Anclaje a platea: varilla roscada química o fleje galvanizado, en esquinas y cada 1,2–1,5 m."]}><FijacionesSVG /></Detail>
      </div>
      <Card className="p-3 text-xs" style={{ color: gray }}>
        Diagramas esquemáticos propios de PMD basados en la <b>Enciclopedia del Steel Frame</b> (AD Barbieri) y el
        <b> Manual de Ingeniería de Steel Framing</b> (ILAFA / R. Dannemann, base AISI). Verificar dimensionado de
        dinteles, vigas y arriostramiento con el cálculo estructural y la documentación del proveedor antes de fabricar.
      </Card>
    </div>
  );
}
