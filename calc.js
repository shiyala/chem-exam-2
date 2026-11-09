/* Floating scientific calculator for Practice, Drills and the Mock exam.
   Uses app.js's evalExpr (same maths the answer boxes accept). */
(function () {
  if (typeof evalExpr !== "function") return;
  const PAGES = ["#practice", "#drills", "#mock"];
  const onPage = () => { const h = location.hash || ""; return PAGES.some(p => h === p || h.startsWith(p + "/")); };
  const mk = (tag, attrs, html) => { const n = document.createElement(tag); for (const k in attrs || {}) n.setAttribute(k, attrs[k]); if (html != null) n.innerHTML = html; return n; };

  const SUPS = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻" };
  function pretty(v) {
    if (v === 0) return "0";
    const a = Math.abs(v);
    if (a >= 1e-3 && a < 1e9) return String(Number(v.toPrecision(10)));
    const [m, e] = v.toExponential(9).split("e");
    return String(Number(m)) + " × 10" + String(Number(e)).replace(/./g, c => SUPS[c] || c);
  }
  function plain(v) {   // what goes into an answer box
    const a = Math.abs(v);
    if (v === 0 || (a >= 1e-3 && a < 1e9)) return String(Number(v.toPrecision(10)));
    const [m, e] = v.toExponential(9).split("e");
    return String(Number(m)) + "e" + Number(e);
  }

  let ans = 0, justEvaluated = false, target = null, lastCard = null, hasResult = false, filling = false;

  const fab = mk("button", { class: "calc-fab", type: "button", "aria-label": "Open calculator", title: "Calculator", hidden: "" },
    '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M7 2h10a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3zm0 2a1 1 0 0 0-1 1v3h12V5a1 1 0 0 0-1-1H7zm-1 6v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9H6zm2 2h2v2H8v-2zm3 0h2v2h-2v-2zm3 0h2v2h-2v-2zm-6 4h2v2H8v-2zm3 0h2v2h-2v-2zm3 0h2v2h-2v-2z"/></svg>');
  const panel = mk("aside", { class: "calc-panel", role: "dialog", "aria-label": "Calculator", hidden: "" });
  const head = mk("div", { class: "calc-head" }, "<b>Calculator</b>");
  const close = mk("button", { class: "chip-x", type: "button", "aria-label": "Close calculator" }, "×");
  head.appendChild(close);
  const expr = mk("input", { class: "calc-expr", type: "text", autocomplete: "off", autocorrect: "off", autocapitalize: "off", spellcheck: "false", "aria-label": "Calculation" });
  if (window.matchMedia && matchMedia("(pointer: coarse)").matches) expr.setAttribute("inputmode", "none");
  const out = mk("div", { class: "calc-out", "aria-live": "polite" }, "&nbsp;");
  const keys = mk("div", { class: "calc-keys" });
  const useBtn = mk("button", { class: "btn small calc-use", type: "button", disabled: "" }, "Put in answer box");
  panel.append(head, expr, out, keys, useBtn);

  const insert = t => {
    if (justEvaluated) { expr.value = /^[+\-×÷^]/.test(t) || t === "²" ? "Ans" : ""; justEvaluated = false; }
    const a = expr.selectionStart ?? expr.value.length, b = expr.selectionEnd ?? expr.value.length;
    expr.value = expr.value.slice(0, a) + t + expr.value.slice(b);
    const p = a + t.length; try { expr.setSelectionRange(p, p); } catch (e) {}
    preview();
  };
  function compute(s) {
    let x = s.replace(/Ans/gi, "(" + plain(ans) + ")").replace(/E/g, "e").replace(/²/g, "^2").replace(/√/g, "sqrt");
    const open = (x.match(/\(/g) || []).length - (x.match(/\)/g) || []).length;
    if (open > 0) x += ")".repeat(open);
    return evalExpr(x);
  }
  function preview() {
    const v = expr.value.trim() ? compute(expr.value) : null;
    out.classList.remove("err");
    out.innerHTML = v == null ? "&nbsp;" : "= " + pretty(v);
  }
  function equals() {
    if (!expr.value.trim()) return;
    const v = compute(expr.value);
    if (v == null) { out.classList.add("err"); out.textContent = "Can't work that out. Check the brackets."; return; }
    ans = v; justEvaluated = true;
    out.classList.remove("err"); out.innerHTML = "= <b>" + pretty(v) + "</b>";
    hasResult = true; refreshUse();
  }

  const K = [
    ["x²", () => insert("²"), "fn"], ["xʸ", () => insert("^"), "fn"], ["√", () => insert("√("), "fn"], ["log", () => insert("log("), "fn"], ["ln", () => insert("ln("), "fn"],
    ["10ˣ", () => insert("10^("), "fn"], ["eˣ", () => insert("exp("), "fn"], ["(", () => insert("("), "fn"], [")", () => insert(")"), "fn"], ["÷", () => insert("÷"), "op"],
    ["7"], ["8"], ["9"], ["×", () => insert("×"), "op"], ["⌫", () => { justEvaluated = false; const a = expr.selectionStart ?? expr.value.length, b = expr.selectionEnd ?? a; const s = a === b ? Math.max(0, a - 1) : a; expr.value = expr.value.slice(0, s) + expr.value.slice(b); try { expr.setSelectionRange(s, s); } catch (e) {} preview(); }, "ctl"],
    ["4"], ["5"], ["6"], ["−", () => insert("−"), "op"], ["AC", () => { expr.value = ""; justEvaluated = false; out.innerHTML = "&nbsp;"; out.classList.remove("err"); }, "ctl"],
    ["1"], ["2"], ["3"], ["+", () => insert("+"), "op"], ["Ans", () => insert("Ans"), "ctl"],
    ["0"], ["."], ["EE", () => insert("E"), "fn"], ["(−)", () => insert("−"), "fn"], ["=", equals, "eq"],
  ];
  const labels = { "√": "square root", "x²": "squared", "xʸ": "to the power", "10ˣ": "ten to the power", "eˣ": "e to the power", "⌫": "delete", "AC": "clear", "EE": "times ten to the power (E)", "(−)": "negative", "−": "minus", "×": "times", "÷": "divided by" };
  K.forEach(([lab, fn, cls]) => {
    const b = mk("button", { class: "calc-key" + (cls ? " " + cls : ""), type: "button", "aria-label": labels[lab] || lab }, lab);
    b.addEventListener("pointerdown", e => e.preventDefault());
    b.addEventListener("click", () => { (fn || (() => insert(lab)))(); if (!expr.hasAttribute("inputmode")) expr.focus(); });
    keys.appendChild(b);
  });
  expr.addEventListener("input", () => { justEvaluated = false; preview(); });
  expr.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === "=") { e.preventDefault(); equals(); }
    else if (e.key === "Escape") hide();
  });

  /* Where the result goes: the answer box last tapped, or else the first empty box
     of the problem last touched (or the one in view), so the button works without tapping a box first. */
  const BOX = ".check input:not(.unit):not(.bal-co)";
  const CARD = ".problem, .drill, .card";
  const main = document.getElementById("main");
  if (main) {
    main.addEventListener("focusin", e => { const t = e.target; if (!filling && t.matches && t.matches(BOX)) target = t; const c = t.closest && t.closest(CARD); if (c) lastCard = c; refreshUse(); });
    main.addEventListener("pointerdown", e => { const c = e.target.closest && e.target.closest(CARD); if (c && c.querySelector(BOX)) { lastCard = c; refreshUse(); } }, true);
  }
  function cardInView() {
    const limit = panel.hidden ? window.innerHeight : Math.min(window.innerHeight, panel.getBoundingClientRect().top || window.innerHeight);
    let best = null, bestD = Infinity;
    document.querySelectorAll("#main " + CARD).forEach(c => {
      if (!c.querySelector(BOX)) return;
      const r = c.getBoundingClientRect();
      if (r.bottom < 0 || r.top > limit) return;
      const d = Math.abs((r.top + r.bottom) / 2 - limit / 2);
      if (d < bestD) { bestD = d; best = c; }
    });
    return best || document.querySelector("#main " + BOX)?.closest(CARD) || null;
  }
  function pickTarget() {
    if (target && document.body.contains(target)) return target;
    const c = (lastCard && document.body.contains(lastCard)) ? lastCard : cardInView();
    if (!c) return null;
    const boxes = [...c.querySelectorAll(BOX)];
    return boxes.find(b => !b.value.trim()) || boxes[0] || null;
  }
  function refreshUse() {
    const t = hasResult ? pickTarget() : null;
    useBtn.disabled = !t;
    const lab = t && t.closest(".check")?.querySelector(".check-label");
    useBtn.textContent = "Put in answer box" + (lab ? " " + lab.textContent.trim() : "");
  }
  useBtn.addEventListener("click", () => {
    const t = pickTarget();
    if (!t) { refreshUse(); return; }
    t.value = plain(ans);
    t.dispatchEvent(new Event("input"));
    target = null; lastCard = t.closest(CARD) || lastCard;   // next result goes to the next empty box
    t.scrollIntoView({ block: "center", behavior: "smooth" });
    t.classList.add("calc-filled"); setTimeout(() => t.classList.remove("calc-filled"), 1200);
    if (!expr.hasAttribute("inputmode")) { filling = true; t.focus(); filling = false; }
    refreshUse();
  });

  /* Drag by the header on wide screens. */
  let drag = null;
  head.addEventListener("pointerdown", e => {
    if (e.target === close || window.innerWidth < 720) return;
    const r = panel.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    head.setPointerCapture && head.setPointerCapture(e.pointerId);
  });
  head.addEventListener("pointermove", e => {
    if (!drag) return;
    const x = Math.min(Math.max(0, e.clientX - drag.dx), window.innerWidth - panel.offsetWidth);
    const y = Math.min(Math.max(0, e.clientY - drag.dy), window.innerHeight - panel.offsetHeight);
    Object.assign(panel.style, { left: x + "px", top: y + "px", right: "auto", bottom: "auto" });
  });
  head.addEventListener("pointerup", () => { drag = null; });

  function show() { refreshUse(); panel.hidden = false; fab.hidden = true; document.body.classList.add("calc-open"); if (!expr.hasAttribute("inputmode")) expr.focus(); }
  function hide() { panel.hidden = true; document.body.classList.remove("calc-open"); sync(); }
  function sync() {
    const here = onPage();
    if (!here) { panel.hidden = true; document.body.classList.remove("calc-open"); }
    fab.hidden = !here || !panel.hidden;
    fab.classList.toggle("solo", (location.hash || "").startsWith("#mock"));
    target = null; lastCard = null; refreshUse();
  }
  fab.addEventListener("click", show);
  close.addEventListener("click", hide);
  document.body.append(fab, panel);
  window.addEventListener("hashchange", sync);
  sync();
  window.__calc = { pickTarget, show, hide, insert, equals, expr, out, useBtn, fab, panel };
})();
