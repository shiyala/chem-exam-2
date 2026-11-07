/*
 * Ask Claude backend for the Chem Exam 2 study site.
 *
 * The page signs in with Google and sends the Google ID token with each question.
 * This Worker checks the token (signature, audience, expiry, allowed email),
 * then passes the conversation to Claude with the API key kept as a secret.
 *
 * Settings (see wrangler.toml): ALLOWED_ORIGIN, GOOGLE_CLIENT_ID, MODEL, MAX_TOKENS.
 * Secrets (Cloudflare dashboard): ANTHROPIC_API_KEY, ALLOWED_EMAILS (the admins).
 * KV namespace ACCESS (optional): access requests and approved accounts.
 *
 * Routes (all POST, all need a Google ID token):
 *   /            ask Claude (body: { messages })
 *   /me          { email, allowed, admin, requested, requests }
 *   /request     ask for access (body: { note })
 *   /admin       list pending requests and approved accounts (admins only)
 *   /admin/decide  { email, decision: "approve" | "deny" | "remove" } (admins only)
 *   /progress       read this account's saved study progress (any signed-in account)
 *   /progress/save  { data } save it (any signed-in account; up to 50 KB)
 */
import Anthropic from "@anthropic-ai/sdk";

const GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);
const MAX_MESSAGES = 30;          // turns kept per request
const MAX_CHARS_PER_MESSAGE = 6000;
const MAX_TOTAL_CHARS = 40000;
const MAX_PROGRESS_BYTES = 50000;

const SYSTEM_PROMPT = `You are a chemistry tutor built into a study site for CHM 10100 (general chemistry) Exam 2. The student is studying on a phone, between other things, for an exam on Monday, November 9.

Exam 2 covers: Chapter 3 solutions only (molarity, dilution, concentration units); Chapter 4 (reaction types, solubility rules, net ionic equations, acids and bases, oxidation numbers and redox, stoichiometry, limiting reactant, percent yield, titration); Chapter 5 thermochemistry (q = mcΔT, calorimetry, enthalpy, Hess's law, enthalpies of formation, first law); Chapter 6 only light and the quantum mechanical model (c = λν, E = hν, the Bohr model, de Broglie, quantum numbers, orbitals, electron configurations including ions and exceptions). Periodic trends are NOT on this exam. Earlier skills still apply: naming, unit conversions, mole calculations.

The professor grades open-ended work with partial credit, and points were lost on the last exam for significant figures, missing units, rounding too early, and sign errors on heat. So when you work a calculation:
- show each step with units carried through,
- keep full precision until the end and round once to the correct significant figures,
- state the final answer with its unit and say how many sig figs it has and why,
- point out the sign of q or ΔH and what it means.

How to help:
- If the student is stuck on a problem, find the step they are stuck on and help with that; give the full worked solution when they ask for it or after they have tried.
- If they share their own answer, check it, and name the exact mistake if there is one.
- Be accurate. If a question depends on a value or rule the professor may define differently (an equation sheet constant, a solubility exception), say so and tell them to check their equation sheet or notes.
- Keep answers short enough to read on a phone. Use short paragraphs and simple lists.
- Write plain text. Do not use LaTeX or Markdown headings. Write formulas with Unicode subscripts and superscripts (H₂SO₄, Fe³⁺, 1s² 2s² 2p⁶) and scientific notation as 6.022 × 10²³.
- Stay on chemistry and studying for this exam. For anything else, say briefly that you are here for chem help.

The student often asks from a page of the study site. Then their message starts with the page name and what they are looking at: a problem, drill or card, any answers they typed, the site's feedback on them, and sometimes the site's hint or worked solution marked as not yet shown to them. Answer about that content. Do not reveal a solution they have not opened unless they ask for it; use it to make sure your help is right. If the site's feedback and your own working disagree, say so plainly.`;

