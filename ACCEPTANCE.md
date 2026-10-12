# 驗收：權重決策矩陣

這是規格，尚未實作。以下案例全部待執行，固定假名稱與數值，不讀真實個人檔案。JSON假檔以Node內建TextEncoder/Buffer從本文schema產生到測試暫存目錄；測試結束清理本專案指定目錄，不能掃描使用者下載資料夾。

基準B為TECHNICAL完整schema示例：便利benefit權重2、負擔cost權重1；A=[5,5]、B=[3,1]。

| ID／FR | 種類 | 輸入／操作 | 預期 |
|---|---|---|---|
| M01／01,05 | 自動 | 初始2×2，兩權重1，全null | MISSING_SCORES,missingCount=4；無排名 |
| M02／05,06,07 | 自動 | 基準B | W=3；A的N=8、B的N=8；各66.67，rank均1、tied=true，A先B後；contributions的A兩項為200/3與0，B兩項為100/3與100/3，數值誤差各≤1e-12 |
| M03／04,05 | 自動 | B改A=[5,1]、B=[1,5] | A的N=12、score100.00、rank1；B的N=0、score0.00、rank2 |
| M04／06 | 自動 | 單準則benefit權重1、A/B/C分數5/5/1 | 排名1/1/3；A/B均並列，C不並列 |
| M05／04 | 自動 | 單準則cost權重1，A=1 B=5 | A100.00 rank1；B0.00 rank2；改benefit後排序反轉 |
| M06／03 | 自動 | 所有權重0，包括null格 | ZERO_WEIGHT；無NaN/Infinity或排行 |
| M07／03,05 | 自動 | 權重[1,0]，A=[5,null] B=[3,null] | 可排序，A100.00 B50.00；不回缺漏 |
| M08／05 | 自動 | 基準B的A第一格null | MISSING_SCORES,missingCount=1；整份無排名 |
| M09／02 | 自動 | 重複option label；下方M09明定fixture的兩個NFC等值名稱；空title | 前兩DUPLICATE_LABEL；後INVALID_LABEL |
| M10／02 | 自動 | title81個a、label41個a、label含換行或U+202E或未配對U+D800（含位於頭尾的控制字元） | 均INVALID_LABEL；不截短、不先trim繞過 |
| M11／03,04 | 自動 | JSON weight=-1/101/1.5/"2"/Infinity；score=0/6/1.5/"5" | 前組INVALID_WEIGHT；後組INVALID_SCORE |
| M12／10 | 自動 | root多欄位；option多__proto__；缺title；version2 | 前三INVALID_SCHEMA；最後UNKNOWN_VERSION |
| M13／10 | 自動 | 下方M13明定fixture：一次測字面重複title，一次測JSON escape還原後重複title | 兩者均DUPLICATE_KEY，不能採最後值；不得把escape測成含反斜線的普通key |
| M14／10 | 自動 | 65537byte；UTF8 bytes C3 28；`{"x":`；深度9的合法JSON陣列 | FILE_TOO_LARGE；INVALID_UTF8；INVALID_JSON；TOO_DEEP |
| M15／10 | 自動 | 重複option id；scores少行／倒序；values長度不合；未知optionId | INVALID_REFERENCE；結構長度問題可固定INVALID_SCHEMA，須依schema模組的固定映射測試，不允許成功 |
| M16／09,10 | 自動 | 初始doc與基準B分別呼叫serializeDocument；成功後把result.value這個Uint8Array傳parseImportBytes | 皆回原正規化doc；包含null草稿；無BOM且末尾一個LF；不多rank/timestamp欄位。serialize無效doc傳原schema錯誤碼；注入編碼失敗時EXPORT_FAILED |
| M17／01,08 | 自動 | 8方案再新增；1準則再移除；移除中間準則 | 超限/下限拒絕且doc不變；成功移除時各values同索引刪除 |
| M18／02,12 | 手動 | 名稱填`<img src=x onerror=alert(1)>` | 長度合法時完整純文字顯示；無img、alert或網路，仍可計算與匯出 |
| M19／10,11 | 自動＋手動 | 有工作B，讀合法檔後取消；讀壞檔；選A再選B且A較晚完成 | 原B保留；失敗不改B；最後只可預覽最新選B，舊A丟棄 |
| M20／10,11 | 手動 | 合法匯入預覽，背景嘗試編輯；取消；再確認取代 | 預覽時背景鎖定；取消原資料／焦點恢復；确认一次性取代，分數按新doc重算 |
| M21／08,12 | 手動 | 移除已填分數列後取消；清空全部取消再確認 | 取消不變；確認重設初始2×2，已下載檔案不被觸碰 |
| M22／09,11 | 自動＋手動 | 连續下載10次；清空；pagehide；下載失敗 | 前URL被撤銷、最多1個liveURL、timeout清理；固定檔名；失敗保留draft、EXPORT_FAILED |
| M23／12 | 手動 | 清Network後輸入、計算、匯入本機假檔、下載；重整 | 無對外請求、URL/storage/log無工作資料；重整初始狀態 |
| M24／13 | 手動 | 鍵盤增刪行列、評分、匯入、dialog取消；讀屏 | 格名含方案+準則+方向、焦點合理、Esc取消、不靠滑鼠完成 |
| M25／13 | 手動 | 320px、200%頁面縮放、8×8、40字名稱 | 只有表格區可水平捲、操作可達、外頁不橫向捲動、不裁文字 |
| M26／13 | 手動 | 阻止File/Blob/TextDecoder能力；另禁用JS | IO禁用並說明，核心可計算；無JS保留靜態說明、無假結果 |
| M27／05,06,07 | 手動 | 載入基準B並確認取代；展開兩方案的加權明細；把A的便利評分改成未評分，再改回5 | 兩方案均顯示並列第1名、66.67分，公式25×8÷3；A的貢獻顯示66.67與0.00，B顯示33.33與33.33，總分仍66.67並附四捨五入差異說明。改未評分後立即清除全部舊排名／分數／明細，顯示尚缺1格；改回5後恢復上述結果。畫面沒有「最佳選擇」或替人決定的推薦文案 |

