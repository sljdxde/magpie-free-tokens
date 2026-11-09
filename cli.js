// 手动跑一次（bun cli.js）；不参与 magpie 运行时，也不在单测覆盖范围内。
import { refresh } from "./index.js";
refresh({}).then((p) => { console.log(JSON.stringify({ published: !!p, deals: p ? p.meta.totalDeals : 0, icons: p ? Object.keys(p.icons).length : 0 })); process.exit(0); }).catch((e) => { console.error(e); process.exit(1); });
