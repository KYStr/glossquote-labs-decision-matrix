# 權重決策矩陣驗收

日期：2026-10-10；Windows，Node24.14.0/npm11.9.0。自動、真正瀏覽器與人工 NOT_RUN 分開記錄。所有測資合成，未讀憑證或私人檔案。命令在此工具目錄執行。

## 設計 brief

Product App。使用者要核對數個方案的主觀取捨；核心物件是可編輯二維矩陣，成功狀態是完整有效資料下可核對每個分子的排行。低風險本機工作；清空、已評分項目移除、取代檔案有明示確認。無登入/權限狀態，能力缺失只影響 IO。

同語首頁、語言、開啟/下載常見操作永遠可見；方向/權重/移除就近；計算明細一層 disclosure。採家族 paper #f3f0e8、ink #111410、white #fff、acid #c8f56a、muted #55594f/control #60645c。系統 Segoe UI 字型，數值才用 mono；不下載字型。平面分隔、二維工作表是唯一可水平捲區域，不用假數據裝飾。

```text
桌面：品牌/語言 → H1/本機資料提示 → 標題/檔案操作
       準則欄（名稱/方向/權重/比例/移除）
       方案×準則矩陣 → 缺值狀態/排序/展開明細 → 公式/FAQ
手機：相同順序；準則欄垂直重排；矩陣區內左右捲；結果堆疊
```

T00–T02 的命令與復測紀錄見 HANDOFF；T03-L10N `npm.cmd test` 20/20 exit0、check exit0。

## T03 實際瀏覽器

Chromium155/IAB：M18 文字 `<img src=x onerror=alert(1)>` 純文字、imgCount0；M21 清空/保留/Esc/確認重設 PASS，取消焦點回 clear-all，確認焦點 comparison-title；M24 鍵盤 Enter 新增行後 focus=option-o3，原生select End評分，移除有分數項目局部確認預設保留、Esc可取消；評分 accessible name 含方案/準則/方向 PASS（讀屏朗讀人工 NOT_RUN）。M25 320px 的8×8／40字名稱：page clientWidth=scrollWidth=305（扣15 scrollbar）、matrix client271/scroll1920、64select，僅矩陣內水平捲 PASS。200%真頁面縮放：IAB Ctrl+plus 五次前後CSS viewport仍1265，能力沒有生效，人工 NOT_RUN；沒有把viewport重排冒充zoom。暫時viewport已還原。桌面 screenshot、40%較長英文文案、visible focus/44px tokens/reduced-motion 規則審查 PASS；真手機觸控/Firefox未測。

UI複核修正同語頁 title error的id對應、名稱改動後remove accessible name同步。修復後真浏览器確認空title就地錯誤、順位清空；未放寬邏輯gate。

## T04 實際檔案與競態

`npm.cmd test` exit0 25/25；check exit0。M19 自動 latest A/B reversed completion、cancel後rejection、size前後閘門 PASS。真正 chooser isMultiple=false、選專用 baseline-synthetic.json→review；背景 `:modal`=true，草稿仍原草稿保留標記。Esc取消焦點回open-file、草稿保留；invalid-synthetic.json→INVALID_JSON、中性錯誤、草稿不變；重選同檔→确认一次性取代 PASS（M19/20/24 dialog）。下載固定glossquote-decision-matrix.json，瀏覽器回傳新建立的合成下載路徑；只讀這個精確檔案做 strict roundtrip exit0，無掃描Download資料夾。證據 ../../.runs/decision-matrix/download-roundtrip-20261010.json。介面只說交給瀏覽器，未聲稱OS保存保證。

M22 注入URL/timer，10次最多1liveURL/1timer、60秒延後revoke、clear/pagehide同clear、trigger失敗清理與原稿不變 PASS。M27 真瀏覽器：兩者並列66.67；25×8÷3，A貢獻66.67/0.00、B33.33/33.33及rounding說明；改A未評分→尚缺1格且舊分數/排名/明細全部移除，改回5恢復 PASS。截圖 ../../.runs/decision-matrix/matrix-zh-desktop-20261010.jpg。

## T05 邊界、隱私與降級

`npm.cmd test` exit0 30/30，check exit0。C0/C1/bidi 每個碼點於頭尾、raw長度閘門；兩方向score1..5/weight0,1,100；權重等比例縮放不改排名或分數；8×8最大W800/N3200與UTF8roundtrip；nested escaped duplicate keys、500層有界拒絕；20次快速取消後遲到結果不review PASS。

真正瀏覽器使用專用 ../../.runs/decision-matrix/browser-audit-server.mjs（5188）載入相同公開來源與CSP。在資產載入後按Begin清起點，合成標記、評分、chooser本機匯入、確認取代、Blob下載，再Report：Performance resource requestsAfterBegin=[]，localStorageKeys/sessionStorageKeys/databases/caches=[]，consoleCount0，query/hash空；證據 privacy-browser-20261010.json。這是實際資源觀察+無网络API/持久化原碼審查，沒有僅靠CSP推論。重新整理回4缺分 PASS（M23）。OS DevTools完整Network封包視圖及物理斷網人工NOT_RUN；工具本身connect-src none且無網路呼叫。

