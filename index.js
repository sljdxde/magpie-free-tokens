// magpie-free-tokens host part：仅在页面打开（宿主启动）时拉一次 AIHOT、读本机 magpie、写 page/data.js。
// 不后台轮询、不随包分发任何 AIHOT 数据；失败只写错误标记，页面显示「暂不可用」。
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { fetchFreeTokens } from "./src/aihot.js";
import { configDir, readLocal } from "./src/inventory.js";
import { buildPayload } from "./src/classify.js";

function defaultDataPath() { return process.env.FREE_TOKENS_DATA_PATH || fileURLToPath(new URL("./page/data.js", import.meta.url)); }
function writeAtomic(file, text) { const t = file + ".tmp"; fs.writeFileSync(t, text); fs.renameSync(t, file); }

export async function refresh(input, opts = {}) {
  const dir = (opts.configDir || configDir)(input);
  const local = (opts.readLocal || readLocal)(dir);
  const getFt = opts.fetchFreeTokens || fetchFreeTokens;
  const path = opts.dataPath || defaultDataPath();
  let payload;
  try {
    payload = buildPayload(await getFt(), local);
  } catch (e) {
    writeAtomic(path, "window.__FREE_TOKENS__ = { error: true, meta: { generatedAt: " + JSON.stringify(new Date().toISOString()) + " } };\n");
    console.error("[free-tokens] fetch failed:", e.message);
    return null;
  }
  writeAtomic(path, "window.__FREE_TOKENS__ = " + JSON.stringify(payload) + ";\n");
  console.error(`[free-tokens] data.js: ${payload.deals.length} deals · ${Object.keys(payload.demoState.installed).length} providers${payload.demoState.configKnown ? "" : " · config unknown"}`);
  return payload;
}

const server = async (input) => { await refresh(input); return {}; };
export default { id: "free-tokens", server };
