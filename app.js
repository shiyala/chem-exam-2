/* CHM 10100 Exam 2 study site: rendering, answer checking, drills, flashcards, mock exam. */
"use strict";

/* ---------------- storage ---------------- */
const STORE_KEY = "chm101-exam2-v1";
const store = (() => {
  let data = {};
  try { data = JSON.parse(localStorage.getItem(STORE_KEY) || "{}") || {}; } catch (e) { data = {}; }
  const subs = [];
  const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) {} };
  const tell = (why) => subs.forEach(f => { try { f(why); } catch (e) {} });
  return {
    get(k, d) { return k in data ? data[k] : d; },
    set(k, v) { data[k] = v; save(); tell("set"); },
    clear() { data = {}; try { localStorage.removeItem(STORE_KEY); } catch (e) {} tell("clear"); },
    /* for progress sync */
    all() { return JSON.parse(JSON.stringify(data)); },
    replace(next) { data = next && typeof next === "object" ? next : {}; save(); },
    onChange(f) { subs.push(f); }
  };
})();

/* ---------------- text rendering ---------------- */
function chem(f) {
  let s = f.replace(/\^([0-9]*[+\-−])/g, (m, c) => "<sup>" + c.replace("-", "−") + "</sup>");
  s = s.replace(/([A-Za-z\)\]])(\d+)/g, "$1<sub>$2</sub>");
  return s;
}
function config(c) {
  return c.replace(/(\d)([spdf])(\d+)/g, "$1$2<sup>$3</sup>");
}
function R(t) {
  if (t == null) return "";
  let s = String(t);
  s = s.replace(/\[\[(.+?)\]\](?!\])/g, (m, c) => config(c));
  s = s.replace(/\{([^{}]+)\}/g, (m, f) => chem(f));
  s = s.replace(/(\d|n|\))\^([−\-+]?\d+)/g, (m, b, e) => b + "<sup>" + e.replace("-", "−") + "</sup>");
  return s;
}
const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, attrs = {}, html) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  if (html != null) e.innerHTML = html;
  return e;
};
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ---------------- number parsing and sig figs ---------------- */
const SUP = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-", "⁺": "+" };
const SUB = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9", "₊": "+", "₋": "-" };
/* Turn any typed math into one plain form: * / ^ - ( ), no spaces, superscripts as ^(...). */
function normalizeMath(raw) {
  let s = String(raw == null ? "" : raw).trim();
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g, m => "^(" + [...m].map(c => SUP[c]).join("") + ")");
  s = s.replace(/[₀-₉₊₋]/g, c => SUB[c]);
  s = s.replace(/[−–—]/g, "-").replace(/[×✕✖·•⋅]/g, "*").replace(/÷/g, "/").replace(/\*\*/g, "^");
  s = s.replace(/(\d)\s*[xX]\s*(?=[\d(.])/g, "$1*");
  s = s.replace(/(\d),(?=\d{3}(\D|$))/g, "$1");
  s = s.replace(/\s+/g, "");
  s = s.replace(/^=+|=+$/g, "");
  return s;
}
function parseNumber(raw) {
  if (raw == null) return null;
  let s = normalizeMath(raw);
  if (!s) return null;
  s = s.replace(/\*10\^\(?([+\-]?\d+)\)?$/, "e$1").replace(/\*10$/, "e1");
  const m = s.match(/^([+\-]?)(\d*\.?\d*)(?:[eE]\(?([+\-]?\d+)\)?)?$/);
  if (!m || !m[2] || m[2] === ".") return null;
  const mant = m[2];
  const value = parseFloat(m[1] + mant + (m[3] ? "e" + m[3] : ""));
  if (!isFinite(value)) return null;
  return { value, sf: sigFigs(mant, !!m[3]), ambiguous: !mant.includes(".") && /[1-9]0+$/.test(mant) && !m[3] };
}
/* Safe calculator for typed expressions: + - * / ^, parentheses, E notation, sqrt, log, ln, exp. */
function evalExpr(raw) {
  const s = normalizeMath(raw).toLowerCase();
  if (!s) return null;
  let i = 0;
  const peek = () => s[i];
  const num = () => {
    const m = s.slice(i).match(/^(\d+\.?\d*|\.\d+)(e[+\-]?\d+)?/);
    if (!m) return null;
    i += m[0].length;
    return parseFloat(m[0]);
  };
  const FN = { sqrt: Math.sqrt, log: Math.log10, ln: Math.log, exp: Math.exp };
  function primary() {
    const c = peek();
    if (c === "(") { i++; const v = expr(); if (peek() !== ")") throw 0; i++; return v; }
    for (const f of Object.keys(FN)) if (s.startsWith(f + "(", i)) { i += f.length; return FN[f](primary()); }
    if (s.startsWith("pi", i)) { i += 2; return Math.PI; }
    const n = num();
    if (n == null) throw 0;
    return n;
  }
  function unary() {
    if (peek() === "-") { i++; return -unary(); }
    if (peek() === "+") { i++; return unary(); }
    return power();
  }
  function power() {
    const b = primary();
    if (peek() === "^") { i++; return Math.pow(b, unary()); }
    return b;
  }
  function term() {
    let v = unary();
    for (;;) {
      if (peek() === "*") { i++; v *= unary(); }
      else if (peek() === "/") { i++; v /= unary(); }
      else if (peek() === "(" || /[a-z]/.test(peek() || "")) { v *= unary(); }
      else return v;
    }
  }
  function expr() {
    let v = term();
    for (;;) {
      if (peek() === "+") { i++; v += term(); }
      else if (peek() === "-") { i++; v -= term(); }
      else return v;
    }
  }
  try {
    const v = expr();
    if (i !== s.length || !isFinite(v)) return null;
    return v;
  } catch (e) { return null; }
}
function sigFigs(mant) {
  let s = mant.replace(/^[+\-]/, "");
  if (s.includes(".")) {
    const digits = s.replace(".", "").replace(/^0+/, "");
    return digits.length || 1;
  }
  s = s.replace(/^0+/, "");
  if (!s) return 1;
  return s.replace(/0+$/, "").length;
}
function fmtSci(v, sf) {
  if (v === 0) return "0";
  const exp = Math.floor(Math.log10(Math.abs(v)));
  if (exp >= -2 && exp <= Math.min(4, sf - 1)) {
    const dec = Math.max(0, sf - 1 - exp);
    return Number(v).toFixed(dec);
  }
  const m = (v / Math.pow(10, exp)).toFixed(sf - 1);
  return m + " × 10^" + exp;
}
function normUnit(u) {
  return String(u || "").toLowerCase().replace(/[\s·*°()]/g, "").replace(/µ|μ/g, "u").replace(/−/g, "-");
}
function normText(t) {
  let s = String(t || "").replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]/g, c => SUP[c]).replace(/[₀-₉₊₋]/g, c => SUB[c]);
  return s.toLowerCase().replace(/[−–—]/g, "-").replace(/[<>;:,\s]+/g, ",").replace(/^,|,$/g, "");
}

/* ---------------- electron configurations ---------------- */
const SUBSHELLS = ["1s", "2s", "2p", "3s", "3p", "4s", "3d", "4p", "5s", "4d", "5p"];
const CAP = { s: 2, p: 6, d: 10, f: 14 };
const CORES = { He: 2, Ne: 10, Ar: 18, Kr: 36 };
function fillConfig(electrons, z) {
  const map = {};
  let left = electrons;
  for (const sh of SUBSHELLS) {
    if (left <= 0) break;
    const n = Math.min(CAP[sh[1]], left);
    map[sh] = n; left -= n;
  }
  if (z === 24 && electrons === 24) { map["4s"] = 1; map["3d"] = 5; }
  if (z === 29 && electrons === 29) { map["4s"] = 1; map["3d"] = 10; }
  return map;
}
function ionConfig(z, charge) {
  if (charge <= 0) return fillConfig(z - charge, z);
  const map = fillConfig(z, z);
  let remove = charge;
  const order = Object.keys(map).sort((a, b) => (b[0] - a[0]) || ("spdf".indexOf(b[1]) - "spdf".indexOf(a[1])));
  for (const sh of order) {
    while (remove > 0 && map[sh] > 0) { map[sh]--; remove--; }
    if (map[sh] === 0) delete map[sh];
  }
  return map;
}
function parseConfig(str) {
  const s = String(str || "").replace(/<\/?sup>/g, "");
  const map = {};
  const core = s.match(/\[(He|Ne|Ar|Kr)\]/i);
  if (core) {
    const name = core[1][0].toUpperCase() + core[1].slice(1).toLowerCase();
    Object.assign(map, fillConfig(CORES[name], 0));
  }
  const rest = s.replace(/\[[A-Za-z]+\]/g, " ");
  const re = /(\d)\s*([spdfSPDF])\s*\^?\s*(\d+)/g;
  let m, found = false;
  while ((m = re.exec(rest))) { map[m[1] + m[2].toLowerCase()] = (map[m[1] + m[2].toLowerCase()] || 0) + parseInt(m[3], 10); found = true; }
  if (!found && !core) return null;
  return map;
}
function sameConfig(a, b) {
  if (!a || !b) return false;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) if ((a[k] || 0) !== (b[k] || 0)) return false;
  return true;
}
function formatConfig(map) {
  const total = Object.values(map).reduce((x, y) => x + y, 0);
  let coreName = null;
  for (const [name, n] of Object.entries(CORES)) {
    if (n <= total && n >= 10 || (name === "He" && total > 2)) {
      const coreMap = fillConfig(n, 0);
      if (Object.entries(coreMap).every(([k, v]) => map[k] === v) && n < total) coreName = name;
    }
  }
  const coreMap = coreName ? fillConfig(CORES[coreName], 0) : {};
  const parts = SUBSHELLS.filter(sh => map[sh] && !(sh in coreMap)).map(sh => sh + map[sh]);
  return (coreName ? "[" + coreName + "] " : "") + parts.join(" ");
}

