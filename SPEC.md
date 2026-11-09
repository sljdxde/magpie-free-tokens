# AIHOT Token 羊毛 · magpie 页面插件 — 可实施规格（SPEC）

* 版本：v0.1（原型 + 规格）
* 日期：2026-11-09
* 状态：设计已锁定，原型（假数据）已交付；生产数据通道与合规待真机/授权确认
* 交付物：本规格 + `page/`（可在 magpie 加载的 page 插件骨架，假数据）+ `preview-light.png` / `preview-dark.png`

***

## 1. 目标与范围

**目标**：做一个 magpie 侧栏 **页面插件**「Token 羊毛」，把 AIHOT 的 Token 羊毛以**卡片册**形式展示，并做到：

1. 拿到 AIHOT 羊毛信息（数据源见 §2；官方 MCP 不含羊毛，见下）；
2. 按用户视角把每条羊毛分成三档：**已配置可用** / **有插件待配置** / **暂无插件**（已配置者再标今日是否已领）；
3. 「有插件待配置」给出该装哪个插件 / 去登录；「暂无插件」明确提示；
4. 展示沿用 aihot 羊毛页的信息结构，视觉严格遵循 magpie 原生 UI（亮/暗色 token）。

**受众 / 分发**：发布到 magpie 社区（免费、非商用）。→ 触发 AIHOT 合规约束（§10）。

**非目标（首版不做）**：自动替用户签到/领取；Agent MCP 工具与用量面板；移动端原生；AIHOT 模型榜 / API 价格对比。

***

## 2. 关键调研结论（已核实的事实）

| 维度                   | 结论                                                                                                                                                                                                                             | 证据                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| 官方 MCP / API 是否有"羊毛" | **没有**。AIHOT 官方 v2.0 `/api/v1` + MCP（10 个工具：latest/search/hot/story/daily/weekly/monthly/codex-resets/antigravity-resets/claude-resets）+ Skill + RSS，只覆盖资讯与额度重置监控。                                                             | `openapi-v1.json`、`llms.txt`、`/api/v1/agent`                                                      |
| 羊毛数据从哪来              | 羊毛页是 React Router 应用，其 loader 数据在 **`GET https://aihot.news/free-tokens.data`** 直接返回结构化 JSON（\~47 KB，`deals`/`ended`/`basis`）。取数用**诚实自定义 UA**（伪装 Chrome 反而违反条款；空/`curl`/`python-requests` 等会被 403，而缓存命中时任何 UA 都 200——极易误判）。**无 ETag/Last-Modified，条件请求无效**。非官方、未文档化，随时可能变。                                                              | 实测 200 + 解码成功                                                                                     |
| 本机 magpie 状态是否可读     | 可读。`~/.config/magpie/`（`$XDG_CONFIG_HOME/magpie`）下：`plugins.json`（已装 spec）、`plugin-providers.json`（每 provider 的 `id/name/signedIn/checkin/accounts/models`）、`plugin-checkin.json`（每账号签到 `outcome: claimed/done/inactive/...`）。 | 本机实查，16 个 provider                                                                                |
| 社区是否已有羊毛聚合插件         | 无。registry 97 条无"羊毛聚合"插件；但有大量带每日签到的 provider 插件（zcode/minimax/qoder/trae/codearts/loomy/kiro/sensenova/inkstone/autoclaw/astudio/codar…）。                                                                                      | `registry.json`                                                                                   |
| 页面插件如何拿动态数据          | 纯 page 插件不启动 Bun、不能联网/读文件；须加 `main` 才有 Bun 侧。推荐 Bun 定时 fetch+读配置→原子写 `page/data.js`，页面用同目录 `<script src="data.js?t=">` 热刷新（`script-src <own>` 放行）；`quota-keepalive@0.1.15` 已实装。本地 127.0.0.1 服务（`page-chat`）为备选。                | `internal/gui/pluginpage.go`、`pageservice.go`、`docs/subsystems/plugin-runtime.md`、`pagebridge.js` |

> ⚠️ 结论重申：需求 1 里"官方 MCP 能不能调"——**能调资讯与重置监控，调不到羊毛**。羊毛必须走 `free-tokens.data`（或页面抓取）这条非官方路径。

