# Steel Framing — síntesis técnica para el panelizador

Consolidado de dos manuales (leídos al 100%):

- **Enciclopedia del Steel Frame** — AD Barbieri (norma IRAM-IAS U 500-205).
- **Manual de Ingeniería de Steel Framing** — ILAFA / R. Dannemann (base AISI 2001/2004).

Sirve como fuente de verdad para las reglas constructivas de la app. Las medidas marcadas
"PMD" son las decisiones propias de PMD (no tocar sin confirmación de Augusto).

---

## 1. Perfiles (IRAM-IAS U 500-205 · acero ZAR280 · galv. Z275)

Designación AISI: `H × B × D × t` (alma × ala × labio × espesor, en mm).

| Tipo | Designación común | Alma | Ala | Labio | Esp. | kg/m | Uso |
|------|-------------------|------|-----|-------|------|------|-----|
| PGC (C) | 90×0,89 | 90 | 40 | 17 | 0,89 | 1,50 | montante / jack / king |
| PGC (C) | 100×0,89 | 100 | 40 | 17 | 0,89 | 1,50 | montante |
| **PGC (C)** | **100×1,2** | 100 | 40 | 17 | 1,2 | ~2,0 | **montante PMD** |
| PGC (C) | 140×1,24 | 140 | 40 | 17 | 1,24 | ~2,6 | dintel / viga |
| PGC (C) | 200×2,0 | 200 | 44 | 17 | 2,0 | 4,90 | dintel / viga (luz grande) |
| PGU (U) | 100×0,89 | 102 | 35 | — | 0,89 | 1,22 | solera |
| **PGU (U)** | **100×0,9** | ~102 | 35 | — | 0,9 | 1,3 | **solera PMD** |

- Encastre montante–solera: la carga baja por **aplastamiento** (los tornillos sólo fijan).
- Perforaciones de paso de instalaciones: primera a **300 mm** del extremo, luego cada **600 mm**.
- Largo estándar de fabricación de montante de panel: 2700 mm. **PMD: 3,00 m exacto** (media barra de 6 m).

## 2. Modulación

- Estándar del manual: **400 ó 600 mm** eje a eje (submúltiplo de 1,20 m / placa de 4').
- **PMD: 400 mm.**

## 3. Encuentros entre paneles

- **Doble (D):** 2 PGC unidos por el alma → esquina (caja). *(PMD ya lo hace: "montante en caja").*
- **Triple (T):** 3 PGC, el central rotado 90° (ofrece su alma al tabique) → encuentro en T.
  *(PMD hoy pone 2 PGC en la T — ver propuesta P1).*
- **Cuádruple (cruz):** 4 PGC, o dos Dobles separados el alma.
- Conexión con ángulos A1 (50×0,85), A2 (50×1,2), A3 (50×1,6) y tornillos Nº8.

## 4. Vanos

- **Dintel:** 2 PGC enfrentados (viga cajón) + **solera de dintel PGU**; apoyo extremo ≥ **38 mm**
  (interior 90 mm). *(PMD: dintel en caja con apoyo 100 mm/lado.)*
- **King:** montante + jacks (de piso a solera de dintel). Cantidad de jacks ≈ montantes
  interrumpidos ÷ 2; separación entre jacks = altura del alma del dintel.
- **Cripples:** montantes cortos sobre el dintel y bajo el antepecho, a la modulación.
- **"Corte de 10":** la solera del vano se corta a largo = **ancho del vano + 20 cm**; se cortan las
  alas a 10 cm de cada extremo y se pliegan 90° → pestañas que atornillan a jacks/king.

## 5. Vigas / entrepisos

- Viguetas perfil C serie V (150–300 mm). Apoyo extremo ≥ 38 mm, interior ≥ 90 mm.
- **Atiesadores de apoyo (web stiffeners)** en TODOS los apoyos de vigueta.
- Voladizo ≤ 600 mm; mayor requiere viguetas dobles (cajón / espalda con espalda).

## 6. Arriostramiento

- **Cruz de San Andrés** con fleje/cinta galvanizada: ancho ≥ **32 mm**, esp. ≥ **0,84 mm**, a **30–60°**.
- Trabaja **sólo a tracción** → dos diagonales en X, **pretensadas**.
- Tensión en el fleje: **Tf = W / cos α** (a 45° ≈ 1,41·W).
- Alternativa: **OSB ≥ 15 mm** como diafragma estructural.

## 7. Emplacado OSB

- Placas 1,22 × 2,44; **trabadas** (juntas nunca alineadas; fila superior corrida ½ placa).
- Fijación Nº8: **150 mm en bordes, 300 mm en campo**.
- PMD: corte en martillo en vanos + solape de 0,30 m sobre el panel vecino.

## 8. Cubiertas

- Cabios C (V1–V5 / M) @ 400–600 mm; OSB de techo ≥ 12 mm; chapa a medida.
- Cabriadas reticuladas para luces mayores; correas @ ≤ 600 mm.

## 9. Fijaciones y anclajes

- Tornillos autoperforantes Nº6 (Ø3,5), **Nº8 (Ø3,8)**, Nº10 (Ø4,8)… acero-acero: mín. 2 por unión.
- Largo = espesor total + 10–12 mm (mín. 3 hilos pasados).
- Anclaje a platea: **varilla roscada química** (M8–M12, 20–30 cm) o **fleje galvanizado**;
  en esquinas y cada **1,2–1,5 m** (2–3 por panel de 2,4 m).

---

## Propuestas de mejora al motor (requieren OK de Augusto)

Mapeadas al manual. NINGUNA aplicada todavía — la lógica actual del motor no se tocó.

| # | Cambio propuesto | Fuente | Impacto |
|---|------------------|--------|---------|
| **P1** | Encuentro en T = **3 PGC** (Triple) en vez de 2 | AD Barbieri §2.3.2; ILAFA E6 | +1 PGC por T en el cómputo |
| **P2** | Agregar **solera de dintel PGU** + formalizar **"corte de 10"** en soleras de vano | AD Barbieri §3.1.1/§3.1.4 | +PGU por vano; fichas más fieles |
| **P3** | **Cómputo de tornillería** (Nº8 acero-acero + OSB @150/300) y **anclajes a platea** | ILAFA B3, E2; D2-2 | nuevas líneas de cómputo |
| **P4** | **Arriostramiento en X** opcional por paño no emplacado (fleje 32×0,84, 45°, Tf=W/cosα) | ambos | nuevo material + diagrama en ficha |
| **P5** | Cantidad de **jacks ≈ montantes interrumpidos ÷ 2** (hoy 1 fijo) | AD Barbieri §3.1.2 | dintel más real en vanos anchos |
| **P6** | **Selector de perfil/espesor** (PGC 90/100, 0,89/1,2) y modulación 400/600 | tablas de perfiles | flexibilidad + cómputo por kg real |

> Recomendación: arrancar por **P3 + P4** (aditivos, no cambian la estructura actual de los
> paneles) y dejar **P1/P2/P5** para revisar juntos contra la práctica real de PMD.
