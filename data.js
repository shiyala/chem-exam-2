// Content for the CHM 10100 Exam 2 study site.
// Notation used by the renderer: {Formula} = chemical formula (digits become subscripts, ^2+ becomes a charge),
// [[1s2 2s2 2p6]] = electron configuration (digits after s/p/d/f become superscripts), 10^-3 = exponent.

const EXAM = {
  title: "CHM 10100 Exam 2",
  start: "2026-11-09T18:00:00Z", // Mon Nov 9, 1:00 PM Eastern
  end: "2026-11-09T18:50:00Z",
  facts: [
    ["When", "Monday, Nov 9, 1:00 to 1:50 PM, in the regular class session. Arriving late gets no extra time."],
    ["Covers", "Ch 3 (solutions only), Ch 4, Ch 5 and Ch 6 (light, the quantum mechanical model and electron configurations only; no periodic trends). Naming, unit conversions and mole calculations from earlier chapters still apply."],
    ["Format", "Open-ended, like the in-class questions and Lumen. Show your work: partial credit is given."],
    ["Equation sheet", "Provided as part of the exam (D2L > Course Information > Student Resources). Look at it before Monday."],
    ["Calculator", "Bring your own. No phone, computer or tablet, and no sharing."]
  ],
  plan: [
    ["Thu Nov 5", "Habits checklist, then Ch 3 and Ch 4 study lists. Practice problems 1 to 9. Drills: solubility, oxidation numbers, sig figs."],
    ["Fri Nov 6", "Problems 10 to 13 (stoichiometry, titration), then the Ch 5 list and problems 14 to 19. Drills: calorimetry and molarity."],
    ["Sat Nov 7", "Ch 6 list and problems 20 to 23, which match the Ch 6 Part 1 homework: 20 is electromagnetic energy, 21 the Bohr model, 22 and 23 electron configurations. Do each homework section right after its problem. Work everything on the calculator you'll bring Monday. Drills: electron configurations, quantum numbers, photon energy, Bohr. Read the equation sheet."],
    ["Sun Nov 8", "Redo every problem you marked missed, then the 50-minute mock exam. The Ch 6 Part 1 homework is due by 11:59 PM."],
    ["Mon Nov 9", "Calculator, pencil, arrive early. Run the habits checklist on every answer."]
  ]
};

const EXAM1 = {
  summary: "Exam 1 scored 92/100. All 8 lost points were bookkeeping or reading slips, not gaps in the chemistry: units and sig figs (2 points), physical vs chemical properties (4 points), and skipping an answer choice (2 points).",
  rows: [
    { q: "2", lost: 0.5, what: "Answer 2.34e6 written with no units.", right: "2.34 × 10^6 µL/s", fix: "Every final answer gets a unit, even after a perfect setup." },
    { q: "3", lost: 2, what: "Picked boiling point as a chemical property.", right: "a. Flammable", fix: "Chemical property = shows only when the substance becomes something new (burns, rusts, reacts)." },
    { q: "11", lost: 1, what: "Wrote 89.5620 with no units (6 sig figs).", right: "89.562 amu", fix: "The % data have 5 sig figs, so the answer gets 5. Write amu." },
    { q: "12", lost: 2, what: "Marked wrong. The choices marked (never found pure in nature; turns black in air) are both chemical.", right: "d. Solid at 25 °C, melts at 98 °C", fix: "Reacting with air or water is chemical. State and melting point are physical." },
    { q: "14", lost: 0.5, what: "526.8 with no units.", right: "{PbBr4}, 526.8 g/mol", fix: "Molar mass is always g/mol." },
    { q: "18", lost: 2, what: "Marked wrong. The work shows numbers for a, c, d and e, but none for b.", right: "b. 1.087 mol {CoCl3} = 6.546 × 10^23 Co atoms", fix: "Work every option in a smallest/largest question. Count atoms per formula unit ({Co2O3} has 2 Co)." }
  ],
  nearMisses: [
    "Q15: 55.85 ÷ 183.54 × 100 = 30.43%, not 30.42%. Round once, at the end, from the full calculator value.",
    "Q19: the scratch work shows 6.28 mol C; it is 6.228. Copy digits off the calculator carefully when you divide again."
  ]
};

const HABITS = [
  ["Unit on the answer", "g/mol, mol, M, mL, J or kJ, kJ/mol, nm, Hz, amu. No bare numbers."],
  ["Sig figs", "× and ÷ keep the fewest sig figs; + and − keep the fewest decimal places. Exact numbers (coefficients, 100, 1000 mL/L) never limit you."],
  ["Round once", "Keep the full calculator value through every step. Round only the final answer."],
  ["Sign and direction", "q and ΔH are negative when heat leaves the system. Say released or absorbed when asked for heat."],
  ["Every option", "In smallest/largest questions, calculate all of them, then compare."],
  ["Read the verb", "\"Write AND calculate\" means two answers. Box each one."],
  ["Scientific notation", "2.34 × 10^6, not 2.34e6. One digit before the decimal point."]
];

