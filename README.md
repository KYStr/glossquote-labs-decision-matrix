# 權重決策矩陣

GlossQuote-Labs。原生瀏覽器工具，繁體中文與英文。本機實作已完成，來源公開與正式網站狀態另見 docs/RELEASE-CANDIDATE.md。

給需要比較數個方案的人：列出評估準則與權重，填寫 1–5 分，查看可解釋的加權分數與排序。MVP 讓人整理自己的判斷，沒有 AI 自動推薦，也不替人作決定。

每份比較限 2–8 個方案、1–8 項準則；明確區分效益型「越高越好」和成本型「越低越好」。可自願下載本機 JSON 草稿，之後自行選檔匯入；不自動儲存、不上傳。

原生 HTML/CSS/瀏覽器 ESM，沒有 runtime 或 development 套件。Node.js 24+ 僅開發與 node:test。實測 Windows 上 Chromium155；其他平台、讀屏與200%真頁面縮放列人工 NOT_RUN，未宣稱通過。

## 本機使用 / Local development

在本目錄執行（Windows 使用 npm.cmd），不需 npm install：

```text
npm.cmd test
npm.cmd run check
npm.cmd run build
npm.cmd run dev
```

預覽 http://127.0.0.1:4188/index.html 與 http://127.0.0.1:4188/en/index.html。伺服器只供 public；`node scripts/serve.mjs --dist` 可驗收 dist。用 Ctrl+C 停止自己的預覽。埠占用可 `--port=0` 自動選空閒 loopback 埠；不要結束其他人的程序。

預設 build 是 noindex preview，robots 禁索引，不含 canonical/sitemap。正式候選：

```text
npm.cmd run build -- --production --origin=https://decide.glossquote.com
```

正式模式只接受這個候選origin，產生兩語 canonical/hreflang/x-default/sitemap/robots；404仍noindex。這個命令沒有部署。wrangler.jsonc 是靜態資產候選，無worker後端、帳戶id、route、secret或telemetry；`html_handling:none` 保留 index.html URL，`404-page`不使用SPA fallback。正式部署/自訂網域/首頁目錄由原主對話驗收整合。

## 行為與限制 / Behavior and limits

Benefits use score−1, costs use 5−score. Total percentage = 25×Σ(weight×utility)/Σweight. Integer numerators determine ties and ranks (1,1,3); active missing cells hide the whole ranking. Zero weights do not contribute. Drafts are memory-only, with voluntary UTF-8 JSON import/export capped at 64 KiB. No accounts, uploads, remote fonts, tracking, storage or dependencies. Switching language starts another page; download first to retain your draft.

Each JSON object has exact keys, bounded labels/integers/references. Duplicate keys (including escapes), invalid UTF-8, unknown versions and excess depth are rejected. Download uses a single revoked Blob URL and a fixed filename. Files are processed on your device; refreshing resets the comparison. See PRODUCT/TECHNICAL for the exact schema and docs/VERIFICATION.md for test evidence.

不含外部資料、協作、雲端、帳號、分享連結、CSV/Excel、圖片報表、最佳化求解或 AI。規格見 [產品](PRODUCT.md)、[技術](TECHNICAL.md)、[安全](docs/PRIVACY-SECURITY.md)、[工程](docs/ENGINEERING.md)；實際結果見 [驗收](ACCEPTANCE.md)、[核對研究](docs/RESEARCH.md)、[驗收紀錄](docs/VERIFICATION.md)、[發布候選](docs/RELEASE-CANDIDATE.md)。原始藍圖的「尚未實作」與舊預覽埠不代表現況；以本 README、發布候選與實際程式為準。資料夾與獨立來源不依賴其他工具。
