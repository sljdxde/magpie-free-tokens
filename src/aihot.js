import { decodeTurboStream } from "./turbo.js";
const URL = "https://aihot.news/free-tokens.data";
export async function fetchFreeTokens() {
  const res = await fetch(URL, {
    headers: {
      // 诚实 UA（伪装浏览器反而违反 AIHOT 条款）
      "User-Agent": "magpie-free-tokens/0.1 (+local-desktop-plugin)",
      "Accept": "text/plain",
      "Accept-Encoding": "gzip, br",
    },
  });
  if (!res.ok) throw new Error(`AIHOT ${res.status} ${res.statusText}`);
  return decodeTurboStream(await res.text());
}