/* ---------------- answer checking UI ---------------- */
function insertAt(inp, text) {
  const a = inp.selectionStart == null ? inp.value.length : inp.selectionStart;
  const b = inp.selectionEnd == null ? inp.value.length : inp.selectionEnd;
  inp.value = inp.value.slice(0, a) + text + inp.value.slice(b);
  const pos = a + text.length;
  try { inp.setSelectionRange(pos, pos); } catch (e) {}
  inp.focus();
  inp.dispatchEvent(new Event("input"));
}
/* short: plain whole-number answers (oxidation numbers, counts) only get a minus key. */
function numKeys(inp, short) {
  const keys = el("span", { class: "numkeys" });
  const add = (lab, aria, fn, cls) => {
    const b = el("button", { class: "key" + (cls ? " " + cls : ""), type: "button", "aria-label": aria, tabindex: "-1" }, lab);
    b.addEventListener("pointerdown", e => e.preventDefault());
    b.addEventListener("mousedown", e => e.preventDefault());
    b.addEventListener("click", () => fn(b));
    keys.appendChild(b);
    return b;
  };
  if (!short) add("E", "Insert E (times ten to the power)", () => insertAt(inp, "e"));
  add("−", "Insert minus sign", () => insertAt(inp, "-"));
  if (short) return keys;
  const label = () => inp.getAttribute("inputmode") === "decimal" ? "abc" : "123";
  const tog = add(label(), "Switch between number pad and full keyboard", b => {
    const next = inp.getAttribute("inputmode") === "decimal" ? "text" : "decimal";
    store.set("kbd", next);
    document.querySelectorAll("input.num:not(.short)").forEach(x => x.setAttribute("inputmode", next));
    document.querySelectorAll(".key.kbd").forEach(x => { x.textContent = next === "decimal" ? "abc" : "123"; });
    inp.blur();
    setTimeout(() => inp.focus(), 60);
  }, "kbd");
  tog.textContent = label();
  return keys;
}
/* Tap pad for electron configurations: noble-gas cores, subshells in filling order, electron counts, live preview. */
const SUPDIG = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
function cfgTokens(str) {
  const s = String(str || "");
  const core = (s.match(/\[(He|Ne|Ar|Kr)\]/i) || [])[1];
  const list = [];
  const re = /(\d)\s*([spdfSPDF])\s*\^?\s*(\d*)/g;
  let m;
  const rest = s.replace(/\[[A-Za-z]+\]/g, " ");
  while ((m = re.exec(rest))) list.push({ sh: m[1] + m[2].toLowerCase(), n: m[3] === "" ? null : parseInt(m[3], 10) });
  return { core: core ? core[0].toUpperCase() + core.slice(1).toLowerCase() : null, list };
}
function cfgText(st) {
  return [st.core ? "[" + st.core + "]" : "", ...st.list.map(t => t.sh + (t.n == null ? "" : t.n))].filter(Boolean).join(" ");
}
/* Small periodic table (Z 1-54) that lights up the cells for the subshells in a configuration. */
const PT_SYMS = "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe".split(" ");
function ptPos(z) {
  if (z === 1) return [1, 1];
  if (z === 2) return [1, 18];
  const starts = [[3, 2], [11, 3], [19, 4], [37, 5]];
  let per = 2, z0 = 3;
  starts.forEach(([a, p]) => { if (z >= a) { per = p; z0 = a; } });
  const i = z - z0;
  if (per <= 3) return [per, i < 2 ? i + 1 : i + 11];
  return [per, i + 1];
}
/* Cells (in fill order) that belong to one subshell. */
function ptBlock(sh) {
  const n = +sh[0], l = sh[1];
  if (sh === "1s") return [1, 2];
  const zs = [];
  for (let z = 1; z <= 54; z++) {
    const [per, g] = ptPos(z);
    if (l === "s" && per === n && g <= 2) zs.push(z);
    if (l === "p" && per === n && g >= 13) zs.push(z);
    if (l === "d" && per === n + 1 && g >= 3 && g <= 12) zs.push(z);
  }
  return zs;
}
function miniTable() {
  const box = el("div", { class: "pt" });
  const grid = el("div", { class: "pt-grid", role: "img", "aria-label": "Periodic table showing the filled subshells" });
  const cells = {};
  for (let z = 1; z <= 54; z++) {
    const [per, g] = ptPos(z);
    const blk = g <= 2 || z === 2 ? "s" : g >= 13 ? "p" : "d";
    const c = el("button", { class: "pt-cell b-" + blk, type: "button", tabindex: "-1", title: PT_SYMS[z - 1] + ", Z = " + z, style: `grid-row:${per};grid-column:${g}` }, PT_SYMS[z - 1]);
    c.addEventListener("pointerdown", e => e.preventDefault());
    cells[z] = c; grid.appendChild(c);
  }
  const capDefault = 'Tap an element for its Z. <span class="pt-key b-s">s</span> <span class="pt-key b-p">p</span> <span class="pt-key b-d">d</span> blocks';
  const cap = el("div", { class: "pt-cap small muted" }, capDefault);
  Object.entries(cells).forEach(([z, c]) => c.addEventListener("click", () => {
    const blk = c.classList.contains("b-s") ? "s" : c.classList.contains("b-p") ? "p" : "d";
    cap.textContent = PT_SYMS[z - 1] + ": Z = " + z + ", in the " + blk + " block (period " + ptPos(+z)[0] + ").";
  }));
  box.appendChild(grid); box.appendChild(cap);
  box.appendChild(el("a", { class: "small", href: "#levels" }, "Why does 4s fill before 3d? See the energy levels"));
  box.update = (st) => {
    Object.values(cells).forEach(c => c.classList.remove("core", "fill", "over", "last"));
    if (st.core) for (let z = 1; z <= CORES[st.core]; z++) cells[z].classList.add("core");
    let last = null;
    st.list.forEach(t => {
      const zs = ptBlock(t.sh), n = t.n || 0;
      zs.slice(0, n).forEach(z => { cells[z].classList.add("fill"); last = z; });
      if (n > zs.length && zs.length) cells[zs[zs.length - 1]].classList.add("over");
    });
    if (last) cells[last].classList.add("last");
  };
  return box;
}
function configPad(inp) {
  const pad = el("div", { class: "cfgpad" });
  const preview = el("div", { class: "cfg-preview", "aria-live": "polite" });
  const count = el("span", { class: "cfg-count" });
  const head = el("div", { class: "cfg-head" });
  head.appendChild(preview); head.appendChild(count);
  pad.appendChild(head);
  const table = miniTable();
  pad.appendChild(table);
  let sel = -1;
  const st = () => cfgTokens(inp.value);
  const write = s => { inp.value = cfgText(s); inp.dispatchEvent(new Event("input")); };
  const btn = (lab, aria, fn, cls) => {
    const b = el("button", { class: "key" + (cls ? " " + cls : ""), type: "button", "aria-label": aria, tabindex: "-1" }, lab);
    b.addEventListener("pointerdown", e => e.preventDefault());
    b.addEventListener("mousedown", e => e.preventDefault());
    b.addEventListener("click", () => fn(b));
    return b;
  };
  const row = (name) => { const r = el("div", { class: "cfg-row" }); r.appendChild(el("span", { class: "cfg-lab" }, name)); pad.appendChild(r); return r; };

  const coreRow = row("Core");
  const coreBtns = {};
  ["He", "Ne", "Ar", "Kr"].forEach(c => {
    coreBtns[c] = btn("[" + c + "]", "Noble-gas core " + c, () => { const s = st(); s.core = s.core === c ? null : c; write(s); }, "core");
    coreRow.appendChild(coreBtns[c]);
  });

  const shRow = row("Add");
  const shBtns = {};
  SUBSHELLS.forEach(sh => {
    shBtns[sh] = btn(sh, "Add subshell " + sh, () => {
      const s = st();
      const i = s.list.findIndex(t => t.sh === sh);
      if (i >= 0) { sel = i; render(); return; }
      s.list.push({ sh, n: CAP[sh[1]] });
      sel = s.list.length - 1;
      write(s);
    }, "sh");
    shRow.appendChild(shBtns[sh]);
  });

  const nRow = row("e⁻");
  const nBtns = [];
  for (let k = 1; k <= 10; k++) {
    const b = btn(String(k), k + " electrons in the selected subshell", () => {
      const s = st(); const i = sel >= 0 && sel < s.list.length ? sel : s.list.length - 1;
      if (i < 0) return;
      s.list[i].n = k; write(s);
    }, "n");
    nBtns.push(b); nRow.appendChild(b);
  }
  nRow.appendChild(btn("⌫", "Remove the selected subshell", () => {
    const s = st(); const i = sel >= 0 && sel < s.list.length ? sel : s.list.length - 1;
    if (i >= 0) { s.list.splice(i, 1); sel = Math.min(i, s.list.length - 1); write(s); }
    else if (s.core) { s.core = null; write(s); }
  }, "del"));
  nRow.appendChild(btn("Clear", "Clear the answer", () => { sel = -1; write({ core: null, list: [] }); }, "clr"));

  function render() {
    const s = st();
    if (sel >= s.list.length) sel = s.list.length - 1;
    preview.innerHTML = "";
    if (s.core) preview.appendChild(el("span", { class: "cfg-core" }, "[" + s.core + "]"));
    s.list.forEach((t, i) => {
      const chip = el("button", { class: "cfg-chip" + (i === (sel >= 0 ? sel : s.list.length - 1) ? " on" : "") + (t.n != null && t.n > CAP[t.sh[1]] ? " over" : ""), type: "button", tabindex: "-1", "aria-label": "Select " + t.sh },
        t.sh + (t.n == null ? "<sup>?</sup>" : "<sup>" + t.n + "</sup>"));
      chip.addEventListener("pointerdown", e => e.preventDefault());
      chip.addEventListener("click", () => { sel = i; render(); });
      preview.appendChild(chip);
    });
    if (!s.core && !s.list.length) preview.appendChild(el("span", { class: "muted small" }, "Tap a core and subshells below, or type."));
    const total = (s.core ? CORES[s.core] : 0) + s.list.reduce((a, t) => a + (t.n || 0), 0);
    count.textContent = total ? total + " e⁻" : "";
    table.update(s);
    Object.entries(coreBtns).forEach(([c, b]) => b.classList.toggle("on", s.core === c));
    const coreMap = s.core ? fillConfig(CORES[s.core], 0) : {};
    SUBSHELLS.forEach(sh => { shBtns[sh].classList.toggle("on", s.list.some(t => t.sh === sh)); shBtns[sh].classList.toggle("dim", sh in coreMap); });
    const cur = s.list[sel >= 0 ? sel : s.list.length - 1];
    const cap = cur ? CAP[cur.sh[1]] : 0;
    nBtns.forEach((b, k) => { b.hidden = !cur || k + 1 > cap; b.classList.toggle("on", !!cur && cur.n === k + 1); });
  }
  inp.addEventListener("input", render);
  render();
  return pad;
}
/* saveKey: keep what was typed (and whether it was checked) so it survives a reload and syncs. */
function savedAnswer(key) { return key ? (store.get("answers", {})[key] || null) : null; }
function saveAnswer(key, rec) {
  if (!key) return;
  const all = store.get("answers", {});
  if (!rec.v && !rec.u) delete all[key]; else all[key] = rec;
  store.set("answers", all);
}
/* ---------------- equation balancing ---------------- */
/* Atom counts of a formula like Ca3(PO4)2 or Fe2O3. */
function atomCounts(f) {
  let i = 0;
  function group() {
    const m = {};
    while (i < f.length && f[i] !== ")") {
      let part;
      if (f[i] === "(") { i++; part = group(); i++; }
      else {
        const e = f.slice(i).match(/^[A-Z][a-z]?/);
        if (!e) { i++; continue; }
        i += e[0].length; part = { [e[0]]: 1 };
      }
      const d = f.slice(i).match(/^\d+/); const k = d ? +d[0] : 1; if (d) i += d[0].length;
      for (const x in part) m[x] = (m[x] || 0) + part[x] * k;
    }
    return m;
  }
  return group();
}
const gcd = (a, b) => b ? gcd(b, a % b) : a;
/* check.balance = { left: [...formulas], right: [...] }. Any coefficients that balance every element in lowest whole numbers are right. */
function balanceWidget(check, wrap, out, onResult, saveKey, prev, live) {
  const { left, right } = check.balance;
  const all = [...left, ...right];
  const counts = all.map(atomCounts);
  const elems = [...new Set(counts.flatMap(c => Object.keys(c)))];
  const eq = el("div", { class: "bal-eq" });
  const boxes = all.map((f, i) => {
    if (i === left.length) eq.appendChild(el("span", { class: "bal-arrow" }, "→"));
    else if (i > 0) eq.appendChild(el("span", { class: "bal-plus" }, "+"));
    const term = el("span", { class: "bal-term" });
    const b = el("input", { type: "text", inputmode: "numeric", pattern: "[0-9]*", autocomplete: "off", enterkeyhint: "next", class: "bal-co", placeholder: "1", maxlength: "3", "aria-label": "coefficient for " + f });
    term.appendChild(b);
    term.appendChild(el("span", { class: "bal-f" }, chem(f)));
    eq.appendChild(term);
    return b;
  });
  wrap.appendChild(eq);
  const tally = el("div", { class: "bal-tally", "aria-live": "polite" });
  wrap.appendChild(tally);
  const coeffs = () => boxes.map(b => { const v = b.value.trim(); return v === "" ? 1 : (/^\d+$/.test(v) ? +v : NaN); });
  const sums = co => elems.map(x => {
    let L = 0, Rr = 0;
    counts.forEach((c, i) => { const n = (c[x] || 0) * co[i]; if (i < left.length) L += n; else Rr += n; });
    return [x, L, Rr];
  });
  const draw = () => {
    const co = coeffs();
    if (co.some(isNaN)) { tally.innerHTML = "Whole numbers only."; return; }
    tally.innerHTML = sums(co).map(([x, L, Rr]) => `<span class="bal-el ${L === Rr ? "ok" : "off"}"><b>${x}</b> ${L} → ${Rr}</span>`).join("");
  };
  const run = () => {
    const co = coeffs();
    let ok = false, msg;
    if (co.some(n => isNaN(n) || n < 1)) msg = "Use whole numbers of 1 or more. An empty box counts as 1.";
    else if (!sums(co).every(([, L, Rr]) => L === Rr)) msg = "Not balanced yet. Look for the red element in the counts below the equation.";
    else if (co.reduce(gcd) !== 1) msg = "Balanced, but not in lowest whole numbers. Divide every coefficient by " + co.reduce(gcd) + ".";
    else { ok = true; msg = "Correct. Balanced in lowest whole numbers."; }
    out.className = "feedback " + (ok ? "good" : "bad"); out.innerHTML = msg;
    onResult && onResult(ok);
    return ok;
  };
  wrap.__grade = run;
  let checked = !!(prev && prev.c);
  const keep = () => saveKey && saveAnswer(saveKey, { v: boxes.map(b => b.value.trim()).join(",").replace(/^,+$/, ""), c: checked });
  boxes.forEach((b, i) => {
    b.addEventListener("input", () => { b.value = b.value.replace(/\D/g, ""); checked = false; keep(); draw(); out.className = "feedback"; out.innerHTML = ""; });
    b.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); if (boxes[i + 1]) boxes[i + 1].focus(); else if (live) { checked = true; keep(); run(); } } });
    b.addEventListener("focus", () => { try { b.select(); } catch (e) {} });
  });
  if (live) {
    const btn = el("button", { class: "btn small", type: "button" }, "Check");
    btn.addEventListener("click", () => { checked = true; keep(); run(); });
    wrap.appendChild(btn);
  }
  if (prev && prev.v) prev.v.split(",").forEach((v, i) => { if (boxes[i]) boxes[i].value = v; });
  draw();
  if (prev && prev.c) run();
}