M15固定錯誤碼為：重複id／row次序／未知optionId→INVALID_REFERENCE；scores或values長度不合→INVALID_SCHEMA。這是已定契約，測試不能接受任意錯誤。M17純函式使用`LIMIT_REACHED`／`MINIMUM_REQUIRED`固定回傳碼，UI將它們映射數量限制提示。M16的編碼失敗採測試注入假encoder，不改原生全域、也不要求正式函式讓使用者控制encoder；可將編碼helper作為模組內部依賴注入點。

## M09／M13 的精確測試資料

以下為可直接放進Node測試的JavaScript，並非產品實作。M09使用碼點建構，第一名稱是一個U+00E9，第二名稱為U+0065及U+0301兩個碼點；兩者不是含有反斜線的字面文字。

```js
const nfcFixture = {
  schemaVersion: 1,
  title: "NFC 測試",
  options: [
    { id: "o1", label: String.fromCodePoint(0x00e9) },
    { id: "o2", label: String.fromCodePoint(0x0065, 0x0301) }
  ],
  criteria: [
    { id: "c1", label: "便利", direction: "benefit", weight: 1 }
  ],
  scores: [
    { optionId: "o1", values: [5] },
    { optionId: "o2", values: [3] }
  ]
};
// validateDocument(nfcFixture) => { ok: false, code: "DUPLICATE_LABEL" }
```

M13的String.raw模板保留JSON文字中的單一反斜線；JSON key的原始文字是引號、反斜線、u0074itle、引號，JSON解碼後必須是title。不要把這個單一反斜線再加倍。以下兩段JSON都含完整schema，只由重複key造成拒絕。

