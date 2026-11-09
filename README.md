# Token 羊毛 · magpie 页面插件

在 [magpie](https://usemagpie.ai) 窗口里一眼看清：今天能免费领哪些大模型额度（数据源 [AIHOT · Token 羊毛](https://aihot.news/free-tokens)），以及你已经装了/还缺哪些 magpie 插件、哪些今天还没领。

> 状态：**生产取数已实现（P1）**。`bun index.js` 取真实 AIHOT 羊毛 + 读本机 `~/.config/magpie` → 写 `page/data.js`，页面每 5s 热刷新；`mock-data.js` 仅作离线兜底与独立预览。

## 能力

- **三档速览（紧凑）**：按「我能不能用」分三档——已配置可用 / 有插件待配置 / 暂无插件；一次只看一档的紧凑列表，不铺 45 张大卡。
- **三态判定**：未装插件 / 已装未领 / 已领；无对应插件时显示「暂无插件」。
- **该装哪个 / 怎么登录**：对待安装羊毛给对应社区插件与 `magpie plugin add` 命令（气泡内可手动复制）；未登录的给「插件→已安装→登录」路径与 `magpie plugin login <pid>`。
- **厂商图标**：用 magpie 自带品牌图标（page/brand/，22 家），其余用首字母/首字色块。
- **汇总**：今日可领项数、可折合面额、我已领、下次刷新倒计时；类别/状态筛选 + 搜索。

## 为什么不是官方 MCP

AIHOT 官方 API/MCP 只覆盖资讯与额度重置监控，**不含羊毛**。羊毛数据在 `https://aihot.news/free-tokens.data`（React Router loader 数据，需浏览器 UA）。详见 SPEC §2。

## 预览 / 加载（截图 preview-ready.jpg / preview-setup.jpg / preview-dark.jpg）

```bash
# 独立预览（浏览器直接打开）
open page/index.html

# 加载进 magpie（page-only + 假数据，不联网、不起宿主）
magpie plugin add "/Users/yuzhou/004个人代码仓库/free-token-monitor"
```

## 结构

```
package.json        # main(index.js) + magpie.page
index.js            # Bun 主模块：定时 fetch+解码+读本机 → 写 page/data.js
src/turbo.js        # free-tokens.data 零依赖解码器（turbo-stream v2 flatten）
src/aihot.js        # AIHOT 取数（诚实 UA / gzip）
src/inventory.js    # 读 ~/.config/magpie 的 plugins/providers/checkin
src/classify.js     # 三档判定 + meta（今天还能领 ¥）
src/mapping.js      # 羊毛→插件映射（13 provider）
data/snapshot.json  # 离线兜底快照
page/index.html     # 页面骨架（引 data.js 热刷新）
page/app.js         # 渲染 + 三档 + 搜索（读 __FREE_TOKENS__ / __MOCK__）
page/style.css      # magpie --magpie-* token + 亮/暗
page/data.js        # 运行时生成（gitignore，不入库）
page/mock-data.js   # 离线兜底/独立预览
SPEC.md             # 可实施规格
```

## 数据与合规

- 数据源：AIHOT（署名并链回原站）。插件在用户本机实时取数、仅展示、不收费、不再分发。
- 发布社区前需按 AIHOT 条款确认授权（见 SPEC §10）。

## 路线

P0 原型（本目录）→ P1 Bun 本地服务 + 真实取数 → P2 完整映射 → P3 打磨 → P4 真机验证 → P5 上架。

MIT License.