/* ---------------- typed chemical equations (molecular, complete ionic, net ionic) ---------------- */
/* Reads e.g. "Pb^2+(aq) + 2I^-(aq) -> PbI2(s)". Charges with ^ (or a trailing sign), states optional. */
const EQ_SUPMAP = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁺": "+", "⁻": "-" };
function eqPrep(raw) {
  let s = String(raw || "");
  s = s.replace(/[₀-₉]/g, c => SUB[c]);
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+/g, m => "^" + [...m].map(c => EQ_SUPMAP[c]).join(""));
  s = s.replace(/[−–—]/g, "-").replace(/⟶|→|-+>|=+>|=/g, "⇒");
  s = s.replace(/\(\s*(aq|s|l|g)\s*\)/gi, (m, st) => "§" + st.toLowerCase() + "§");
  return s.replace(/\s+/g, "");
}
function parseEqSide(s) {
  // returns array of species or null; backtracks on whether a sign is a charge or the "+" between species
  function at(i) {
    if (i >= s.length) return null;
    const em = s.slice(i).match(/^(\d*)e(\^?-)/);
    if (em) {
      let k = i + em[0].length;
      const st = s.slice(k).match(/^§(aq|s|l|g)§/); if (st) k += st[0].length;
      const sp = { co: em[1] === "" ? 1 : +em[1], alts: [{ f: "e", q: -1 }], state: "" };
      if (k === s.length) return [sp];
      if (s[k] === "+") { const rest = at(k + 1); if (rest) return [sp, ...rest]; }
      return null;
    }
    const m = s.slice(i).match(/^(\d*)([A-Z(\[][A-Za-z0-9()\[\]]*)/);
    if (!m) return null;
    const co = m[1] === "" ? 1 : +m[1];
    let f = m[2].replace(/[\[\]]/g, c => c === "[" ? "(" : ")");
    let j = i + m[0].length;
    const tries = [];
    const cm = s.slice(j).match(/^\^(\d*)([+-])/), cr = s.slice(j).match(/^\^([+-])(\d+)/);
    if (cr) tries.push({ len: cr[0].length, alts: [{ f, q: (cr[1] === "+" ? 1 : -1) * +cr[2] }] });
    if (cm) tries.push({ len: cm[0].length, alts: [{ f, q: (cm[2] === "+" ? 1 : -1) * (cm[1] === "" ? 1 : +cm[1]) }] });
    else {
      const sm = s.slice(j).match(/^([+-])/);
      if (sm) {
        const sign = sm[1] === "+" ? 1 : -1;
        const alts = [{ f, q: sign }];
        const d = f.match(/^(.+)(\d)$/);
        if (d) alts.push({ f: d[1], q: sign * +d[2] });
        tries.push({ len: 1, alts });
      }
      tries.push({ len: 0, alts: [{ f, q: 0 }] });
    }
    for (const t of tries) {
      let k = j + t.len, state = "";
      const st = s.slice(k).match(/^§(aq|s|l|g)§/);
      if (st) { state = st[1]; k += st[0].length; }
      const sp = { co, alts: t.alts, state };
      if (k === s.length) return [sp];
      if (s[k] === "+") { const rest = at(k + 1); if (rest) return [sp, ...rest]; }
    }
    return null;
  }
  return at(0);
}
function parseEq(raw) {
  const s = eqPrep(raw);
  const parts = s.split("⇒");
  if (parts.length !== 2) return null;
  const L = parseEqSide(parts[0]), Rt = parseEqSide(parts[1]);
  return L && Rt ? [L, Rt] : null;
}
const eqKey = a => { const c = atomCounts(a.f); return Object.keys(c).sort().map(x => x + c[x]).join("") + "|" + a.q; };
const eqShow = (a, state) => chem(a.f + (a.q ? "^" + (Math.abs(a.q) > 1 ? Math.abs(a.q) : "") + (a.q > 0 ? "+" : "−") : "")) + (state ? "(" + state + ")" : "");
const eqText = (a, state) => (a.f + (a.q ? "^" + (Math.abs(a.q) > 1 ? Math.abs(a.q) : "") + (a.q > 0 ? "+" : "-") : "")) + (state ? "(" + state + ")" : "");
/* Pick the reading of each typed species that matches one the answer uses. */
function eqResolve(side, known) {
  return side.map(sp => { const a = sp.alts.find(x => known.has(eqKey(x))) || sp.alts[0]; return { co: sp.co, a, k: eqKey(a), state: sp.state }; });
}
function eqTally(sides) {
  const sum = side => { const m = {}; let q = 0; side.forEach(t => { const c = atomCounts(t.a.f); for (const x in c) m[x] = (m[x] || 0) + c[x] * t.co; q += t.a.q * t.co; }); return { m, q }; };
  const [L, Rt] = sides.map(sum);
  const els = [...new Set([...Object.keys(L.m), ...Object.keys(Rt.m)])];
  const rows = els.map(x => [x, L.m[x] || 0, Rt.m[x] || 0]);
  rows.push(["charge", L.q, Rt.q]);
  return rows;
}
function gradeEq(input, answer, medium) {
  const isNR = t => /^(nr|noreaction)\.?$/i.test(String(t).replace(/\s+/g, ""));
  if (isNR(answer)) return isNR(input) ? { ok: true, msg: "Correct. No precipitate, gas or water forms, so it's NR." } : { ok: false, msg: "Check the solubility of both possible products before you write a reaction." };
  if (isNR(input)) return { ok: false, msg: "This pair does react. Swap partners and check each product against the solubility rules." };
  const sf = eqPrep(input).match(/\^([+-])(\d+)/);
  if (sf) return { ok: false, msg: "Write the charge number first, then the sign: <sup>" + sf[2] + (sf[1] === "+" ? "+" : "−") + "</sup>, not <sup>" + (sf[1] === "+" ? "+" : "−") + sf[2] + "</sup>." };
  const U = parseEq(input);
  if (!U) {
    const parts = eqPrep(input).split("⇒");
    if (parts.length !== 2) return { ok: false, msg: "Put one → between the two sides." };
    const bad = !parseEqSide(parts[0]) ? "left" : "right";
    return { ok: false, msg: "I can't read the " + bad + " side yet. Check each formula, and put charges on with the x<sup>2+</sup> keys, like Pb²⁺(aq) + 2I⁻(aq)." };
  }
  const E = parseEq(answer);
  const known = new Set(E.flat().flatMap(sp => sp.alts.map(eqKey)));
  const u = U.map(side => eqResolve(side, known)), e = E.map(side => eqResolve(side, known));
  const name = t => eqShow(t.a, t.state);
  const names = list => list.map(name).join(", ");
  const sideName = i => i === 0 ? "left" : "right";
  // same species on each side?
  for (let i = 0; i < 2; i++) {
    const uk = new Set(u[i].map(t => t.k)), ek = new Set(e[i].map(t => t.k));
    const extra = u[i].filter(t => !ek.has(t.k)), missing = e[i].filter(t => !uk.has(t.k));
    if (!extra.length && !missing.length) continue;
    // an ion written with its count as a subscript, e.g. H2^2+ for 2H^+
    for (const t of extra) for (const m of missing) {
      const a = atomCounts(t.a.f), b = atomCounts(m.a.f), ka = Object.keys(a), kb = Object.keys(b);
      if (!m.a.q || ka.length !== kb.length) continue;
      const k = t.a.q / m.a.q;
      if (k > 1 && Number.isInteger(k) && kb.every(x => a[x] === b[x] * k)) return { ok: false, msg: eqShow(t.a) + " isn't an ion. It splits into " + k + " separate " + eqShow(m.a) + " ions, so write " + k + eqShow(m.a) + ": the subscript becomes a coefficient." };
    }
    const isE = t => t.a.f === "e", isH = t => t.k === "H1|1", isOH = t => t.k === "H1O1|-1";
    const ansAll = e.flat();
    if (extra.some(isE) && !ansAll.some(isE)) return { ok: false, msg: "The electrons should cancel in the overall equation. Multiply each half-reaction so both have the same number of e<sup>−</sup>, then add them." };
    if (extra.some(isE) && e[1 - i].some(isE)) return { ok: false, msg: "The electrons go on the other side. Oxidation loses electrons (they're products); reduction gains them (they're reactants)." };
    if (medium === "basic" && u.flat().some(isH)) return { ok: false, msg: "This one is in basic solution, so no H<sup>+</sup> in the final answer. Add the same number of OH<sup>−</sup> to both sides, turn each H<sup>+</sup> + OH<sup>−</sup> into H<sub>2</sub>O, and cancel water." };
    if (medium === "acidic" && u.flat().some(isOH)) return { ok: false, msg: "This one is in acidic solution. Balance O with H<sub>2</sub>O and H with H<sup>+</sup>, not OH<sup>−</sup>." };
    // spectators left in?
    const other = new Set(u[1 - i].map(t => t.k));
    const both = extra.filter(t => other.has(t.k));
    const spect = both.filter(t => t.a.q !== 0);
    if (both.length && missing.length === 0 && both.some(t => isE(t) || t.a.q === 0 || (medium && (isH(t) || isOH(t))))) return { ok: false, msg: "Cancel what appears on both sides: " + names(both) + "." };
    if (spect.length && missing.length === 0) return { ok: false, msg: "Cross out the spectator ions: " + names(spect) + ". They appear unchanged on both sides." };
    const unsplit = extra.filter(t => t.a.q === 0 && t.state === "aq");
    if (unsplit.length && missing.some(t => t.a.q !== 0)) return { ok: false, msg: "Split the soluble (aq) ionic compounds into their ions: " + names(unsplit) + "." };
    const split = missing.filter(t => t.a.q === 0 && (t.state === "s" || t.state === "l" || t.state === "g"));
    if (split.length && extra.some(t => t.a.q !== 0)) return { ok: false, msg: "Keep solids, liquids and gases together as one formula. Something on the " + sideName(i) + " shouldn't be split." };
    const weak = missing.find(t => t.a.q === 0 && t.state === "aq");
    if (weak && extra.some(t => t.a.q !== 0)) return { ok: false, msg: "Keep " + eqShow(weak.a) + " together. " + (/^H[A-Z]/.test(weak.a.f) && !/^H2O$/.test(weak.a.f) ? "It's a weak acid, so it barely ionizes and stays as whole molecules in ionic equations." : "It barely ionizes in water, so it isn't split into ions.") };
    if (extra.some(t => t.a.q !== 0) && missing.every(t => t.a.q === 0) && missing.length) return { ok: false, msg: "This step keeps compounds together. Write the " + sideName(i) + " side as whole formulas, not ions." };
    return { ok: false, msg: "The " + sideName(i) + " side isn't right yet. " + (missing.length ? "Something is missing or written differently there." : "There's something extra there.") };
  }
  // coefficients
  const ratio = [];
  for (let i = 0; i < 2; i++) u[i].forEach(t => { const m = e[i].find(x => x.k === t.k); ratio.push(t.co / m.co); });
  const sameCount = u.every((side, i) => side.length === e[i].length);
  const tally = eqTally(u);
  const off = tally.filter(([, L, Rr]) => L !== Rr).map(([x]) => x);
  if (!sameCount) return { ok: false, msg: "Write each species once, with one coefficient." };
  if (!ratio.every(r => r === ratio[0])) return { ok: false, msg: off.length ? "Right species, but not balanced: check " + off.join(", ") + " in the counts below." : "Right species, but check the coefficients." };
  if (ratio[0] !== 1) return { ok: false, msg: ratio[0] > 1 && Number.isInteger(ratio[0]) ? "Balanced, but not in lowest whole numbers. Divide every coefficient by " + ratio[0] + "." : "Right species, but check the coefficients." };
  // states
  const noState = [], wrongState = [];
  for (let i = 0; i < 2; i++) u[i].forEach(t => { const m = e[i].find(x => x.k === t.k); if (!t.state) { if (m.state) noState.push(m); } else if (m.state && t.state !== m.state) wrongState.push(t); });
  if (wrongState.length) return { ok: false, msg: "Species and coefficients are right. Check the state of " + names(wrongState) + "." };
  if (noState.length) return { ok: false, msg: "Species and coefficients are right. Now add the states, (aq), (s), (l) or (g), to every species." };
  return { ok: true, msg: "Correct. Balanced in atoms and charge, in lowest whole numbers." };
}
function eqPreview(input) {
  const U = parseEq(input);
  if (!U) return null;
  const side = s => s.map(sp => (sp.co > 1 ? sp.co : "") + eqShow(sp.alts[0], sp.state)).join(" + ");
  return { html: side(U[0]) + " → " + side(U[1]), tally: eqTally(U.map(s => eqResolve(s, new Set()))) };
}
const EQ_ROWS = [
  ["sub", ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉"]],
  ["sup", ["²", "³", "⁴", "⁺", "⁻"]],
  ["", [["→", " → "], ["+", " + "], "(aq)", "(s)", "(l)", "(g)", ["e⁻", "e⁻"], ["⌫", null]]]
];
function eqWidget(check, wrap, out, onResult, saveKey, prev, live) {
  wrap.classList.add("eqn");
  const inp = el("input", { type: "text", class: "eq-in", autocomplete: "off", autocapitalize: "off", autocorrect: "off", spellcheck: "false", enterkeyhint: "done", placeholder: check.nr ? "equation, or NR" : "type the equation", "aria-label": "equation " + (check.label || "").replace(/[{}]/g, "") });
  wrap.appendChild(inp);
  const put = ins => {
    const a = inp.selectionStart ?? inp.value.length, z = inp.selectionEnd ?? inp.value.length;
    let v, p;
    if (ins == null) { const s0 = a === z ? Math.max(0, a - 1) : a; v = inp.value.slice(0, s0) + inp.value.slice(z); p = s0; }
    else { v = inp.value.slice(0, a) + ins + inp.value.slice(z); p = a + ins.length; }
    inp.value = v; inp.focus(); try { inp.setSelectionRange(p, p); } catch (e) {}
    inp.dispatchEvent(new Event("input"));
  };
  const pad = el("div", { class: "eq-pad", hidden: "" });
  EQ_ROWS.forEach(([name, ks]) => {
    const row = el("div", { class: "eq-row" });
    if (name) row.appendChild(el("span", { class: "eq-row-lab" }, name === "sub" ? "x<sub>2</sub>" : "x<sup>2+</sup>"));
    ks.forEach(k => {
      const [lab, ins] = Array.isArray(k) ? k : [k, k];
      const plain = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9", "²": "2", "³": "3", "⁴": "4", "⁺": "+", "⁻": "−" }[lab];
      const face = name === "sub" ? '<span class="eq-x">x</span><sub>' + plain + "</sub>" : name === "sup" ? '<span class="eq-x">x</span><sup>' + plain + "</sup>" : lab;
      const b = el("button", { type: "button", class: "eq-key", "aria-label": ins == null ? "delete" : name === "sub" ? "subscript " + plain : name === "sup" ? "superscript " + plain : "insert " + lab }, face);
      b.addEventListener("pointerdown", ev => ev.preventDefault());
      b.addEventListener("click", () => put(ins));
      row.appendChild(b);
    });
    pad.appendChild(row);
  });
  if (check.copyUp) {
    const cb = el("button", { type: "button", class: "eq-key eq-copy" }, "Copy from above");
    cb.addEventListener("pointerdown", ev => ev.preventDefault());
    cb.addEventListener("click", () => {
      const up = wrap.previousElementSibling && wrap.previousElementSibling.querySelector("input.eq-in");
      if (!up || !up.value.trim()) { out.className = "feedback bad"; out.innerHTML = "Write the step above first."; return; }
      inp.value = up.value; inp.focus(); inp.dispatchEvent(new Event("input"));
    });
    pad.lastChild.appendChild(cb);
  }
  wrap.appendChild(pad);
  inp.addEventListener("focus", () => { pad.hidden = false; });
  inp.addEventListener("blur", () => { setTimeout(() => { if (document.activeElement !== inp) pad.hidden = true; }, 150); });
  const pv = el("div", { class: "eq-preview", "aria-live": "polite" });
  wrap.appendChild(pv);
  const draw = () => {
    const v = inp.value.trim();
    if (!v || /^(nr|noreaction)\.?$/i.test(v.replace(/\s+/g, ""))) { pv.innerHTML = ""; return; }
    const p = eqPreview(v);
    if (!p) { pv.innerHTML = '<span class="eq-wait">' + (eqPrep(v).split("⇒").length === 2 ? "Keep going…" : "Keep going… (one → between the sides)") + "</span>"; return; }
    pv.innerHTML = '<div class="bal-tally">' + p.tally.map(([x, L, Rr]) => `<span class="bal-el ${L === Rr ? "ok" : "off"}"><b>${x}</b> ${x === "charge" ? [L, Rr].map(n => n > 0 ? "+" + n : n < 0 ? "−" + -n : "0").join(" → ") : L + " → " + Rr}</span>`).join("") + "</div>";
  };
  const answers = [].concat(check.eq);
  const run = () => {
    const v = inp.value.trim();
    let res = v ? gradeEq(v, answers[0], check.medium) : { ok: false, msg: "Write the equation first." };
    for (const a of answers.slice(1)) { if (res.ok) break; const r = gradeEq(v, a, check.medium); if (r.ok) res = r; }
    out.className = "feedback " + (res.ok ? "good" : "bad"); out.innerHTML = res.msg;
    onResult && onResult(res.ok);
    return res.ok;
  };
  wrap.__grade = run;
  let checked = !!(prev && prev.c);
  const keep = () => saveKey && saveAnswer(saveKey, { v: inp.value, c: checked });
  inp.addEventListener("input", () => { checked = false; keep(); draw(); out.className = "feedback"; out.innerHTML = ""; });
  inp.addEventListener("keydown", e => { if (e.key === "Enter" && live) { e.preventDefault(); checked = true; keep(); run(); } });
  if (live) {
    const btn = el("button", { class: "btn small", type: "button" }, "Check");
    btn.addEventListener("click", () => { checked = true; keep(); run(); });
    wrap.appendChild(btn);
  }
  if (prev && prev.v) inp.value = prev.v;
  draw();
  if (prev && prev.c && live) run();
}

/* check.choice = [options], check.answer = the right option. Tap to pick; graded on tap (or at Finish in the mock). */
function choiceWidget(check, wrap, out, onResult, saveKey, prev, live) {
  wrap.classList.add("choice");
  const row = el("div", { class: "chips", role: "radiogroup", "aria-label": (check.label || "choices").replace(/[{}]/g, "") });
  let picked = prev && prev.v ? prev.v : null;
  const btns = check.choice.map(o => {
    const b = el("button", { class: "chip-pick", type: "button", role: "radio", "aria-checked": "false" }, R(o));
    b.addEventListener("click", () => { picked = o; paint(); saveKey && saveAnswer(saveKey, { v: o, c: true }); if (live) run(); else { out.className = "feedback"; out.innerHTML = ""; } });
    row.appendChild(b);
    return b;
  });
  const paint = () => btns.forEach((b, i) => { const on = check.choice[i] === picked; b.classList.toggle("on", on); b.setAttribute("aria-checked", on ? "true" : "false"); b.classList.remove("good", "bad"); });
  const run = () => {
    const ok = picked != null && normText(picked) === normText(check.answer);
    paint();
    const i = check.choice.indexOf(picked);
    if (i >= 0) btns[i].classList.add(ok ? "good" : "bad");
    out.className = "feedback " + (ok ? "good" : "bad");
    out.innerHTML = picked == null ? "Pick an answer first." : ok ? "Correct." : "Not quite. Try another, or open the solution.";
    onResult && onResult(ok);
    return ok;
  };
  wrap.__grade = run;
  wrap.appendChild(row);
  paint();
  if (picked != null && live) run();
}

/* opts.deferred: no Check button or feedback until wrap.__grade() is called (mock exam). */
function checkWidget(check, onResult, saveKey, opts = {}) {
  const wrap = el("div", { class: "check" });
  const live = !opts.deferred;
  const prev = savedAnswer(saveKey);
  if (check.label) wrap.appendChild(el("span", { class: "check-label" }, R(check.label)));
  const out = el("div", { class: "feedback" });
  if (check.balance) { balanceWidget(check, wrap, out, onResult, saveKey, prev, live); wrap.appendChild(out); return wrap; }
  if (check.choice) { choiceWidget(check, wrap, out, onResult, saveKey, prev, live); wrap.appendChild(out); return wrap; }
  if (check.eq) { eqWidget(check, wrap, out, onResult, saveKey, prev, live); wrap.appendChild(out); return wrap; }
  if (check.text || check.config) {
    const inp = el("input", { type: "text", placeholder: check.config ? "e.g. [Ar] 4s2 3d6" : "your answer", "aria-label": "answer " + (check.label || "") });
    if (check.config) { inp.setAttribute("autocapitalize", "off"); inp.setAttribute("autocorrect", "off"); inp.setAttribute("spellcheck", "false"); }
    wrap.appendChild(inp);
    const btn = el("button", { class: "btn small", type: "button" }, "Check");
    const run = () => {
      let ok;
      if (check.config) ok = sameConfig(parseConfig(inp.value), parseConfig(check.config));
      else ok = check.text.some(t => normText(t) === normText(inp.value));
      out.className = "feedback " + (ok ? "good" : "bad");
      out.innerHTML = ok ? "Correct." : (inp.value.trim() ? "Not quite. Try again or open the solution." : "Type an answer first.");
      onResult && onResult(ok);
      return ok;
    };
    wrap.__grade = run;
    if (live) {
      btn.addEventListener("click", run);
      inp.addEventListener("keydown", e => { if (e.key === "Enter") run(); });
      wrap.appendChild(btn);
    }
    if (check.config) wrap.appendChild(configPad(inp));
    if (saveKey) {
      let checked = !!(prev && prev.c);
      const keep = () => saveAnswer(saveKey, { v: inp.value, c: checked });
      inp.addEventListener("input", () => { checked = false; keep(); out.className = "feedback"; out.innerHTML = ""; });
      btn.addEventListener("click", () => { checked = !!inp.value.trim(); keep(); });
      inp.addEventListener("keydown", e => { if (e.key === "Enter") { checked = !!inp.value.trim(); keep(); } });
      if (prev) { inp.value = prev.v || ""; if (prev.c && inp.value.trim()) run(); }
    }
  } else {
    const short = !check.sf && !check.units;
    const inp = el("input", { type: "text", inputmode: short ? "decimal" : store.get("kbd", "decimal"), autocomplete: "off", autocorrect: "off", autocapitalize: "off", spellcheck: "false", enterkeyhint: "done", placeholder: check.sf ? "e.g. 3.32e4 or 6.02e-23" : "number", class: "num" + (short ? " short" : ""), "aria-label": "value " + (check.label || "") });
    wrap.appendChild(inp);
    wrap.appendChild(numKeys(inp, short));
    let unit = null;
    if (check.units) {
      unit = el("input", { type: "text", placeholder: "unit", class: "unit", "aria-label": "unit " + (check.label || "") });
      wrap.appendChild(unit);
    }
    const btn = el("button", { class: "btn small", type: "button" }, "Check");
    const run = () => {
      const res = gradeNumber(check, inp.value, unit ? unit.value : null);
      out.className = "feedback " + res.cls;
      out.innerHTML = res.msg;
      onResult && onResult(res.ok);
      return res.ok;
    };
    wrap.__grade = run;
    if (live) {
      btn.addEventListener("click", run);
      [inp, unit].forEach(x => x && x.addEventListener("keydown", e => { if (e.key === "Enter") run(); }));
      wrap.appendChild(btn);
    }
    if (saveKey) {
      let checked = !!(prev && prev.c);
      const keep = () => saveAnswer(saveKey, { v: inp.value, u: unit ? unit.value : "", c: checked });
      [inp, unit].forEach(x => x && x.addEventListener("input", () => { checked = false; keep(); out.className = "feedback"; out.innerHTML = ""; }));
      btn.addEventListener("click", () => { checked = !!inp.value.trim(); keep(); });
      [inp, unit].forEach(x => x && x.addEventListener("keydown", e => { if (e.key === "Enter") { checked = !!inp.value.trim(); keep(); } }));
      if (prev) { inp.value = prev.v || ""; if (unit) unit.value = prev.u || ""; if (prev.c && inp.value.trim()) run(); }
    }
  }
  wrap.appendChild(out);
  return wrap;
}
function gradeNumber(check, raw, unitRaw) {
  let p = parseNumber(raw);
  let fromExpr = false;
  if (!p) {
    const ev = evalExpr(raw);
    if (ev == null) return { ok: false, cls: "bad", msg: "I couldn't read that. Try 0.308, 3.32e4, 3.32 × 10^4 or a calculation like 6.626e-34*2.998e8/486.1e-9." };
    p = { value: ev, sf: null, ambiguous: false }; fromExpr = true;
  }
  const target = check.value;
  let v = p.value;
  if (check.abs) { v = Math.abs(v); }
  const t = check.abs ? Math.abs(target) : target;
  const tol = check.exact ? 1e-9 : (check.tol || 0.006);
  const close = t === 0 ? Math.abs(v) < 1e-12 : Math.abs(v - t) / Math.abs(t) <= tol;
  if (!close) {
    const signOnly = !check.abs && Math.abs(Math.abs(v) - Math.abs(t)) / Math.abs(t) <= tol;
    const near = t !== 0 && Math.abs(v - t) / Math.abs(t) <= 0.03;
    return { ok: false, cls: "bad", msg: signOnly ? "Right size, wrong sign. Is heat leaving or entering the system?" : near ? "Close, but not quite. Did you round too early or round off a constant? Keep full calculator values until the end." : "Not quite. Check your setup, then try again or open the solution." };
  }
  if (!fromExpr && check.sf && !check.tol && !check.exact && p.sf && !p.ambiguous) {
    const k = Math.min(p.sf, check.sf);
    const a = Number(v.toPrecision(k)), b = Number(t.toPrecision(k));
    if (Math.abs(a - b) > Math.abs(b) * 1e-9) return { ok: false, cls: "bad", msg: "Close, but not quite. The last digit is off. Did you round too early or round off a constant? Keep full calculator values until the end." };
  }
  const notes = [];
  let ok = true;
  if (fromExpr && check.sf) notes.push("Worked out from your calculation. On the exam, write the final answer as " + R(fmtSci(t, check.sf)) + " (" + check.sf + " sig figs).");
  if (!fromExpr && check.sf && p.sf !== check.sf && !p.ambiguous) { ok = false; notes.push("You have " + p.sf + " sig fig" + (p.sf === 1 ? "" : "s") + "; this answer needs " + check.sf + " (" + R(fmtSci(t, check.sf)) + ")."); }
  if (check.sf && p.ambiguous) notes.push("Trailing zeros without a decimal point are ambiguous. Use scientific notation: " + R(fmtSci(t, check.sf)) + ".");
  if (check.units) {
    if (!unitRaw || !unitRaw.trim()) { ok = false; notes.push("Missing unit. That cost points on Exam 1. Expected: " + check.units[0] + "."); }
    else if (!check.units.some(u => normUnit(u) === normUnit(unitRaw))) { ok = false; notes.push("Unit doesn't match. Expected " + check.units[0] + "."); }
  }
  if (ok && fromExpr) return { ok: true, cls: "good", msg: "Correct value. " + notes.join(" ") };
  if (ok) return { ok: true, cls: "good", msg: "Correct, with the right sig figs and unit." };
  return { ok: false, cls: "warn", msg: "The number is right, but: " + notes.join(" ") };
}

/* ---------------- views ---------------- */
const VIEWS = {};
function route() {
  const id = (location.hash || "#home").slice(1).split("/")[0];
  const view = VIEWS[id] ? id : "home";
  document.querySelectorAll("nav a").forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + view));
  const main = $("#main");
  main.innerHTML = "";
  VIEWS[view](main);
  main.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

/* Home */
VIEWS.home = main => {
  const start = new Date(EXAM.start);
  const card = el("section", { class: "hero" });
  card.innerHTML = `<h1>${EXAM.title}</h1><p class="lead">Ch 3 (solutions), Ch 4, Ch 5 and Ch 6. Monday, Nov 9, 1:00 PM.</p><div id="countdown" class="countdown"></div>`;
  main.appendChild(card);
  const tick = () => {
    const c = $("#countdown"); if (!c) return;
    const ms = start - new Date();
    if (ms <= 0) { c.textContent = new Date() < new Date(EXAM.end) ? "Exam in progress. You've got this." : "Exam done."; return; }
    const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4);
    c.innerHTML = `<b>${d}</b> days <b>${h}</b> hours <b>${m}</b> min to go`;
  };
  tick(); clearInterval(window.__cd); window.__cd = setInterval(tick, 30000);

  const done = store.get("probs", {});
  const got = Object.values(done).filter(x => x === "got").length;
  const missed = Object.values(done).filter(x => x === "missed").length;
  const studyDone = Object.values(store.get("study", {})).filter(Boolean).length;
  const studyTotal = STUDY.reduce((a, c) => a + c.groups.reduce((x, g) => x + g.items.length, 0), 0);
  const stats = el("section", { class: "stats" });
  stats.innerHTML = `
    <div class="stat"><span class="num">${got}/${PROBLEMS.length}</span><span>practice problems got</span></div>
    <div class="stat"><span class="num">${missed}</span><span>marked to redo</span></div>
    <div class="stat"><span class="num">${studyDone}/${studyTotal}</span><span>study items checked</span></div>
    <div class="stat"><span class="num">${store.get("drillCorrect", 0)}</span><span>drill answers right</span></div>`;
  main.appendChild(stats);

  const facts = el("section", { class: "card" }, "<h2>Exam facts</h2>");
  const dl = el("dl", { class: "facts" });
  EXAM.facts.forEach(([k, v]) => { dl.appendChild(el("dt", {}, k)); dl.appendChild(el("dd", {}, R(v))); });
  facts.appendChild(dl);
  facts.appendChild(el("p", { class: "muted small" }, "From Dr. Butler's Nov 6 weekly summary email."));
  main.appendChild(facts);

  const plan = el("section", { class: "card" }, "<h2>Study plan</h2>");
  const ol = el("ol", { class: "plan" });
  EXAM.plan.forEach(([d, t]) => ol.appendChild(el("li", {}, `<b>${d}:</b> ${R(t)}`)));
  plan.appendChild(ol);
  main.appendChild(plan);

  const go = el("section", { class: "grid" });
  [["#review", "Exam 1 review", "Where the 8 points went"], ["#practice", "Practice problems", PROBLEMS.length + " exam-style problems with an answer checker"], ["#drills", "Drills", "Endless random questions on your weak spots"], ["#mock", "Mock exam", "50-minute timed run"], ["#cards", "Flashcards", "Formulas and rules to memorize"], ["#study", "Study lists", "Checklists for every chapter"]]
    .forEach(([h, t, s]) => go.appendChild(el("a", { class: "tile", href: h }, `<b>${t}</b><span>${s}</span>`)));
  main.appendChild(go);
};

/* Exam 1 review */
VIEWS.review = main => {
  main.appendChild(el("h1", {}, "Exam 1 review"));
  main.appendChild(el("p", { class: "lead" }, R(EXAM1.summary)));
  const list = el("div", { class: "review" });
  EXAM1.rows.forEach(r => {
    list.appendChild(el("article", { class: "card miss" }, `
      <div class="miss-head"><b>Q${r.q}</b><span class="pill">−${r.lost} pt${r.lost === 1 ? "" : "s"}</span></div>
      <p><span class="tag">What happened</span> ${R(r.what)}</p>
      <p><span class="tag">Right answer</span> ${R(r.right)}</p>
      <p><span class="tag good">Fix</span> ${R(r.fix)}</p>`));
  });
  main.appendChild(list);
  const nm = el("section", { class: "card" }, "<h2>Near misses</h2>");
  const ul = el("ul");
  EXAM1.nearMisses.forEach(t => ul.appendChild(el("li", {}, R(t))));
  nm.appendChild(ul);
  main.appendChild(nm);
  main.appendChild(el("a", { class: "btn", href: "#habits" }, "Go to the habits checklist"));
};

/* Habits */
VIEWS.habits = main => {
  main.appendChild(el("h1", {}, "Habits checklist"));
  main.appendChild(el("p", { class: "lead" }, "Run these on every answer, in practice and on Monday. The first three would have saved all 8 points on Exam 1."));
  const ul = el("ul", { class: "checklist" });
  HABITS.forEach(([t, d], i) => {
    const li = el("li");
    const cb = el("input", { type: "checkbox", id: "h" + i });
    const lab = el("label", { for: "h" + i }, `<b>${t}:</b> ${R(d)}`);
    li.appendChild(cb); li.appendChild(lab); ul.appendChild(li);
  });
  main.appendChild(ul);
  main.appendChild(el("p", { class: "muted" }, "These boxes reset each time on purpose: tick through them for each problem."));
};

/* Study lists */
VIEWS.study = main => {
  main.appendChild(el("h1", {}, "Study lists"));
  main.appendChild(el("p", { class: "lead" }, "Tick an item when you can explain it and do a problem on it without notes. Ticks are saved in this browser."));
  const saved = store.get("study", {});
  STUDY.forEach((c, ci) => {
    const sec = el("section", { class: "card" });
    const total = c.groups.reduce((a, g) => a + g.items.length, 0);
    const prog = el("div", { class: "progress" }, "<span></span>");
    const head = el("div", { class: "card-head" }, `<h2>${c.ch}: ${c.title}</h2><a class="small" href="#practice/${c.ch.replace(" ", "")}">Problems ${c.probs}</a>`);
    sec.appendChild(head); sec.appendChild(prog);
    const update = () => {
      const n = c.groups.reduce((a, g, gi) => a + g.items.filter((_, ii) => saved[`${ci}.${gi}.${ii}`]).length, 0);
      prog.firstChild.style.width = (100 * n / total) + "%";
      prog.setAttribute("aria-label", `${n} of ${total} done`);
    };
    c.groups.forEach((g, gi) => {
      sec.appendChild(el("h3", {}, g.name));
      if (g.table) {
        const t = el("table", { class: "sol-table" });
        t.innerHTML = "<thead><tr><th>Ion</th><th>Usually</th><th>Exceptions</th></tr></thead><tbody>" +
          SOLUBILITY_TABLE.map(r => `<tr><td>${R(r[0])}</td><td>${r[1]}</td><td>${R(r[2])}</td></tr>`).join("") + "</tbody>";
        const sc = el("div", { class: "table-wrap" }); sc.appendChild(t); sec.appendChild(sc);
      }
      const ul = el("ul", { class: "checklist" });
      g.items.forEach((it, ii) => {
        const key = `${ci}.${gi}.${ii}`;
        const li = el("li");
        const cb = el("input", { type: "checkbox", id: "s" + key.replace(/\./g, "-") });
        cb.checked = !!saved[key];
        cb.addEventListener("change", () => { saved[key] = cb.checked; store.set("study", saved); update(); });
        li.appendChild(cb); li.appendChild(el("label", { for: cb.id }, R(it))); ul.appendChild(li);
      });
      sec.appendChild(ul);
    });
    update();
    main.appendChild(sec);
  });
};

/* Practice */
function problemCard(p, opts = {}) {
  const status = store.get("probs", {});
  const card = el("article", { class: "card problem", id: "p" + p.n });
  const st = status[p.n];
  card.appendChild(el("div", { class: "card-head" }, `<h3>${p.num || p.n}. ${p.topic}</h3><span class="pill ${st || ""}">${p.ch}${st === "got" ? " · got it" : st === "missed" ? " · redo" : ""}</span>`));
  card.appendChild(el("div", { class: "q" }, R(p.q)));
  if (!opts.noChecks && p.checks && p.checks.length) {
    const box = el("div", { class: "checks" });
    const ws = p.checks.map((c, i) => checkWidget(c, null, opts.noSolution ? null : p.n + ":" + i, { deferred: !!opts.mock }));
    ws.forEach(w => box.appendChild(w));
    card.appendChild(box);
    card.__grade = () => ws.map(w => w.__grade());
  }
  if (opts.mock) card.appendChild(el("textarea", { class: "work", rows: "3", placeholder: "Your work", "aria-label": "Your work for problem " + (p.num || p.n) }));
  const actions = el("div", { class: "actions" });
  if (!opts.noHint && p.hint) {
    const hint = el("div", { class: "hint", hidden: "" }, R(p.hint));
    actions.appendChild(el("button", { class: "btn ghost small", type: "button", onclick: () => { hint.hidden = !hint.hidden; } }, "Hint"));
    card.appendChild(hint);
  }
  const sol = el("div", { class: "solution", hidden: "" }, R(p.sol));
  const solBtn = el("button", { class: "btn ghost small", type: "button", onclick: () => { sol.hidden = !sol.hidden; solBtn.textContent = sol.hidden ? "Show solution" : "Hide solution"; } }, "Show solution");
  if (!opts.noSolution) actions.appendChild(solBtn);
  const mark = (v) => { const s = store.get("probs", {}); s[p.n] = v; store.set("probs", s); const pill = card.querySelector(".pill"); pill.className = "pill " + v; pill.textContent = p.ch + (v === "got" ? " · got it" : " · redo"); };
  actions.appendChild(el("button", { class: "btn small ok", type: "button", onclick: () => mark("got") }, "Got it"));
  actions.appendChild(el("button", { class: "btn small no", type: "button", onclick: () => mark("missed") }, "Redo later"));
  card.appendChild(actions);
  card.appendChild(sol);
  card.__showSolution = () => { sol.hidden = false; };
  return card;
}
VIEWS.practice = main => {
  const sub = (location.hash.split("/")[1] || "all");
  main.appendChild(el("h1", {}, "Practice problems"));
  main.appendChild(el("p", { class: "lead" }, "Work each one on paper first, then check. The checker grades the number, the sig figs and the unit, like Dr. Butler does. Type answers any way you like: 3.32e4, 3.32 × 10^4, 3.32*10^4 or a whole calculation like 6.626e-34*2.998e8/486.1e-9. On a phone, the E and − buttons add those to the number pad, and abc switches to the full keyboard for ( ) ^ * /."));
  const filters = el("div", { class: "filters" });
  const status = store.get("probs", {});
  [["all", "All"], ["Ch3", "Ch 3"], ["Ch4", "Ch 4"], ["Ch5", "Ch 5"], ["Ch6", "Ch 6"], ["redo", "Redo list"]].forEach(([k, t]) => {
    filters.appendChild(el("a", { class: "chip" + (sub === k ? " on" : ""), href: "#practice/" + k }, t));
  });
  main.appendChild(filters);
  const list = PROBLEMS.filter(p => sub === "all" || (sub === "redo" ? status[p.n] === "missed" : p.ch.replace(" ", "") === sub));
  if (!list.length) main.appendChild(el("p", { class: "muted" }, sub === "redo" ? "Nothing on the redo list. Mark problems with Redo later to collect them here." : "No problems here."));
  list.forEach(p => main.appendChild(problemCard(p)));
};

/* Mock exam */
VIEWS.mock = main => {
  main.appendChild(el("h1", {}, "Mock exam"));
  main.appendChild(el("p", { class: "muted small" }, R("Constants: c = 2.998 × 10^8 m/s, h = 6.626 × 10^−34 J·s, N<sub>A</sub> = 6.022 × 10^23 /mol, c(water) = 4.184 J/g·°C, E<sub>n</sub> = −2.179 × 10^−18 J ÷ n^2.")));
  const bar = el("div", { class: "timer-bar" });
  const timeEl = el("span", { class: "timer" }, "50:00");
  const startBtn = el("button", { class: "btn", type: "button" }, "Start");
  const finishBtn = el("button", { class: "btn ghost", type: "button" }, "Finish and see solutions");
  bar.appendChild(timeEl); bar.appendChild(startBtn); bar.appendChild(finishBtn);
  main.appendChild(bar);
  const area = el("div", { class: "mock-area" });
  main.appendChild(area);
  const cards = MOCK_PROBLEMS.map(p => problemCard(p, { mock: true, noHint: true, noSolution: true }));
  let left = 50 * 60, timer = null, started = false;
  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const finish = () => {
    clearInterval(timer); timer = null;
    if (!started) { cards.forEach(c => area.appendChild(c)); started = true; }
    let right = 0, total = 0;
    cards.forEach(c => { if (c.__grade) c.__grade().forEach(ok => { total++; if (ok) right++; }); c.__showSolution(); });
    timeEl.textContent = "Done · " + fmt(50 * 60 - left) + " used";
    startBtn.disabled = true; finishBtn.disabled = true;
    area.prepend(el("p", { class: "callout" }, `<b>${right} of ${total}</b> answer boxes right. Check your written work against each solution.`));
  };
  startBtn.addEventListener("click", () => {
    if (!started) { cards.forEach(c => area.appendChild(c)); started = true; }
    if (timer) { clearInterval(timer); timer = null; startBtn.textContent = "Resume"; return; }
    startBtn.textContent = "Pause";
    timer = setInterval(() => { left--; timeEl.textContent = fmt(left); timeEl.classList.toggle("low", left <= 300); if (left <= 0) finish(); }, 1000);
  });
  finishBtn.addEventListener("click", finish);
  window.__stopMock = () => clearInterval(timer);
};

/* Flashcards */
VIEWS.cards = main => {
  main.appendChild(el("h1", {}, "Flashcards"));
  main.appendChild(el("p", { class: "lead" }, "Say the answer out loud, then flip. Tap the card or press Space to flip; arrow keys move."));
  let deck = shuffle(FLASHCARDS), i = 0, flipped = false;
  const card = el("button", { class: "flash", type: "button", "aria-live": "polite" });
  const count = el("p", { class: "muted center" });
  const show = () => { const [f, b] = deck[i]; card.innerHTML = flipped ? `<span class="side">Answer</span>${R(b)}` : `<span class="side">Prompt</span>${R(f)}`; card.classList.toggle("back", flipped); count.textContent = `${i + 1} / ${deck.length}`; };
  card.addEventListener("click", () => { flipped = !flipped; show(); });
  const nav = el("div", { class: "actions center" });
  nav.appendChild(el("button", { class: "btn ghost", type: "button", onclick: () => { i = (i - 1 + deck.length) % deck.length; flipped = false; show(); } }, "Previous"));
  nav.appendChild(el("button", { class: "btn ghost", type: "button", onclick: () => { deck = shuffle(FLASHCARDS); i = 0; flipped = false; show(); } }, "Shuffle"));
  nav.appendChild(el("button", { class: "btn", type: "button", onclick: () => { i = (i + 1) % deck.length; flipped = false; show(); } }, "Next"));
  main.appendChild(card); main.appendChild(count); main.appendChild(nav);
  document.onkeydown = e => {
    if (!document.body.contains(card) || /input|textarea/i.test(e.target.tagName)) return;
    if (e.key === " ") { e.preventDefault(); flipped = !flipped; show(); }
    if (e.key === "ArrowRight") { i = (i + 1) % deck.length; flipped = false; show(); }
    if (e.key === "ArrowLeft") { i = (i - 1 + deck.length) % deck.length; flipped = false; show(); }
  };
  show();
};

/* ---------------- drills ---------------- */
const ELEMENTS = "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr".split(" ");
const DRILLS = {};
function countRight() { store.set("drillCorrect", store.get("drillCorrect", 0) + 1); }

function mcDrill(gen) {
  return box => {
    const q = gen();
    box.appendChild(el("p", { class: "q" }, R(q.prompt)));
    const opts = el("div", { class: "mc" });
    const fb = el("div", { class: "feedback" });
    let answered = false;
    q.options.forEach(o => {
      const b = el("button", { class: "btn ghost", type: "button" }, R(o));
      b.addEventListener("click", () => {
        if (answered) return; answered = true;
        const ok = o === q.answer;
        b.classList.add(ok ? "right" : "wrong");
        [...opts.children].forEach(x => { if (x.innerHTML === R(q.answer)) x.classList.add("right"); });
        fb.className = "feedback " + (ok ? "good" : "bad");
        fb.innerHTML = (ok ? "Correct. " : "Not quite. ") + R(q.why || "");
        if (ok) countRight();
      });
      opts.appendChild(b);
    });
    box.appendChild(opts); box.appendChild(fb);
  };
}
function inputDrill(gen) {
  return box => {
    const q = gen();
    box.appendChild(el("p", { class: "q" }, R(q.prompt)));
    let counted = false;
    const w = checkWidget(q.check, ok => { if (ok && !counted) { counted = true; countRight(); } });
    box.appendChild(w);
    const sol = el("div", { class: "solution", hidden: "" }, R(q.sol));
    const row = el("div", { class: "drill-actions" });
    const sb = el("button", { class: "btn ghost", type: "button" }, "Show solution");
    sb.addEventListener("click", () => { sol.hidden = !sol.hidden; sb.textContent = sol.hidden ? "Show solution" : "Hide solution"; });
    row.appendChild(sb);
    box.appendChild(sol);
    box.appendChild(row);
  };
}

const SOLUBLE = [
  ["NaCl", "Soluble", "Group 1 compounds are soluble."], ["AgCl", "Insoluble", "Halides of Ag⁺, Pb²⁺, Hg₂²⁺ are insoluble."],
  ["PbI2", "Insoluble", "Halides of Pb²⁺ are insoluble."], ["KNO3", "Soluble", "Nitrates are always soluble."],
  ["BaSO4", "Insoluble", "Sulfates of Ba²⁺, Pb²⁺, Sr²⁺, Ca²⁺ are insoluble."], ["Na2SO4", "Soluble", "Group 1 compounds are soluble."],
  ["CaCO3", "Insoluble", "Carbonates are insoluble except Group 1 and NH₄⁺."], ["(NH4)2CO3", "Soluble", "Ammonium compounds are soluble."],
  ["Fe(OH)3", "Insoluble", "Hydroxides are insoluble except Group 1 and NH₄⁺."], ["NaOH", "Soluble", "Group 1 hydroxides are soluble."],
  ["Cu(NO3)2", "Soluble", "Nitrates are always soluble."], ["CuS", "Insoluble", "Sulfides are insoluble except Group 1 and NH₄⁺."],
  ["Ca3(PO4)2", "Insoluble", "Phosphates are insoluble except Group 1 and NH₄⁺."], ["K3PO4", "Soluble", "Group 1 compounds are soluble."],
  ["MgCl2", "Soluble", "Chlorides are soluble except Ag⁺, Pb²⁺, Hg₂²⁺."], ["PbSO4", "Insoluble", "Pb²⁺ sulfate is an exception."],
  ["Ba(NO3)2", "Soluble", "Nitrates are always soluble."], ["Mg(OH)2", "Insoluble", "Hydroxides are insoluble except Group 1 and NH₄⁺."],
  ["AgNO3", "Soluble", "Nitrates are always soluble."], ["ZnS", "Insoluble", "Sulfides are insoluble except Group 1 and NH₄⁺."],
  ["NH4Cl", "Soluble", "Ammonium compounds are soluble."], ["Pb(C2H3O2)2", "Soluble", "Acetates are always soluble."],
  ["BaCl2", "Soluble", "Chlorides are soluble; barium is only an exception for sulfate."], ["Ag2CO3", "Insoluble", "Carbonates are insoluble except Group 1 and NH₄⁺."]
];
DRILLS.solubility = { name: "Soluble or insoluble", ch: "Ch 4", run: mcDrill(() => {
  const [f, a, why] = pick(SOLUBLE);
  return { prompt: `Is <b>{${f}}</b> soluble in water?`, options: ["Soluble", "Insoluble"], answer: a, why };
}) };

const OXNUM = [
  ["S", "H2SO4", 6], ["N", "HNO3", 5], ["N", "NH3", -3], ["C", "CH4", -4], ["C", "CO3^2−", 4], ["Cr", "Cr2O7^2−", 6], ["Mn", "MnO4^−", 7],
  ["Mn", "MnO2", 4], ["Fe", "Fe2O3", 3], ["P", "PO4^3−", 5], ["Cl", "ClO3^−", 5], ["Cl", "HClO4", 7], ["O", "H2O2", -1], ["S", "H2S", -2],
  ["N", "NO2", 4], ["Cu", "Cu2O", 1], ["S", "SO3^2−", 4], ["N", "NO3^−", 5], ["C", "CO", 2], ["H", "NaH", -1], ["Cl", "Cl2", 0], ["Fe", "Fe", 0]
];
const BALANCE_EQS = [
  "H2 + O2 > H2O | 2,1,2", "N2 + H2 > NH3 | 1,3,2", "CH4 + O2 > CO2 + H2O | 1,2,1,2", "C3H8 + O2 > CO2 + H2O | 1,5,3,4",
  "C2H6 + O2 > CO2 + H2O | 2,7,4,6", "Fe + O2 > Fe2O3 | 4,3,2", "Na + Cl2 > NaCl | 2,1,2", "KClO3 > KCl + O2 | 2,2,3",
  "Al + HCl > AlCl3 + H2 | 2,6,2,3", "Zn + HCl > ZnCl2 + H2 | 1,2,1,1", "Mg + O2 > MgO | 2,1,2", "H2SO4 + NaOH > Na2SO4 + H2O | 1,2,1,2",
  "Pb(NO3)2 + KI > PbI2 + KNO3 | 1,2,1,2", "AgNO3 + CaCl2 > AgCl + Ca(NO3)2 | 2,1,2,1", "FeCl3 + NaOH > Fe(OH)3 + NaCl | 1,3,1,3",
  "Na2CO3 + HCl > NaCl + H2O + CO2 | 1,2,2,1,1", "C6H12O6 + O2 > CO2 + H2O | 1,6,6,6", "NH3 + O2 > NO + H2O | 4,5,4,6",
  "P4 + O2 > P4O10 | 1,5,1", "Ca(OH)2 + HNO3 > Ca(NO3)2 + H2O | 1,2,1,2", "Fe2O3 + C > Fe + CO2 | 2,3,4,3", "C4H10 + O2 > CO2 + H2O | 2,13,8,10"
].map(line => {
  const [eq, co] = line.split("|");
  const [l, r] = eq.split(">").map(side => side.trim().split(/\s*\+\s*/));
  return { left: l, right: r, co: co.trim().split(",").map(Number) };
});
DRILLS.balance = { name: "Balancing equations", ch: "Ch 4", run: inputDrill(() => {
  const e = pick(BALANCE_EQS);
  const all = [...e.left, ...e.right];
  const side = (fs, off) => fs.map((f, i) => (e.co[off + i] > 1 ? "<b>" + e.co[off + i] + "</b>" : "") + "{" + f + "}").join(" + ");
  return { prompt: "Balance it. An empty box counts as 1.", check: { label: "", balance: { left: e.left, right: e.right } },
    sol: side(e.left, 0) + " → " + side(e.right, e.left.length) + "<br>Balance the element that shows up in the fewest formulas first, keep polyatomic ions together, and leave O and H for last." };
}) };

DRILLS.oxnum = { name: "Oxidation numbers", ch: "Ch 4", run: inputDrill(() => {
  const [atom, f, v] = pick(OXNUM);
  return { prompt: `Oxidation number of <b>${atom}</b> in <b>{${f}}</b>?`, check: { label: "", value: v, exact: true },
    sol: `<b>${v > 0 ? "+" + v : v}</b>. Set ${atom} = x and make the total equal the overall charge (O = −2, H = +1 unless noted).` };
}) };

const SF_SAMPLES = () => {
  const kind = randInt(0, 5);
  const d = () => String(randInt(1, 9));
  switch (kind) {
    case 0: return "0.00" + d() + d() + (Math.random() < .5 ? "0" : "");
    case 1: return d() + d() + "." + d() + "0";
    case 2: return d() + "0" + "0" + d();
    case 3: return d() + "." + d() + d() + " x 10^" + randInt(-9, 9);
    case 4: return d() + d() + "00.";
    default: return "0." + d() + "0" + d() + "0";
  }
};
DRILLS.sfcount = { name: "Count sig figs", ch: "Exam 1 skill", run: inputDrill(() => {
  const s = SF_SAMPLES();
  const n = parseNumber(s).sf;
  return { prompt: `How many significant figures in <b>${R(s.replace(" x ", " × "))}</b>?`, check: { label: "", value: n, exact: true },
    sol: `<b>${n}</b>. Leading zeros never count; captive zeros always count; trailing zeros count only with a decimal point.` };
}) };

DRILLS.sfcalc = { name: "Sig figs in calculations", ch: "Exam 1 skill", run: inputDrill(() => {
  if (Math.random() < 0.55) {
    const sfa = randInt(2, 4), sfb = randInt(2, 4);
    const clean = sf => { let x; do { x = rand(1.1, 99).toPrecision(sf); } while (!x.includes(".") && /0$/.test(x)); return Number(x); };
    const a = clean(sfa), b = clean(sfb);
    const op = Math.random() < .5 ? "×" : "÷";
    const exact = op === "×" ? a * b : a / b;
    const sf = Math.min(sfa, sfb);
    const as = a.toPrecision(sfa), bs = b.toPrecision(sfb);
    return { prompt: `Calculate and round correctly: <b>${as} g ${op} ${bs} ${op === "×" ? "" : "mL"}</b>${op === "×" ? " (just the number)" : " (just the number, g/mL)"}`,
      check: { label: "", value: Number(exact.toPrecision(sf)), sf, tol: 1e-6 },
      sol: `Calculator: ${exact.toPrecision(7)}. ${as} has ${sfa} and ${bs} has ${sfb} sig figs, so keep ${sf}: <b>${R(fmtSci(exact, sf))}</b>.` };
  }
  const da = randInt(0, 3), db = randInt(0, 3);
  const a = rand(5, 200), b = rand(1, 50);
  const as = a.toFixed(da), bs = b.toFixed(db);
  const plus = Math.random() < .5;
  const exact = plus ? Number(as) + Number(bs) : Number(as) - Number(bs);
  const dec = Math.min(da, db);
  const ans = Number(exact.toFixed(dec));
  return { prompt: `Calculate and round correctly: <b>${as} mL ${plus ? "+" : "−"} ${bs} mL</b> (just the number)`,
    check: { label: "", value: ans, sf: parseNumber(ans.toFixed(dec)).sf, tol: 1e-9 },
    sol: `Adding/subtracting keeps the fewest decimal places (${dec}): ${exact.toFixed(5)} → <b>${ans.toFixed(dec)}</b>.` };
}) };

const CMPDS = [["NaCl", 58.44], ["KCl", 74.55], ["NaOH", 40.00], ["CaCl2", 110.98], ["KNO3", 101.11], ["C6H12O6", 180.16], ["Na2CO3", 105.99], ["MgSO4", 120.38], ["NH4Cl", 53.49], ["AgNO3", 169.88]];
DRILLS.molarity = { name: "Molarity", ch: "Ch 3", run: inputDrill(() => {
  const [f, mm] = pick(CMPDS);
  const g = Number(rand(1, 30).toPrecision(3)), mL = pick([100.0, 250.0, 500.0, 1000.0, 50.00]);
  const M = g / mm / (mL / 1000);
  return { prompt: `${g.toPrecision(3)} g of {${f}} (${mm} g/mol) is dissolved to make ${mL.toFixed(mL === 50 ? 2 : 1)} mL of solution. Molarity?`,
    check: { label: "", value: M, sf: 3, units: ["M", "mol/L"] },
    sol: `${g.toPrecision(3)} ÷ ${mm} = ${(g / mm).toPrecision(4)} mol; ÷ ${(mL / 1000).toFixed(4)} L = <b>${R(fmtSci(M, 3))} M</b>.` };
}) };
DRILLS.dilution = { name: "Dilution", ch: "Ch 3", run: inputDrill(() => {
  const M1 = Number(rand(1, 12).toPrecision(3)), V2 = pick([100.0, 250.0, 500.0, 1000.0]), M2 = Number(rand(0.05, 0.9).toPrecision(3));
  const V1 = M2 * V2 / M1;
  return { prompt: `How many mL of ${M1.toPrecision(3)} M stock are needed to make ${V2.toFixed(1)} mL of ${M2.toPrecision(3)} M solution?`,
    check: { label: "", value: V1, sf: 3, units: ["mL"] },
    sol: `V₁ = M₂V₂ ÷ M₁ = (${M2.toPrecision(3)} × ${V2.toFixed(1)}) ÷ ${M1.toPrecision(3)} = <b>${R(fmtSci(V1, 3))} mL</b>.` };
}) };
DRILLS.moles = { name: "Grams to moles", ch: "Review", run: inputDrill(() => {
  const [f, mm] = pick(CMPDS);
  const g = Number(rand(2, 90).toPrecision(3));
  return { prompt: `How many moles are in ${g.toPrecision(3)} g of {${f}} (${mm} g/mol)?`, check: { label: "", value: g / mm, sf: 3, units: ["mol"] },
    sol: `${g.toPrecision(3)} g ÷ ${mm} g/mol = <b>${R(fmtSci(g / mm, 3))} mol</b>.` };
}) };
DRILLS.heat = { name: "q = mcΔT", ch: "Ch 5", run: inputDrill(() => {
  const subs = pick([["water", 4.184], ["aluminum", 0.897], ["copper", 0.385], ["iron", 0.449]]);
  let m; do { m = Number(rand(20, 300).toPrecision(3)); } while (m >= 100 && m % 10 === 0);
  const T1 = Number(rand(15, 30).toFixed(1));
  let T2 = Number(rand(5, 95).toFixed(1)); if (Math.abs(T2 - T1) < 12) T2 = Number((T1 + 40.3).toFixed(1));
  const dT = T2 - T1;
  const q = m * subs[1] * dT;
  return { prompt: `${m.toPrecision(3)} g of ${subs[0]} (c = ${subs[1]} J/g·°C) goes from ${T1.toFixed(1)} °C to ${T2.toFixed(1)} °C. Calculate q in J (include the sign).`,
    check: { label: "", value: q, sf: 3, units: ["J"] },
    sol: `ΔT = ${T2.toFixed(1)} − ${T1.toFixed(1)} = ${dT.toFixed(1)} °C. q = ${m.toPrecision(3)} × ${subs[1]} × ${dT.toFixed(1)} = <b>${R(fmtSci(q, 3))} J</b> (${q < 0 ? "heat released" : "heat absorbed"}).` };
}) };
DRILLS.photon = { name: "Photon energy", ch: "Ch 6", run: inputDrill(() => {
  const nm = Number(rand(380, 750).toFixed(1));
  const E = 6.626e-34 * 2.998e8 / (nm * 1e-9);
  return { prompt: `Calculate the energy of one photon of ${nm.toFixed(1)} nm light.`, check: { label: "", value: E, sf: 4, units: ["J"], tol: 0.002 },
    sol: `E = hc/λ = (6.626 × 10^−34 × 2.998 × 10^8) ÷ (${nm.toFixed(1)} × 10^−9 m) = <b>${R(fmtSci(E, 4))} J</b>.` };
}) };
DRILLS.bohr = { name: "Bohr transitions", ch: "Ch 6", run: inputDrill(() => {
  const lo = pick([1, 2, 2, 3]), hi = randInt(lo + 1, 6);
  const dE = 2.179e-18 * (1 / (lo * lo) - 1 / (hi * hi));
  const lam = 6.626e-34 * 2.998e8 / dE * 1e9;
  return { prompt: `A hydrogen electron drops from n = ${hi} to n = ${lo}. Calculate the wavelength of the emitted photon in nm.`, check: { label: "", value: lam, sf: 4, units: ["nm"], tol: 0.003 },
    sol: `ΔE = 2.179 × 10^−18 × (1/${lo * lo} − 1/${hi * hi}) = ${R(fmtSci(dE, 4))} J. λ = hc/ΔE = <b>${R(fmtSci(lam, 4))} nm</b>${lam >= 400 && lam <= 700 ? " (visible)" : lam < 400 ? " (UV)" : " (IR)"}.` };
}) };
DRILLS.config = { name: "Electron configurations", ch: "Ch 6", run: inputDrill(() => {
  const ions = [["Fe", 26, 2], ["Fe", 26, 3], ["Cu", 29, 1], ["Cu", 29, 2], ["Zn", 30, 2], ["Mn", 25, 2], ["Co", 28 - 1, 2], ["Na", 11, 1], ["Ca", 20, 2], ["Cl", 17, -1], ["O", 8, -2], ["S", 16, -2], ["Br", 35, -1], ["N", 7, -3]];
  let sym, z, ch = 0;
  if (Math.random() < 0.3) { [sym, z, ch] = pick(ions); }
  else { z = randInt(3, 36); sym = ELEMENTS[z - 1]; }
  const map = ionConfig(z, ch);
  const label = ch === 0 ? sym : `{${sym}^${Math.abs(ch) === 1 ? "" : Math.abs(ch)}${ch > 0 ? "+" : "−"}}`;
  const ans = formatConfig(map);
  return { prompt: `Write the noble-gas electron configuration of <b>${R(label)}</b>${ch === 0 ? ` (Z = ${z})` : ""}.`, check: { label: "", config: ans },
    sol: `<b>${config(ans)}</b>${z === 24 || z === 29 ? " (exception: half-filled or filled 3d is more stable)." : ch > 0 && z > 20 ? " (4s electrons leave before 3d)." : "."} Tap it in with the buttons, or type it like [Ar] 4s2 3d6.` };
}) };
DRILLS.qnum = { name: "Quantum numbers", ch: "Ch 6", run: mcDrill(() => {
  const n = randInt(1, 4);
  let l = randInt(0, Math.min(3, n)); // sometimes l = n (invalid)
  let ml = randInt(-l - (Math.random() < .25 ? 1 : 0), l + (Math.random() < .25 ? 1 : 0));
  const ms = pick(["+½", "−½"]);
  let reason = "All four are in range.";
  let ok = true;
  if (l > n - 1) { ok = false; reason = `l can only go up to n − 1 = ${n - 1}.`; }
  else if (Math.abs(ml) > l) { ok = false; reason = `For l = ${l}, m<sub>l</sub> only runs from −${l} to +${l}.`; }
  return { prompt: `Is this set allowed? n = ${n}, l = ${l}, m<sub>l</sub> = ${ml}, m<sub>s</sub> = ${ms}`, options: ["Allowed", "Not allowed"], answer: ok ? "Allowed" : "Not allowed", why: reason };
}) };
const PERIODS = { 2: ["Li", "Be", "B", "C", "N", "O", "F"], 3: ["Na", "Mg", "Al", "Si", "P", "S", "Cl"], 4: ["K", "Ca", "Ga", "Ge", "As", "Se", "Br"] };
const GROUPS = { "Group 1": ["Li", "Na", "K", "Rb", "Cs"], "Group 2": ["Be", "Mg", "Ca", "Sr", "Ba"], "Group 16": ["O", "S", "Se", "Te"], "Group 17": ["F", "Cl", "Br", "I"] };
const TRENDS_DRILL = { /* periodic trends: not on Exam 2 (Dr. Butler, Nov 6) */ name: "Periodic trends", ch: "Ch 6", run: mcDrill(() => {
  const prop = pick(["largest atomic radius", "smallest atomic radius", "highest first ionization energy", "lowest first ionization energy"]);
  const radius = prop.includes("radius");
  const wantBigRadius = prop === "largest atomic radius" || prop === "lowest first ionization energy";
  let set, answer, why;
  if (Math.random() < 0.5) {
    const p = pick(["2", "3", "4"]);
    const row = PERIODS[p];
    let idx;
    do { idx = shuffle([0, 1, 2, 3, 4, 5, 6]).slice(0, 3).sort((a, b) => a - b); }
    while (!radius && (idx.includes(1) && idx.includes(2) || idx.includes(4) && idx.includes(5)));
    set = idx.map(i => row[i]);
    answer = wantBigRadius ? set[0] : set[set.length - 1];
    why = `Same period: going right adds protons to the same shell, so atoms get smaller and ionization energy rises. ${radius ? "" : "(Watch the dips at group 13 and group 16.)"}`;
  } else {
    const g = pick(Object.keys(GROUPS));
    const col = GROUPS[g];
    const idx = shuffle(col.map((_, i) => i)).slice(0, 3).sort((a, b) => a - b);
    set = idx.map(i => col[i]);
    answer = wantBigRadius ? set[set.length - 1] : set[0];
    why = `Same group (${g}): going down adds shells, so atoms get bigger and ionization energy drops.`;
  }
  return { prompt: `Which has the <b>${prop}</b>?`, options: shuffle(set), answer, why };
}) };
const ACIDS = [["HCl", "Strong acid"], ["HNO3", "Strong acid"], ["H2SO4", "Strong acid"], ["HBr", "Strong acid"], ["HI", "Strong acid"], ["HClO4", "Strong acid"],
  ["HF", "Weak acid"], ["HC2H3O2", "Weak acid"], ["H3PO4", "Weak acid"], ["H2CO3", "Weak acid"], ["NaOH", "Strong base"], ["KOH", "Strong base"],
  ["Ba(OH)2", "Strong base"], ["Ca(OH)2", "Strong base"], ["NH3", "Weak base"], ["LiOH", "Strong base"]];
DRILLS.acids = { name: "Strong or weak", ch: "Ch 4", run: mcDrill(() => {
  const [f, a] = pick(ACIDS);
  return { prompt: `Classify <b>{${f}}</b>.`, options: ["Strong acid", "Weak acid", "Strong base", "Weak base"], answer: a,
    why: "Strong acids: HCl, HBr, HI, HNO₃, H₂SO₄, HClO₄. Strong bases: Group 1 hydroxides and Ca, Sr, Ba hydroxides. Strong ones get split into ions in net ionic equations." };
}) };

VIEWS.drills = main => {
  const id = location.hash.split("/")[1];
  main.appendChild(el("h1", {}, "Drills"));
  main.appendChild(el("p", { class: "lead" }, "Random questions, as many as you want. Number answers are graded for value, sig figs and unit. Type 6.02e-23, 6.02 × 10^-23 or a whole calculation. Tap abc for the full keyboard."));
  const tabs = el("div", { class: "filters" });
  Object.entries(DRILLS).forEach(([k, d]) => tabs.appendChild(el("a", { class: "chip" + (k === id ? " on" : ""), href: "#drills/" + k }, `${d.name} <small>${d.ch}</small>`)));
  main.appendChild(tabs);
  if (!DRILLS[id]) { main.appendChild(el("p", { class: "muted" }, "Pick a drill. Start with the ones marked Exam 1 skill: they're where your points went last time.")); return; }
  const card = el("section", { class: "card drill" });
  const box = el("div");
  const next = el("button", { class: "btn", type: "button" }, "Next question");
  next.classList.add("drill-next");
  const runOne = () => {
    box.innerHTML = ""; DRILLS[id].run(box);
    let row = box.querySelector(".drill-actions");
    if (!row) { row = el("div", { class: "drill-actions" }); box.appendChild(row); }
    row.appendChild(next);
    const f = box.querySelector("input"); if (f) f.focus();
  };
  next.addEventListener("click", runOne);
  card.appendChild(el("h2", {}, DRILLS[id].name)); card.appendChild(box);
  main.appendChild(card);
  runOne();
};

/* Formula sheet */
VIEWS.formulas = main => {
  main.appendChild(el("h1", {}, "Formula sheet"));
  main.appendChild(el("p", { class: "lead" }, "Dr. Butler gives her own equation sheet with the exam; compare this one to hers on D2L so nothing on Monday is a surprise."));
  const rows = [
    ["Molarity", "M = mol ÷ L"], ["Dilution", "M₁V₁ = M₂V₂"], ["Mass percent", "g solute ÷ g solution × 100"], ["ppm / ppb", "g solute ÷ g solution × 10^6 / 10^9"],
    ["Percent yield", "actual ÷ theoretical × 100"], ["Specific heat", "q = mcΔT"], ["Calorimetry", "q(rxn) = −q(soln); q(hot) = −q(cold)"], ["First law", "ΔU = q + w, w = −PΔV"],
    ["Formation", "ΔH°rxn = ΣnΔH°f(products) − ΣnΔH°f(reactants)"], ["Wave", "c = λν"], ["Photon", "E = hν = hc/λ"], ["Bohr (H)", "E<sub>n</sub> = −2.179 × 10^−18 J ÷ n^2"],
    ["de Broglie", "λ = h ÷ mv"], ["Constants", "c = 2.998 × 10^8 m/s; h = 6.626 × 10^−34 J·s; N<sub>A</sub> = 6.022 × 10^23 /mol; c(water) = 4.184 J/g·°C"]
  ];
  const t = el("table", { class: "sol-table" });
  t.innerHTML = "<tbody>" + rows.map(r => `<tr><th>${r[0]}</th><td>${R(r[1])}</td></tr>`).join("") + "</tbody>";
  const w = el("div", { class: "table-wrap" }); w.appendChild(t); main.appendChild(w);
};

/* ---------------- boot ---------------- */
window.addEventListener("hashchange", () => { if (window.__stopMock) { window.__stopMock(); window.__stopMock = null; } document.onkeydown = null; route(); });
document.addEventListener("DOMContentLoaded", () => {
  $("#reset").addEventListener("click", () => { if (confirm("Clear all saved progress on this device?")) { store.clear(); route(); } });
  route();
});

if (typeof module !== "undefined") module.exports = { evalExpr, normalizeMath, parseNumber, sigFigs, fmtSci, parseConfig, sameConfig, ionConfig, formatConfig, normText, normUnit, gradeNumber, R };
