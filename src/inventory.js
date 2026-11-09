import fs from "node:fs";
import path from "node:path";
import os from "node:os";
// 找到 magpie 配置目录（优先插件 input.directory，其次 $XDG_CONFIG_HOME/magpie、~/.config/magpie）
export function configDir(input) {
  const cand = [];
  if (input && input.directory) cand.push(input.directory);
  if (process.env.XDG_CONFIG_HOME) cand.push(path.join(process.env.XDG_CONFIG_HOME, "magpie"));
  cand.push(path.join(os.homedir(), ".config", "magpie"));
  for (const d of cand) { try { if (fs.existsSync(path.join(d, "plugin-providers.json"))) return d; } catch {} }
  return cand[0];
}
export function readLocal(dir) {
  const rd = (f) => { try { return JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); } catch { return null; } };
  return { providers: rd("plugin-providers.json") || [], checkin: rd("plugin-checkin.json") || {}, plugins: rd("plugins.json") || {} };
}
