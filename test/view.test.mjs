import { test } from "bun:test";
import assert from "node:assert/strict";
import * as V from "../page/view.js";

const MAP = { "阿里云 Qoder": { pid: ["qoder", "qoder-cn"], npm: "@magpie-community/opencode-qoder-auth", name: "Qoder" } };
const ctx = (over = {}) => ({ mapping: MAP, demoState: { configKnown: true, installed: {} }, icons: {}, ...over });

test("esc / safeUrl / colorFor / initials / fmtYuan", () => {
  assert.equal(V.esc(`<a>&"'`), "&lt;a&gt;&amp;&quot;&#39;");
  assert.equal(V.safeUrl("javascript:alert(1)"), null);
  assert.equal(V.safeUrl("https://a/b"), "https://a/b");
  assert.match(V.colorFor("abc"), /^#/);
  assert.equal(V.initials("Deep Seek"), "DS");
  assert.equal(V.initials("豆包"), "豆");
  assert.equal(V.initials(""), "?");
  assert.equal(V.fmtYuan(120), "120");
  assert.equal(V.fmtYuan(12.5), "12.5");
  assert.equal(V.fmtYuan("x"), "");
});
test("resolvePid array/nonarray", () => {
  assert.equal(V.resolvePid({ url: "https://qoder.com/x" }, MAP["阿里云 Qoder"]), "qoder");
  assert.equal(V.resolvePid({ url: "https://qoder.cn/x" }, MAP["阿里云 Qoder"]), "qoder-cn");
  assert.equal(V.resolvePid({ url: "https://other/x" }, MAP["阿里云 Qoder"]), "qoder");
  assert.equal(V.resolvePid({}, { pid: "z" }), "z");
});
test("bucketOf: none / config-unknown / install / login / ready (daily & non-daily)", () => {
  const D = { provider: "阿里云 Qoder", url: "https://qoder.cn/x", kind: "daily" };
  assert.equal(V.bucketOf({ provider: "X" }, MAP, { configKnown: true, installed: {} }).key, "none");
  assert.equal(V.bucketOf(D, MAP, { configKnown: false, installed: {} }).key, "setup");
  assert.equal(V.bucketOf(D, MAP, { configKnown: true, installed: {} }).key, "setup");
  assert.equal(V.bucketOf(D, MAP, { configKnown: true, installed: { "qoder-cn": { signedIn: false } } }).mode, "login");
  const ready = V.bucketOf(D, MAP, { configKnown: true, installed: { "qoder-cn": { signedIn: true, checkin: "claimed" } } });
  assert.equal(ready.key, "ready"); assert.equal(ready.checkin, "claimed");
  const monthly = V.bucketOf({ ...D, kind: "monthly" }, MAP, { configKnown: true, installed: { "qoder-cn": { signedIn: true } } });
  assert.equal(monthly.checkin, null);
});
test("counts", () => {
  const c = V.counts([{ provider: "X" }, { provider: "阿里云 Qoder", url: "https://qoder.cn/x", kind: "daily" }], MAP, { configKnown: true, installed: { "qoder-cn": { signedIn: true } } });
  assert.equal(c.none, 1); assert.equal(c.ready, 1); assert.equal(c.setup, 0);
});
test("avatarHtml icon vs fallback", () => {
  assert.match(V.avatarHtml("豆包", { "豆包": "brand/x.svg" }), /avatar logo/);
  const g = V.avatarHtml("豆包", {});
  assert.match(g, /avatar gen/); assert.match(g, /豆/);
});
test("summaryHtml", () => {
  const s = V.summaryHtml({ todayClaimable: 201 }, 50, { ready: 14, setup: 8, none: 28 });
  assert.match(s, /¥201/); assert.match(s, /50/); assert.match(s, /14/);
});
test("rowHtml: ready checkin states + yuan", () => {
  const b = { provider: "阿里云 Qoder", url: "https://qoder.cn/x", kind: "daily", title: "t", yuan: 12, label: "≈12" };
  const r = (checkin) => V.rowHtml(b, ctx({ demoState: { configKnown: true, installed: { "qoder-cn": { signedIn: true, checkin } } } }));
  assert.match(r("claimed"), /今日已领/);
  assert.match(r("done"), /今日已领/);
  assert.match(r("none"), /今日可领/);
  assert.match(r(null), /可用/);
  assert.match(r("claimed"), /¥12/);
  assert.match(r("claimed"), /<small>≈12<\/small>/);
  const monthly = V.rowHtml({ ...b, kind: "monthly" }, ctx({ demoState: { configKnown: true, installed: { "qoder-cn": { signedIn: true } } } }));
  assert.match(monthly, /可用/);
});
test("rowHtml: setup install/login buttons", () => {
  const b = { provider: "阿里云 Qoder", url: "https://qoder.cn/x", kind: "daily", title: "t" };
  const ins = V.rowHtml(b, ctx());
  assert.match(ins, /安装插件/);
  assert.match(ins, /data-npm="@magpie-community\/opencode-qoder-auth"/);
  assert.match(ins, /data-pid="qoder-cn"/);
  const lg = V.rowHtml(b, ctx({ demoState: { configKnown: true, installed: { "qoder-cn": { signedIn: false } } } }));
  assert.match(lg, /去登录/);
});
test("rowHtml: none with/without url", () => {
  assert.match(V.rowHtml({ provider: "X", url: "https://e/x", kind: "daily", title: "t" }, ctx()), /复制链接/);
  assert.ok(!/复制链接/.test(V.rowHtml({ provider: "X", url: "javascript:1", kind: "daily", title: "t" }, ctx())));
});
test("rowHtml: escapes kind/title/url (xss)", () => {
  const r = V.rowHtml({ provider: "X", kind: "<img>", title: "<b>", url: "https://e/x" }, ctx({ mapping: {} }));
  assert.ok(!/<img>/.test(r)); assert.match(r, /&lt;img&gt;/);
});