const STUDY = [
  { ch: "Ch 3", title: "Solutions (only this part of Ch 3)", probs: "1–3", groups: [
    { name: "Concentration", items: [
      "Solute, solvent, solution; concentrated vs dilute.",
      "Molarity: M = mol solute ÷ L solution. mL ÷ 1000 = L. Rearrange for mol (M × L) and volume (mol ÷ M).",
      "Making a solution from a solid: M × L = mol, then mol × molar mass = grams to weigh.",
      "Dilution: M<sub>1</sub>V<sub>1</sub> = M<sub>2</sub>V<sub>2</sub>. Moles of solute don't change when you add water.",
      "Mass percent: g solute ÷ g solution × 100 (solution = solute + solvent).",
      "Volume percent and mass-volume percent (g solute ÷ mL solution × 100).",
      "ppm = g solute ÷ g solution × 10^6; ppb uses 10^9. For dilute water solutions 1 ppm ≈ 1 mg/L.",
      "Ion concentrations: 0.10 M {CaCl2} gives 0.10 M {Ca^2+} and 0.20 M {Cl^−}."
    ]}
  ]},
  { ch: "Ch 4", title: "Reactions and stoichiometry", probs: "4–13", groups: [
    { name: "Equations and reaction types", items: [
      "Balance by atom count; keep polyatomic ions together. Lowest whole-number coefficients. Add states (s), (l), (g), (aq).",
      "Names to formulas before balancing: iron(III) chloride = {FeCl3}. Charges must cancel in the formula.",
      "Classify: combination, decomposition, single replacement, double replacement (precipitation, acid-base, gas-forming), combustion."
    ]},
    { name: "Precipitation and net ionic equations", table: true, items: [
      "Molecular → complete ionic → net ionic. Split only soluble ionic compounds (aq) and strong acids.",
      "Never split solids, liquids, gases, water or weak acids.",
      "Cross out spectator ions; the net ionic equation must balance atoms and charge.",
      "No precipitate, gas or water = NR (no reaction)."
    ]},
    { name: "Acids and bases", items: [
      "Strong acids: {HCl}, {HBr}, {HI}, {HNO3}, {H2SO4}, {HClO4}. Everything else is weak and stays together.",
      "Strong bases: Group 1 hydroxides plus {Ca(OH)2}, {Sr(OH)2}, {Ba(OH)2}. {NH3} is weak.",
      "Strong acid + strong base net ionic: {H^+}(aq) + {OH^−}(aq) → {H2O}(l).",
      "Gas-forming: carbonate + acid → {CO2}(g) + {H2O}(l); {NH4^+} + {OH^−} → {NH3}(g) + {H2O}(l)."
    ]},
    { name: "Redox", items: [
      "Oxidation numbers: element alone = 0; monatomic ion = its charge; O = −2 (peroxides −1); H = +1 with nonmetals; F = −1; sum = overall charge.",
      "Oxidation = loses electrons (number goes up). Reduction = gains (number goes down). OIL RIG.",
      "Oxidizing agent = the species reduced. Reducing agent = the species oxidized."
    ]},
    { name: "Stoichiometry, yield and analysis", items: [
      "Road map: g → mol (÷ molar mass) → mol of other substance (coefficient ratio) → g (× molar mass).",
      "Limiting reactant: work out the product from each reactant; the smaller amount wins.",
      "Excess left = starting amount − amount used by the limiting reactant.",
      "Percent yield = actual ÷ theoretical × 100.",
      "Titration: mol = M × V(L), mole ratio, then M = mol ÷ V(L). Watch 2:1 ratios like {H2SO4} + 2{NaOH}.",
      "Gravimetric analysis: precipitate mass → mol → mass of the element → mass percent in the sample."
    ]}
  ]},
  { ch: "Ch 5", title: "Thermochemistry", probs: "14–19", groups: [
    { name: "Heat and calorimetry", items: [
      "System vs surroundings. Exothermic: heat leaves the system, q and ΔH negative. Endothermic: reverse.",
      "q = m × c × ΔT, with ΔT = T<sub>final</sub> − T<sub>initial</sub>. Water c = 4.184 J/g·°C.",
      "Calorimetry: heat lost by hot = heat gained by cold, q(metal) = −q(water).",
      "Coffee-cup: q(rxn) = −q(solution); divide by moles reacted for ΔH in kJ/mol.",
      "First law: ΔU = q + w. Heat absorbed is +q; work done by the system is −w (w = −PΔV)."
    ]},
    { name: "Enthalpy", items: [
      "ΔH goes with the moles written. Reverse the equation: flip the sign. Multiply: multiply ΔH.",
      "Heat from a mass: g → mol → × (ΔH ÷ moles in the equation).",
      "Hess's law: flip and scale the given equations until they add up to the target; do the same to their ΔH.",
      "ΔH°<sub>rxn</sub> = ΣnΔH°<sub>f</sub>(products) − ΣnΔH°<sub>f</sub>(reactants). Elements in standard state = 0.",
      "J vs kJ: divide by 1000; never mix them in one equation."
    ]}
  ]},
  { ch: "Ch 6", title: "Light, quantum model, configurations (no periodic trends)", probs: "20–23", groups: [
    { name: "Light and the atom", items: [
      "c = λν, c = 2.998 × 10^8 m/s. λ in meters (nm × 10^−9); ν in Hz (s^−1).",
      "E = hν = hc/λ, h = 6.626 × 10^−34 J·s. Per photon; × 6.022 × 10^23 for per mole.",
      "Spectrum by energy: radio < microwave < IR < visible (red ~700 nm, violet ~400 nm) < UV < X-ray < gamma.",
      "Photoelectric effect: below the threshold frequency no electrons, however bright. Brightness = how many; frequency = their energy.",
      "Bohr (H): E<sub>n</sub> = −2.179 × 10^−18 J ÷ n^2. Emission = drop to lower n; absorption = jump up. Lines ending at n = 2 are visible."
    ]},
    { name: "Quantum mechanical model", items: [
      "n = 1, 2, 3…; l = 0 to n − 1 (s, p, d, f); m<sub>l</sub> = −l to +l; m<sub>s</sub> = ±½.",
      "Orbitals per subshell: s 1, p 3, d 5, f 7. 2 electrons per orbital. 2n^2 electrons per shell; n^2 orbitals.",
      "Shapes: s sphere, p dumbbell. Heisenberg: orbitals are probability regions, not paths."
    ]},
    { name: "Electron configuration", items: [
      "Order: [[1s 2s 2p 3s 3p 4s 3d 4p 5s 4d 5p 6s 4f 5d 6p]] (read the periodic table by block).",
      "Pauli: 2 electrons per orbital, opposite spins. Hund: fill singly before pairing.",
      "Noble gas shorthand: Fe = [[[Ar] 4s2 3d6]].",
      "Exceptions: Cr = [[[Ar] 4s1 3d5]], Cu = [[[Ar] 4s1 3d10]].",
      "Cations lose electrons from the highest n first: 4s before 3d. {Fe^3+} = [[[Ar] 3d5]].",
      "Valence electrons and unpaired electrons from an orbital diagram."
    ]}
  ]}
];

