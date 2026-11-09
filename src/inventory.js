import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// magpie 配置目录：MAGPIE_CONFIG_DIR / input.directory(仅当其确含 plugin-providers.json) /
// $XDG_CONFIG_HOME/magpie / ~/.config/magpie。绝不回落到宿主工作目录。
export function configDir(input) {
  const cand = [];
  if (process.env.MAGPIE_CONFIG_DIR) cand.push(process.env.MAGPIE_CONFIG_DIR);
  if (input && input.directory) cand.push(input.directory);
  if (process.env.XDG_CONFIG_HOME) cand.push(path.join(process.env.XDG_CONFIG_HOME, "magpie"));
  cand.push(path.join(os.homedir(), ".config", "magpie"));
  for (const d of cand) { try { if (fs.existsSync(path.join(d, "plugin-providers.json"))) return d; } catch {} }
  // 都不含：返回标准配置目录（不是宿主工作目录）
  return process.env.XDG_CONFIG_HOME ? path.join(process.env.XDG_CONFIG_HOME, "magpie") : path.join(os.homedir(), ".config", "magpie");
}

// 读本机状态：文件缺失 = 空（fresh）；存在但解析失败 = null（未知，不做签到判断）。
export function readLocal(dir) {
  const read = (f) => {
    try { return { ok: true, val: JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) }; }
    catch (e) { return { ok: false, missing: e && e.code === "ENOENT" }; }
  };
  const pv = read("plugin-providers.json");
  const ck = read("plugin-checkin.json");
  const providers = pv.ok ? (Array.isArray(pv.val) ? pv.val : []) : (pv.missing ? [] : null);
  const checkin = ck.ok ? (ck.val && typeof ck.val === "object" && !Array.isArray(ck.val) ? ck.val : {}) : (ck.missing ? {} : null);
  return { providers, checkin, dir };
}
