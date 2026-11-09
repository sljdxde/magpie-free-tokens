// AIHOT 羊毛 → magpie 插件。cli = magpie 社区短名（magpie plugin add <cli> 用）；无短名则用 npm:<npm>。
export const MAPPING = {
  "豆包": { pid: "doubao-work", npm: "@magpie-community/opencode-doubao-work-auth", cli: null, name: "豆包工作", checkin: false },
  "Cloudflare": { pid: "cloudflare-workers-ai", npm: "@magpie-community/opencode-cloudflare-workers-ai-auth", cli: "cloudflare-workers-ai", name: "Cloudflare Workers AI", checkin: false },
  "MiniMax": { pid: "minimax-code", npm: "@magpie-community/opencode-minimax-auth", cli: "minimax", name: "MiniMax Code", checkin: true },
  "阿里云 Qoder": { pid: ["qoder", "qoder-cn"], npm: "@magpie-community/opencode-qoder-auth", cli: "qoder", name: "Qoder", checkin: true },
  "字节 TRAE": { pid: "trae-cn", npm: "@magpie-community/opencode-trae-auth", cli: "trae", name: "Trae", checkin: true },
  "腾讯 WorkBuddy": { pid: "workbuddy", npm: "@magpie-community/opencode-workbuddy-auth", cli: "workbuddy", name: "WorkBuddy", checkin: true },
  "书生·端砚": { pid: "intern-inkstone", npm: "@magpie-community/opencode-inkstone-auth", cli: "inkstone", name: "书生·端砚", checkin: true },
  "Zed": { pid: "zed", npm: "@magpie-community/opencode-zed-auth", cli: "zed", name: "Zed", checkin: false },
  "华为云码道": { pid: "codearts", npm: "@magpie-community/opencode-codearts-auth", cli: "codearts", name: "CodeArts", checkin: true },
  "智谱 AutoClaw": { pid: "autoclaw-cn", npm: "@magpie-community/opencode-autoclaw-auth", cli: "autoclaw", name: "AutoClaw", checkin: true },
  "智谱 ZCode": { pid: "zcode", npm: "@magpie-community/opencode-zcode-auth", cli: "zcode", name: "ZCode", checkin: true },
  "商汤日日新": { pid: "sensenova-token-plan", npm: "@magpie-community/opencode-sensenova-auth", cli: "sensenova", name: "SenseNova", checkin: false },
  "OpenCode": { pid: "opencode-zen-free", npm: "@magpie-community/opencode-zen-free-auth", cli: "zen-free", name: "OpenCode Zen Free", checkin: false },
};
