// magpie-free-tokens · Bun 主模块：定时 fetch AIHOT → 解码 → 读本机 magpie → 分三档 → 写 page/data.js。
// 品牌图标随包内置（page/brand/），无需联网抓图；缺图标由前端用首字母/首字兜底。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchFreeTokens } from "./src/aihot.js";
import { configDir, readLocal } from "./src/inventory.js";
import { buildPayload } from "./src/classify.js";

const PAGE_DATA = fileURLToPath(new URL("./page/data.js", import.meta.url));
const SNAPSHOT = fileURLToPath(new URL("./data/snapshot.json", import.meta.url));
const TTL = 5 * 60 * 1000;
let timer = null;

function writeAtomic(file, text) { const t = file + ".tmp"; fs.writeFileSync(t, text); fs.renameSync(t, file); }
function loadSnapshot() { try { return JSON.parse(fs.readFileSync(SNAPSHOT, "utf8")); } catch { return { deals: [], basis: null }; } }

export async function refresh(input) {
  const dir = configDir(input);
  const local = readLocal(dir);
  let ft, stale = false;
  try { ft = await fetchFreeTokens(); }
  catch (e) { ft = loadSnapshot(); stale = true; if (!ft.deals || !ft.deals.length) { console.error("[free-tokens] fetch failed & no snapshot:", e.message); return null; } }
  const payload = buildPayload(ft, local);
  payload.meta.stale = stale;
  writeAtomic(PAGE_DATA, "window.__FREE_TOKENS__ = " + JSON.stringify(payload) + ";\n");
  console.error(`[free-tokens] data.js: ${payload.deals.length} deals · ${Object.keys(payload.demoState.installed).length} providers · ${Object.keys(payload.icons).length} brand icons${stale ? " · SNAPSHOT" : ""}`);
  return payload;
}

export const FreeTokens = async (input) => {
  refresh(input).catch((e) => console.error("[free-tokens]", e.message));
  if (!timer) timer = setInterval(() => refresh(input).catch((e) => console.error("[free-tokens]", e.message)), TTL);
  return {};
};
export default { id: "free-tokens", server: FreeTokens };

if (import.meta.main) { refresh({}).then((p) => { if (!p) process.exit(1); console.log(JSON.stringify({ today: p.meta.todayClaimable, total: p.meta.totalDeals, icons: Object.keys(p.icons || {}).length, stale: p.meta.stale }, null, 2)); process.exit(0); }).catch((e) => { console.error(e); process.exit(1); }); }
