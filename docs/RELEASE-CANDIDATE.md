# 權重決策矩陣 — 發布候選

日期 2026-10-10。狀態 **LOCAL_COMPLETE_SOURCE_PENDING**，待本對話完成獨立公開來源核驗後更新 READY_FOR_INTEGRATION。這是原主對話的整合候選，不是正式上線宣告。

- 工具：08-decision-matrix；繁中/index.html、英文/en/index.html。
- 候選網址：https://decide.glossquote.com/index.html、https://decide.glossquote.com/en/index.html。未部署、未操作DNS/帳戶/首頁/040141.xyz/GlossGate。
- 實作：2–8方案、1–8準則、benefit/cost、weight0..100、score1..5/null、整數N平手/competition rank、缺分或W0無假排行、逐項貢獻、memory-only、JSON schema1 exact validation、64KiB UTF8、generation取消/候選取代確認、單一Blob URL撤銷、keyboard與dialogfallback、靜態兩語公式/FAQ/同語首頁連結。
- 依賴/資產：無runtime/dev套件、無模型/遠端字型/外部圖片/telemetry。Node24.14.0/npm11.9.0開發；Chromium155真實驗收。

## 可重現檢查

```text
npm.cmd test
npm.cmd run check
npm.cmd run build
npm.cmd run build -- --production --origin=https://decide.glossquote.com
node scripts/serve.mjs --dist --port=4188
```

預設preview14靜態資產/noindex、robots Disallow；正式候選15靜態資產/兩canonical+雙向hreflang+x-default/sitemap兩URL、robotsAllow+Sitemap、安全headers/MIME。404仍noindex。只允許上述origin；dist受限定/拒symlink，不包含test/docs/工作檔/憑證；build不部署。正式產物應在主對話正式release之前由命令重建。

## 驗收與人工 NOT_RUN

31項offline必要邏輯/安全/SEO/server行為有PASS證據；最終一次全套30PASS/1FAIL（新增404內容case），修復後受影響scaffold2/2 PASS；其餘29未變沿用PASS。來源副本將再檢查獨立可用性。真正Chromium：評分/66.67並列與貢獻/缺分清舊結果、chooser/取消/壞檔/取代、Blob下載roundtrip、keyboard與focus、320px雙語/8×8/40字、resource/storage/URL/console、缺能力/noJS/dialogfallback PASS。詳情 docs/VERIFICATION.md及本機HANDOFF。

人工NOT_RUN：Firefox、物理手機touch、真正讀屏朗讀、200%真瀏覽器zoom（IAB shortcut沒有生效）、OS filepicker全鍵盤、完整DevToolsNetwork封包視圖與物理斷網、404狀態的IAB導航（client阻擋；HTTP回歸與404HTML直接預覽PASS）、Wrangler平台dryrun/真hostHTTPS/MIME/headers/SEO。使用者已允許保留人工例外，沒有把必要公式/算法gate移到NOT_RUN。

## 整合者下一步

1. 獨立審查公開來源commit、測試與manual例外。發布副本只含本工具allowlist；模型配置要求Sol/max，後端路由沒有独立host證據，未假稱確認。
2. 如通過，重建正式候選，以既有授權部署免費Cloudflare靜態資產到decide.glossquote.com。候選wrangler.jsonc無account/route/secret；原主對話處理憑證、網域與正式部署，驗兩語真host、404、MIME/headers/canonical/hreflang/sitemap/robots。
3. 驗證正式live後，原主對話在00-home新增/發布雙語catalog項目、發布首頁獨立來源並部署首頁，驗兩語catalog。此對話未改00-home。
4. Source-only公開不等於live；不可把本文件候選網址當成已上線證據。

來源目標：https://github.com/KYStr/glossquote-labs-decision-matrix；PUBLIC及remoteHEAD尚待T08核驗，完成後追加，不捏造成功。