M26 fixture先移除File/Blob/TextDecoder，再載入真正app：兩IO disabled、中性說明，填4格仍兩100分 PASS。無JS fixture不載入任何script：workspace hidden、js-note/公式/FAQ可讀、無假結果 PASS。M24 dialog fallback 移除showModal：fieldset disabled=true、焦點預設cancel、Shift+Tab trap到confirm、Esc取消回clear-all PASS。真讀屏/Firefox/手機/200%zoom人工NOT_RUN，未改成PASS。

## T06 SEO／建置

preview來源始終noindex；build預設14資產含robots禁索引，無canonical/sitemap。`--production --origin=https://decide.glossquote.com` 生成15資產，兩語各自canonical、雙向zh-Hant/en/x-default、sitemap兩URL/六alternate、robots Allow+Sitemap；404維持noindex。build拒未知origin、檢查真根dist不為symlink/junction、以allowlist複製；無docs/test/.runs/工作JSON/憑證。所有JS/CSS/HTML本地引用、ESM語法、無依賴/危險DOM/網路/持久化API檢查有效。

首次gate FAIL是新版公開檔案allowlist未列i18n（文件名含數字）；追加精確js/i18n.mjs項目，不擴大資產類型。受影響scaffold/seo復測3/3 exit0，check及previewbuild exit0；production-candidate build exit0（15靜態資產）。之後安全headers補MIME與preview X-Robots時機，在T07最後gate再驗。

正式候選HTTP/瀏覽器EN實作（loopback4188的dist）：初始4缺分、英文benefit/cost、兩66.67並列 PASS；320px英文page client=scroll305，matrix271/scroll779 PASS，截圖 matrix-en-mobile-20261010.jpg。巢狀不存在路徑由HTTP回歸證實404而非首頁；IAB導航404被client阻擋，真404狀態導航人工NOT_RUN，另200方式預覽404 HTML可核對文案/連結。

Cloudflare設定僅候選，無正式部署/host驗收或帳戶/DNS改動。官方2026-10-10核對 [Static asset headers](https://developers.cloudflare.com/workers/static-assets/headers/)、[HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)、[custom404](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/)。html_handling:none保留/index.html，404-page回404；_headers安全策略與/js/* MIME已準備。沒有安裝Wrangler或執行平台dryrun，主對話整合時驗真host。workers-best-practices技能源版本1.0.2（catalog1.0.1舊路徑不存在，搜尋cache找到新版）；observability建議由本專案明確無telemetry規範覆蓋，設定disabled；無執行backend所以不需要nodejs_compat/binding types。

## 最終逐項覆蓋與人工例外

| 驗收 | 結果與證據 |
|---|---|
| M01–M08 | PASS，scoring.test，獨立手算與browser M27 |
| M09–M12/M15 | PASS，schema.test/boundaries.test，精確碼點/錯誤碼 |
| M13/M14/M16 | PASS，import.test：literal/escape重複鍵、byte65536/65537、fatalUTF8、depth、roundtrip/fault |
| M17 | PASS，matrix.test：2..8/1..8、immutable同步/命名/id再用 |
| M18 | PASS，真DOM純文字imgCount0，合法標籤可算分且schema可序列化；無執行圖片/HTML |
| M19/M20 | PASS，自動generation/真chooser/review取消與取代/壞檔保持草稿 |
| M21 | PASS，原生/局部兩選項、Esc/保留/確認、重設焦點；filled準則刪除再算100/50 |
| M22 | PASS，自動10次URL/timer單一live/clear/fault；真瀏覽器下載與strict roundtrip；OS保存不作保證 |
| M23 | PASS，真資源觀察/storage/URL/console/重整及source review；完整DevToolsNetwork與物理斷網人工NOT_RUN |
| M24 | PASS，鍵盤/全名select/native與fallbackdialog/焦點；實際讀屏朗讀人工NOT_RUN |
| M25 | PASS，320px雙語與8×8/40字；實際200%頁面zoom、物理手機touch人工NOT_RUN |
| M26 | PASS，實際缺File/Blob/TextDecoder和無JSfixture |
| M27 | PASS，真兩66.67與25×8÷3、分項及缺分即刻清空/恢復 |
| SEO/build/server | PASS，兩模式/非法origin、allowlist、MIME/security/GETHEAD405/穿越404；正式host未部署/未驗 |

最終全套31項：首次30PASS/1FAIL（scaffold新增no-extension巢狀404本文未回）；serve修復共用notFound，受影響scaffold2/2 exit0。其餘29未變沿用PASS，check再次exit0、build previewexit0。保留原FAIL和修復證據，不將NOT_RUN當PASS。源副本需要獨立重跑確認可獨立使用；其證據由T08追加。

環境full fingerprint before/after-build一致，無持續PATH/TEMP/TMP/registry更動。開始時其他工具/根GlossGate已未提交的改動未碰；本工具新程式與文檔是本次唯一產品寫入範圍。系統與他人工作不收尾/不清除。