```js
const duplicateLiteral = String.raw`{"schemaVersion":1,"title":"A","title":"B","options":[{"id":"o1","label":"方案 A"},{"id":"o2","label":"方案 B"}],"criteria":[{"id":"c1","label":"便利","direction":"benefit","weight":1}],"scores":[{"optionId":"o1","values":[5]},{"optionId":"o2","values":[3]}]}`;
const duplicateEscaped = String.raw`{"schemaVersion":1,"title":"A","\u0074itle":"B","options":[{"id":"o1","label":"方案 A"},{"id":"o2","label":"方案 B"}],"criteria":[{"id":"c1","label":"便利","direction":"benefit","weight":1}],"scores":[{"optionId":"o1","values":[5]},{"optionId":"o2","values":[3]}]}`;
for (const source of [duplicateLiteral, duplicateEscaped]) {
  const bytes = new TextEncoder().encode(source);
  // parseImportBytes(bytes) => { ok: false, code: "DUPLICATE_KEY" }
}
```

對每個分數與權重作有界測試：score1..5、weight0/1/100，各方向下分數必在0..100；同時增加所有方案同樣的正權重倍數且不超100時排序與分數不變。這些性質測試不能替代M02–M05手算案例。

逐項記錄docs/VERIFICATION.md：命令、自動／手動區別、瀏覽器版本、日期、狀態、缺陷與復測。`npm test`不代表檔案下載或畫面已通過；不能把「點擊成功」當作使用者硬碟保存成功。
# U08 增量驗收（2026-10-13）

原驗收歷史保留；新版不能沿用舊版外驗通過。精確 fixture 均為 schemaVersion1 的合成資料。執行結果在 docs/VERIFICATION，不由本表的預期推定 PASS。

| ID | 必要結果 |
|---|---|
| U08-01 | 權重2/1 benefit/cost，A[5,5]/B[3,1]均66.67並列；逐項整數差+4/−4，顯示+33.33/−33.33；總差0.00，沒有勝者。 |
| U08-02 | A[5,1]/B[3,1]總分100.00/66.67，總差由原分子12−8得33.33。 |
| U08-03 | cost A5/B1排序B/A，raw score1/5按ID取得；切benefit後raw不變，pair及表名同步重選。 |
| U08-04 | 四方案5/5/5/1，ranks1/1/1/4，完整A/B/C並列第一，pair原序A/B。 |
| U08-05 | 四方案5/4/4/1，ranks1/2/2/4；B/C第二群組完整。同步調換原序後pairA/C，不改競賽名次。 |
| U08-06 | 權重1/0，A[5,null]/B[3,null]可算100/50；inactive原null仍未評分、未計入，貢獻／差0。 |
| U08-07 | 全0權重、正權重null、無效名稱／權重各回既有固定錯誤，無部分排名或舊pair／總差／表。 |
| U08-08 | 八項weight1 benefit，A全2/B全1，各差3.125顯示3.13；rounded合計25.04，原分子總差25.00，不造補差列或0.01上限。 |
| U08-09 | 評分／權重／方向／標籤及增刪當次重算；新無效／缺漏立即清舊區，修正後只顯示最新pair。 |
| U08-10 | script-looking名字只textContent；計算前後serialize bytes相同，匯入仍exact schemaVersion1，沒有衍生欄位。 |
| U08-11 | frozen doc無mutation；900個weight0/1/100、benefit/cost、score1..5的獨立oracle；逐项ΔN合計等於總ΔN，未rounded誤差≤1e−12，所有數有限／分子safe integer。 |
| U08-12 | 匯入待確認／取消／壞檔及清空取消保留，確認才重算或清除；兩語原生操作／keyboard／320px／200%／8×8／40字，局部表捲動與周邊重排。 |

focused：`node --test test/comparison.test.mjs test/comparison-controller.test.mjs test/scoring.test.mjs test/i18n.test.mjs`。settled版本必要 gate：`npm.cmd test`、`npm.cmd run check`、preview build、`npm.cmd run build -- --production --origin=https://decide.glossquote.com`；有意義的來源差異做 `git diff --check`。Windows environment-key fingerprints前後一致。未跑原生項目如實 NOT_RUN；必要結果錯、殘留、schema改形、不安全DOM或隱私回歸阻止候選發布。
