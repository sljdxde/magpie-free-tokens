// magpie-free-tokens host part: 只在页面被打开（宿主启动）时拉一次 AIHOT 数据、读本机 magpie、写 page/data.js。
// 不做后台轮询（用户没打开页面就不联网）；失败不发送任何 AIHOT 数据（不随包分发快照）。
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { fetchFreeTokens } from "./src/aihot.js";
import { configDir, readLocal } from "./src/inventory.js";
import { buildPayload } from "./src/classify.js";

const PAGE_DATA = fileURLToPath(new URL("./page/data.js", import.meta.url));

function writeAtomic(file, text) { const t = file + ".tmp"; fs.writeFileSync(t, text); fs.renameSync(t, file); }

const refresh = async (input) => {
  const dir = configDir(input);
  const local = readLocal(dir);
  let payload;
  try {
    payload = buildPayload(await fetchFreeTokens(), local);
  } catch (e) {
    // 拉取失败：不发任何数据，页面显示「暂不可用」
    writeAtomic(PAGE_DATA, "window.__FREE_TOKENS__ = { error: true, meta: { generatedAt: " + JSON.stringify(new Date().toISOString()) + " } };\n");
    console.error("[free-tokens] fetch failed:", e.message);
    return null;
  }
  writeAtomic(PAGE_DATA, "window.__FREE_TOKENS__ = " + JSON.stringify(payload) + ";\n");
  console.error(`[free-tokens] data.js: ${payload.deals.length} deals · ${Object.keys(payload.demoState.installed).length} providers${payload.demoState.configKnown ? "" : " · config unknown"}`);
  return payload;
};

const server = async (input) => {
  await refresh(input); // 每次页面打开（宿主启动）刷新一次
  return {};
};
export default { id: "free-tokens", server };

if (import.meta.main) { refresh({}).then((p) => { console.log(JSON.stringify({ published: !!p, deals: p ? p.meta.totalDeals : 0, icons: p ? Object.keys(p.icons).length : 0 })); process.exit(0); }).catch((e) => { console.error(e); process.exit(1); }); }
