// DOM 级回归测试（happy-dom）：验证列表渲染、tablist 键盘、原生 <dialog> 弹层开合与复制状态。
// 覆盖静态字符串测试管不到的真实交互，防止 app.js 的 DOM 逻辑回归。
import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { Window } from "happy-dom";

const pageDir = fileURLToPath(new URL("../page/", import.meta.url));
const html = fs.readFileSync(pageDir + "index.html", "utf8");
const viewJs = fs.readFileSync(pageDir + "view.js", "utf8");
const appJs = fs.readFileSync(pageDir + "app.js", "utf8");

const MAP = {
  "阿里云 Qoder": { pid: ["qoder", "qoder-cn"], npm: "@magpie-community/opencode-qoder-auth", name: "Qoder", checkin: true },
  "豆包": { pid: "doubao-work", npm: "@magpie-community/opencode-doubao-work-auth", name: "豆包工作", checkin: false },
};
const FIXTURE = {
  meta: { generatedAt: "2026-11-20T06:00:00.000Z", source: "x", todayClaimable: 12 },
  deals: [
    { id: "q", provider: "阿里云 Qoder", title: "Qoder 每日签到", kind: "daily", url: "https://qoder.cn/x", tags: ["签到"], yuan: 12, label: "≈12", counted: true },
    { id: "d", provider: "豆包", title: "豆包新人福利", kind: "once", url: "https://example.com/d", tags: [], yuan: null, label: "免费", counted: true },
    { id: "n", provider: "无插件厂商", title: "某羊毛", kind: "free", url: "https://example.com/n", tags: [], yuan: null, label: "免费", counted: true },
  ],
  mapping: MAP,
  // 只装了 qoder-cn（已登录）→ ready；豆包未装 → setup(install)；无插件厂商 → none
  demoState: { installed: { "qoder-cn": { signedIn: true, checkin: "none" } }, configKnown: true, checkinKnown: true },
  icons: {},
};

const tick = (ms = 25) => new Promise((r) => setTimeout(r, ms));

async function mount() {
  const window = new Window({ url: "http://localhost/" });
  try {
    window.happyDOM.settings.disableJavaScriptFileLoading = true;
    window.happyDOM.settings.disableCSSFileLoading = true;
  } catch { /* 版本差异忽略 */ }
  const document = window.document;
  document.body.innerHTML = html.split("<body>")[1].split("</body>")[0];
  window.__FREE_TOKENS__ = JSON.parse(JSON.stringify(FIXTURE));

  globalThis.window = window;
  globalThis.document = document;
  globalThis.navigator = window.navigator;
  globalThis.HTMLDialogElement = window.HTMLDialogElement;
  globalThis.matchMedia = window.matchMedia.bind(window);

  new Function(viewJs)();
  window.FTView = globalThis.FTView;
  new Function(appJs)();
  await tick();
  return { window, document };
}

test("渲染：概览 + 默认 ready 档 + tablist 语义", async () => {
  const { document } = await mount();
  assert.match(document.querySelector("#summary").textContent, /¥12/);
  assert.equal(document.querySelectorAll("#list .row").length, 1, "默认 ready 档应有 1 行");
  assert.equal(document.querySelector("#list").getAttribute("role"), "tabpanel");
  assert.equal(document.querySelector("#list").getAttribute("aria-labelledby"), "tab-ready");
  assert.equal(document.querySelector("#list").getAttribute("aria-describedby"), "tabhint");
  const ready = document.querySelector("#tab-ready");
  assert.equal(ready.getAttribute("role"), "tab");
  assert.equal(ready.getAttribute("aria-selected"), "true");
  assert.equal(ready.getAttribute("tabindex"), "0");
  assert.equal(document.querySelector("#tab-setup").getAttribute("tabindex"), "-1");
  // #empty 现在位于 tabpanel 内
  assert.ok(document.querySelector("#list #empty"), "#empty 应在 #list 内");
  assert.equal(document.querySelector("#q").getAttribute("aria-label"), "搜索厂商或羊毛");
});

test("tablist 方向键：ArrowRight 切到 setup 且焦点跟随", async () => {
  const { window, document } = await mount();
  const ready = document.querySelector("#tab-ready");
  ready.focus();
  ready.dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
  await tick();
  const sel = document.querySelector('#buckets .tile[aria-selected="true"]');
  assert.equal(sel.dataset.tab, "setup");
  assert.equal(document.activeElement.id, "tab-setup");
});

test("原生 <dialog> 弹层：安装操作打开、聚焦输入框、复制反馈为 live region", async () => {
  const { window, document } = await mount();
  document.querySelector("#tab-setup").click();
  await tick();
  const btn = document.querySelector('#list [data-act="install"]');
  assert.ok(btn, "setup 档应有安装按钮");
  btn.click();
  await tick();
  const pop = document.querySelector("#pop");
  assert.equal(pop.tagName, "DIALOG");
  assert.equal(pop.getAttribute("closedby"), "any");
  assert.equal(pop.open, true);
  const input = document.querySelector("#pop-copy-input");
  assert.equal(document.activeElement, input, "打开后焦点应在复制输入框");
  assert.equal(input.value, "@magpie-community/opencode-doubao-work-auth");
  assert.equal(document.querySelector(".pop-tip").getAttribute("role"), "status");

  // 复制按钮 → 状态提示有内容（成功或手动复制提示均可）
  document.querySelector("[data-copy]").click();
  await tick(50);
  assert.match(document.querySelector(".pop-tip").textContent, /已复制|手动复制/);
});

test("弹层关闭：关闭按钮与（无 closedby 时）遮罩 pointerup 兜底", async () => {
  const { window, document } = await mount();
  document.querySelector("#tab-setup").click();
  await tick();
  document.querySelector('#list [data-act="install"]').click();
  await tick();
  const pop = document.querySelector("#pop");
  assert.equal(pop.open, true);
  pop.querySelector(".pop-close").click();
  await tick();
  assert.equal(pop.open, false, "点关闭后应关闭");

  // 再开一次，模拟点遮罩（getBoundingClientRect 在 happy-dom 为 0，用大坐标即“外部”）
  document.querySelector('#list [data-act="install"]').click();
  await tick();
  assert.equal(pop.open, true);
  pop.dispatchEvent(new window.MouseEvent("pointerdown", { clientX: 999, clientY: 999, bubbles: true }));
  pop.dispatchEvent(new window.MouseEvent("pointerup", { clientX: 999, clientY: 999, bubbles: true }));
  await tick();
  assert.equal(pop.open, false, "点遮罩应关闭（closedby 兜底）");
});
