// Token 羊毛 · 紧凑三档视图（classic script；只读；跟随 magpie 主题；无外链、无网络请求）。
// 依赖先加载的 view.js（window.FTView）。用 classic 而非 module：magpie 页面 frame 为 sandbox=allow-scripts，
// origin 为 null，module script 走 CORS 会被拒（见 review）。
(function () {
  "use strict";
  if (!window.FTView) { document.addEventListener("DOMContentLoaded", () => { const el = document.getElementById("list"); if (el) el.innerHTML = '<div class="empty">页面资源加载失败（view.js 未加载）</div>'; }); return; }
  const V = window.FTView;
  const { esc, bucketOf, counts, summaryHtml, rowHtml, actionOf } = V;

  const hasBridge = typeof window.magpie !== "undefined" && window.magpie && window.magpie.ready;
  function previewBridge() {
    // 纯浏览器预览：跟随系统亮暗，并监听系统切换（指南要求读 matchMedia 时必须处理 change）
    const mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    const dark = !!(mq && mq.matches);
    return {
      ready: Promise.resolve({ dark }),
      theme: { dark },
      options: { get: async () => ({}), set: async (o) => o },
      read: async () => ({}),
      onTheme(cb) { if (mq && mq.addEventListener) mq.addEventListener("change", (e) => cb({ dark: e.matches })); },
    };
  }
  const MAG = hasBridge ? window.magpie : previewBridge();

  const TABS = [["ready", "已配置可用", "已装好并登录，可直接用"], ["setup", "有插件待配置", "有插件，还没装或没登录"], ["none", "暂无插件", "还没有对应的 magpie 插件"]];
  const TAB_HINT = {
    ready: "这些羊毛对应的供应商已在你的 magpie 里登录，可以直接使用；标「今日可领」的记得去签到。",
    setup: "点「安装插件」会给出可粘贴的包名；到 magpie「插件 → 发现 → 已有想装的?」粘贴添加（页面无法直接跳转安装）。",
    none: "这些还没有对应的 magpie 插件；「复制链接」可在浏览器打开来源。",
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  let meta, deals, mapping, demoState, icons = {};
  let DATA_REF = null, wired = false;
  const state = { tab: "ready", q: "" };
  function applyData(d) { meta = d.meta || {}; deals = Array.isArray(d.deals) ? d.deals : []; mapping = d.mapping || {}; demoState = d.demoState || { installed: {}, configKnown: true, checkinKnown: true }; icons = d.icons || {}; DATA_REF = d; }
  function showUnavailable() { applyData({ meta: {}, deals: [], mapping: {}, demoState: { installed: {}, configKnown: true, checkinKnown: true } }); showMessage("数据源暂不可用（AIHOT 无法访问）。稍后重试。"); }

  function applyTheme(dark) { document.documentElement.dataset.theme = dark ? "dark" : "light"; }
  function renderSummary(c) { $("#summary").innerHTML = summaryHtml(meta, deals.length, c); }

  // 三档切换：用 tablist/tab/tabpanel 语义；方向键移动（selection follows focus）
  function renderBuckets(c) {
    const el = $("#buckets");
    el.innerHTML = TABS.map(([k, label]) => `<button type="button" role="tab" id="tab-${k}" class="tile ${state.tab === k ? "on" : ""}" data-tab="${k}" aria-selected="${state.tab === k}" tabindex="${state.tab === k ? 0 : -1}" aria-controls="list"><span class="k">${esc(label)}</span><span class="v">${c[k]}</span></button>`).join("");
    $$(".tile", el).forEach((b) => (b.onclick = () => selectTab(b.dataset.tab, false)));
    const panel = $("#list"); if (panel) panel.setAttribute("aria-labelledby", "tab-" + state.tab);
  }
  function selectTab(k, focus) { state.tab = k; render(); if (focus) { const t = $("#tab-" + k); if (t) t.focus(); } }

  function renderList() {
    const q = state.q.trim().toLowerCase();
    const rows = deals.filter((d) => bucketOf(d, mapping, demoState).key === state.tab)
      .filter((d) => !q || (d.provider + " " + d.title + " " + (d.tags || []).join(" ")).toLowerCase().includes(q))
      .sort((a, b) => (b.yuan || 0) - (a.yuan || 0) || a.provider.localeCompare(b.provider));
    const box = $("#rows"); box.innerHTML = rows.map((d) => rowHtml(d, { mapping, demoState, icons })).join("");
    // 空结果与档位/筛选变化都做轻量播报（#empty 现在位于 tabpanel 内）
    const empty = $("#empty");
    if (rows.length) { empty.style.display = "none"; empty.textContent = "这一档没有符合条件的羊毛"; }
    else { empty.style.display = "block"; empty.textContent = q ? `没有匹配「${state.q.trim()}」的羊毛` : "这一档没有符合条件的羊毛"; }
    const live = $("#live"); const label = (TABS.find((t) => t[0] === state.tab) || ["", "", ""])[1]; const msg = `${label}：${rows.length} 项`;
    if (live && live.textContent !== msg) live.textContent = msg;
    $$(".avatar.logo img", box).forEach((img) => img.addEventListener("error", () => { const d = img.parentNode; d.className = "avatar gen"; d.style.background = d.getAttribute("data-col") || "#4f46e5"; d.textContent = d.getAttribute("data-ini") || "?"; }));
    $$("[data-act]", box).forEach((btn) => btn.addEventListener("click", (e) => { e.stopPropagation(); onAction(btn); }));
  }
  function render() {
    if (!deals) return;
    const c = counts(deals, mapping, demoState); renderSummary(c); renderBuckets(c);
    $("#tabhint").innerHTML = esc(TAB_HINT[state.tab] || ""); renderList();
    let when = ""; try { when = new Date(meta.generatedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false }); } catch { when = String(meta.generatedAt); }
    const warn = demoState.configKnown ? "" : " · 读取本机 magpie 配置失败，档位可能不准";
    $("#footNote").textContent = `三档：已配置可用 / 有插件待配置 / 暂无插件；数据取自 AIHOT 实时 · ${when}（北京时间）${warn}。数据源：AIHOT · https://aihot.news/free-tokens`;
  }
  function showMessage(msg) { $("#rows").innerHTML = `<div class="empty">${esc(msg)}</div>`; $("#empty").style.display = "none"; }

  function onAction(btn) { const a = actionOf(btn.dataset); if (a) openPop(a); }

  async function copyText(txt) { try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(txt); return true; } } catch {} try { const ta = document.createElement("textarea"); ta.value = txt; ta.style.position = "fixed"; ta.style.top = "-1000px"; document.body.appendChild(ta); ta.focus(); ta.select(); const ok = document.execCommand("copy"); ta.remove(); return ok; } catch { return false; } }

  // —— 原生 <dialog> 弹层：焦点陷阱、Esc/返回手势、焦点归还由浏览器负责 ——
  const isOutside = (e, d) => { const r = d.getBoundingClientRect(); return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom; };
  let popDownOutside = false, currentCopy = "";
  function closePop() { const p = $("#pop"); if (p && p.open) p.close(); }
  function setTip(msg) { const t = $("#pop .pop-tip"); if (t) t.textContent = msg; }
  async function tryCopy(txt) { const ok = await copyText(txt); setTip(ok ? "已复制到剪贴板" : "已全选，请按 ⌘C / Ctrl+C 手动复制"); }
  function openPop({ title, steps, copyText: ct }) {
    const pop = $("#pop"); if (!pop) return;
    closePop();
    currentCopy = ct || "";
    $("#pop-title").textContent = title || "";
    const ol = pop.querySelector(".pop-steps");
    ol.innerHTML = (steps || []).map((s) => `<li>${esc(s)}</li>`).join("");
    ol.style.display = steps && steps.length ? "" : "none";
    const copyWrap = pop.querySelector(".pop-copy");
    const input = pop.querySelector(".pop-copy input");
    setTip("");
    if (ct) {
      copyWrap.style.display = "";
      input.value = ct;
      pop.showModal();
      input.focus(); input.select();
      tryCopy(ct);
    } else {
      copyWrap.style.display = "none";
      pop.showModal();
    }
  }

  function wire() {
    if (wired) return;
    wired = true;
    $("#q").addEventListener("input", (e) => { state.q = e.target.value; renderList(); });
    $("#buckets").addEventListener("keydown", (e) => {
      if (!/^(ArrowLeft|ArrowRight|Home|End)$/.test(e.key)) return;
      const tabs = $$(".tile", $("#buckets"));
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      let n = i;
      if (e.key === "ArrowRight") n = (i + 1) % tabs.length;
      else if (e.key === "ArrowLeft") n = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === "Home") n = 0; else n = tabs.length - 1;
      e.preventDefault();
      selectTab(tabs[n].dataset.tab, true);
    });
    const pop = $("#pop");
    if (pop) {
      pop.querySelector(".pop-close").addEventListener("click", closePop);
      pop.querySelector("[data-copy]").addEventListener("click", async () => { await tryCopy(currentCopy); const input = pop.querySelector(".pop-copy input"); if (input) { input.focus(); input.select(); } });
      // light-dismiss 兜底：Safari 等不支持 closedby 时，点遮罩关闭（按坐标判定，避免误触 padding）
      if (typeof HTMLDialogElement === "undefined" || !("closedBy" in HTMLDialogElement.prototype)) {
        pop.addEventListener("pointerdown", (e) => { popDownOutside = isOutside(e, pop); });
        pop.addEventListener("pointerup", (e) => { if (popDownOutside && isOutside(e, pop)) { popDownOutside = false; pop.close(); } });
      }
    }
  }

  function boot() { const d = window.__FREE_TOKENS__; if (!d) return false; if (d.error) { showUnavailable(); return true; } applyData(d); render(); return true; }
  let tick = 0, tried = 0;
  function inject() {
    const s = document.createElement("script"); s.src = "data.js?t=" + Date.now() + "-" + (tick++);
    const done = () => { if (s.parentNode) s.parentNode.removeChild(s); };
    s.onload = () => { done(); const d = window.__FREE_TOKENS__; if (!d || d === DATA_REF) return; if (d.error) { showUnavailable(); } else { applyData(d); render(); } };
    s.onerror = () => { done(); };
    document.head.appendChild(s);
  }

  MAG.ready.then((theme) => {
    applyTheme(!!(theme && theme.dark));
    if (MAG.onTheme) MAG.onTheme((t) => applyTheme(!!(t && t.dark)));
    wire();
    inject(); // 宿主与纯浏览器预览都尝试加载 data.js（预览不再永远无数据）
    if (hasBridge) {
      // 仅在有需要时重试几次（宿主可能稍后才写 data.js），不无限轮询
      const timer = setInterval(() => {
        const d = window.__FREE_TOKENS__;
        if (DATA_REF || (d && d.error) || ++tried >= 8) { clearInterval(timer); return; }
        inject();
      }, 2000);
    }
    if (!boot()) { showMessage("数据准备中…"); setTimeout(() => { if (!DATA_REF) { const d = window.__FREE_TOKENS__; if (d && d.error) showUnavailable(); else showMessage("数据未就绪（请确认 AIHOT 可访问后重新打开此页）。"); } }, 16000); }
  });
})();
