import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildPayload } from "../src/classify.js";
import { readLocal } from "../src/inventory.js";

const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
const ft = (deals) => ({ deals, basis: { usdCny: 6.67 } });
const deal = (o = {}) => ({ id: "x", kind: "daily", title: "t", provider: "阿里云 Qoder", detail: "", url: "https://docs.qoder.cn/x", tags: [], endsAt: null, validity: "", verifiedAt: "2026-11-09T00:00:00Z", yuan: null, label: "100", face: "100", counted: true, evidence: "official", ...o });
const tier = (p, d) => { const m = p.mapping[d.provider]; if (!m) return "none"; const pid = Array.isArray(m.pid) ? (/qoder\.com/.test(d.url || "") ? "qoder" : /qoder\.cn/.test(d.url || "") ? "qoder-cn" : m.pid[0]) : m.pid; const st = p.demoState.installed[pid]; return !st ? "setup" : st.signedIn ? "ready" : "setup"; };

test("three tiers ready/setup/none", () => {
  const local = { providers: [{ id: "qoder-cn", name: "Qoder CN", signedIn: true }], checkin: { "qoder-cn|acc": { day: today, outcome: "claimed" } } };
  const p = buildPayload(ft([deal(), deal({ provider: "Zed" }), deal({ provider: "DeepSeek" })]), local);
  assert.deepEqual(p.deals.map((d) => tier(p, d)), ["ready", "setup", "none"]);
  assert.equal(p.demoState.configKnown, true);
  assert.equal(p.demoState.installed["qoder-cn"].checkin, "claimed");
});

test("allowlist drops non-official (middleman) provider", () => {
  const p = buildPayload(ft([deal({ provider: "某中转站" }), deal({ provider: "DeepSeek" })]), { providers: [], checkin: {} });
  assert.equal(p.deals.length, 1);
  assert.equal(p.deals[0].provider, "DeepSeek");
});

test("kind whitelisted and url limited to https (xss/ssrf)", () => {
  const p = buildPayload(ft([deal({ kind: "<img src=x onerror=alert(1)>", url: "javascript:alert(1)" })]), { providers: [], checkin: {} });
  assert.equal(p.deals[0].kind, "other");
  assert.equal(p.deals[0].url, null);
});

test("corrupt plugin-checkin.json => unknown (null), not 未领", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ft-"));
  fs.writeFileSync(path.join(dir, "plugin-providers.json"), JSON.stringify([{ id: "qoder-cn", signedIn: true }]));
  fs.writeFileSync(path.join(dir, "plugin-checkin.json"), "{ broken json");
  const local = readLocal(dir);
  assert.equal(local.checkin, null);
  assert.equal(local.providers.length, 1);
  const p = buildPayload(ft([deal()]), local);
  assert.equal(p.demoState.checkinKnown, false);
  assert.equal(p.demoState.installed["qoder-cn"].checkin, null);
});

test("missing config files => empty (fresh), not unknown", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ft2-"));
  const local = readLocal(dir);
  assert.deepEqual(local.providers, []);
  assert.deepEqual(local.checkin, {});
});