***

## 3. 需求 → 设计映射

| 需求                 | 设计落点                                                                                     |
| ------------------ | ---------------------------------------------------------------------------------------- |
| 1 获取羊毛信息           | Bun 侧 `GET free-tokens.data`（UA + ETag）→ turbo-stream 解码 → Deal[] + basis；内置一份快照兜底       |
| 2 已装/已领三态          | Bun 侧读 `plugins.json` / `plugin-providers.json` / `plugin-checkin.json`，与「羊毛→插件映射」比对，算三态 |
| 3 该装哪个 / 暂无插件      | 内置人工映射表（provider → npm 包 / provider id / 是否 checkin）+ 自动兜底；无映射 → "暂无插件"                  |
| 4 卡片风格 + magpie UI | magpie page（bridge `--magpie-*` token，亮/暗）；信息结构沿用 aihot 羊毛页（折算/门槛/截止/核实）                 |

***

## 4. 数据模型：Deal 字段（来自真实 `free-tokens.data`）

顶层：`{ deals: Deal[45], ended: Deal[], basis: {mix, ratio, usdCny}, serverNow, expiresAt }`

| 字段                                                       | 类型                  | 含义                                                                      |
| -------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------- |
| `id`                                                     | string              | 唯一 id，如 `minimax-daily-400`                                             |
| `kind`                                                   | enum                | `daily` \| `monthly` \| `once` \| `limited` \| `free`（当日分布：10/8/20/5/2） |
| `title`                                                  | string              | 标题                                                                      |
| `provider`                                               | string              | 厂商名（映射键），如「阿里云 Qoder」「字节 TRAE」                                          |
| `detail`                                                 | string              | 详细说明                                                                    |
| `url`                                                    | string              | 来源/官方链接                                                                 |
| `tags`                                                   | string[]            | 标签，如「下载客户端」「仅个人账号」                                                      |
| `endsAt`                                                 | ISO\|null           | 截止时间（北京时间口径）                                                            |
| `validity`                                               | string              | 有效口径，如「领取后 7 天」                                                         |
| `verifiedAt`                                             | ISO                 | 核实时间                                                                    |
| `yuan`                                                   | number\|null        | **折算人民币价值**；日常额度多为 null（"未有适用售价，不折钱"）                                   |
| `label` / `face`                                         | string              | 额度文案，如「400 积分」                                                          |
| `counted`                                                | bool                | 是否计入汇总（43/45）                                                           |
| `appliesTo` / `note`                                     | string              | 适用范围 / 备注                                                               |
| `clientOnly` / `studentOnly` / `realName` / `autoRenews` | bool                | 门槛标记                                                                    |
| `icon`                                                   | string\|null        | 图标（经 `/api/img-proxy`，页面沙盒取不到，见 §12）                                    |
| `models`                                                 | {slug,name,score}[] | 关联模型（部分）                                                                |

**解码**：`free-tokens.data` 是 turbo-stream **v2「flatten」** 格式（JSON 数组、下标即引用 id；对象写成 `{"_<keyId>": <valueId>}`，负数内联常量如 -5=null）。⚠️ 不要用 `turbo-stream@3`——它只实现 v3、会**静默返回原始扁平数组**（不报错，最危险）；React Router 的 `unflatten` 未导出。**推荐 ~90 行零依赖解码器**（见 research/aihot-data-spec.md §2.2），或 `turbo-stream@2.4.1`。**结构陷阱**：`root.root` 与 `root["free-tokens"]` 是**两个同级 key**，deals 在 `root["free-tokens"].data.deals`。字段集恒为 25 个（可做校验）。

**折算（已验证）**：`todayTotal = round(Σ deal.yuan where counted===true && yuan!=null)`，实测 200.969 → **¥201**，与站点「今天还能领」完全一致。**必须同时过滤 `counted` 与 `yuan!=null`**；只滤 `yuan` 会得 ¥567（把未计入的学生/大额算进来）。`basis.usdCny=6.6713` 是活汇率、不可硬编码；`ratio="7 : 2 : 1"` 为 缓存命中:输入:输出。`endsAt`/`verifiedAt` 为 UTC（`T16:00:00Z`=北京时间次日 00:00），UI 须按 Asia/Shanghai 渲染；`endsAt=null` 时显示 `validity`。`icon` 是签名代理链接勿改写，且页面沙盒取不到，用厂商首字头像。

