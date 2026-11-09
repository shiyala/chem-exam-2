/* Google sign-in for the whole site, progress sync, and Ask Claude (a panel on every page plus its own tab).
 * Questions and progress go to the Worker in ASK_CONFIG.workerUrl.
 * Everything here stays hidden until config.js has both a Google client ID and a Worker address. */
"use strict";
(function () {
  const CFG = window.ASK_CONFIG || {};
  const READY = !!(CFG.googleClientId && CFG.workerUrl);
  const TOKEN_KEY = "chm101-ask-token";
  const CHAT_KEY = "chm101-ask-chat";
  const CTX_KEY = "chm101-ask-context";
  const SIGNED_KEY = "chm101-signed-in";
  const SYNC_KEY = "chm101-sync";
  const DRAFT_KEY = "chm101-ask-draft";

  const ss = {
    get(k, d) { try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { sessionStorage.removeItem(k); } catch (e) {} }
  };
  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
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

  /* ---------- sign-in (site-wide) ---------- */
  function readToken() {
    let t = ls.get(TOKEN_KEY, null) || ss.get(TOKEN_KEY, null);
    if (!t || !t.token || !t.exp || t.exp * 1000 < Date.now() + 60000) return null;
    return t;
  }
  function saveCredential(cred) {
    try {
      const p = JSON.parse(decodeURIComponent(escape(atob(cred.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))));
      ls.set(TOKEN_KEY, { token: cred, exp: p.exp, email: p.email || "" });
      ls.set(SIGNED_KEY, p.email || "1");
    } catch (e) { ls.del(TOKEN_KEY); }
  }
  const authSubs = [];
  const authChanged = () => authSubs.forEach(f => { try { f(); } catch (e) {} });
  function dropToken() { ls.del(TOKEN_KEY); ss.del(TOKEN_KEY); syncState(ls.get(SIGNED_KEY, null) ? "expired" : "off"); }
  function signOut() {
    dropToken(); ls.del(SIGNED_KEY);
    try { if (window.google && google.accounts) google.accounts.id.disableAutoSelect(); } catch (e) {}
    syncState("off");
    authChanged();
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
      callback: (resp) => { if (resp && resp.credential) { saveCredential(resp.credential); authChanged(); } }
    });
    gisReady = true;
  }
  const isDark = () => document.documentElement.getAttribute("data-theme") === "dark" ||
    (!document.documentElement.getAttribute("data-theme") && matchMedia("(prefers-color-scheme: dark)").matches);
  function gisButton(slot, err) {
    loadGis().then(() => {
      initGis();
      google.accounts.id.renderButton(slot, { theme: isDark() ? "filled_black" : "outline", size: "large", text: "signin_with", shape: "pill" });
    }).catch(() => { if (err) err.textContent = "Google sign-in didn't load. Check your connection and reload the page."; });
  }
  /* Someone who signed in before gets signed back in quietly when their hour-long token runs out. */
  let silentTried = false;
  function silentSignIn() {
    if (silentTried || readToken() || !ls.get(SIGNED_KEY, null)) return;
    silentTried = true;
    loadGis().then(() => { initGis(); google.accounts.id.prompt(); }).catch(() => {});
  }

  /* ---------- server calls ---------- */
  const endpoint = path => CFG.workerUrl.replace(/\/+$/, "") + path;
  async function api(path, tok, body) {
    const res = await fetch(endpoint(path), {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + tok.token },
      body: JSON.stringify(body || {})
    });
    let data = {};
    try { data = await res.json(); } catch (e) {}
    return { res, data };
  }

  /* ---------- progress sync ---------- */
  // meta: { email, rev (server time of the copy we last matched), dirty (changed here since) }
  let meta = ls.get(SYNC_KEY, {}) || {};
  const saveMeta = () => ls.set(SYNC_KEY, meta);
  const sync = { state: "off", at: 0, subs: [] };
  function syncState(s) { sync.state = s; if (s === "synced") sync.at = Date.now(); sync.subs.forEach(f => { try { f(); } catch (e) {} }); }
  let pushTimer = null, applying = false, pulling = null, lastPull = 0;
  const isObj = x => x && typeof x === "object" && !Array.isArray(x);
  function merge(server, local) {
    const out = { ...server };
    for (const k of Object.keys(local)) {
      const a = server[k], b = local[k];
      if (!(k in server)) out[k] = b;
      else if (typeof a === "number" && typeof b === "number") out[k] = Math.max(a, b);
      else if (isObj(a) && isObj(b)) {
        const o = { ...a };
        for (const kk of Object.keys(b)) {
          const x = a[kk], y = b[kk];
          o[kk] = (x === true || y === true) ? true : (x === "got" || y === "got") ? "got" : (y !== undefined ? y : x);
        }
        out[k] = o;
      } else out[k] = b;
    }
    return out;
  }
  function refreshView() {
    const a = document.activeElement;
    if (a && /^(input|textarea|select)$/i.test(a.tagName) && document.getElementById("main").contains(a)) return;
    if (!(location.hash || "").startsWith("#ask")) route();
  }
  async function pull() {
    if (pulling) return pulling;
    const tok = readToken();
    if (!tok) { syncState(ls.get(SIGNED_KEY, null) ? "expired" : "off"); return; }
    pulling = (async () => {
      syncState("syncing");
      try {
        const { res, data } = await api("/progress", tok);
        if (res.status === 401) { dropToken(); syncState("expired"); silentSignIn(); return; }
        if (!res.ok) { syncState("error"); return; }
        lastPull = Date.now();
        const server = isObj(data.data) ? data.data : null;
        const local = store.all();
        const same = meta.email === tok.email;
        let next;
        if (!server) next = local;
        else if (same && !meta.dirty) next = server;
        else next = merge(server, local);
        const changedHere = JSON.stringify(next) !== JSON.stringify(local);
        const needPush = !server || JSON.stringify(next) !== JSON.stringify(server);
        meta = { email: tok.email, rev: data.updatedAt || 0, dirty: needPush };
        saveMeta();
        if (changedHere) { applying = true; store.replace(next); applying = false; refreshView(); }
        if (needPush) await push(); else syncState("synced");
      } catch (e) { syncState("error"); }
    })();
    try { await pulling; } finally { pulling = null; }
  }
  async function push() {
    clearTimeout(pushTimer); pushTimer = null;
    const tok = readToken();
    if (!tok) { syncState(ls.get(SIGNED_KEY, null) ? "expired" : "off"); silentSignIn(); return; }
    if (meta.email !== tok.email) { await pull(); return; }   // first match up with this account's saved copy
    syncState("syncing");
    try {
      const { res, data } = await api("/progress/save", tok, { data: store.all() });
      if (res.status === 401) { dropToken(); syncState("expired"); silentSignIn(); return; }
      if (!res.ok) { syncState("error"); return; }
      meta.rev = data.updatedAt || Date.now(); meta.dirty = false; saveMeta();
      syncState("synced");
    } catch (e) { syncState("error"); }
  }
  store.onChange(why => {
    if (applying) return;
    meta.dirty = true; saveMeta();
    if (!readToken()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(push, why === "clear" ? 1500 : 15000);
  });
  document.addEventListener("visibilitychange", () => {
    if (!readToken()) return;
    if (document.visibilityState === "hidden") { if (meta.dirty) push(); }
    else if (!meta.dirty && Date.now() - lastPull > 30000) pull();
  });

  /* ---------- account button in the header ---------- */
  function accountMenu() {
    const bar = document.querySelector("header .bar");
    if (!bar) return;
    const btn = el("button", { class: "icon-btn acct-btn", type: "button", "aria-haspopup": "dialog", "aria-expanded": "false" }, "Sign in");
    const theme = document.getElementById("theme");
    bar.insertBefore(btn, theme || null);
    const pop = el("div", { class: "acct-pop card", role: "dialog", "aria-label": "Account", hidden: "" });
    document.body.appendChild(pop);
    const ago = t => { const s = Math.round((Date.now() - t) / 1000); return s < 60 ? "just now" : s < 3600 ? Math.round(s / 60) + " min ago" : Math.round(s / 3600) + " h ago"; };
    const label = () => {
      const tok = readToken();
      const map = { syncing: "Saving…", synced: "✓ Saved", error: "Sync paused", expired: "Sign in", off: "Sign in" };
      btn.textContent = tok ? (map[sync.state] === "Sign in" ? "Account" : map[sync.state]) : (ls.get(SIGNED_KEY, null) ? "Sign in again" : "Sign in");
      btn.classList.toggle("on", !!tok);
    };
    const fill = () => {
      pop.innerHTML = "";
      const tok = readToken();
      if (!tok) {
        pop.appendChild(el("p", {}, "<b>Sign in with Google</b> to keep your progress across your phone and laptop, and to ask Claude."));
        const slot = el("div", { class: "gsi-slot" }); const err = el("p", { class: "small muted" });
        pop.appendChild(slot); pop.appendChild(err);
        gisButton(slot, err);
        pop.appendChild(el("p", { class: "small muted" }, "Without signing in, progress stays on this device."));
        return;
      }
      pop.appendChild(el("p", { class: "small" }, "Signed in as <b>" + esc(tok.email) + "</b>"));
      const st = { syncing: "Saving your progress…", synced: "Progress saved to your account " + ago(sync.at) + ".", error: "Couldn't reach the server. Your progress is safe on this device and will save when you're back online.", expired: "Sign in again to keep saving.", off: "" }[sync.state] || "";
      if (st) pop.appendChild(el("p", { class: "small muted" }, st));
      const row = el("div", { class: "lv-actions" });
      row.appendChild(el("button", { class: "btn small", type: "button", onclick: () => { meta.dirty ? push() : pull(); } }, "Sync now"));
      row.appendChild(el("button", { class: "btn ghost small", type: "button", onclick: () => { close(); signOut(); } }, "Sign out"));
      pop.appendChild(row);
    };
    const place = () => { const r = btn.getBoundingClientRect(); pop.style.top = Math.round(r.bottom + 8) + "px"; };
    const open = () => { fill(); place(); pop.hidden = false; btn.setAttribute("aria-expanded", "true"); };
    const close = () => { pop.hidden = true; btn.setAttribute("aria-expanded", "false"); };
    btn.addEventListener("click", e => { e.stopPropagation(); pop.hidden ? open() : close(); });
    document.addEventListener("click", e => { if (!pop.hidden && !pop.contains(e.target) && e.target !== btn) close(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !pop.hidden) close(); });
    sync.subs.push(() => { label(); if (!pop.hidden) fill(); });
    authSubs.push(() => { label(); if (!pop.hidden) { if (readToken()) close(); else fill(); } });
    label();
  }

  /* ---------- what's on screen, for context ---------- */
  const CTX_SEL = ".problem, .flash, .card, article, section";
  let lastTouched = null;
  function extract(node) {
    const clone = node.cloneNode(true);
    const oi = node.querySelectorAll("input, textarea, select"), ci = clone.querySelectorAll("input, textarea, select");
    oi.forEach((inp, i) => {
      const c = ci[i]; if (!c) return;
      let t;
      if (inp.type === "checkbox" || inp.type === "radio") t = inp.checked ? "[x] " : "[ ] ";
      else t = inp.value.trim() ? ` [typed: ${inp.value.trim()}] ` : " [blank] ";
      c.replaceWith(document.createTextNode(t));
    });
    const ob = node.querySelectorAll(".mc button"), cb = clone.querySelectorAll(".mc button");
    ob.forEach((b, i) => {
      const c = cb[i]; if (!c) return;
      const tag = b.classList.contains("wrong") ? " (picked, wrong)" : b.classList.contains("right") ? " (correct answer)" : "";
      c.replaceWith(document.createTextNode(" • " + b.textContent.trim() + tag + "\n"));
    });
    const oc = node.querySelectorAll(".chip-pick"), cc = clone.querySelectorAll(".chip-pick");
    oc.forEach((b, i) => {
      const c = cc[i]; if (!c) return;
      const tag = b.classList.contains("on") ? (b.classList.contains("good") ? " (picked, right)" : b.classList.contains("bad") ? " (picked, wrong)" : " (picked)") : "";
      c.replaceWith(document.createTextNode(" [" + b.textContent.trim() + tag + "]"));
    });
    clone.querySelectorAll("[hidden]").forEach(h => {
      if (h.classList.contains("solution")) h.replaceWith(document.createTextNode("\n[Worked solution from the site, not opened by the student yet: " + h.textContent.trim() + "]\n"));
      else if (h.classList.contains("hint")) h.replaceWith(document.createTextNode("\n[Hint, not opened yet: " + h.textContent.trim() + "]\n"));
      else h.remove();
    });
    clone.querySelectorAll(".solution").forEach(h => h.replaceWith(document.createTextNode("\n[Worked solution, opened: " + h.textContent.trim() + "]\n")));
    clone.querySelectorAll("button, svg, script, style, .cfgpad, .pt, .ask-chip, .gsi-slot, .side").forEach(x => x.remove());
    return plain(clone.innerHTML);
  }
  function describe(node, page) {
    if (node.classList.contains("problem")) { const h = node.querySelector("h3"); return "problem " + (h ? h.textContent.trim() : ""); }
    if (node.classList.contains("flash")) return "this flashcard";
    const h = node.querySelector("h2, h3");
    if (h && h.textContent.trim()) return h.textContent.trim().slice(0, 60);
    const t = node.textContent.trim().replace(/\s+/g, " ");
    return t ? (t.slice(0, 50) + (t.length > 50 ? "…" : "")) : page;
  }
  function capture(forNode) {
    const main = document.getElementById("main");
    if (!main) return null;
    const h1 = main.querySelector("h1");
    const page = h1 ? h1.textContent.trim() : "Overview";
    let node = forNode || null;
    if (!node && lastTouched && main.contains(lastTouched)) node = lastTouched.closest(CTX_SEL);
    if (node && !main.contains(node)) node = null;
    if (!node && typeof document.elementFromPoint === "function") {
      const hit = document.elementFromPoint(window.innerWidth / 2, window.innerHeight * 0.45);
      if (hit && main.contains(hit)) node = hit.closest(CTX_SEL);
    }
    let text, label;
    if (node && main.contains(node)) { text = extract(node); label = describe(node, page); }
    else { text = extract(main); label = "the " + page + " page"; }
    text = text.length > 3500 ? text.slice(0, 3500) + " …" : text;
    return { label: label + (label.startsWith("the ") ? "" : " · " + page), text: `Page: ${page}\n${text}` };
  }

  /* ---------- Ask Claude, mounted in the tab or the panel ---------- */
  const mounts = [];
  let signInNote = null;
  function mount(box, opts) {
    if (!mounts.some(m => m.box === box)) mounts.push({ box, opts });
    box.innerHTML = "";
    const tok = readToken();
    if (!tok) { signInCard(box, opts); return; }
    const wait = el("p", { class: "muted" }, "Checking your access…");
    box.appendChild(wait);
    api("/me", tok).then(({ res, data }) => {
      wait.remove();
      if (res.status === 401) { dropToken(); signInNote = "Your sign-in expired. Sign in again."; signInCard(box, opts); return; }
      if (!res.ok) { box.appendChild(el("p", { class: "feedback bad" }, esc(data.error || "The server didn't answer. Try again in a moment."))); return; }
      if (!data.allowed) { accessCard(box, tok, data, opts); return; }
      if (opts.full && data.admin && data.requestsEnabled) adminPanel(box, tok, data.requests || 0);
      chatView(box, tok, opts);
    }).catch(() => { wait.textContent = "Couldn't reach the server. Check your connection and try again."; });
  }
  authSubs.push(() => {
    for (let i = mounts.length - 1; i >= 0; i--) {
      if (!document.body.contains(mounts[i].box)) { mounts.splice(i, 1); continue; }
      mount(mounts[i].box, mounts[i].opts);
    }
  });

  VIEWS.ask = main => {
    main.appendChild(el("h1", {}, "Ask Claude"));
    if (!READY) {
      main.appendChild(el("p", { class: "lead" }, "Ask Claude isn't set up on this site yet. Once the Google sign-in and the server are connected, this tab will let you ask about any Exam 2 topic."));
      return;
    }
    main.appendChild(el("p", { class: "lead" }, "Ask about any Exam 2 topic, or a problem you're stuck on. On any other page, the chat icon in the bottom right brings what you're looking at into the question. Claude can make mistakes, so check answers against your notes and the equation sheet."));
    const box = el("div");
    main.appendChild(box);
    mount(box, { full: true });
  };

  function signOutButton(label) {
    return el("button", { class: "btn ghost small", type: "button", onclick: () => signOut() }, label || "Sign out");
  }

  function signInCard(box, opts) {
    const card = el("section", { class: "card center" });
    if (signInNote) { card.appendChild(el("p", { class: "feedback warn" }, esc(signInNote))); signInNote = null; }
    card.appendChild(el("p", {}, "Sign in with your Google account to ask questions. Signing in also saves your progress across devices."));
    const slot = el("div", { class: "gsi-slot" });
    const err = el("p", { class: "small muted" });
    card.appendChild(slot); card.appendChild(err);
    box.appendChild(card);
    gisButton(slot, err);
  }

  /* ---------- request access (accounts that aren't on the list) ---------- */
  function accessCard(box, tok, me, opts) {
    const card = el("section", { class: "card" });
    card.appendChild(el("p", {}, `<b>${esc(tok.email)}</b> doesn't have access to Ask Claude yet. Your progress still saves to this account.`));
    const msg = el("p", { class: "feedback", "aria-live": "polite" });
    const row = el("div", { class: "lv-actions" });
    if (me && me.requested) {
      msg.className = "feedback good";
      msg.textContent = "Your request is in. You'll be able to ask questions once the site owner approves it.";
      card.appendChild(msg);
      row.appendChild(el("button", { class: "btn", type: "button", onclick: () => mount(box, opts) }, "Check again"));
    } else if (me && me.requestsEnabled === false) {
      card.appendChild(el("p", { class: "muted" }, "Ask the site owner to add your Google account."));
    } else {
      const ta = el("textarea", { rows: "2", maxlength: "300", placeholder: "Optional note for the site owner, like who you are", "aria-label": "Note with your request" });
      card.appendChild(ta);
      const go = el("button", { class: "btn", type: "button" }, "Request access");
      go.addEventListener("click", async () => {
        go.disabled = true; msg.className = "feedback"; msg.textContent = "Sending…";
        try {
          const { res, data } = await api("/request", tok, { note: ta.value.trim() });
          if (res.status === 401) { dropToken(); mount(box, opts); return; }
          if (data.allowed) { mount(box, opts); return; }
          if (!res.ok) { msg.className = "feedback bad"; msg.textContent = data.error || "That didn't go through. Try again."; go.disabled = false; return; }
          ta.remove(); go.remove();
          msg.className = "feedback good";
          msg.textContent = "Request sent. You'll be able to ask questions once the site owner approves it.";
        } catch (e) { msg.className = "feedback bad"; msg.textContent = "Couldn't reach the server. Try again."; go.disabled = false; }
      });
      row.appendChild(go);
      card.appendChild(msg);
    }
    row.appendChild(signOutButton("Use another account"));
    card.appendChild(row);
    box.appendChild(card);
  }

  /* ---------- owner's panel: approve or deny requests ---------- */
  function adminPanel(main, tok, count) {
    const box = el("details", { class: "card admin" });
    if (count) box.open = true;
    const sum = el("summary", {}, `Access requests${count ? ` <span class="badge">${count}</span>` : ""}`);
    box.appendChild(sum);
    const body = el("div");
    box.appendChild(body);
    main.appendChild(box);
    let loaded = false;
    const load = async () => {
      body.innerHTML = "<p class='muted small'>Loading…</p>";
      try {
        const { res, data } = await api("/admin", tok);
        if (!res.ok) { body.innerHTML = `<p class="feedback bad">${esc(data.error || "Couldn't load requests.")}</p>`; return; }
        loaded = true;
        body.innerHTML = "";
        body.appendChild(el("h3", {}, "Waiting"));
        if (!data.pending.length) body.appendChild(el("p", { class: "muted small" }, "No one is waiting."));
        data.pending.forEach(r => body.appendChild(row(r, [["Approve", "approve", "btn small"], ["Deny", "deny", "btn ghost small"]])));
        body.appendChild(el("h3", {}, "Approved"));
        if (!data.approved.length) body.appendChild(el("p", { class: "muted small" }, "Only the accounts in the server settings so far."));
        data.approved.forEach(r => body.appendChild(row(r, [["Remove", "remove", "btn ghost small"]])));
        const n = data.pending.length;
        sum.innerHTML = `Access requests${n ? ` <span class="badge">${n}</span>` : ""}`;
      } catch (e) { body.innerHTML = "<p class='feedback bad'>Couldn't reach the server.</p>"; }
    };
    function row(r, buttons) {
      const d = el("div", { class: "req" });
      const who = el("div", { class: "req-who" }, `<b>${esc(r.name || r.email)}</b>${r.name ? `<br><span class="small muted">${esc(r.email)}</span>` : ""}${r.note ? `<br><span class="small">“${esc(r.note)}”</span>` : ""}`);
      const acts = el("div", { class: "req-acts" });
      buttons.forEach(([label, decision, cls]) => {
        const b = el("button", { class: cls, type: "button" }, label);
        b.addEventListener("click", async () => {
          acts.querySelectorAll("button").forEach(x => x.disabled = true);
          try {
            const { res, data } = await api("/admin/decide", tok, { email: r.email, decision });
            if (!res.ok) { alertLine(d, data.error || "That didn't work."); acts.querySelectorAll("button").forEach(x => x.disabled = false); return; }
            load();
          } catch (e) { alertLine(d, "Couldn't reach the server."); acts.querySelectorAll("button").forEach(x => x.disabled = false); }
        });
        acts.appendChild(b);
      });
      d.appendChild(who); d.appendChild(acts);
      return d;
    }
    const alertLine = (d, t) => { let p = d.querySelector(".feedback"); if (!p) { p = el("p", { class: "feedback bad small" }); d.appendChild(p); } p.textContent = t; };
    box.addEventListener("toggle", () => { if (box.open && !loaded) load(); });
    if (box.open) load();
  }

  /* ---------- the conversation ---------- */
  function chatView(box, tok, opts) {
    let chat = ss.get(CHAT_KEY, []);
    let ctx = ss.get(CTX_KEY, null);

    const bar = el("div", { class: "ask-bar small muted" });
    bar.appendChild(el("span", {}, opts.full ? "Signed in as " + esc(tok.email) : ""));
    const newBtn = el("button", { class: "btn ghost small", type: "button" }, "New chat");
    bar.appendChild(newBtn);
    if (opts.full) bar.appendChild(signOutButton());
    box.appendChild(bar);

    const list = el("div", { class: "chat", "aria-live": "polite" });
    box.appendChild(list);

    const chip = el("div", { class: "ask-chip" });
    const form = el("form", { class: "chat-form" });
    const ta = el("textarea", { rows: "3", placeholder: "Type a question, or paste your work and ask where it went wrong", "aria-label": "Your question" });
    const send = el("button", { class: "btn", type: "submit" }, "Send");
    const status = el("p", { class: "small muted", role: "status" });
    form.appendChild(chip); form.appendChild(ta); form.appendChild(send);
    box.appendChild(form); box.appendChild(status);

    const showChip = () => {
      chip.innerHTML = "";
      chip.hidden = !ctx;
      if (!ctx) { ta.placeholder = "Type a question, or paste your work and ask where it went wrong"; return; }
      chip.appendChild(el("span", {}, "About " + esc(ctx.label)));
      chip.appendChild(el("button", { class: "chip-x", type: "button", "aria-label": "Don't include this", onclick: () => { ctx = null; ss.del(CTX_KEY); showChip(); } }, "×"));
      if (!ta.value) ta.placeholder = "What's your question about this? (Leave blank to get help getting started)";
    };
    const bubble = (m) => {
      const b = el("div", { class: "msg " + (m.role === "user" ? "user" : "bot") });
      b.innerHTML = m.role === "user" ? esc(m.shown || m.content).replace(/\n/g, "<br>") : format(m.content);
      list.appendChild(b);
      return b;
    };
    const renderAll = () => {
      list.innerHTML = "";
      if (!chat.length) list.appendChild(el("p", { class: "muted small" }, opts.full
        ? "Try: \"Why does Cu⁺ lose the 4s electron first?\" or \"Check my limiting reactant work: …\""
        : "Ask about what's on this page, like \"Why is my answer wrong?\" or \"Explain the second step.\""));
      chat.forEach(bubble);
    };
    renderAll(); showChip();
    if (!opts.full && list.lastChild) list.lastChild.scrollIntoView({ block: "end" });

    newBtn.addEventListener("click", () => { chat = []; ss.del(CHAT_KEY); renderAll(); showChip(); ta.value = ""; ta.focus(); });
    ta.addEventListener("keydown", e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); form.requestSubmit(); } });

    form.addEventListener("submit", async e => {
      e.preventDefault();
      let q = ta.value.trim();
      if (!q && !ctx) { ta.focus(); return; }
      const t = readToken();
      if (!t) { ss.set(DRAFT_KEY, q); mount(box, opts); return; }
      if (!q) q = "Can you help me get started on this?";
      const content = ctx ? `Here's what I'm looking at on the study site:\n${ctx.text}\n\nMy question: ${q}` : q;
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
        const { res, data } = await api("/", t, { messages: chat.map(m => ({ role: m.role, content: m.content })) });
        if (res.status === 403 && data.canRequest !== undefined) { undo(""); mount(box, opts); return; }
        if (res.status === 401) {
          undo("");
          dropToken();
          ss.set(DRAFT_KEY, q);
          signInNote = "Your sign-in expired. Sign in again, and your question will still be in the box.";
          mount(box, opts);
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

    const draft = ss.get(DRAFT_KEY, null);
    if (draft) { ta.value = draft; ss.del(DRAFT_KEY); }
    if (!("ontouchstart" in window)) ta.focus({ preventScroll: true });
  }

  if (!READY) return;

  /* ---------- wire it into the page ---------- */
  ss.del(TOKEN_KEY);   // older versions kept the token per tab
  const nav = document.querySelector("nav");
  if (nav && !nav.querySelector('a[href="#ask"]')) nav.appendChild(el("a", { href: "#ask" }, "Ask Claude"));
  accountMenu();

  const mainEl = document.getElementById("main");
  if (mainEl) {
    const note = e => { lastTouched = e.target; };
    mainEl.addEventListener("pointerdown", note, true);
    mainEl.addEventListener("focusin", note, true);
  }

  /* Floating button and panel */
  const fab = el("button", { class: "ask-fab", type: "button", "aria-haspopup": "dialog", "aria-label": "Ask Claude about this page", title: "Ask Claude" },
    '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="currentColor" d="M12 3C6.5 3 2 6.9 2 11.7c0 2.4 1.1 4.6 3 6.2-.2 1.3-.8 2.6-1.8 3.6 2 0 3.8-.7 5.1-1.7 1.2.4 2.4.6 3.7.6 5.5 0 10-3.9 10-8.7S17.5 3 12 3zm-4.5 10a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6zm4.5 0a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6zm4.5 0a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6z"/></svg>');
  const panel = el("aside", { class: "ask-panel", role: "dialog", "aria-label": "Ask Claude", hidden: "" });
  const head = el("div", { class: "ask-panel-head" }, "<b>Ask Claude</b>");
  const x = el("button", { class: "chip-x ask-close", type: "button", "aria-label": "Close" }, "×");
  head.appendChild(x);
  const pbody = el("div", { class: "ask-panel-body" });
  panel.appendChild(head); panel.appendChild(pbody);
  document.body.appendChild(fab); document.body.appendChild(panel);
  function openPanel(ctx) {
    const c = ctx || capture();
    if (c) ss.set(CTX_KEY, c); else ss.del(CTX_KEY);
    panel.hidden = false; fab.hidden = true;
    document.body.classList.add("ask-open");
    mount(pbody, { full: false });
  }
  function closePanel() {
    panel.hidden = true; document.body.classList.remove("ask-open");
    const h = location.hash || "";
    fab.hidden = h.startsWith("#ask") || h.startsWith("#mock");   // no help during the mock exam
  }
  fab.addEventListener("click", () => openPanel());
  x.addEventListener("click", closePanel);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !panel.hidden) closePanel(); });
  window.addEventListener("hashchange", closePanel);
  closePanel();

  /* "Ask Claude" on each practice problem opens the panel about that problem (not in the mock exam). */
  const baseCard = problemCard;
  problemCard = function (p, opts = {}) {
    const card = baseCard(p, opts);
    if (opts.noSolution) return card;
    const actions = card.querySelector(".actions");
    if (actions) actions.appendChild(el("button", {
      class: "btn ghost small", type: "button",
      onclick: () => openPanel(capture(card))
    }, "Ask Claude"));
    return card;
  };

  if (readToken()) pull(); else silentSignIn();
  authSubs.push(() => { if (readToken()) pull(); });
})();
