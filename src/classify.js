import { MAPPING } from "./mapping.js";
import { BRAND } from "./icons.js";

function todayBJ() { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" }); }
const RANK = { claimed: 4, done: 3, inactive: 2, failed: 1 };
function checkinFor(checkin, pid) {
  let best = "none";
  const today = todayBJ();
  for (const [k, v] of Object.entries(checkin || {})) {
    if (!(k === pid || k.startsWith(pid + "|"))) continue;
    if (!v) continue;
    if (v.day && v.day !== today) continue;
    const o = v.outcome;
    if (o && RANK[o] && RANK[o] > (RANK[best] || 0)) best = o;
  }
  return best;
}
function buildState(local) {
  const installed = {};
  for (const p of local.providers || []) {
    if (!p || !p.id) continue;
    installed[p.id] = { signedIn: !!p.signedIn, checkin: checkinFor(local.checkin, p.id), name: p.name || p.id };
  }
  return { installed };
}
function pick(x) {
  return { id: x.id, kind: x.kind, title: x.title, provider: x.provider, detail: x.detail, url: x.url, tags: x.tags || [], endsAt: x.endsAt || null, validity: x.validity, verifiedAt: x.verifiedAt, yuan: x.yuan == null ? null : x.yuan, label: x.label, face: x.face, counted: x.counted !== false };
}
function countKinds(ds) { const c = {}; for (const d of ds) c[d.kind] = (c[d.kind] || 0) + 1; return c; }

export function buildPayload(ftData, local) {
  const deals = (ftData.deals || []).map(pick);
  const priced = deals.filter((d) => d.yuan != null);
  const today = Math.round(deals.filter((d) => d.counted && d.yuan != null).reduce((s, d) => s + d.yuan, 0));
  const meta = {
    generatedAt: new Date().toISOString(), source: "aihot.news/free-tokens",
    todayClaimable: today, faceTotal: +priced.reduce((s, d) => s + d.yuan, 0).toFixed(2),
    pricedCount: priced.length, monthlyClaimed: 0, totalDeals: deals.length, kindCounts: countKinds(deals), basis: ftData.basis || null,
  };
  // 品牌图标（仅出现在 deals 里的厂商）
  const icons = {};
  for (const d of deals) { if (BRAND[d.provider] && !icons[d.provider]) icons[d.provider] = "brand/" + BRAND[d.provider]; }
  return { meta, deals, mapping: MAPPING, demoState: buildState(local), icons };
}