***

## 5. 分档模型（用户视角三档，含子态）

对每条 Deal 判一档：
1. `mapping[provider]` 无 → **暂无插件**（`none`）：还没有 magpie 插件，插件领不了。
2. 有映射但本机 `plugin-providers.json` 里无该 provider（未安装）→ **有插件待配置**（`setup`，CTA「安装插件」，复制 `magpie plugin add <npm>`）。
3. 已装但 `signedIn=false` → **有插件待配置**（`setup`，CTA「去登录」）。
4. 已装且已登录 → **已配置可用**（`ready`）：可直接用；若 `kind==='daily'` 再给子态「今日已领」（checkin claimed/done）/「今日可领」（否则）。

补充：`plugin-providers.json` 的 `checkin:true|false` 是"插件是否支持签到"权威源；`settings.json` 的 `pluginCheckins` 反映"用户实际开启了自动签到"（更窄）；`plugin-checkin.json` 的 key 含脱敏占位符，勿当账号 id 展示。
**展示**：顶部三档计数（可点选切换）+ 搜索 + 所选档的**紧凑行列表**；默认选「已配置可用」，一次只看一档，**不再平铺 45 张大卡**。

---

## 6. 羊毛 → 插件 映射（已验证 45/45，22 有插件 / 23 无）

统计：45 条 deal，**22 条有对应社区插件、23 条无插件（提示「暂无插件」）**；其中已装且已登录 13、已装未登录 1（Qoder 国际版）、未装 8、支持每日签到 15。（豆包「工作」通道与「免费用豆包」签到额度仅部分吻合，严格产品口径则为 20/25，需与用户确认。）完整逐条表见 `research/offer-plugin-mapping.md`。

内置映射（13 个有插件的 provider；`pid` 可为一串）：

| provider | npm 包 | providerId | checkin |
|---|---|---|---|
| 豆包 | @magpie-community/opencode-doubao-work-auth | doubao-work | 否 |
| Cloudflare | @magpie-community/opencode-cloudflare-workers-ai-auth | cloudflare-workers-ai | 否 |
| MiniMax | @magpie-community/opencode-minimax-auth | minimax-code | 是 |
| 阿里云 Qoder | @magpie-community/opencode-qoder-auth | qoder / qoder-cn | 是 |
| 字节 TRAE | @magpie-community/opencode-trae-auth | trae-cn | 是 |
| 腾讯 WorkBuddy | @magpie-community/opencode-workbuddy-auth | workbuddy | 是 |
| 书生·端砚 | @magpie-community/opencode-inkstone-auth | intern-inkstone | 是 |
| Zed | @magpie-community/opencode-zed-auth | zed | 否 |
| 华为云码道 | @magpie-community/opencode-codearts-auth | codearts | 是 |
| 智谱 AutoClaw | @magpie-community/opencode-autoclaw-auth | autoclaw-cn | 是 |
| 智谱 ZCode | @magpie-community/opencode-zcode-auth | zcode | 是 |
| 商汤日日新 | @magpie-community/opencode-sensenova-auth | sensenova-token-plan | 否 |
| OpenCode | @magpie-community/opencode-zen-free-auth | opencode-zen-free | 否 |

- **Qoder 一个品牌两个 id**：`docs.qoder.com` → `qoder`（国际版），`docs.qoder.cn` → `qoder-cn`（国内版）；运行时按 deal 域名分流。
- **自动兜底**：provider 归一化 + registry `name/providers` 关键词匹配，命中用其 `package`；仍无 → 暂无插件。
- **可维护**：映射随社区插件更新；`magpie.options` 允许用户追加覆盖。

---

## 7. 生产架构与数据流

**结论（源码验证）**：纯 `page` 插件（只有 `magpie.page`）是 `InMagpieOnly`，**不启动 Bun 宿主**，既不能 fetch 也读不到本机文件。要 fetch `free-tokens.data` 并读 `~/.config/magpie`，**必须给插件加 `main`（或 `exports`）**；加了之后宿主会加载，打开页面 HTML 时 `pageHost` 会主动 warm 宿主（`internal/gui/pluginpage.go:352-356,277-309`）。

