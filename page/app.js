// Token 羊毛 · 紧凑三档视图（生产：读 __FREE_TOKENS__，data.js 每 5s 热注入；原型：__MOCK__）。
(() => {
  "use strict";

  const hasBridge = typeof window.magpie !== "undefined" && window.magpie && window.magpie.ready;
  function mockBridge() {
    const dark = window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
    return { ready: Promise.resolve({ dark, lang: "zh", tokens: {} }), theme: { dark }, options: { get: async () => ({}), set: async (o) => o }, read: async () => ({}), onTheme() {} };
  }
  const MAG = hasBridge ? window.magpie : mockBridge();

  const KIND = { daily: "每天", monthly: "每月", once: "新人", limited: "限时", free: "免费" };
  const TABS = [
    ["ready", "已配置可用", "已装好并登录，可直接用"],
    ["setup", "有插件待配置", "有插件，还没装或没登录"],
    ["none", "暂无插件", "还没有对应的 magpie 插件"],
  ];
  const TAB_HINT = {
    ready: "这些羊毛对应的供应商已在你的 magpie 里登录，可以直接使用；标「今日可领」的记得去签到。",
    setup: "点「安装插件」会给出安装命令并自动全选；到 magpie「插件 → 发现」添加，或终端运行。页面无法直接跳转安装。",
    none: "这些还没有对应的 magpie 插件，暂时只能查看来源；等社区/官方出了插件再来。",
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const colorFor = (n) => { const P = ["#4f46e5", "#0d9488", "#b45309", "#7c3aed", "#be123c", "#0369a1", "#15803d", "#c2410c", "#9333ea", "#0f766e", "#b91c1c", "#1d4ed8"]; let h = 0; for (const c of n) h = (h * 31 + c.codePointAt(0)) >>> 0; return P[h % P.length]; };
  const initials = (n) => { const s = String(n || "?").trim(); if (/^[\x00-\x7F]/.test(s)) { const w = s.split(/\s+/); return (w[0][0] + (w[1] ? w[1][0] : "")).toUpperCase(); } return s.slice(0, 1); };
  const fmtYuan = (y) => { const n = +y; if (!isFinite(n)) return ""; return n >= 100 ? String(Math.round(n)) : n.toFixed(2).replace(/\.?0+$/, ""); };

  let meta, deals, mapping, demoState, icons = {};
  let DATA_REF = null, wired = false;
  const state = { tab: "ready", q: "" };
  function applyData(d) { meta = d.meta; deals = d.deals || []; mapping = d.mapping || {}; demoState = d.demoState || { installed: {} }; icons = d.icons || {}; DATA_REF = d; }

  function resolvePid(d, m) { const pid = m.pid; if (Array.isArray(pid)) { if (/qoder\.com/.test(d.url || "")) return "qoder"; if (/qoder\.cn/.test(d.url || "")) return "qoder-cn"; return pid[0]; } return pid; }
  function bucketOf(d) { const m = mapping[d.provider]; if (!m) return { key: "none" }; const st = demoState.installed[resolvePid(d, m)]; if (!st) return { key: "setup", mode: "install", m }; if (!st.signedIn) return { key: "setup", mode: "login", m }; return { key: "ready", m, checkin: d.kind === "daily" ? st.checkin : null }; }
  function counts() { const c = { ready: 0, setup: 0, none: 0 }; for (const d of deals) c[bucketOf(d).key]++; return c; }

  let curDark = false;
  function applyTheme(dark) { document.documentElement.dataset.theme = dark ? "dark" : "light"; const b = $("#themeBtn"); if (b) b.textContent = dark ? "切换亮色" : "切换暗色"; }

  window.__iconFail = function (img) {
    const d = img.parentNode; if (!d) return;
    d.className = "avatar gen";
    d.style.background = d.getAttribute("data-col") || "#4f46e5";
    d.textContent = d.getAttribute("data-ini") || "?";
  };
  function avatarHtml(provider) {
    const src = icons[provider];
    if (src) return `<div class="avatar logo" data-ini="${esc(initials(provider))}" data-col="${colorFor(provider)}"><img src="${esc(src)}" alt="" loading="lazy" onerror="window.__iconFail(this)"></div>`;
    return `<div class="avatar gen" style="background:${colorFor(provider)}">${esc(initials(provider))}</div>`;
  }

  function renderSummary(c) { $("#summary").innerHTML = `今天还能领 <b>¥${meta.todayClaimable}</b><span class="sep">·</span>共 <b>${deals.length}</b> 项羊毛<span class="sep">·</span>已配置可用 <b>${c.ready}</b> · 待配置 <b>${c.setup}</b> · 暂无插件 <b>${c.none}</b>`; }
  function renderBuckets(c) {
    $("#buckets").innerHTML = TABS.map(([k, label, hint]) => `<button class="bucket b-${k} ${state.tab === k ? "on" : ""}" data-tab="${k}"><div class="bnum">${c[k]}</div><div class="blabel">${label}</div><div class="bhint">${hint}</div></button>`).join("");
    $$(".bucket").forEach((b) => (b.onclick = () => { state.tab = b.dataset.tab; render(); }));
  }
  function rowHtml(d) {
    const b = bucketOf(d);
    const yuan = d.yuan ? `¥${fmtYuan(d.yuan)}` : (d.label || d.face || "");
    const yuanSub = d.yuan && (d.label || d.face) ? `<small>${esc(d.label || d.face)}</small>` : "";
    let sub = "", act = "";
    if (b.key === "ready") {
      if (d.kind === "daily") { const done = b.checkin === "claimed" || b.checkin === "done"; sub = done ? `<span class="dot ok"></span>今日已领` : `<span class="dot warn"></span>今日可领`; }
      else sub = `<span class="dot ok"></span>可用`;
    } else if (b.key === "setup") {
      const pid = resolvePid(d, b.m);
      sub = `<span class="dot mut"></span>插件：${esc(b.m.name)}`;
      act = `<button class="cta primary" data-act="${b.mode}" data-name="${esc(b.m.name)}" data-npm="${esc(b.m.npm)}" data-cli="${esc(b.m.cli || "")}" data-pid="${esc(pid)}">${b.mode === "login" ? "去登录" : "安装插件"}</button>`;
    } else {
      sub = `<span class="dot mut"></span>暂无可用插件`;
      act = `<button class="cta" data-act="src" data-url="${esc(d.url)}">查看来源 ↗</button>`;
    }
    return `<div class="row" title="${esc(d.detail || "")}">${avatarHtml(d.provider)}<div class="rmain"><div class="rprov">${esc(d.provider)} <span class="tag">${KIND[d.kind] || d.kind}</span></div><div class="rtitle">${esc(d.title)}</div><div class="rsub">${sub}</div></div><div class="rright"><div class="rval">${esc(yuan)}${yuanSub}</div>${act}</div></div>`;
  }
  function renderList() {
    const q = state.q.trim().toLowerCase();
    const rows = deals.filter((d) => bucketOf(d).key === state.tab).filter((d) => !q || (d.provider + " " + d.title + " " + (d.tags || []).join(" ")).toLowerCase().includes(q)).sort((a, b) => (b.yuan || 0) - (a.yuan || 0) || a.provider.localeCompare(b.provider));
    const list = $("#list"); list.innerHTML = rows.map(rowHtml).join("");
    $("#empty").style.display = rows.length ? "none" : "block";
    $$("[data-act]", list).forEach((btn) => btn.addEventListener("click", (e) => { e.stopPropagation(); onAction(btn); }));
  }
  function render() {
    if (!deals) return;
    const c = counts(); renderSummary(c); renderBuckets(c);
    $("#tabhint").innerHTML = TAB_HINT[state.tab] || ""; renderList();
    const src = meta.stale ? "AIHOT 快照（可能过期）" : "AIHOT 实时";
    let when = ""; try { when = new Date(meta.generatedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false }); } catch { when = String(meta.generatedAt); }
    $("#footNote").innerHTML = `三档：已配置可用 / 有插件待配置 / 暂无插件；数据取自 ${esc(src)} · ${esc(when)}（北京时间）。数据源：AIHOT。`;
  }
  function showLoading() { $("#list").innerHTML = `<div class="empty">数据准备中…（正在从 AIHOT 与本机 magpie 取数）</div>`; $("#empty").style.display = "none"; }

  // ---- action router ----
  function onAction(btn) {
    const a = btn.dataset.act;
    if (a === "src") return window.open(btn.dataset.url, "_blank", "noopener");
    if (a === "install") {
      const cli = btn.dataset.cli, npm = btn.dataset.npm, name = btn.dataset.name;
      const term = cli ? `magpie plugin add ${cli}` : `magpie plugin add npm:${npm}`;
      popover({
        title: `安装插件：${name}`,
        steps: [
          `在 magpie「插件 → 发现」页最下方「已有想装的?」输入框，粘贴下面的包名，点「安装」`,
          `（终端方式：${term}）`,
        ],
        copyText: npm,
        copyLabel: "npm 包名",
      });
    } else if (a === "login") {
      const pid = btn.dataset.pid, name = btn.dataset.name;
      popover({ title: `登录：${name}`, steps: [`magpie →「插件 → 已安装」，找到「${name}」那一行`, "点该行「登录」，按提示完成（浏览器 / 设备码）", `或终端运行：magpie plugin login ${pid}`], copyText: `magpie plugin login ${pid}` });
    }
  }

  // ---- robust copy + popover (沙盒里 navigator.clipboard 常被拦) ----
  async function copyText(txt) {
    try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(txt); return true; } } catch {}
    try { const ta = document.createElement("textarea"); ta.value = txt; ta.style.position = "fixed"; ta.style.top = "-1000px"; document.body.appendChild(ta); ta.focus(); ta.select(); const ok = document.execCommand("copy"); ta.remove(); return ok; } catch { return false; }
  }
  function closePop() { const p = $("#pop-wrap"); if (p) p.remove(); }
  function popover({ title, steps, copyText: ct }) {
    closePop();
    const wrap = document.createElement("div"); wrap.id = "pop-wrap"; wrap.className = "pop-wrap";
    wrap.innerHTML = `<div class="pop">
      <div class="pop-h">${esc(title)}</div>
      ${steps && steps.length ? `<ol class="pop-steps">${steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>` : ""}
      <div class="pop-copy"><input readonly value="${esc(ct)}" spellcheck="false"><button class="pop-btn" data-copy>复制</button></div>
      <div class="pop-tip" data-tip></div>
      <div class="pop-foot"><button class="pop-close">关闭</button></div>
    </div>`;
    document.body.appendChild(wrap);
    const input = wrap.querySelector("input"), tip = wrap.querySelector("[data-tip]");
    const tryCopy = async (announce) => { const ok = await copyText(ct); if (announce) tip.textContent = ok ? "已复制到剪贴板" : "已全选，请按 ⌘C / Ctrl+C 手动复制"; return ok; };
    input.focus(); input.select();
    tryCopy(true);
    wrap.querySelector("[data-copy]").onclick = async () => { await tryCopy(true); input.focus(); input.select(); };
    wrap.querySelector(".pop-close").onclick = closePop;
    wrap.addEventListener("click", (e) => { if (e.target === wrap) closePop(); });
  }

  // ---- wiring & data ----
  function wire() { if (wired) return; wired = true; $("#themeBtn").addEventListener("click", () => { curDark = !curDark; applyTheme(curDark); }); $("#q").addEventListener("input", (e) => { state.q = e.target.value; renderList(); }); }
  function boot() { const d = window.__FREE_TOKENS__ || window.__MOCK__; if (!d || !d.deals) return false; applyData(d); render(); return true; }
  let tick = 0;
  function inject() { if (!hasBridge) return; const s = document.createElement("script"); s.src = "data.js?t=" + Date.now() + "-" + (tick++); s.onload = () => { const d = window.__FREE_TOKENS__; if (d && d !== DATA_REF) { applyData(d); render(); } }; s.onerror = () => {}; document.head.appendChild(s); }

  MAG.ready.then((theme) => {
    curDark = !!(theme && theme.dark); applyTheme(curDark);
    if (MAG.onTheme) MAG.onTheme((t) => { curDark = !!(t && t.dark); applyTheme(curDark); });
    wire();
    if (hasBridge) { inject(); setInterval(inject, 5000); }
    if (!boot()) showLoading();
  });
})();