const SOLUBILITY_TABLE = [
  ["Group 1 ({Li^+}, {Na^+}, {K^+}), {NH4^+}", "Soluble", "None"],
  ["{NO3^−}, {C2H3O2^−}, {ClO3^−}, {ClO4^−}", "Soluble", "None"],
  ["{Cl^−}, {Br^−}, {I^−}", "Soluble", "Insoluble with {Ag^+}, {Pb^2+}, {Hg2^2+}"],
  ["{SO4^2−}", "Soluble", "Insoluble with {Ba^2+}, {Pb^2+}, {Sr^2+}, {Ca^2+} (slightly), {Hg2^2+}"],
  ["{CO3^2−}, {PO4^3−}, {S^2−}", "Insoluble", "Soluble with Group 1 and {NH4^+}"],
  ["{OH^−}", "Insoluble", "Soluble with Group 1 and {NH4^+}; {Ca^2+}, {Sr^2+}, {Ba^2+} slightly"]
];

// Numeric check: {label, value, sf (null = any), units:[accepted], abs:true to accept sign-free, tol (relative)}
// Text check: {label, text:[accepted answers], hint}
const PROBLEMS = [
  // ---------- Ch 3 ----------
  { n: 1, ch: "Ch 3", topic: "Molarity",
    q: "(a) 4.50 g {NaCl} is dissolved in water to make 250.0 mL of solution. Calculate the molarity.<br>(b) How many grams of {NaCl} are needed to make 500.0 mL of 0.150 M {NaCl}?",
    checks: [
      { label: "(a)", value: 0.308, sf: 3, units: ["M", "mol/L"] },
      { label: "(b)", value: 4.38, sf: 3, units: ["g"] }
    ],
    hint: "Grams → moles with the molar mass of NaCl (58.44 g/mol), then divide by liters.",
    sol: "(a) {NaCl} = 22.99 + 35.45 = 58.44 g/mol. 4.50 g ÷ 58.44 g/mol = 0.07700 mol. 0.07700 mol ÷ 0.2500 L = <b>0.308 M</b> (3 sig figs from 4.50 g).<br>(b) 0.150 mol/L × 0.5000 L = 0.07500 mol × 58.44 g/mol = <b>4.38 g</b>." },
  { n: 2, ch: "Ch 3", topic: "Dilution",
    q: "(a) How many mL of 6.00 M {HCl} are needed to make 500.0 mL of 0.250 M {HCl}?<br>(b) 25.0 mL of 2.50 M {KNO3} is diluted to 150.0 mL. What is the new molarity?",
    checks: [
      { label: "(a)", value: 20.8, sf: 3, units: ["mL"] },
      { label: "(b)", value: 0.417, sf: 3, units: ["M", "mol/L"] }
    ],
    hint: "M₁V₁ = M₂V₂. Volumes just need the same unit on both sides.",
    sol: "(a) V₁ = (0.250 M × 500.0 mL) ÷ 6.00 M = <b>20.8 mL</b>.<br>(b) M₂ = (2.50 M × 25.0 mL) ÷ 150.0 mL = <b>0.417 M</b>." },
  { n: 3, ch: "Ch 3", topic: "Other concentration units",
    q: "(a) A 250.0 g water sample contains 0.0042 g of lead. Express the lead concentration in ppm.<br>(b) 15.0 g of sucrose is dissolved in 135.0 g of water. Calculate the mass percent of sucrose.<br>(c) What is the molarity of {Cl^−} in 0.150 M {CaCl2}?",
    checks: [
      { label: "(a)", value: 17, sf: 2, units: ["ppm"] },
      { label: "(b)", value: 10.0, sf: 3, units: ["%"] },
      { label: "(c)", value: 0.300, sf: 3, units: ["M", "mol/L"] }
    ],
    hint: "Solution mass = solute + solvent. Each {CaCl2} gives two chloride ions.",
    sol: "(a) 0.0042 ÷ 250.0 × 10^6 = <b>17 ppm</b> (2 sig figs from 0.0042).<br>(b) 15.0 ÷ (15.0 + 135.0) × 100 = <b>10.0%</b>.<br>(c) 2 × 0.150 M = <b>0.300 M {Cl^−}</b>." },
  // ---------- Ch 4 ----------
  { n: 4, ch: "Ch 4", topic: "Balancing",
    q: "Balance (type the coefficients separated by commas, use 1 where needed):<br>(a) {C4H10} + {O2} → {CO2} + {H2O}<br>(b) Al + {O2} → {Al2O3}<br>(c) {Fe2O3} + CO → Fe + {CO2}<br>(d) {Ca(OH)2} + {H3PO4} → {Ca3(PO4)2} + {H2O}",
    checks: [
      { label: "(a)", text: ["2,13,8,10"] },
      { label: "(b)", text: ["4,3,2"] },
      { label: "(c)", text: ["1,3,2,3"] },
      { label: "(d)", text: ["3,2,1,6"] }
    ],
    hint: "Balance C, then H, then O last. An odd number of O atoms means double everything. Keep {PO4} together.",
    sol: "(a) <b>2</b>{C4H10} + <b>13</b>{O2} → <b>8</b>{CO2} + <b>10</b>{H2O}<br>(b) <b>4</b>Al + <b>3</b>{O2} → <b>2</b>{Al2O3}<br>(c) {Fe2O3} + <b>3</b>CO → <b>2</b>Fe + <b>3</b>{CO2}<br>(d) <b>3</b>{Ca(OH)2} + <b>2</b>{H3PO4} → {Ca3(PO4)2} + <b>6</b>{H2O}" },
  { n: 5, ch: "Ch 4", topic: "Precipitation, net ionic",
    q: "For each pair of aqueous solutions, write the balanced molecular, complete ionic and net ionic equations, or write NR. Name any precipitate.<br>(a) lead(II) nitrate + potassium iodide<br>(b) iron(III) chloride + sodium hydroxide<br>(c) sodium nitrate + potassium chloride",
    checks: [
      { label: "(a) precipitate formula", text: ["PbI2"] },
      { label: "(b) precipitate formula", text: ["Fe(OH)3"] },
      { label: "(c) reaction or NR?", text: ["NR", "no reaction"] }
    ],
    hint: "Swap partners, then check each product against the solubility rules. Only (aq) strong electrolytes get split.",
    sol: "(a) {Pb(NO3)2}(aq) + 2{KI}(aq) → {PbI2}(s) + 2{KNO3}(aq)<br>Complete: {Pb^2+} + 2{NO3^−} + 2{K^+} + 2{I^−} → {PbI2}(s) + 2{K^+} + 2{NO3^−}<br>Net: <b>{Pb^2+}(aq) + 2{I^−}(aq) → {PbI2}(s)</b>, lead(II) iodide (yellow).<br><br>(b) {FeCl3}(aq) + 3{NaOH}(aq) → {Fe(OH)3}(s) + 3{NaCl}(aq)<br>Complete: {Fe^3+} + 3{Cl^−} + 3{Na^+} + 3{OH^−} → {Fe(OH)3}(s) + 3{Na^+} + 3{Cl^−}<br>Net: <b>{Fe^3+}(aq) + 3{OH^−}(aq) → {Fe(OH)3}(s)</b>, iron(III) hydroxide.<br><br>(c) <b>NR</b>. {NaCl} and {KNO3} are both soluble, so every ion is a spectator." },
  { n: 6, ch: "Ch 4", topic: "Solubility rules",
    q: "Soluble or insoluble in water? {AgCl}, {K2CO3}, {BaSO4}, {Mg(OH)2}, {NH4NO3}, {CaCO3}, {PbCl2}, {Na3PO4}<br><span class='muted'>Type S or I for each, in order, separated by commas.</span>",
    checks: [ { label: "Answers", text: ["I,S,I,I,S,I,I,S"] } ],
    hint: "Group 1 and ammonium compounds are always soluble. Check the exceptions for chloride and sulfate.",
    sol: "{AgCl} <b>insoluble</b>; {K2CO3} <b>soluble</b> (Group 1); {BaSO4} <b>insoluble</b>; {Mg(OH)2} <b>insoluble</b>; {NH4NO3} <b>soluble</b>; {CaCO3} <b>insoluble</b>; {PbCl2} <b>insoluble</b>; {Na3PO4} <b>soluble</b> (Group 1)." },
  { n: 7, ch: "Ch 4", topic: "Acid-base, gas-forming",
    q: "Write the molecular and net ionic equations:<br>(a) sulfuric acid + sodium hydroxide<br>(b) acetic acid ({HC2H3O2}) + potassium hydroxide<br>(c) sodium carbonate + hydrochloric acid",
    checks: [ { label: "(c) gas formed", text: ["CO2"] } ],
    hint: "Weak acids stay together in the net ionic equation. Carbonate + acid makes a gas.",
    sol: "(a) {H2SO4}(aq) + 2{NaOH}(aq) → {Na2SO4}(aq) + 2{H2O}(l). Net: <b>{H^+}(aq) + {OH^−}(aq) → {H2O}(l)</b>.<br>(b) {HC2H3O2}(aq) + {KOH}(aq) → {KC2H3O2}(aq) + {H2O}(l). Net: <b>{HC2H3O2}(aq) + {OH^−}(aq) → {C2H3O2^−}(aq) + {H2O}(l)</b>.<br>(c) {Na2CO3}(aq) + 2{HCl}(aq) → 2{NaCl}(aq) + {H2O}(l) + {CO2}(g). Net: <b>{CO3^2−}(aq) + 2{H^+}(aq) → {H2O}(l) + {CO2}(g)</b>." },
  { n: 8, ch: "Ch 4", topic: "Oxidation numbers, redox",
    q: "(a) Assign the oxidation number of: Cr in {K2Cr2O7}, S in {SO4^2−}, N in {NH4^+}, Mn in {MnO4^−}, C in {CO2}.<br>(b) For Zn(s) + {CuSO4}(aq) → {ZnSO4}(aq) + Cu(s), name what is oxidized, what is reduced, the oxidizing agent and the reducing agent.",
    checks: [
      { label: "Cr", value: 6, sf: null, units: null, exact: true },
      { label: "S", value: 6, sf: null, units: null, exact: true },
      { label: "N", value: -3, sf: null, units: null, exact: true },
      { label: "Mn", value: 7, sf: null, units: null, exact: true },
      { label: "C", value: 4, sf: null, units: null, exact: true },
      { label: "(b) oxidized", text: ["Zn"] }
    ],
    hint: "Set the unknown as x and make the sum equal the overall charge.",
    sol: "(a) Cr <b>+6</b> (2(+1) + 2x + 7(−2) = 0). S <b>+6</b>. N <b>−3</b>. Mn <b>+7</b>. C <b>+4</b>.<br>(b) Zn goes 0 → +2: <b>Zn is oxidized</b> and is the <b>reducing agent</b>. Cu goes +2 → 0: <b>{Cu^2+} is reduced</b> and is the <b>oxidizing agent</b>." },
  { n: 9, ch: "Ch 4", topic: "Classifying reactions",
    q: "Classify each: combination, decomposition, single replacement, precipitation, acid-base, combustion.<br>(a) 2{H2O2}(l) → 2{H2O}(l) + {O2}(g)<br>(b) {C3H8}(g) + 5{O2}(g) → 3{CO2}(g) + 4{H2O}(l)<br>(c) {AgNO3}(aq) + {NaCl}(aq) → {AgCl}(s) + {NaNO3}(aq)<br>(d) {HNO3}(aq) + {KOH}(aq) → {KNO3}(aq) + {H2O}(l)<br>(e) Zn(s) + 2{HCl}(aq) → {ZnCl2}(aq) + {H2}(g)<br>(f) 2Na(s) + {Cl2}(g) → 2{NaCl}(s)",
    checks: [],
    hint: "One reactant breaking apart = decomposition. Fuel + O₂ = combustion.",
    sol: "(a) <b>decomposition</b> (b) <b>combustion</b> (c) <b>precipitation</b> (d) <b>acid-base</b> (e) <b>single replacement</b> (f) <b>combination</b>. (a), (e) and (f) are also redox." },
  { n: 10, ch: "Ch 4", topic: "Limiting reactant, yield",
    q: "2Al(s) + 3{Cl2}(g) → 2{AlCl3}(s). 10.0 g Al reacts with 25.0 g {Cl2}.<br>(a) Which reactant is limiting?<br>(b) Theoretical yield of {AlCl3} in grams?<br>(c) If 25.6 g {AlCl3} is collected, what is the percent yield?<br>(d) How many grams of the excess reactant are left over?",
    checks: [
      { label: "(a)", text: ["Cl2"] },
      { label: "(b)", value: 31.3, sf: 3, units: ["g"] },
      { label: "(c)", value: 81.7, sf: 3, units: ["%"] },
      { label: "(d)", value: 3.7, sf: 2, units: ["g"] }
    ],
    hint: "Work out moles of AlCl₃ from each reactant. Molar masses: Al 26.98, Cl₂ 70.90, AlCl₃ 133.33 g/mol.",
    sol: "Al: 10.0 ÷ 26.98 = 0.3706 mol. {Cl2}: 25.0 ÷ 70.90 = 0.3526 mol.<br>(a) {AlCl3} from Al: 0.3706 × 2/2 = 0.3706 mol. From {Cl2}: 0.3526 × 2/3 = 0.2351 mol. <b>{Cl2} is limiting</b>.<br>(b) 0.2351 mol × 133.33 g/mol = <b>31.3 g</b>.<br>(c) 25.6 ÷ 31.34 × 100 = <b>81.7%</b>.<br>(d) Al used = 0.2351 × 26.98 = 6.34 g. Left = 10.0 − 6.34 = <b>3.7 g Al</b> (tenths place from 10.0 g)." },
  { n: 11, ch: "Ch 4", topic: "Titration",
    q: "(a) 25.00 mL of {HCl} is titrated to the endpoint with 31.42 mL of 0.1050 M {NaOH}. Calculate the molarity of the {HCl}.<br>(b) 20.00 mL of {H2SO4} needs 18.75 mL of 0.2000 M {NaOH}. Calculate the molarity of the {H2SO4}.",
    checks: [
      { label: "(a)", value: 0.1320, sf: 4, units: ["M", "mol/L"] },
      { label: "(b)", value: 0.09375, sf: 4, units: ["M", "mol/L"] }
    ],
    hint: "mol titrant = M × V(L). {H2SO4} + 2{NaOH}: half as many moles of acid.",
    sol: "(a) 0.1050 M × 0.03142 L = 3.299 × 10^−3 mol {NaOH} = mol {HCl}. ÷ 0.02500 L = <b>0.1320 M</b>.<br>(b) 0.2000 × 0.01875 = 3.750 × 10^−3 mol {NaOH}; ÷ 2 = 1.875 × 10^−3 mol {H2SO4}; ÷ 0.02000 L = <b>0.09375 M</b>." },
  { n: 12, ch: "Ch 4", topic: "Gravimetric analysis",
    q: "A 0.5000 g sample containing chloride is dissolved and treated with excess {AgNO3}. The dried {AgCl} weighs 1.0352 g. Calculate the mass percent of chlorine in the sample.",
    checks: [ { label: "% Cl", value: 51.21, sf: 4, units: ["%"] } ],
    hint: "mol AgCl = mol Cl. AgCl = 143.32 g/mol.",
    sol: "1.0352 g ÷ 143.32 g/mol = 7.223 × 10^−3 mol {AgCl} = mol Cl. × 35.45 g/mol = 0.2561 g Cl. ÷ 0.5000 g × 100 = <b>51.21%</b>." },
  { n: 13, ch: "Ch 4", topic: "Solution stoichiometry",
    q: "{Pb(NO3)2}(aq) + 2{KI}(aq) → {PbI2}(s) + 2{KNO3}(aq)<br>(a) What volume in mL of 0.150 M {Pb(NO3)2} reacts exactly with 50.0 mL of 0.200 M {KI}?<br>(b) What mass of {PbI2} forms?",
    checks: [
      { label: "(a)", value: 33.3, sf: 3, units: ["mL"] },
      { label: "(b)", value: 2.31, sf: 3, units: ["g"] }
    ],
    hint: "1 {Pb(NO3)2} : 2 {KI}. {PbI2} = 461.0 g/mol.",
    sol: "(a) 0.200 M × 0.0500 L = 0.0100 mol {KI} → 0.00500 mol {Pb(NO3)2}. ÷ 0.150 M = 0.0333 L = <b>33.3 mL</b>.<br>(b) 0.00500 mol × 461.0 g/mol = <b>2.31 g {PbI2}</b>." },
  // ---------- Ch 5 ----------
  { n: 14, ch: "Ch 5", topic: "q = mcΔT",
    q: "How much heat, in J, does it take to warm 125 g of water from 22.0 °C to 85.5 °C?",
    checks: [ { label: "q", value: 33200, sf: 3, units: ["J"] } ],
    hint: "ΔT = final − initial. Water c = 4.184 J/g·°C.",
    sol: "q = 125 g × 4.184 J/g·°C × 63.5 °C = <b>3.32 × 10^4 J</b> (33.2 kJ)." },
  { n: 15, ch: "Ch 5", topic: "Calorimetry (specific heat)",
    q: "A 45.0 g piece of metal at 98.00 °C is dropped into 100.0 g of water at 20.00 °C. The final temperature is 26.47 °C. Calculate the specific heat of the metal.",
    checks: [ { label: "c", value: 0.841, sf: 3, units: ["J/g°C", "J/g·°C", "J/(g°C)", "J/(g·°C)", "J/gC", "J/g*°C", "J/g*C"] } ],
    hint: "q(metal) = −q(water). Find q(water) first.",
    sol: "q(water) = 100.0 × 4.184 × (26.47 − 20.00) = +2707 J. q(metal) = −2707 J = 45.0 × c × (26.47 − 98.00). c = 2707 ÷ (45.0 × 71.53) = <b>0.841 J/g·°C</b>." },
  { n: 16, ch: "Ch 5", topic: "Coffee-cup ΔH",
    q: "In a coffee-cup calorimeter, 50.0 mL of 1.00 M {HCl} and 50.0 mL of 1.00 M {NaOH}, both at 22.15 °C, are mixed. The temperature rises to 28.88 °C. Density 1.00 g/mL, c = 4.184 J/g·°C. Calculate ΔH in kJ per mole of water formed.",
    checks: [ { label: "ΔH", value: -56.3, sf: 3, units: ["kJ/mol"] } ],
    hint: "Total mass is 100.0 g. q(rxn) = −q(solution). Moles of water = moles of acid.",
    sol: "q(soln) = 100.0 × 4.184 × 6.73 = 2816 J. q(rxn) = −2.816 kJ. mol {H2O} = 0.0500 L × 1.00 M = 0.0500 mol. ΔH = −2.816 ÷ 0.0500 = <b>−56.3 kJ/mol</b>." },
  { n: 17, ch: "Ch 5", topic: "Thermochemical equations, ΔU",
    q: "{CH4}(g) + 2{O2}(g) → {CO2}(g) + 2{H2O}(l), ΔH = −890.4 kJ<br>(a) Exothermic or endothermic? Which way does heat flow?<br>(b) How much heat is released when 25.0 g of {CH4} burns?<br>(c) A gas absorbs 250 J of heat and does 75 J of work on its surroundings. Calculate ΔU.",
    checks: [
      { label: "(a)", text: ["exothermic", "exo"] },
      { label: "(b) heat released", value: 1390, sf: 3, units: ["kJ"], abs: true },
      { label: "(c)", value: 175, sf: 3, units: ["J"] }
    ],
    hint: "{CH4} = 16.04 g/mol. ΔU = q + w; work done BY the system is negative.",
    sol: "(a) ΔH < 0: <b>exothermic</b>, heat flows from the system to the surroundings.<br>(b) 25.0 ÷ 16.04 = 1.559 mol × 890.4 kJ/mol = <b>1.39 × 10^3 kJ released</b>.<br>(c) q = +250 J, w = −75 J. ΔU = <b>+175 J</b>." },
  { n: 18, ch: "Ch 5", topic: "Hess's law",
    q: "Find ΔH for 2C(s) + {H2}(g) → {C2H2}(g), given:<br>C(s) + {O2}(g) → {CO2}(g), ΔH = −393.5 kJ<br>{H2}(g) + ½{O2}(g) → {H2O}(l), ΔH = −285.8 kJ<br>{C2H2}(g) + 5/2 {O2}(g) → 2{CO2}(g) + {H2O}(l), ΔH = −1299.6 kJ",
    checks: [ { label: "ΔH", value: 226.8, sf: 4, units: ["kJ"] } ],
    hint: "{C2H2} is a product in the target, so the third equation gets reversed.",
    sol: "Double eq. 1 (−787.0 kJ), keep eq. 2 (−285.8 kJ), reverse eq. 3 (+1299.6 kJ). {CO2}, {H2O} and {O2} cancel. ΔH = −787.0 − 285.8 + 1299.6 = <b>+226.8 kJ</b>." },
  { n: 19, ch: "Ch 5", topic: "Enthalpy of formation",
    q: "(a) Calculate ΔH°<sub>rxn</sub> for {C2H5OH}(l) + 3{O2}(g) → 2{CO2}(g) + 3{H2O}(l). ΔH°<sub>f</sub> (kJ/mol): {C2H5OH}(l) −277.6, {CO2}(g) −393.5, {H2O}(l) −285.8.<br>(b) How much heat is released when 10.0 g of ethanol burns?",
    checks: [
      { label: "(a)", value: -1366.8, sf: 5, units: ["kJ"] },
      { label: "(b) heat released", value: 297, sf: 3, units: ["kJ"], abs: true }
    ],
    hint: "Products minus reactants, each × its coefficient. {O2} is 0. Ethanol = 46.07 g/mol.",
    sol: "(a) Products: 2(−393.5) + 3(−285.8) = −1644.4 kJ. Reactants: −277.6 kJ. ΔH = −1644.4 − (−277.6) = <b>−1366.8 kJ</b>.<br>(b) 10.0 ÷ 46.07 = 0.2171 mol × 1366.8 = <b>297 kJ released</b>." },
  // ---------- Ch 6 ----------
  { n: 20, ch: "Ch 6", topic: "Light: λ, ν, E",
    q: "Hydrogen gives off light at 486.1 nm. Calculate (a) its frequency, (b) the energy of one photon, (c) the energy of one mole of photons in kJ/mol. (d) Which region of the spectrum is it in?",
    checks: [
      { label: "(a)", value: 6.167e14, sf: 4, units: ["Hz", "s^-1", "1/s", "/s", "s-1"] },
      { label: "(b)", value: 4.087e-19, sf: 4, units: ["J"], tol: 0.002 },
      { label: "(c)", value: 246.1, sf: 4, units: ["kJ/mol"], tol: 0.002 },
      { label: "(d)", text: ["visible"] }
    ],
    hint: "Convert nm to m first (× 10^−9).",
    sol: "(a) ν = 2.998 × 10^8 ÷ 486.1 × 10^−9 = <b>6.167 × 10^14 Hz</b>.<br>(b) E = 6.626 × 10^−34 × 6.167 × 10^14 = <b>4.087 × 10^−19 J</b>.<br>(c) × 6.022 × 10^23 = 2.461 × 10^5 J/mol = <b>246.1 kJ/mol</b>.<br>(d) <b>Visible</b> (blue-green)." },
  { n: 21, ch: "Ch 6", topic: "Bohr model",
    q: "An electron in a hydrogen atom moves from n = 4 to n = 2.<br>(a) Emitted or absorbed?<br>(b) Calculate the photon's energy.<br>(c) Calculate its wavelength in nm.<br>(d) Would n = 3 → n = 2 give a longer or shorter wavelength?",
    checks: [
      { label: "(a)", text: ["emitted", "emission"] },
      { label: "(b)", value: 4.086e-19, sf: 4, units: ["J"], tol: 0.002 },
      { label: "(c)", value: 486.2, sf: 4, units: ["nm"], tol: 0.002 },
      { label: "(d)", text: ["longer"] }
    ],
    hint: "ΔE = 2.179 × 10^−18 J × (1/n_low² − 1/n_high²). Then λ = hc/E.",
    sol: "(a) <b>Emitted</b> (drop to lower n).<br>(b) 2.179 × 10^−18 × (1/4 − 1/16) = <b>4.086 × 10^−19 J</b>.<br>(c) λ = (6.626 × 10^−34 × 2.998 × 10^8) ÷ 4.086 × 10^−19 = 4.862 × 10^−7 m = <b>486.2 nm</b> (same line as problem 20).<br>(d) <b>Longer</b>: smaller energy gap (about 656 nm, red)." },
  { n: 22, ch: "Ch 6", topic: "Quantum numbers",
    q: "(a) Which sets (n, l, m<sub>l</sub>, m<sub>s</sub>) are allowed? (i) 3, 3, 0, +½ (ii) 2, 1, −1, +½ (iii) 4, 2, +3, −½ (iv) 1, 0, 0, −½ (v) 3, 2, −2, +½<br>(b) Name the subshell with n = 4, l = 3. (c) How many orbitals are in the n = 3 shell? (d) Maximum electrons in a 4d subshell?",
    checks: [
      { label: "(a) allowed (roman numerals, commas)", text: ["ii,iv,v"] },
      { label: "(b)", text: ["4f"] },
      { label: "(c)", value: 9, sf: null, units: null, exact: true },
      { label: "(d)", value: 10, sf: null, units: null, exact: true }
    ],
    hint: "l goes 0 to n − 1; m_l goes −l to +l.",
    sol: "(a) (i) <b>No</b>: l ≤ n − 1 = 2. (ii) <b>Yes</b>. (iii) <b>No</b>: m<sub>l</sub> only −2 to +2. (iv) <b>Yes</b>. (v) <b>Yes</b>.<br>(b) <b>4f</b>. (c) <b>9</b> (n^2). (d) <b>10</b>." },
  { n: 23, ch: "Ch 6", topic: "Electron configurations",
    q: "(a) Full electron configuration of S.<br>(b) Noble-gas configurations of Fe, Cr, Cu, {Fe^3+} and {Br^−}.<br>(c) Orbital diagram for N; how many unpaired electrons?<br>(d) Valence electrons in Se?",
    checks: [
      { label: "(a) S", config: "1s2 2s2 2p6 3s2 3p4" },
      { label: "(b) Cr", config: "[Ar] 4s1 3d5" },
      { label: "(b) Fe3+", config: "[Ar] 3d5" },
      { label: "(c) unpaired", value: 3, sf: null, units: null, exact: true },
      { label: "(d)", value: 6, sf: null, units: null, exact: true }
    ],
    hint: "Cr and Cu are the exceptions. Cations lose 4s before 3d.",
    sol: "(a) [[1s2 2s2 2p6 3s2 3p4]].<br>(b) Fe [[[Ar] 4s2 3d6]]; Cr [[[Ar] 4s1 3d5]] (exception); Cu [[[Ar] 4s1 3d10]] (exception); {Fe^3+} [[[Ar] 3d5]]; {Br^−} [[[Ar] 4s2 3d10 4p6]] = [Kr].<br>(c) 1s ↑↓, 2s ↑↓, 2p ↑ ↑ ↑: <b>3 unpaired</b>.<br>(d) [[[Ar] 4s2 3d10 4p4]]: <b>6 valence electrons</b>." }
];