**推荐架构 (a)：Bun 写 `page/data.js` + 页面热注入脚本**（本机已装 `quota-keepalive@0.1.15` 已验证此模式）：

```
Bun 主模块 index.js（有 main → 宿主加载）
  ├─ 定时(5-10min) fetch free-tokens.data（诚实 UA, gzip/br）→ turbo-stream 解码
  ├─ 读配置目录：plugin-providers.json / plugin-checkin.json / plugins.json
  ├─ 映射表 → 计算三态 → 组装快照
  └─ 原子写 page/data.js： window.__FREE_TOKENS__ = { deals:[...], meta:{...} }

页面 page/index.html + app.js（沙盒）
  └─ 每 5 秒注入 <script src="data.js?t=…">（同目录脚本，script-src <own> 放行）
     重新执行即覆盖 window.__FREE_TOKENS__ 并重绘；不重载 iframe
```

* **CSP 依据**：页面策略 `script-src <own>` 允许同目录 `data.js`（`internal/gui/pluginpage.go:227-249`）；这正是 `quota-keepalive` 源码注释所说的做法（`ui/app.js:1616-1618`）。
* **无需 page→Bun 触发**：本项目只展示、不代领，由 Bun 自己定时刷新即可，**避开** `options.set` 触发整个宿主 Restart 的昂贵通道（`page.go:350-381`）。
* **备选 (b) 本地 127.0.0.1 服务**（page-chat 模式）：可行，但 CSP 更绕（桌面直连须显式写 `connect-src http://127.0.0.1:<port>`，web 经 `serviceSelf` 改写），首版只读不需要，过度设计。
* **备选 (c) 外部进程写 data.js**：可行但不自包含，社区分发不友好，不采用。

**生产 `package.json`（关键字段）**：

```json
{
  "name": "magpie-free-tokens",
  "type": "module",
  "main": "./index.js",
  "files": ["index.js", "src/", "page/", "!page/data.js", "README.md"],
  "magpie": {
    "name": "Token 羊毛",
    "page": { "title": "Token 羊毛", "file": "page/index.html", "icon": "page/icon.svg" }
  }
}
```

> `main` 是新增关键：没有它 Bun 侧不跑、`data.js` 永远不生成。`files` 排除运行时生成的 `page/data.js`。

**Bun 主模块骨架（index.js）**：

```js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const DATA_PATH = fileURLToPath(new URL("./page/data.js", import.meta.url));
const TTL = 5 * 60e3;

async function fetchDeals() {
  const r = await fetch("https://aihot.news/free-tokens.data", {
    headers: { "User-Agent": "magpie-free-tokens/0.1 (+local-desktop-plugin)", "Accept": "text/plain", "Accept-Encoding": "gzip, br" },
  });
  return decodeTurboStream(await r.text()); // 见 §4
}
function scanLocal(cfg) { const rd = (f) => { try { return JSON.parse(fs.readFileSync(path.join(cfg, f), "utf8")); } catch { return null; } };
  return { providers: rd("plugin-providers.json") || [], checkin: rd("plugin-checkin.json") || {}, plugins: rd("plugins.json") || {} }; }

function writeAtomic(file, text) { const t = file + ".tmp"; fs.writeFileSync(t, text); fs.renameSync(t, file); }

export const FreeTokens = async ({ directory }) => {
  const cfg = directory; // magpie 配置目录（$XDG_CONFIG_HOME/magpie 或 ~/.config/magpie）
  async function refresh() {
    try {
      const snap = classify(await fetchDeals(), scanLocal(cfg), MAPPING); // §5 三态
      writeAtomic(DATA_PATH, "window.__FREE_TOKENS__=" + JSON.stringify(snap) + ";");
    } catch (e) { /* 保留上次 data.js，页面显示「可能过期」 */ }
  }
  refresh(); setInterval(refresh, TTL);
  return {}; // 无 provider/tool/middleware 钩子，仅提供 data.js
};
export default { id: "free-tokens", server: FreeTokens };
```

