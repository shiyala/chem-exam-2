/* "Ask Claude" tab: Google sign-in, then questions go to the Worker in ASK_CONFIG.workerUrl.
 * Hidden until config.js has both a Google client ID and a Worker address. */
"use strict";
(function () {
  const CFG = window.ASK_CONFIG || {};
  const READY = !!(CFG.googleClientId && CFG.workerUrl);
  const TOKEN_KEY = "chm101-ask-token";
  const CHAT_KEY = "chm101-ask-chat";
  const CTX_KEY = "chm101-ask-context";

  const ss = {
    get(k, d) { try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { sessionStorage.removeItem(k); } catch (e) {} }
  };
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  /* Light formatting for Claude's answers: paragraphs, lists, **bold**, `code`, x^2. */
  function format(text) {
    const inline = s => esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\^\(([^()]{1,8})\)/g, "<sup>$1</sup>")
      .replace(/(\w|\))\^([−\-+]?\d{1,3})/g, "$1<sup>$2</sup>");
    const out = [];
    let list = null;
    const flush = () => { if (list) { out.push(`<${list.tag}>` + list.items.map(i => `<li>${i}</li>`).join("") + `</${list.tag}>`); list = null; } };
    let para = [];
    const flushPara = () => { if (para.length) { out.push("<p>" + para.map(inline).join("<br>") + "</p>"); para = []; } };
    for (const raw of String(text).split("\n")) {
      const line = raw.replace(/\s+$/, "");
      const ul = /^\s*[-*•]\s+(.*)$/.exec(line);
      const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
      if (ul || ol) {
        flushPara();
        const tag = ul ? "ul" : "ol";
        if (!list || list.tag !== tag) { flush(); list = { tag, items: [] }; }
        list.items.push(inline((ul || ol)[1]));
      } else if (!line.trim()) { flushPara(); flush(); }
      else { flush(); para.push(line.replace(/^#+\s*/, "")); }
    }
    flushPara(); flush();
    return out.join("");
  }

  /* Problem text as plain Unicode, for sending to Claude. */
  const SUPS = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "+": "⁺", "-": "⁻", "−": "⁻" };
  const SUBS = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉" };
  function plain(html) {
    const d = document.createElement("div");
    d.innerHTML = html;
    d.querySelectorAll("sup").forEach(n => { n.replaceWith([...n.textContent].map(c => SUPS[c] || c).join("")); });
    d.querySelectorAll("sub").forEach(n => { n.replaceWith([...n.textContent].map(c => SUBS[c] || c).join("")); });
    d.querySelectorAll("br, p, li, tr").forEach(n => n.append("\n"));
    return d.textContent.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  }

  /* ---------- sign-in ---------- */
  function readToken() {
    const t = ss.get(TOKEN_KEY, null);
    if (!t || !t.token || !t.exp || t.exp * 1000 < Date.now() + 60000) return null;
    return t;
  }
  function saveCredential(cred) {
    try {
      const p = JSON.parse(decodeURIComponent(escape(atob(cred.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))));
      ss.set(TOKEN_KEY, { token: cred, exp: p.exp, email: p.email || "" });
    } catch (e) { ss.del(TOKEN_KEY); }
  }
  let gisPromise = null;
  function loadGis() {
    if (window.google && google.accounts && google.accounts.id) return Promise.resolve();
    if (gisPromise) return gisPromise;
    gisPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { gisPromise = null; reject(new Error("Google sign-in didn't load")); };
      document.head.appendChild(s);
    });
    return gisPromise;
  }
  let gisReady = false;
  function initGis() {
    if (gisReady) return;
    google.accounts.id.initialize({
      client_id: CFG.googleClientId,
      auto_select: true,
      cancel_on_tap_outside: false,
      callback: (resp) => { if (resp && resp.credential) { saveCredential(resp.credential); if ((location.hash || "").startsWith("#ask")) route(); } }
    });
    gisReady = true;
  }

  /* ---------- the Ask view ---------- */
  VIEWS.ask = main => {
    main.appendChild(el("h1", {}, "Ask Claude"));
    if (!READY) {
      main.appendChild(el("p", { class: "lead" }, "Ask Claude isn't set up on this site yet. Once the Google sign-in and the server are connected, this tab will let you ask about any Exam 2 topic."));
      return;
    }
    main.appendChild(el("p", { class: "lead" }, "Ask about any Exam 2 topic, or a problem you're stuck on. Claude can make mistakes, so check answers against your notes and the equation sheet."));
    const tok = readToken();
    if (!tok) { signInCard(main); return; }
    chatView(main, tok);
  };

  function signInCard(main, note) {
    const card = el("section", { class: "card center" });
    if (note) card.appendChild(el("p", { class: "feedback warn" }, esc(note)));
    card.appendChild(el("p", {}, "Sign in with your Google account to ask questions."));
    const slot = el("div", { class: "gsi-slot" });
    card.appendChild(slot);
    const err = el("p", { class: "small muted" });
    card.appendChild(err);
    main.appendChild(card);
    loadGis().then(() => {
      initGis();
      const dark = document.documentElement.getAttribute("data-theme") === "dark" ||
        (!document.documentElement.getAttribute("data-theme") && matchMedia("(prefers-color-scheme: dark)").matches);
      google.accounts.id.renderButton(slot, { theme: dark ? "filled_black" : "outline", size: "large", text: "signin_with", shape: "pill" });
      google.accounts.id.prompt();
    }).catch(e => { err.textContent = "Google sign-in didn't load. Check your connection and reload the page."; });
  }

  function chatView(main, tok) {
    let chat = ss.get(CHAT_KEY, []);
    let ctx = ss.get(CTX_KEY, null);

    const bar = el("div", { class: "ask-bar small muted" });
    bar.appendChild(el("span", {}, "Signed in as " + esc(tok.email)));
    const newBtn = el("button", { class: "btn ghost small", type: "button" }, "New chat");
    const outBtn = el("button", { class: "btn ghost small", type: "button" }, "Sign out");
    bar.appendChild(newBtn); bar.appendChild(outBtn);
    main.appendChild(bar);

    const list = el("div", { class: "chat", "aria-live": "polite" });
    main.appendChild(list);

    const chip = el("div", { class: "ask-chip" });
    const form = el("form", { class: "chat-form" });
    const ta = el("textarea", { rows: "3", placeholder: "Type a question, or paste your work and ask where it went wrong", "aria-label": "Your question" });
    const send = el("button", { class: "btn", type: "submit" }, "Send");
    const status = el("p", { class: "small muted", role: "status" });
    form.appendChild(chip); form.appendChild(ta); form.appendChild(send);
    main.appendChild(form); main.appendChild(status);

    const showChip = () => {
      chip.innerHTML = "";
      chip.hidden = !ctx;
      if (!ctx) return;
      chip.appendChild(el("span", {}, "About " + esc(ctx.label)));
      chip.appendChild(el("button", { class: "chip-x", type: "button", "aria-label": "Remove problem", onclick: () => { ctx = null; ss.del(CTX_KEY); showChip(); } }, "×"));
      if (!ta.value) ta.placeholder = "What's your question about this problem? (Leave blank to get started)";
    };
    const bubble = (m) => {
      const b = el("div", { class: "msg " + (m.role === "user" ? "user" : "bot") });
      b.innerHTML = m.role === "user" ? esc(m.shown || m.content).replace(/\n/g, "<br>") : format(m.content);
      list.appendChild(b);
      return b;
    };
    const renderAll = () => {
      list.innerHTML = "";
      if (!chat.length) list.appendChild(el("p", { class: "muted small" }, "Try: \"Why does Cu⁺ lose the 4s electron first?\" or \"Check my limiting reactant work: …\""));
      chat.forEach(bubble);
    };
    renderAll(); showChip();

    newBtn.addEventListener("click", () => { chat = []; ss.del(CHAT_KEY); ctx = null; ss.del(CTX_KEY); renderAll(); showChip(); ta.value = ""; ta.focus(); });
    outBtn.addEventListener("click", () => {
      ss.del(TOKEN_KEY);
      try { if (window.google && google.accounts) google.accounts.id.disableAutoSelect(); } catch (e) {}
      route();
    });
    ta.addEventListener("keydown", e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); form.requestSubmit(); } });

    form.addEventListener("submit", async e => {
      e.preventDefault();
      let q = ta.value.trim();
      if (!q && !ctx) { ta.focus(); return; }
      const t = readToken();
      if (!t) { main.innerHTML = ""; VIEWS.ask(main); return; }
      if (!q) q = "Can you help me get started on this problem?";
      const content = ctx ? `About this practice problem:\n${ctx.text}\n\nMy question: ${q}` : q;
      const userMsg = { role: "user", content, shown: ctx ? `(About ${ctx.label}) ${q}` : q };
      const usedCtx = ctx;
      chat.push(userMsg);
      if (chat.length === 1) list.innerHTML = "";
      bubble(userMsg);
      ta.value = ""; ctx = null; ss.del(CTX_KEY); showChip();
      const wait = el("div", { class: "msg bot pending" }, "Thinking…");
      list.appendChild(wait);
      wait.scrollIntoView({ block: "nearest" });
      send.disabled = true; status.textContent = "";
      const undo = (msg) => {
        chat.pop(); list.lastChild && list.lastChild.remove();
        if (list.lastChild && list.lastChild.classList && list.lastChild.classList.contains("user")) list.lastChild.remove();
        ta.value = q; if (usedCtx) { ctx = usedCtx; ss.set(CTX_KEY, ctx); } showChip();
        status.textContent = msg;
        if (!chat.length) renderAll();
      };
      try {
        const res = await fetch(CFG.workerUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + t.token },
          body: JSON.stringify({ messages: chat.map(m => ({ role: m.role, content: m.content })) })
        });
        let data = {};
        try { data = await res.json(); } catch (x) {}
        if (res.status === 401) {
          ss.del(TOKEN_KEY);
          undo("");
          main.innerHTML = ""; main.appendChild(el("h1", {}, "Ask Claude"));
          signInCard(main, "Your sign-in expired. Sign in again, and your question will still be in the box.");
          ss.set("chm101-ask-draft", q);
          return;
        }
        if (!res.ok || !data.text) { undo(data.error || "Something went wrong. Try again."); return; }
        wait.remove();
        const botMsg = { role: "assistant", content: data.text };
        chat.push(botMsg);
        ss.set(CHAT_KEY, chat);
        bubble(botMsg).scrollIntoView({ block: "start", behavior: "smooth" });
      } catch (err) {
        undo("Couldn't reach the server. Check your connection and try again.");
      } finally {
        send.disabled = false;
      }
    });

    const draft = ss.get("chm101-ask-draft", null);
    if (draft) { ta.value = draft; ss.del("chm101-ask-draft"); }
    if (!("ontouchstart" in window)) ta.focus({ preventScroll: true });
  }

  if (!READY) return;

  /* Nav link */
  const nav = document.querySelector("nav");
  if (nav && !nav.querySelector('a[href="#ask"]')) nav.appendChild(el("a", { href: "#ask" }, "Ask Claude"));

  /* "Ask Claude" button on practice problems (not in the mock exam). */
  const baseCard = problemCard;
  problemCard = function (p, opts = {}) {
    const card = baseCard(p, opts);
    if (opts.noSolution) return card;
    const actions = card.querySelector(".actions");
    if (actions) actions.appendChild(el("button", {
      class: "btn ghost small", type: "button",
      onclick: () => {
        ss.set(CTX_KEY, { label: `problem ${p.n} (${plain(p.topic)})`, text: `Problem ${p.n}, ${p.ch}: ${plain(R(p.q))}` });
        location.hash = "#ask";
      }
    }, "Ask Claude"));
    return card;
  };
})();
