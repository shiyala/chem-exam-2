/* Energy levels page: orbital boxes drawn at their energies, so you can see why 4s fills before 3d. */
(function () {
  const ORDER = ["1s", "2s", "2p", "3s", "3p", "4s", "3d", "4p", "5s", "4d", "5p"];
  const BOXES = { s: 1, p: 3, d: 5 };
  /* Relative energies on a 0-100 scale. Not to scale; spacing is exaggerated so the order is easy to see. */
  const MANY = { "1s": 0, "2s": 20, "2p": 30, "3s": 42, "3p": 51, "4s": 60, "3d": 67, "4p": 75, "5s": 83, "4d": 90, "5p": 98 };
  const HYD = { 1: 0, 2: 40, 3: 64, 4: 81, 5: 94 };
  const COL = { s: 70, p: 150, d: 282 };
  const VBW = 440;
  const BW = 24, BH = 20, GAP = 2;
  const H = 430, Y0 = 400, K = 3.75;
  const NS = "http://www.w3.org/2000/svg";
  const MAXZ = 36;
  const svgEl = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v); return e; };
  const yFor = (sh, mode) => Y0 - (mode === "h" ? HYD[sh[0]] : MANY[sh]) * K;
  const nl = sh => +sh[0] + "spdf".indexOf(sh[1]);

  /* Electrons per box for k electrons in a subshell: one in each box first (Hund), then pair up. */
  function spread(sh, k) {
    const m = BOXES[sh[1]], out = new Array(m).fill(0);
    for (let i = 0; i < k; i++) out[i % m]++;
    return out;
  }

  function diagram(opts = {}) {
    const wrap = el("div", { class: "lv-wrap" });
    const svg = svgEl("svg", { viewBox: `0 0 ${VBW} ${H}`, class: "lv-svg", role: "img", "aria-label": "Orbital energy diagram" });
    svg.appendChild(svgEl("line", { x1: 14, y1: Y0 + 12, x2: 14, y2: 12, class: "lv-axis" }));
    svg.appendChild(svgEl("path", { d: "M8 20 L14 8 L20 20", class: "lv-axis" }));
    const ax = svgEl("text", { x: 0, y: 0, class: "lv-axlab", transform: `translate(10 ${Y0 / 2 + 40}) rotate(-90)` }); ax.textContent = "Energy";
    svg.appendChild(ax);
    const groups = {}, boxes = {};
    ORDER.forEach(sh => {
      const g = svgEl("g", { class: "lv-g" + (sh === "4s" || sh === "3d" ? " lv-focus" : ""), "data-sh": sh });
      const x0 = COL[sh[1]];
      const lab = svgEl("text", { x: x0 - 5, y: BH / 2 + 4, class: "lv-lab", "text-anchor": "end" }); lab.textContent = sh;
      g.appendChild(lab);
      boxes[sh] = [];
      for (let i = 0; i < BOXES[sh[1]]; i++) {
        const bx = svgEl("g", { class: "lv-box", "data-sh": sh, "data-i": i });
        bx.appendChild(svgEl("rect", { x: x0 + i * (BW + GAP), y: 0, width: BW, height: BH, rx: 3 }));
        const t = svgEl("text", { x: x0 + i * (BW + GAP) + BW / 2, y: BH / 2 + 5, "text-anchor": "middle", class: "lv-e" });
        bx.appendChild(t);
        if (opts.onTap) bx.addEventListener("click", () => opts.onTap(sh, i));
        g.appendChild(bx);
        boxes[sh].push(bx);
      }
      g.appendChild(shapeGlyph(sh[1], x0 + BOXES[sh[1]] * (BW + GAP) + 10, BH / 2));
      groups[sh] = g;
      svg.appendChild(g);
    });
    wrap.appendChild(svg);
    let mode = "m";
    const api = {
      el: wrap,
      setMode(m) {
        mode = m;
        ORDER.forEach(sh => { groups[sh].style.transform = `translate(0px, ${yFor(sh, m)}px)`; });
        wrap.classList.toggle("lv-h", m === "h");
      },
      /* states: { "3d": [2,1,1,1,1], ... } electrons per box */
      draw(states, newest) {
        ORDER.forEach(sh => boxes[sh].forEach((bx, i) => {
          const n = (states[sh] || [])[i] || 0;
          bx.querySelector("text").textContent = n === 2 ? "↑↓" : n === 1 ? "↑" : "";
          bx.classList.toggle("on", n > 0);
          bx.classList.toggle("new", !!newest && newest[0] === sh && newest[1] === i);
        }));
      },
      mode: () => mode
    };
    api.setMode("m");
    return api;
  }

  /* Small orbital shape next to each row: s sphere, p dumbbell, d cloverleaf. */
  function shapeGlyph(l, cx, cy) {
    const g = svgEl("g", { class: "lv-shape", "aria-hidden": "true" });
    if (l === "s") g.appendChild(svgEl("circle", { cx, cy, r: 6.5 }));
    if (l === "p") [-1, 1].forEach(sx => g.appendChild(svgEl("ellipse", { cx: cx + sx * 5, cy, rx: 5, ry: 3.3 })));
    if (l === "d") [45, -45].forEach(a => [-1, 1].forEach(sx => g.appendChild(svgEl("ellipse", { cx: cx + sx * 4.6, cy, rx: 4.2, ry: 2.4, transform: `rotate(${a} ${cx} ${cy})` }))));
    g.appendChild(svgEl("circle", { cx, cy, r: 1.2, class: "lv-nuc" }));
    return g;
  }

  /* ---- Hydrogen-like orbitals, to show how close each one gets to the nucleus ---- */
  function laguerre(k, a, x) {
    if (k === 0) return 1;
    let L0 = 1, L1 = 1 + a - x;
    for (let i = 1; i < k; i++) { const L2 = ((2 * i + 1 + a - x) * L1 - (i + a) * L0) / (i + 1); L0 = L1; L1 = L2; }
    return L1;
  }
  const radCache = {};
  /* Radial part R(r) in Bohr radii, normalized so the integral of r²R² is 1. */
  function radial(sh) {
    if (radCache[sh]) return radCache[sh];
    const n = +sh[0], l = "spdf".indexOf(sh[1]);
    const raw = r => { const rho = 2 * r / n; return Math.pow(rho, l) * Math.exp(-rho / 2) * laguerre(n - l - 1, 2 * l + 1, rho); };
    let sum = 0; const dr = 0.02;
    for (let r = dr / 2; r < 100; r += dr) sum += r * r * raw(r) * raw(r) * dr;
    const k = 1 / Math.sqrt(sum);
    return (radCache[sh] = r => k * raw(r));
  }
  const CORE = 3;   // "inner electrons" zone drawn on the pictures, in Bohr radii
  const SHAPE_SETS = {
    same: { label: "3s, 3p, 3d", orbs: ["3s", "3p", "3d"], extent: 22, xmax: 25,
      intro: "Same shell, three shapes. What matters is how much of each one gets inside the inner electons, close to the nucleus, where the pull is strongest and nothing shields it." },
    pair: { label: "4s vs 3d", orbs: ["4s", "3d"], extent: 34, xmax: 40,
      intro: "Most of 4s is farther out than 3d. But 4s has small inner bumps that dip inside the inner electrons, and 3d has none." }
  };
  SHAPE_SETS.same.intro = SHAPE_SETS.same.intro.replace("electons", "electrons");
  const CAPTION = {
    same: {
      "3s": "<b>3s:</b> dense right at the nucleus, plus two small inner rings. It gets inside the most, feels the most pull, and is lowest.",
      "3p": "<b>3p:</b> zero at the nucleus, but a small inner lobe still gets partway in. Middle.",
      "3d": "<b>3d:</b> zero at the nucleus and no inner lobes. It stays outside the inner electrons, is shielded the most, and is highest."
    },
    pair: {
      "4s": "<b>4s:</b> its main ring is far out, but the inner rings reach in close to the nucleus. That extra pull drops 4s just below 3d.",
      "3d": "<b>3d:</b> closer on average, but it never gets inside the inner electrons, so they shield it almost completely."
    }
  };
  const PLOT_CLASS = ["lv-c1", "lv-c2", "lv-c3"];

  /* Cross-section of one orbital: brighter = more likely to find the electron (log scale, so faint inner rings show). */
  function crossSection(sh, extent, color) {
    const N = 150;
    const cv = el("canvas", { width: N, height: N, class: "lv-cs", role: "img", "aria-label": sh + " orbital cross-section" });
    if (/jsdom/i.test(navigator.userAgent)) return cv;
    const ctx = cv.getContext && cv.getContext("2d");
    if (!ctx) return cv;
    const R = radial(sh), l = sh[1];
    const vals = new Float32Array(N * N);
    let max = 0;
    for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
      const x = ((px + 0.5) / N * 2 - 1) * extent, z = (1 - (py + 0.5) / N * 2) * extent;
      const r = Math.hypot(x, z) || 1e-6;
      const ang = l === "s" ? 1 : l === "p" ? z / r : (x * z) / (r * r);
      const psi = R(r) * ang, v = psi * psi;
      vals[py * N + px] = v; if (v > max) max = v;
    }
    const img = ctx.createImageData(N, N);
    for (let i = 0; i < N * N; i++) {
      const t = vals[i] > 0 ? Math.max(0, Math.min(1, 1 + Math.log10(vals[i] / max) / 3.5)) : 0;
      img.data[i * 4] = color[0]; img.data[i * 4 + 1] = color[1]; img.data[i * 4 + 2] = color[2];
      img.data[i * 4 + 3] = Math.round(255 * Math.pow(t, 1.4));
    }
    ctx.putImageData(img, 0, 0);
    const c = N / 2, scale = N / 2 / extent;
    ctx.setLineDash([3, 3]); ctx.strokeStyle = "rgba(128,128,128,.9)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(c, c, CORE * scale, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle = "rgba(128,128,128,1)";
    ctx.beginPath(); ctx.arc(c, c, 2, 0, Math.PI * 2); ctx.fill();
    return cv;
  }
  function cssColor(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const m = /^#?([0-9a-f]{6})$/i.exec(v);
    if (!m) return fallback;
    const n = parseInt(m[1], 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  }

  /* Radial probability: how likely the electron is at each distance from the nucleus. */
  function radialPlot(orbs, xmax, zoom) {
    const W = 340, Hh = 190, L = 36, B = 30, T = 12, Rt = 10;
    const x1 = zoom ? 8 : xmax;
    const P = sh => { const R = radial(sh); return r => r * r * R(r) * R(r); };
    const fs = orbs.map(P);
    let ymax = 0;
    fs.forEach(f => { for (let r = 0; r <= x1; r += x1 / 400) ymax = Math.max(ymax, f(r)); });
    ymax *= 1.08;
    const X = r => L + (r / x1) * (W - L - Rt), Y = v => Hh - B - (v / ymax) * (Hh - B - T);
    const svg = svgEl("svg", { viewBox: `0 0 ${W} ${Hh}`, class: "lv-plot", role: "img", "aria-label": "Radial probability of " + orbs.join(", ") });
    svg.appendChild(svgEl("rect", { x: X(0), y: T, width: X(CORE) - X(0), height: Hh - B - T, class: "lv-core" }));
    const ct = svgEl("text", { x: X(0) + 4, y: T + 12, class: "lv-plab" }); ct.textContent = zoom ? "inner electrons" : "inner";
    svg.appendChild(ct);
    svg.appendChild(svgEl("line", { x1: L, y1: Hh - B, x2: W - Rt, y2: Hh - B, class: "lv-axis" }));
    svg.appendChild(svgEl("line", { x1: L, y1: Hh - B, x2: L, y2: T, class: "lv-axis" }));
    const xl = svgEl("text", { x: (L + W) / 2, y: Hh - 8, "text-anchor": "middle", class: "lv-plab" }); xl.textContent = "distance from the nucleus →";
    const yl = svgEl("text", { x: 0, y: 0, class: "lv-plab", transform: `translate(14 ${(Hh - B + T) / 2 + 40}) rotate(-90)` }); yl.textContent = "chance of finding it";
    svg.appendChild(xl); svg.appendChild(yl);
    const nuc = svgEl("text", { x: L, y: Hh - B + 14, "text-anchor": "middle", class: "lv-plab" }); nuc.textContent = "nucleus";
    svg.appendChild(nuc);
    fs.forEach((f, i) => {
      let d = "";
      for (let k = 0; k <= 300; k++) { const r = x1 * k / 300; d += (k ? "L" : "M") + X(r).toFixed(1) + " " + Math.max(T, Y(f(r))).toFixed(1); }
      svg.appendChild(svgEl("path", { d, class: "lv-curve " + PLOT_CLASS[i] }));
    });
    return svg;
  }

  function shapesCard() {
    const c = el("section", { class: "card", id: "lv-shapes" });
    c.appendChild(el("h2", {}, "Why the spacing: look at the shapes"));
    c.appendChild(el("p", {}, "An electron's energy depends on how strongly the nucleus pulls on it. Inner electrons block part of that pull. An orbital that reaches in close to the nucleus, inside the inner electrons, feels more of the pull and sits lower."));
    const seg = el("div", { class: "seg", role: "group", "aria-label": "Which orbitals" });
    const body = el("div");
    c.appendChild(seg); c.appendChild(body);
    let which = "same", zoom = false;
    const btns = {};
    Object.entries(SHAPE_SETS).forEach(([k, v]) => {
      const b = el("button", { class: "chip", type: "button" }, v.label);
      b.addEventListener("click", () => { which = k; render(); });
      btns[k] = b; seg.appendChild(b);
    });
    function render() {
      Object.entries(btns).forEach(([k, b]) => b.classList.toggle("on", k === which));
      const set = SHAPE_SETS[which];
      body.innerHTML = "";
      body.appendChild(el("p", { class: "small muted" }, set.intro));
      const colors = [cssColor("--accent", [47, 91, 211]), cssColor("--warn", [138, 90, 0]), cssColor("--good", [31, 122, 69])];
      const row = el("div", { class: "lv-cs-row" });
      set.orbs.forEach((sh, i) => {
        const fig = el("figure", { class: "lv-cs-fig" });
        fig.appendChild(crossSection(sh, set.extent, colors[i]));
        fig.appendChild(el("figcaption", { class: PLOT_CLASS[i] + "-t" }, sh));
        row.appendChild(fig);
      });
      body.appendChild(row);
      body.appendChild(el("p", { class: "small muted" }, "Slices through each orbital, drawn to the same scale. The dot is the nucleus; the dashed circle marks roughly where the inner electrons are."));
      const plotWrap = el("div", { class: "lv-plot-wrap" });
      plotWrap.appendChild(radialPlot(set.orbs, set.xmax, zoom));
      body.appendChild(plotWrap);
      const legend = el("p", { class: "small lv-legend" }, set.orbs.map((sh, i) => `<span class="${PLOT_CLASS[i]}-t">━ ${sh}</span>`).join(" "));
      const zb = el("button", { class: "btn ghost small", type: "button" }, zoom ? "Zoom out" : "Zoom in on the nucleus");
      zb.addEventListener("click", () => { zoom = !zoom; render(); });
      legend.appendChild(zb);
      body.appendChild(legend);
      const ul = el("ul", { class: "lv-caps" });
      set.orbs.forEach(sh => ul.appendChild(el("li", {}, CAPTION[which][sh])));
      body.appendChild(ul);
    }
    render();
    return c;
  }

  const statesFor = map => Object.fromEntries(Object.entries(map).map(([sh, k]) => [sh, spread(sh, k)]));
  const sym = z => ELEMENTS[z - 1];

  VIEWS.levels = main => {
    main.appendChild(el("h1", {}, "Energy levels"));
    main.appendChild(el("p", { class: "lead" }, "Each box is one orbital and holds two electrons. Electrons go into the lowest box that has room. Switch between hydrogen and a many-electron atom to see why 4s fills before 3d."));

    /* ---- 1. Explore ---- */
    const c1 = el("section", { class: "card" });
    c1.appendChild(el("h2", {}, "Watch the boxes fill"));
    const modes = el("div", { class: "seg", role: "group", "aria-label": "Atom type" });
    const mH = el("button", { class: "chip", type: "button" }, "Hydrogen (1 electron)");
    const mM = el("button", { class: "chip on", type: "button" }, "Many electrons");
    modes.appendChild(mH); modes.appendChild(mM);
    c1.appendChild(modes);
    const modeNote = el("p", { class: "small muted lv-note" });
    c1.appendChild(modeNote);

    const step = el("div", { class: "lv-step" });
    const minus = el("button", { class: "key", type: "button", "aria-label": "Remove one electron" }, "−");
    const plus = el("button", { class: "key", type: "button", "aria-label": "Add one electron" }, "+");
    const zlab = el("span", { class: "lv-z", "aria-live": "polite" });
    step.appendChild(minus); step.appendChild(zlab); step.appendChild(plus);
    c1.appendChild(step);
    const jumps = el("div", { class: "filters lv-jumps" });
    [["Ne", 10], ["Ar", 18], ["K", 19], ["Ca", 20], ["Sc", 21], ["Cr", 24], ["Fe", 26], ["Cu", 29], ["Kr", 36]].forEach(([s, z]) => {
      const b = el("button", { class: "chip", type: "button" }, s);
      b.addEventListener("click", () => { Z = z; show(null); });
      jumps.appendChild(b);
    });
    c1.appendChild(jumps);

    const d = diagram();
    c1.appendChild(d.el);
    const cfgLine = el("p", { class: "lv-cfg" });
    const exNote = el("p", { class: "small lv-ex" });
    c1.appendChild(cfgLine); c1.appendChild(exNote);
    c1.appendChild(el("p", { class: "small" }, '<a href="#levels" class="lv-jump-shapes">Why are the levels spaced like this? See the shapes ↓</a>'));
    main.appendChild(c1);
    const sc = shapesCard();
    main.appendChild(sc);
    c1.querySelector(".lv-jump-shapes").addEventListener("click", e => { e.preventDefault(); sc.scrollIntoView({ behavior: "smooth", block: "start" }); });

    let Z = 19;
    let prev = {};
    function show(animateNew) {
      Z = Math.max(1, Math.min(MAXZ, Z));
      const map = fillConfig(Z, Z);
      const st = statesFor(map);
      let newest = null;
      if (animateNew) {
        outer: for (const sh of ORDER) for (let i = 0; i < BOXES[sh[1]]; i++) {
          if (((st[sh] || [])[i] || 0) > ((prev[sh] || [])[i] || 0)) { newest = [sh, i]; break outer; }
        }
      }
      prev = st;
      d.draw(st, newest);
      zlab.innerHTML = `<b>${sym(Z)}</b> · Z = ${Z} · ${Z} electron${Z === 1 ? "" : "s"}`;
      cfgLine.innerHTML = config(formatConfig(map));
      minus.disabled = Z <= 1; plus.disabled = Z >= MAXZ;
      exNote.textContent = Z === 24 ? "Exception: chromium moves one 4s electron into 3d. Two half-filled subshells (4s¹ 3d⁵) are extra stable, and 4s and 3d are close enough in energy for it to pay off."
        : Z === 29 ? "Exception: copper moves one 4s electron into 3d to fill it (4s¹ 3d¹⁰). A full d subshell is extra stable."
        : (Z === 19 || Z === 20) ? "The 4s box is lower than 3d here, so potassium and calcium fill 4s first."
        : (Z === 21) ? "With 4s full, the next electron goes to 3d, the next box up. Notice 3d is still below 4p." : "";
    }
    minus.addEventListener("click", () => { Z--; show(false); });
    plus.addEventListener("click", () => { Z++; show(true); });
    const setMode = m => {
      d.setMode(m);
      mH.classList.toggle("on", m === "h"); mM.classList.toggle("on", m === "m");
      modeNote.innerHTML = m === "h"
        ? "With only one electron, energy depends on n alone, so 3s, 3p and 3d sit at the same height, and 4s is well above 3d."
        : "Add more electrons and the inner ones shield the outer ones. The levels split by l: s drops the most, then p, then d. 4s drops below 3d.";
    };
    mH.addEventListener("click", () => setMode("h"));
    mM.addEventListener("click", () => setMode("m"));
    setMode("m");
    show(false);

    /* ---- 2. Why ---- */
    const c2 = el("section", { class: "card" });
    c2.innerHTML = `<h2>Why 4s comes before 3d</h2>
      <p><b>Shielding:</b> inner electrons sit between the nucleus and an outer electron and cancel part of its pull. The outer electron feels a smaller, effective charge.</p>
      <p><b>Penetration:</b> an s orbital has a little of its electron density right next to the nucleus, inside the inner shells. So a 4s electron is shielded less and pulled harder, which lowers its energy. A 3d orbital stays out of the core, so it is shielded more.</p>
      <p><b>Result:</b> the drop for 4s is big enough to put it just below 3d. The same thing puts 5s below 4d.</p>
      <p><b>Shortcut (n + l rule):</b> fill the subshell with the smaller n + l first. If tied, the smaller n goes first.</p>`;
    const t = el("table", { class: "sol-table lv-nl" });
    t.innerHTML = "<thead><tr><th>Subshell</th><th>n</th><th>l</th><th>n + l</th></tr></thead><tbody>" +
      ["3p", "4s", "3d", "4p", "5s"].map(sh => `<tr${sh === "4s" || sh === "3d" ? ' class="hl"' : ""}><td>${sh}</td><td>${sh[0]}</td><td>${"spdf".indexOf(sh[1])}</td><td>${nl(sh)}</td></tr>`).join("") + "</tbody>";
    const tw = el("div", { class: "table-wrap" }); tw.appendChild(t); c2.appendChild(tw);
    c2.appendChild(el("p", {}, R("<b>Ions:</b> a transition metal loses its 4s electrons first, before any 3d. Fe is [[[Ar] 4s2 3d6]], and {Fe^2+} is [[[Ar] 3d6]]. Once 3d holds electrons, 4s is no longer the lower one, so take electrons from the highest n first.")));
    main.appendChild(c2);

    /* ---- 3. Practice: fill the boxes ---- */
    const c3 = el("section", { class: "card" });
    c3.appendChild(el("h2", {}, "Practice: fill the boxes"));
    c3.appendChild(el("p", { class: "small muted" }, "Tap a box to add electrons: empty, then ↑, then ↑↓, then empty again."));
    const q = el("p", { class: "q lv-q" });
    c3.appendChild(q);
    const user = {};
    const pd = diagram({ onTap: (sh, i) => { user[sh] = user[sh] || new Array(BOXES[sh[1]]).fill(0); user[sh][i] = (user[sh][i] + 1) % 3; redraw(); } });
    c3.appendChild(pd.el);
    const countLine = el("p", { class: "small muted" });
    const fb = el("div", { class: "feedback", "aria-live": "polite" });
    const row = el("div", { class: "lv-actions" });
    const bCheck = el("button", { class: "btn", type: "button" }, "Check");
    const bShow = el("button", { class: "btn ghost", type: "button" }, "Show answer");
    const bClear = el("button", { class: "btn ghost", type: "button" }, "Clear");
    const bNext = el("button", { class: "btn ghost", type: "button" }, "New element");
    [bCheck, bShow, bClear, bNext].forEach(b => row.appendChild(b));
    c3.appendChild(countLine); c3.appendChild(row); c3.appendChild(fb);
    main.appendChild(c3);

    let PZ = 0;
    const POOL = [3, 5, 6, 7, 8, 9, 11, 13, 14, 15, 16, 17, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 33, 34, 35];
    function redraw() {
      pd.draw(user, null);
      const n = Object.values(user).reduce((a, arr) => a + arr.reduce((x, y) => x + y, 0), 0);
      countLine.textContent = `${n} of ${PZ} electrons placed`;
      fb.className = "feedback"; fb.innerHTML = "";
    }
    function newQ() {
      let z; do { z = pick(POOL); } while (z === PZ);
      PZ = z;
      Object.keys(user).forEach(k => delete user[k]);
      q.innerHTML = `Fill the boxes for <b>${sym(z)}</b> (Z = ${z}).`;
      redraw();
    }
    function check() {
      const want = fillConfig(PZ, PZ);
      const total = Object.values(user).reduce((a, arr) => a + arr.reduce((x, y) => x + y, 0), 0);
      let msg = null;
      if (total !== PZ) msg = `You placed ${total} electrons. ${sym(PZ)} has ${PZ}.`;
      if (!msg) for (const sh of ORDER) {
        const have = (user[sh] || []).reduce((x, y) => x + y, 0), need = want[sh] || 0;
        if (have !== need) {
          const lower = ORDER.find(s2 => ORDER.indexOf(s2) < ORDER.indexOf(sh) && ((user[s2] || []).reduce((x, y) => x + y, 0)) < (want[s2] || 0));
          msg = need > have ? `${sh} should have ${need}, you have ${have}.` : `${sh} has ${have}, but it should have ${need}.`;
          if (lower) msg += ` Fill ${lower} first: it is lower in energy.`;
          if (PZ === 24 || PZ === 29) msg += " This one is an exception; look at 4s and 3d.";
          break;
        }
      }
      if (!msg) for (const sh of ORDER) {
        const arr = user[sh] || [];
        const k = arr.reduce((x, y) => x + y, 0);
        if (!k) continue;
        const singles = arr.filter(v => v === 1).length, want1 = spread(sh, k).filter(v => v === 1).length;
        if (singles !== want1) { msg = `Right count in ${sh}, but spread them out: one electron in each box before any box gets a second (Hund's rule).`; break; }
      }
      if (msg) { fb.className = "feedback bad"; fb.textContent = msg; }
      else { fb.className = "feedback good"; fb.innerHTML = "Correct. " + config(formatConfig(want)); store.set("lv-correct", store.get("lv-correct", 0) + 1); }
    }
    bCheck.addEventListener("click", check);
    bShow.addEventListener("click", () => {
      const st = statesFor(fillConfig(PZ, PZ));
      Object.keys(user).forEach(k => delete user[k]);
      Object.assign(user, JSON.parse(JSON.stringify(st)));
      redraw();
      fb.className = "feedback"; fb.innerHTML = "Answer: " + config(formatConfig(fillConfig(PZ, PZ)));
    });
    bClear.addEventListener("click", () => { Object.keys(user).forEach(k => delete user[k]); redraw(); });
    bNext.addEventListener("click", newQ);
    newQ();

    /* ---- 4. Quick quiz: which fills first ---- */
    const c4 = el("section", { class: "card" });
    c4.appendChild(el("h2", {}, "Which fills first?"));
    const q4 = el("p", { class: "q" });
    const opts4 = el("div", { class: "lv-actions" });
    const fb4 = el("div", { class: "feedback", "aria-live": "polite" });
    const next4 = el("button", { class: "btn ghost", type: "button" }, "Next");
    c4.appendChild(q4); c4.appendChild(opts4); c4.appendChild(fb4); c4.appendChild(next4);
    main.appendChild(c4);
    const PAIRS = [["4s", "3d"], ["3d", "4p"], ["5s", "4d"], ["3p", "4s"], ["4p", "5s"], ["2p", "3s"], ["4d", "5p"], ["3s", "3p"], ["3d", "5s"]];
    function quiz() {
      const pair = shuffle(pick(PAIRS));
      q4.textContent = "Which subshell fills first?";
      opts4.innerHTML = ""; fb4.className = "feedback"; fb4.innerHTML = "";
      pair.forEach(sh => {
        const b = el("button", { class: "btn ghost", type: "button" }, sh);
        b.addEventListener("click", () => {
          const first = ORDER.indexOf(pair[0]) < ORDER.indexOf(pair[1]) ? pair[0] : pair[1];
          const other = first === pair[0] ? pair[1] : pair[0];
          const why = nl(first) < nl(other) ? `n + l is ${nl(first)} for ${first} and ${nl(other)} for ${other}.` : `Both have n + l = ${nl(first)}, so the smaller n (${first}) goes first.`;
          fb4.className = "feedback " + (sh === first ? "good" : "bad");
          fb4.textContent = (sh === first ? "Right. " : `No, ${first} fills first. `) + why;
        });
        opts4.appendChild(b);
      });
    }
    next4.addEventListener("click", quiz);
    quiz();
  };

  if (typeof module !== "undefined") module.exports = { spread };
})();