**页面侧**：`app.js` 优先读 `window.__FREE_TOKENS__`（生产）否则 `window.__MOCK__`（原型），并每 5 秒注入 `data.js?t=` 刷新。原型已把数据入口隔离，切换只改一行。

***

## 8. UI 规格（magpie 原生）

**设计原则**：组件/颜色/字体/圆角全部由 magpie 页面桥接注入的 **15 个 token** 驱动——`bg card fg fg-2 muted faint line accent accent-soft accent-fg green red amber font code`（`internal/gui/assets/pluginpages.js` 硬白名单）。magpie 自己的 `card-2 / pill / line-2 / shadow` 等**不会下发**，需要的柔和表面用 `color-mix(in oklab, …)` 从这 15 个推。

**Token（亮/暗，取自 `app.css`；magpie 内由桥接注入，脱离时同值兜底）**：

| token | 亮 | 暗 |
|---|---|---|
| bg | #f4f4f6 | #1a1a1e |
| card | #ffffff | #232327 |
| fg / fg-2 | #1c1c21 / #4a4a55 | #ededf1 / #b9b9c1 |
| muted / faint | #85858d / #a5a5ad | #8b8b94 / #56565f |
| line | #e3e3e8 | #333339 |
| accent / accent-soft / accent-fg | #4f46e5 / #eeedfd / #ffffff | #a5b4fc / #2b2c47 / #14142a |
| green / amber | #189a58 / #c07f16 | #46c07f / #e0a63a |

**关键"像 magpie"的纪律**：
- 卡片静止态**只有 1px `--line` 边框、无投影**；投影只在 hover（`0 4px 14px rgba(20,22,30,.07)`）。
- **数字从不用强调色**：金额/额度用 `--fg`，加 `font-variant-numeric: tabular-nums`。
- **主按钮 = `accent-soft` 底 + `accent` 字**，hover 才填实 `accent`（实心只留给弹层确认键）。
- **汇总条用 1px 缝**：外层 `background:var(--line)` + `gap:1px` + 每格 `background:var(--card)` + `border-radius:12px; overflow:hidden`，而非独立三张卡。
- 暗色**只认 `[data-theme="dark"]`**，不写 `prefers-color-scheme`（否则与 magpie 强制主题打架）。
- 字体：`--magpie-font` 是平台栈、不含用户自选字体——不要硬写字体名。

**字号/圆角阶梯**：正文 13；大数字 20/600/-.01em/tabular-nums；卡片名 13/600；meta 11；全大写小标签 11/600/.05em。圆角四档：6（控件）/ 7-8（字段）/ 10-12（卡片）/ 13·999（胶囊）。卡片网格 `minmax(262px,1fr)` + `gap:10px`。

**布局（紧凑三档）**：标题（+数据源）→ 一行概览（今天还能领 ¥ / 共 N 项 / 三档计数）→ 三档计数并选中（已配置可用 / 有插件待配置 / 暂无插件）→ 搜索 → 所选档的**紧凑行列表**（头像 · 厂商+类别 · 标题 · 子状态 · 价值 · 操作）→ 页脚署名。默认选「已配置可用」，一次只看一档。

**状态色**：已配置可用=`green`、有插件待配置=`accent`、暂无插件=`muted`；就绪档内「今日已领」`green`、「今日可领」`amber`。**动效纪律**：切档/搜索重绘不播入场动画。

**厂商图标**：优先用 **magpie 自带的品牌图标**（从 `internal/gui/assets/icons` 拷入 `page/brand/`，已覆盖 22 家，如 doubao-color.svg / minimax-color.svg / opencode.svg / qoder.svg …）；表外的厂商一律用**首字母/首字色块**兜底。图标随包内置、本地同源加载，不联网抓图，也不再用 AIHOT 的 favicon（此前 favicon 是 WebP 却存成 .png，WebKit 渲染异常——已弃用）。