let certCache = { keys: null, expires: 0 };

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = (env.ALLOWED_ORIGIN || "").trim();
    const cors = {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin"
    };
    const reply = (status, body) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

    if (origin !== allowedOrigin) return reply(403, { error: "This site isn't allowed to use this server." });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return reply(405, { error: "Use POST." });

    if (!env.GOOGLE_CLIENT_ID || !env.ANTHROPIC_API_KEY || !env.ALLOWED_EMAILS) {
      return reply(503, { error: "The server isn't fully set up yet (Google client ID, API key or allowed emails missing)." });
    }

    // 1. Check the Google sign-in.
    const auth = request.headers.get("Authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    let claims;
    try {
      claims = await verifyGoogleToken(token, env.GOOGLE_CLIENT_ID);
    } catch (e) {
      return reply(401, { error: "Please sign in again.", detail: String(e.message || e) });
    }
    if (!claims.email_verified || !claims.email) return reply(403, { error: "This Google account has no verified email." });
    const email = String(claims.email).toLowerCase();
    const admins = env.ALLOWED_EMAILS.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
    const isAdmin = admins.includes(email);
    const kv = env.ACCESS || null;
    const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";

    let body = {};
    if (path !== "/") { try { body = await request.json(); } catch { body = {}; } }

    if (path === "/me") {
      const approved = !isAdmin && kv ? !!(await kv.get("ok:" + email)) : false;
      const requested = !isAdmin && !approved && kv ? !!(await kv.get("req:" + email)) : false;
      const out = { email, admin: isAdmin, allowed: isAdmin || approved, requested, requestsEnabled: !!kv };
      if (isAdmin && kv) out.requests = (await kv.list({ prefix: "req:" })).keys.length;
      return reply(200, out);
    }

    if (path === "/progress" || path === "/progress/save") {
      if (!kv) return reply(503, { error: "Progress sync isn't switched on." });
      if (path === "/progress") {
        const raw = await kv.get("prog:" + email);
        let saved = null;
        try { saved = raw ? JSON.parse(raw) : null; } catch { saved = null; }
        return reply(200, { data: saved && saved.data || null, updatedAt: saved && saved.updatedAt || 0 });
      }
      const data = body && body.data;
      if (!data || typeof data !== "object" || Array.isArray(data)) return reply(400, { error: "Send your progress as an object." });
      const rec = { data, updatedAt: Date.now() };
      const text = JSON.stringify(rec);
      if (new TextEncoder().encode(text).length > MAX_PROGRESS_BYTES) return reply(413, { error: "Progress is too large to save." });
      await kv.put("prog:" + email, text);
      return reply(200, { ok: true, updatedAt: rec.updatedAt });
    }

    if (path === "/request") {
      if (!kv) return reply(503, { error: "Access requests aren't switched on yet." });
      if (isAdmin || await kv.get("ok:" + email)) return reply(200, { ok: true, allowed: true });
      if (await kv.get("no:" + email)) return reply(403, { error: "This request was declined." });
      if (await kv.get("req:" + email)) return reply(200, { ok: true, requested: true });
      const pending = await kv.list({ prefix: "req:", limit: 200 });
      if (pending.keys.length >= 200) return reply(429, { error: "Too many requests are waiting. Try again later." });
      const note = typeof body.note === "string" ? body.note.trim().slice(0, 300) : "";
      const rec = { email, name: String(claims.name || "").slice(0, 80), note, at: new Date().toISOString() };
      while (new TextEncoder().encode(JSON.stringify(rec)).length > 1000) rec.note = rec.note.slice(0, -10);
      await kv.put("req:" + email, JSON.stringify(rec), { metadata: rec });
      return reply(200, { ok: true, requested: true });
    }

    if (path === "/admin" || path === "/admin/decide") {
      if (!isAdmin) return reply(403, { error: "Only the site owner can do that." });
      if (!kv) return reply(503, { error: "Access requests aren't switched on yet." });
      if (path === "/admin") {
        const [req, ok] = await Promise.all([kv.list({ prefix: "req:" }), kv.list({ prefix: "ok:" })]);
        const rows = list => list.keys.map(k => ({ email: k.name.slice(k.name.indexOf(":") + 1), ...(k.metadata || {}) }));
        return reply(200, { pending: rows(req), approved: rows(ok) });
      }
      const who = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      if (!/^[^\s@]+@[^\s@]+$/.test(who) || who.length > 200) return reply(400, { error: "Pick an account." });
      const decision = body.decision;
      if (decision === "approve") {
        const prev = await kv.getWithMetadata("req:" + who);
        const meta = { ...(prev.metadata || {}), email: who, approvedAt: new Date().toISOString() };
        await kv.put("ok:" + who, JSON.stringify(meta), { metadata: meta });
        await kv.delete("req:" + who);
        await kv.delete("no:" + who);
      } else if (decision === "deny") {
        await kv.delete("req:" + who);
        await kv.put("no:" + who, "1", { expirationTtl: 60 * 60 * 24 * 30 });
      } else if (decision === "remove") {
        await kv.delete("ok:" + who);
      } else {
        return reply(400, { error: "Unknown decision." });
      }
      return reply(200, { ok: true });
    }

    if (path !== "/") return reply(404, { error: "Not found." });
    if (!isAdmin && !(kv && await kv.get("ok:" + email))) {
      return reply(403, { error: "This Google account doesn't have access yet.", canRequest: !!kv });
    }

    // 2. Check the conversation.
    try { body = await request.json(); } catch { return reply(400, { error: "Send JSON." }); }
    const messages = cleanMessages(body && body.messages);
    if (!messages) return reply(400, { error: "That conversation is empty or too long. Start a new chat." });

    // 3. Ask Claude.
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 2 });
    try {
      const response = await client.beta.messages.create({
        model: env.MODEL || "claude-sonnet-5-5",
        max_tokens: clampInt(env.MAX_TOKENS, 1000, 16000, 8000),
        output_config: { effort: "medium" },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        cache_control: { type: "ephemeral" },
        system: SYSTEM_PROMPT,
        messages
      });
      if (response.stop_reason === "refusal") {
        return reply(200, { text: "I can't help with that one. Try asking it another way, or ask about a specific chem problem.", stop: "refusal" });
      }
      const text = response.content.filter(b => b.type === "text").map(b => b.text).join("\n\n").trim();
      if (!text) return reply(502, { error: "Claude didn't return an answer. Try again." });
      return reply(200, {
        text: response.stop_reason === "max_tokens" ? text + "\n\n(Cut off because the answer got long. Ask me to continue.)" : text,
        stop: response.stop_reason
      });
    } catch (e) {
      if (e instanceof Anthropic.AuthenticationError) return reply(502, { error: "The Anthropic API key on the server isn't working." });
      if (e instanceof Anthropic.PermissionDeniedError) return reply(502, { error: "The Anthropic account doesn't allow this request. Check billing and credits." });
      if (e instanceof Anthropic.RateLimitError) return reply(429, { error: "Too many questions at once. Wait a moment and try again." });
      if (e instanceof Anthropic.BadRequestError) return reply(502, { error: "Claude couldn't take that request.", detail: e.message });
      if (e instanceof Anthropic.APIError) return reply(502, { error: "Claude is unavailable right now. Try again shortly." });
      return reply(500, { error: "Something went wrong on the server." });
    }
  }
};

