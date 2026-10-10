# T01 — 檔案能力與加權公式核對

日期 2026-10-10，Windows 10/11 host（UA Windows NT 10.0），Codex IAB Chromium 155.0.0.0。無套件、無模型、無雲端 API。來源為官方 File API / Encoding / ECMAScript living specification，查閱當日版本，未用浮動 CDN。

- [W3C File API](https://w3c.github.io/FileAPI/)：使用者選檔、Blob.arrayBuffer、Object URL/revoke；配對 create/revoke，不聲稱作業系統讀檔可立即中止。
- [WHATWG Encoding](https://encoding.spec.whatwg.org/#interface-textdecoder)：UTF-8 fatal 拒絕非法位元組，預設剝除單一前置 BOM；第二個 BOM 留在文字並使 JSON 語法拒絕。
- [ECMAScript Number](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-number.isinteger)：整數及有限值檢查不接受字串轉型。

## 真正瀏覽器 spike（合成資料）

專用 fixture `../../.runs/decision-matrix/research-server.mjs` 綁 127.0.0.1:5188。UI 按「Check synthetic file APIs」後讀取 browser 內 new File；畫面輸出 fileBytes/readBytes=65536、65537 oversize=true、C3 28 fatalRejects=true、singleBOM=true、objectURL=true、revoked=true、downloadAttribute=true、pass=true。這是 API 可行性，實際檔案選擇/下載流程在 T04 再驗；不等同硬碟保存成功。測試結束停止自己 fixture。

64 KiB 是 65536 bytes，不是字數；讀前 size 和讀後 byteLength 皆設閘門。能力缺失只禁用 IO，保留算分；沒有服務備援。Firefox、真手機、讀屏、OS 下載 UI 未測，列人工 NOT_RUN。

## 獨立手算（T02 的真值來源）

| 案例 | 手算 | 預期 |
|---|---|---|
| M02 | W=2+1=3；A N=2×(5−1)+1×(5−5)=8；B N=2×(3−1)+1×(5−1)=8 | 25×8÷3=66.666…；兩者 rank1 並列、A 原序先；A 貢獻 200/3,0；B 100/3,100/3 |
| M03 | A N=2×4+1×4=12；B N=0 | A100/rank1、B0/rank2 |
| M04 | A/B/C 單效益的 N=4/4/0 | competition rank 1/1/3 |
| M05 | 單成本 N=5−1=4 / 5−5=0；改效益 N=0/4 | 100/0；改方向後原分數保留且排序反轉 |

0 權重不讀缺值；W=0 不除；任一正權重缺值全表不排名。以 N 精確整數比較（最大3200），不靠顯示的小數排序；貢獻各自顯示2位但總分由原 N 計算。Schema、同分與缺值沒有未決選擇。