**复制与登录引导（沙盒限制的应对）**：插件页 iframe 的 `navigator.clipboard` 常被拦，故「安装插件 / 去登录」都弹出**气泡**：含分步路径 + 一个 `readonly` 已全选的输入框（保证可 ⌘C/Ctrl+C 手动复制），并尝试自动复制。安装气泡给的是**可直接粘进「插件 → 发现」页最下方「已有想装的?」输入框的 npm 包名**（如 `@magpie-community/opencode-zed-auth`；该框接受 npm 包名 / `github:owner/repo` / 本机文件夹，不接受整条命令），并附终端命令 `magpie plugin add <社区短名>`（短名如 zed/qoder/minimax；豆包无短名用 `npm:<包>`）。登录给「插件→已安装→该行登录」路径 + `magpie plugin login <pid>`。

> 原型见 `page/`，截图 `preview-ready.jpg` / `preview-setup.jpg` / `preview-dark.jpg`（三档视图）。

**关于「安装插件」能否一键跳到安装界面（源码核实，重要限制）**：magpie 页面桥接只暴露 `theme / options.get / options.set / read`（`internal/gui/pluginpages.js` 的 `switch(method)`），**没有导航或执行安装的 API**；页面沙盒 `sandbox allow-scripts` 也禁止 top-navigation / popup。`magpie://` 深链（`importlink.go`）只支持导入「供应商 base URL + key」，**不能安装 npm 插件包**。所以页面**无法**一键跳到插件安装界面并安装。

可行方案（已实现）：点「安装插件」→ **复制 `magpie plugin add <spec>`** 并提示「到 magpie → 插件 → 发现 添加，或终端运行」。

要真正一键，需上游加桥接能力（如 `magpie.open({view:'plugins', search:spec})`，或 `magpie://plugin?spec=…`，或「发现」页支持 `?add=<spec>` 深链）——可作为 feature request 提交。

---

## 9. 包结构与文件清单

```
magpie-free-tokens/
├─ package.json          # main + magpie.page{title,file,icon}
├─ index.js              # (生产) Bun 主模块：定时 fetch+解码+读配置 → 写 page/data.js
├─ src/
│  ├─ aihot.js           # free-tokens.data 客户端 + turbo-stream 解码 + 结构守卫
│  ├─ inventory.js       # 读 plugin-providers / plugin-checkin / plugins（同 quota-keepalive）
│  ├─ classify.js        # 三态 + 映射（§5 / §6）
│  ├─ mapping.json       # 羊毛→插件（首版 12 条 + 自动兜底）
│  └─ snapshot.js        # 组装快照 + writeAtomic
├─ page/
│  ├─ index.html         # 页面骨架
│  ├─ app.js             # 渲染 + 三态 + 筛选 + 倒计时（读 __FREE_TOKENS__ / __MOCK__）
│  ├─ style.css          # magpie token + 亮/暗
│  ├─ mock-data.js       # 原型：真实 45 条快照 + 映射 + demo 状态
│  ├─ icon.svg
│  └─ data.js            # 运行时生成（git 忽略，不进 npm 包）
└─ README.md
```

* 命名：社区发布 `@magpie-community/page-free-tokens`（`package.json` 有 `magpie.page.file`，打 `magpie-plugin` topic）。
* 市场条目：`{ "package": "@magpie-community/page-free-tokens", "kind": "page", "name": "Token 羊毛", "summary": {…} }`，PR 到 `magpie-community/plugins`。

***

## 10. 合规（AIHOT）

**结论：免费、无广告、无赞助的社区插件允许，无需书面授权。** 依据条款 v1.1 §3「个人…制作不收费、不带广告和赞助、不面向客户交付的小工具、Agent 与非商业自动化」+「合理私有缓存」；关键是**每台机器直连 AIHOT**，不是作者自建中转供数。

- **一旦触发，须先发 `agent@virxact.com` 取得书面授权**：收费 / 接赞助 / 挂广告 / 面向客户或公众的商业产品 / 自建聚合 API / 公开镜像 / 把缓存做成可导出数据集。「标注数据来源」不能代替授权。
- **署名（建议，成本极低）**：页脚放可点击的「数据源：AIHOT · Token 羊毛（https://aihot.news/free-tokens）」；用「数据源 / 数据来自」，**禁用**「官方 / 合作 / 授权 / 认证 / 独家」；每条「去用」跳 `deal.url`（厂商原始链接）而非站内页；**不使用 AIHOT 的 Logo / 视觉素材**。
- **红线**：不自建镜像、不做历史数据库 / 可导出集、保留来源、60s 最小间隔、数据撤回要跟随、403 时改 UA 标识而非换 IP / 代理池。