const MOCK = [5, 10, 11, 15, 18, 20, 22, 23];

const FLASHCARDS = [
  ["Molarity", "M = mol solute ÷ L solution"],
  ["Dilution", "M₁V₁ = M₂V₂"],
  ["ppm", "g solute ÷ g solution × 10^6"],
  ["Mass percent", "g solute ÷ g solution × 100"],
  ["Strong acids", "{HCl}, {HBr}, {HI}, {HNO3}, {H2SO4}, {HClO4}"],
  ["Strong bases", "Group 1 hydroxides, {Ca(OH)2}, {Sr(OH)2}, {Ba(OH)2}"],
  ["Always-soluble ions", "Group 1, {NH4^+}, {NO3^−}, {C2H3O2^−}, {ClO3^−}, {ClO4^−}"],
  ["Halide exceptions (insoluble)", "{Ag^+}, {Pb^2+}, {Hg2^2+}"],
  ["Sulfate exceptions (insoluble)", "{Ba^2+}, {Pb^2+}, {Sr^2+}, {Ca^2+}, {Hg2^2+}"],
  ["What gets split in a complete ionic equation?", "Only soluble ionic compounds (aq) and strong acids/bases"],
  ["OIL RIG", "Oxidation Is Loss, Reduction Is Gain (of electrons)"],
  ["Oxidizing agent", "The species that is reduced"],
  ["Percent yield", "actual ÷ theoretical × 100"],
  ["Limiting reactant method", "Calculate product from each reactant; the smaller amount wins"],
  ["Titration", "mol = M × V(L); use the coefficient ratio"],
  ["Specific heat", "q = mcΔT, ΔT = final − initial"],
  ["Water's specific heat", "4.184 J/g·°C"],
  ["Calorimetry", "q(lost by hot) = −q(gained by cold); q(rxn) = −q(soln)"],
  ["First law", "ΔU = q + w (work done by the system is negative)"],
  ["Exothermic", "Heat leaves system; q, ΔH < 0; surroundings warm"],
  ["Reverse an equation", "Flip the sign of ΔH"],
  ["ΔH from formation", "ΣnΔH°f(products) − ΣnΔH°f(reactants); elements = 0"],
  ["Speed of light", "c = λν = 2.998 × 10^8 m/s"],
  ["Photon energy", "E = hν = hc/λ, h = 6.626 × 10^−34 J·s"],
  ["Bohr energy (H)", "E<sub>n</sub> = −2.179 × 10^−18 J ÷ n^2"],
  ["Visible range", "~400 nm (violet) to ~700 nm (red)"],
  ["Allowed l values", "0 to n − 1 (s=0, p=1, d=2, f=3)"],
  ["Allowed m_l values", "−l to +l"],
  ["Orbitals per subshell", "s 1, p 3, d 5, f 7"],
  ["Hund's rule", "Fill orbitals singly before pairing"],
  ["Cr and Cu", "Cr [[[Ar] 4s1 3d5]], Cu [[[Ar] 4s1 3d10]]"],
  ["Transition metal cations", "Remove 4s electrons before 3d"]
];