function clampInt(v, lo, hi, d) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
}

/* Keep only plain-text user/assistant turns, alternating, starting and ending with the user. */
function cleanMessages(raw) {
  if (!Array.isArray(raw)) return null;
  let msgs = raw
    .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map(m => ({ role: m.role, content: m.content.slice(0, MAX_CHARS_PER_MESSAGE) }));
  msgs = msgs.slice(-MAX_MESSAGES);
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  const merged = [];
  for (const m of msgs) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) last.content += "\n\n" + m.content;
    else merged.push({ ...m });
  }
  if (!merged.length || merged[merged.length - 1].role !== "user") return null;
  const total = merged.reduce((n, m) => n + m.content.length, 0);
  if (total > MAX_TOTAL_CHARS) return null;
  return merged;
}

/* ---------- Google ID token check (RS256 JWT) ---------- */
function b64urlToBytes(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function b64urlJson(s) {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));
}

async function googleKeys(forceRefresh) {
  if (!forceRefresh && certCache.keys && Date.now() < certCache.expires) return certCache.keys;
  const res = await fetch(GOOGLE_CERTS_URL);
  if (!res.ok) throw new Error("couldn't load Google keys");
  const { keys } = await res.json();
  const m = /max-age=(\d+)/.exec(res.headers.get("Cache-Control") || "");
  certCache = { keys, expires: Date.now() + (m ? parseInt(m[1], 10) * 1000 : 3600 * 1000) };
  return keys;
}

export async function verifyGoogleToken(token, clientId, now = Date.now()) {
  const parts = (token || "").split(".");
  if (parts.length !== 3) throw new Error("no token");
  const header = b64urlJson(parts[0]);
  const claims = b64urlJson(parts[1]);
  if (header.alg !== "RS256" || !header.kid) throw new Error("unexpected token type");

  let jwk = (await googleKeys(false)).find(k => k.kid === header.kid);
  if (!jwk) jwk = (await googleKeys(true)).find(k => k.kid === header.kid);
  if (!jwk) throw new Error("unknown signing key");

  const key = await crypto.subtle.importKey(
    "jwk", { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]
  );
  const ok = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5", key, b64urlToBytes(parts[2]),
    new TextEncoder().encode(parts[0] + "." + parts[1])
  );
  if (!ok) throw new Error("bad signature");

  const sec = Math.floor(now / 1000);
  if (!GOOGLE_ISSUERS.has(claims.iss)) throw new Error("wrong issuer");
  if (claims.aud !== clientId) throw new Error("wrong audience");
  if (typeof claims.exp !== "number" || claims.exp < sec - 60) throw new Error("expired");
  if (typeof claims.iat === "number" && claims.iat > sec + 300) throw new Error("issued in the future");
  return claims;
}

export const _test = { cleanMessages, setCerts: (keys) => { certCache = { keys, expires: Date.now() + 3600e3 }; } };