---

## 11. 刷新 / 缓存 / 礼貌

- UA 用**诚实自定义串**（如 `magpie-free-tokens/0.1 (+local-desktop-plugin)`），不伪装浏览器。
- 该端点**无 ETag / Last-Modified**，条件请求无效；只能靠本地 TTL 降频（每次约 47KB）。
- 刷新间隔 **5-10 分钟**（用户打开页面时拉一次）；`max-age=59` 视为最小间隔。
- 开 `Accept-Encoding: gzip, br` 省 4-8 倍流量；429/503 读 `Retry-After` 指数退避。
- 首次失败 / 结构变更：保留上次快照（内置 `data/snapshot.json` / 上次 `data.js`）并提示「数据源暂不可用 · 可能过期」，**不清空 UI**；加字段集校验（应恒为 25）。

---

## 12. 风险与开放问题

| 风险                                        | 影响          | 缓解                                      |
| ----------------------------------------- | ----------- | --------------------------------------- |
| `free-tokens.data` 非官方、turbo-stream 格式可能变 | 数据取不到       | 结构守卫 + 内置快照 + 错误态；退路：解析 HTML 或仅跳转       |
| 漏加 `main` → `data.js` 永不生成                | 页面永远空       | 生产 `package.json` 必须有 main；README/CI 校验 |
| 宿主未起来 / 首帧无 `data.js`                     | 首屏「数据准备中」   | 页面容错态；Bun 首轮即写盘                         |
| 若改用 (b) 服务：WebKit 桌面须显式 `connect-src`     | 取数被拒        | 首版用 (a) data.js，规避                      |
| 映射准确性与维护                                  | 误判"暂无插件/已装" | 人工表 + 兜底 + options 覆盖 + 定期随 registry 更新 |
| 签到语义因插件而异（claimed/done/inactive）          | 三态误判        | 只把 `claimed/done` 算已领；其余按"已装未领"         |
| 图标 `icon` 经 aihot 代理、沙盒取不到                | 图标缺失        | 用厂商首字头像（已实现）                            |
| AIHOT 授权                                  | 上架受阻        | §10 主动联系取得确认                            |

## 13. 实施计划

* **P0（已完成）**：page 骨架 + 假数据卡片册 + 亮/暗原型（截图）。
* **P1**：`index.mjs` 本地服务 + turbo-stream 解码 + 本机扫描 + 三态接口；`app.js` 切到 fetch。
* **P2**：完善 `data/mapping.json`（45 条尽量覆盖）+ `snapshot.json` 兜底。
* **P3**：UI 打磨（图标、空/载入态、磁贴密度、i18n 预留）。
* **P4**：真机验证（macOS magpie app + `magpie web`），跑 `magpie plugin add ./`。
* **P5**：`magpie plugin add` 自测 → 打 `magpie-plugin` topic / 提 registry PR → 联系 AIHOT 授权。

## 14. 验收标准

1. `magpie plugin add <path>` 后，侧栏出现「Token 羊毛」页，亮/暗均正常。
2. 45 条羊毛卡片正确渲染；四态（已领/已装未领/待安装/暂无插件）判定与本机实际一致。
3. 汇总条、类别/状态筛选、搜索、倒计时、卡片展开均可用。
4. 断网 / `.data` 变更时用快照兜底并提示，不白屏。
5. 页脚有"数据源：AIHOT"署名与外链。
6. 仅读非机密数据；不索取任何密钥。

***

## 附录：原型如何预览/加载

* **独立预览**：直接开 `page/index.html`（`_magpie/bridge.js` 404 时 app.js 自动用本地兜底与系统主题）。
* **加载进 magpie**：`magpie plugin add /Users/yuzhou/004个人代码仓库/free-token-monitor`（本原型为 page-only + 假数据，不联网、不起宿主）。
* **数据**：`page/mock-data.js` 为真实 aihot 快照（2026-11-09）+ demo 本机状态（取自真实 `~/.config/magpie`）。
