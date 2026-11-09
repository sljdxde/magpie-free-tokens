// Token 羊毛 · 紧凑三档视图（只读；跟随 magpie 主题；无外链、无网络请求）。
(() => {
  "use strict";
  const hasBridge = typeof window.magpie !== "undefined" && window.magpie && window.magpie.ready;
  function mockBridge() { const dark = window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches; return { ready: Promise.resolve({ dark }), theme: { dark }, options: { get: async () => ({}), set: async (o) => o }, read: async () => ({}), onTheme() {} }; }
  const MAG = hasBridge ? window.magpie : mockBridge();

  const KIND = { daily: "每天", monthly: "每月", once: "新人", limited: "限时", free: "免费" };
  const TABS = [["ready", "已配置可用", "已装好并登录，可直接用"], ["setup", "有插件待配置", "有插件，还没装或没登录"], ["none", "暂无插件", "还没有对应的 magpie 插件"]];
  const TAB_HINT = {
    ready: "这些羊毛对应的供应商已在你的 magpie 里登录，可以直接使用；标「今日可领」的记得去签到。",
    setup: "点「安装插件」会给出可粘贴的包名；到 magpie「插件 → 发现 → 已有想装的?」粘贴添加（页面无法直接跳转安装）。",
    none: "这些还没有对应的 magpie 插件；「复制链接」可在浏览器打开来源。",
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = (u) => { try { const x = new URL(String(u || "")); return x.protocol === "https:" ? x.href : null; } catch { return null; } };
  const colorFor = (n) => { const P = ["#4f46e5", "#0d9488", "#b45309", "#7c3aed", "#be123c", "#0369a1", "#15803d", "#c2410c", "#9333ea", "#0f766e", "#b91c1c", "#1d4ed8"]; let h = 0; for (const c of String(n)) h = (h * 31 + c.codePointAt(0)) >>> 0; return P[h % P.length]; };
  const initials = (n) => { const s = String(n || "?").trim(); if (/^[\x00-\x7F]/.test(s)) { const w = s.split(/\s+/); return (w[0][0] + (w[1] ? w[1][0] : "")).toUpperCase(); } return s.slice(0, 1); };
  const fmtYuan = (y) => { const n = +y; if (!isFinite(n)) return ""; return n >= 100 ? String(Math.round(n)) : n.toFixed(2).replace(/\.?0+$/, ""); };

  let meta, deals, mapping, demoState, icons = {};
  let DATA_REF = null, wired = false;
  const state = { tab: "ready", q: "" };
  function applyData(d) { meta = d.meta || {}; deals = Array.isArray(d.deals) ? d.deals : []; mapping = d.mapping || {}; demoState = d.demoState || { installed: {}, configKnown: true, checkinKnown: true }; icons = d.icons || {}; DATA_REF = d; }

  function resolvePid(d, m) { const pid = m.pid; if (Array.isArray(pid)) { if (/qoder\.com/.test(d.url || "")) return "qoder"; if (/qoder\.cn/.test(d.url || "")) return "qoder-cn"; return pid[0]; } return pid; }
  function bucketOf(d) { const m = mapping[d.provider]; if (!m) return { key: "none" }; if (!demoState.configKnown) return { key: "setup", mode: "install", m, unknown: true }; const st = demoState.installed[resolvePid(d, m)]; if (!st) return { key: "setup", mode: "install", m }; if (!st.signedIn) return { key: "setup", mode: "login", m }; return { key: "ready", m, checkin: d.kind === "daily" ? st.checkin : null }; }
  function counts() { const c = { ready: 0, setup: 0, none: 0 }; for (const d of deals) c[bucketOf(d).key]++; return c; }

  function applyTheme(dark) { document.documentElement.dataset.theme = dark ? "dark" : "light"; }

  function avatarHtml(provider) { const src = icons[provider]; if (src) return `<div class="avatar logo" data-ini="${esc(initials(provider))}" data-col="${colorFor(provider)}"><img src="${esc(src)}" alt=""></div>`; return `<div class="avatar gen" style="background:${colorFor(provider)}">${esc(initials(provider))}</div>`; }

  function renderSummary(c) { $("#summary").innerHTML = `今天还能领 <b>¥${esc(meta.todayClaimable)}</b><span class="sep">·</span>共 <b>${deals.length}</b> 项羊毛<span class="sep">·</span>已配置可用 <b>${c.ready}</b> · 待配置 <b>${c.setup}</b> · 暂无插件 <b>${c.none}</b>`; }
  function renderBuckets(c) { $("#buckets").innerHTML = TABS.map(([k, label, hint]) => `<button class="bucket b-${k} ${state.tab === k ? "on" : ""}" data-tab="${k}"><div class="bnum">${c[k]}</div><div class="blabel">${esc(label)}</div><div class="bhint">${esc(hint)}</div></button>`).join(""); $$(".bucket").forEach((b) => (b.onclick = () => { state.tab = b.dataset.tab; render(); })); }

  function rowHtml(d) {
    const b = bucketOf(d);
    const yuan = d.yuan != null ? `¥${fmtYuan(d.yuan)}` : (d.label || d.face || "");
    const yuanSub = d.yuan != null && (d.label || d.face) ? `<small>${esc(d.label || d.face)}</small>` : "";
    const url = safeUrl(d.url);
    let sub = "", act = "";
    if (b.key === "ready") {
      if (d.kind === "daily" && b.checkin != null) { const done = b.checkin === "claimed" || b.checkin === "done"; sub = done ? `<span class="dot ok"></span>今日已领` : `<span class="dot warn"></span>今日可领`; }
      else sub = `<span class="dot ok"></span>可用`;
    } else if (b.key === "setup") {
      sub = `<span class="dot mut"></span>插件：${esc(b.m.name)}`;
      act = `<button class="cta primary" data-act="${b.mode}" data-name="${esc(b.m.name)}" data-npm="${esc(b.m.npm)}">${b.mode === "login" ? "去登录" : "安装插件"}</button>`;
    } else {
      sub = `<span class="dot mut"></span>暂无可用插件`;
      act = url ? `<button class="cta" data-act="copy" data-url="${esc(url)}">复制链接</button>` : "";
    }
    return `<div class="row">${avatarHtml(d.provider)}<div class="rmain"><div class="rprov">${esc(d.provider)} <span class="tag">${esc(KIND[d.kind] || d.kind || "")}</span></div><div class="rtitle">${esc(d.title)}</div><div class="rsub">${sub}</div></div><div class="rright"><div class="rval">${esc(yuan)}${yuanSub}</div>${act}</div></div>`;
  }

  function renderList() {
    const q = state.q.trim().toLowerCase();
    const rows = deals.filter((d) => bucketOf(d).key === state.tab).filter((d) => !q || (d.provider + " " + d.title + " " + (d.tags || []).join(" ")).toLowerCase().includes(q)).sort((a, b) => (b.yuan || 0) - (a.yuan || 0) || a.provider.localeCompare(b.provider));
    const list = $("#list"); list.innerHTML = rows.map(rowHtml).join("");
    $("#empty").style.display = rows.length ? "none" : "block";
    // 图标加载失败 → 首字母色块（不用内联事件，避开 CSP）
    $$(".avatar.logo img", list).forEach((img) => img.addEventListener("error", () => { const d = img.parentNode; d.className = "avatar gen"; d.style.background = d.getAttribute("data-col") || "#4f46e5"; d.textContent = d.getAttribute("data-ini") || "?"; }));
    $$("[data-act]", list).forEach((btn) => btn.addEventListener("click", (e) => { e.stopPropagation(); onAction(btn); }));
  }
  function render() {
    if (!deals) return;
    const c = counts(); renderSummary(c); renderBuckets(c);
    $("#tabhint").innerHTML = esc(TAB_HINT[state.tab] || ""); renderList();
    let when = ""; try { when = new Date(meta.generatedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false }); } catch { when = String(meta.generatedAt); }
    const warn = demoState.configKnown ? "" : " · 读取本机 magpie 配置失败，档位可能不准";
    $("#footNote").textContent = `三档：已配置可用 / 有插件待配置 / 暂无插件；数据取自 AIHOT 实时 · ${when}（北京时间）${warn}。数据源：AIHOT · https://aihot.news/free-tokens`;
  }
  function showMessage(msg) { $("#list").innerHTML = `<div class="empty">${esc(msg)}</div>`; $("#empty").style.display = "none"; }

  function onAction(btn) {
    const a = btn.dataset.act;
    if (a === "install") { const npm = btn.dataset.npm, name = btn.dataset.name; popover({ title: `安装插件：${name}`, steps: ["在 magpie「插件 → 发现」页最下方「已有想装的?」输入框，粘贴下面的包名，点「安装」", `（终端方式：magpie plugin add ${npm}）`], copyText: npm }); }
    else if (a === "login") { const pid = btn.dataset.pid, name = btn.dataset.name; popover({ title: `登录：${name}`, steps: [`magpie →「插件 → 已安装」，找到「${name}」那一行`, "点该行「登录」，按提示完成（浏览器 / 设备码）"], copyText: pid ? `magpie plugin login ${pid}` : "" }); }
    else if (a === "copy") { const url = safeUrl(btn.dataset.url); if (url) popover({ title: "来源链接", steps: ["页面沙盒不能直接打开外链，复制后到浏览器打开。"], copyText: url }); }
  }

  async function copyText(txt) { try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(txt); return true; } } catch {} try { const ta = document.createElement("textarea"); ta.value = txt; ta.style.position = "fixed"; ta.style.top = "-1000px"; document.body.appendChild(ta); ta.focus(); ta.select(); const ok = document.execCommand("copy"); ta.remove(); return ok; } catch { return false; } }
  function closePop() { const p = $("#pop-wrap"); if (p) p.remove(); }
  function popover({ title, steps, copyText: ct }) {
    closePop();
    const wrap = document.createElement("div"); wrap.id = "pop-wrap"; wrap.className = "pop-wrap";
    wrap.innerHTML = `<div class="pop"><div class="pop-h">${esc(title)}</div>${steps && steps.length ? `<ol class="pop-steps">${steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>` : ""}${ct ? `<div class="pop-copy"><input readonly value="${esc(ct)}" spellcheck="false"><button class="pop-btn" data-copy>复制</button></div><div class="pop-tip" data-tip></div>` : ""}<div class="pop-foot"><button class="pop-close">关闭</button></div></div>`;
    document.body.appendChild(wrap);
    const input = wrap.querySelector("input"), tip = wrap.querySelector("[data-tip]");
    if (input) { input.focus(); input.select(); const tryCopy = async () => { const ok = await copyText(ct); if (tip) tip.textContent = ok ? "已复制到剪贴板" : "已全选，请按 ⌘C / Ctrl+C 手动复制"; }; tryCopy(); wrap.querySelector("[data-copy]").onclick = async () => { await tryCopy(); input.focus(); input.select(); }; }
    wrap.querySelector(".pop-close").onclick = closePop;
    wrap.addEventListener("click", (e) => { if (e.target === wrap) closePop(); });
  }

  function wire() { if (wired) return; wired = true; $("#q").addEventListener("input", (e) => { state.q = e.target.value; renderList(); }); }
  function boot() { const d = window.__FREE_TOKENS__ || window.__MOCK__; if (!d) return false; if (d.error) { applyData({ meta: d.meta || {}, deals: [], mapping: {}, demoState: { installed: {}, configKnown: true, checkinKnown: true } }); showMessage("数据源暂不可用（AIHOT 无法访问）。稍后重试。"); return true; } applyData(d); render(); return true; }
  let tick = 0;
  function inject() { if (!hasBridge) return; const s = document.createElement("script"); s.src = "data.js?t=" + Date.now() + "-" + (tick++); s.onload = () => { const d = window.__FREE_TOKENS__; if (d && d !== DATA_REF) { applyData(d); render(); } }; s.onerror = () => {}; document.head.appendChild(s); }

  MAG.ready.then((theme) => {
    applyTheme(!!(theme && theme.dark));
    if (MAG.onTheme) MAG.onTheme((t) => applyTheme(!!(t && t.dark)));
    wire();
    if (hasBridge) { inject(); setInterval(inject, 5000); }
    if (!boot()) { showMessage("数据准备中…"); setTimeout(() => { if (!DATA_REF) showMessage("数据未就绪（请确认 AIHOT 可访问后重新打开此页）。"); }, 12000); }
  });
})();
