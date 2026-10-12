# 技術規格：權重決策矩陣

這是規格，尚未實作。遵守 [工程](docs/ENGINEERING.md) 與 [安全](docs/PRIVACY-SECURITY.md)。原生HTML/CSS/瀏覽器ESM，Node.js24+離線測試，無runtime套件。

## 檔案與命令

```text
package.json
scripts/{serve,check,build}.mjs
public/index.html
public/styles/{tokens,app}.css
public/js/app.mjs
public/js/file-io.mjs
public/js/core/schema.mjs
public/js/core/json-import.mjs
public/js/core/scoring.mjs
public/js/core/matrix.mjs
test/{scaffold,schema,import,scoring,matrix,file-io,boundaries}.test.mjs
docs/RESEARCH.md
docs/VERIFICATION.md
dist/
```

大括號為檔案列舉縮寫。T00建立dev=`node scripts/serve.mjs`、test=`node --test`、check=`node scripts/check.mjs`、build=`node scripts/build.mjs`。serve綁127.0.0.1:4173，只供public、拒路徑穿越／未知路徑；check真查ESM語法、必要檔案、危險DOM／外部資源／禁止持久化；build只複製public至受限本專案dist，不包輸入與測試。不要npm install、CDN或遠端字型。

## 唯一交換schema v1

```json
{
  "schemaVersion": 1,
  "title": "我的比較",
  "options": [
    {"id": "o1", "label": "方案 A"},
    {"id": "o2", "label": "方案 B"}
  ],
  "criteria": [
    {"id": "c1", "label": "便利", "direction": "benefit", "weight": 2},
    {"id": "c2", "label": "負擔", "direction": "cost", "weight": 1}
  ],
  "scores": [
    {"optionId": "o1", "values": [5, 5]},
    {"optionId": "o2", "values": [3, 1]}
  ]
}
```

exact keys：根物件剛好schemaVersion/title/options/criteria/scores；option剛好id/label；criterion剛好id/label/direction/weight；score row剛好optionId/values。以Object.keys長度與每個名稱白名單檢查；禁止未知欄位含`__proto__`、`constructor`、`prototype`。只接受非null普通JSON物件，不接受陣列代替物件。不要把任意輸入Object.assign到狀態或原型。

schemaVersion必須number整數1；options長度2..8，criteria長度1..8，scores長度等於options。id固定ASCII：option=`^o[1-9][0-9]{0,5}$`、criterion=`^c[1-9][0-9]{0,5}$`，各自唯一。scores順序必須與options完全相同，每列optionId=同位置option.id，values長度=criteria長度，values第j格對應criteria[j]。不接受不明引用、缺列、多列或重排的scores。

固定錯誤對應：重複id、score row次序錯誤、未知optionId回INVALID_REFERENCE；陣列長度或物件欄位結構不符回INVALID_SCHEMA。無效id格式也回INVALID_REFERENCE，不讓呼叫端猜測錯誤類別。此JSON僅為手算範例，不是初始草稿；`createDefaultDocument()`必須依PRODUCT FR-01建立兩方案、兩準則、全null分數及權重1。

weight必須Number.isInteger且0..100；values元素只能null或Number.isInteger且1..5，不強制將字串轉數字；direction只接受benefit/cost。每個label/title依PRODUCT的NFC/trim/長度/禁控制字元規則驗證；匯入可正規化，但不能靜默截短；正規化後重複名稱拒絕。根title不能空，預設「我的比較」。所有數字及中間值必须有限。

JSON最多65536byte，UTF-8可有開頭單一BOM，由TextDecoder處理；以`new TextDecoder('utf-8',{fatal:true})`拒絕壞位元組。先檔案size閘門，再arrayBuffer，再實際byteLength閘門，再解碼；JSON.parse只做語法解析，不能當schema驗證。JSON.parse遇Infinity字面會失敗；`1e999`雖可解析成Infinity，schema仍拒絕。

JSON.parse後仍檢查原文重複key與深度：grammar已合法，用迭代scanner逐字走原JSON，正確跨越字串及反斜線escape；每遇`{`推入含Set及expectKey=true的object frame，`[`推array frame，深度>8回TOO_DEEP。每個object的key字串用JSON.parse該完整字串token還原escape，再檢查該frame的Set，重複回DUPLICATE_KEY；冒號將expectKey設false、當前object層逗號重設true；子陣列／物件自己的逗號不能改父frame。不能用正則單獨判斷JSON重複key；`"title"`與`"\u0074itle"`必須視為重複。scanner需有單獨測試，不能遞迴未知深度輸入。

## 純函式契約

模組歸屬固定：schema.mjs匯出validateDocument；json-import.mjs匯出parseImportBytes與serializeDocument並包含重複key scanner；scoring.mjs匯出scoreDocument；matrix.mjs匯出createDefaultDocument與增刪函式。file-io.mjs只負責瀏覽器讀檔／下載／取消，不能另外維護不同的schema或公式。

- `validateDocument(value)`→`{ok:true,value:全新正規化document}` 或 `{ok:false,code}`，不修改輸入。將shape/欄位類型先驗證再處理文字或數字；未知版本單独回UNKNOWN_VERSION。UI raw draft先明確解析字串權重再建立candidate，不能把JSON import字串權重視同UI數字。
- `parseImportBytes(bytes)`→同上，僅接受Uint8Array、上限65536；順序為byte檢查→UTF8→JSON→重複key/深度→validateDocument。錯誤不含原文。
- `scoreDocument(doc)`→`{ok:true,value:{totalWeight,ranked:[{optionId,numerator,score,rank,tied,contributions}]}}`或錯誤。先validateDocument；W=0回ZERO_WEIGHT；再數權重>0的null格，缺漏回MISSING_SCORES並只附`missingCount`整數；沒有部分排行。
- 分子N=`sum(weight*(benefit?score-1:5-score))`。0權重格不讀score而貢獻0。W≤800、N≤3200，是精確整數。score=25*N/W；contributions各項=25*w*u/W，展示2位小數但總分直接從N算，不加總已四捨五入貢獻。各項分別四捨五入，顯示值相加可能與總分或總差不同；不宣稱最多差0.01。8項各3.125顯示3.13時合計25.04，原始總分仍25.00。
- 排序用`b.numerator-a.numerator`，相同N維持options原序。rank=前方N更高的方案數+1，tied=任一其他方案N相等。分數展示`score.toFixed(2)`；權重百分比同樣兩位但不反向作計算。
- `serializeDocument(doc)`→`Result<Uint8Array>`，固定回`{ok:true,value:bytes}`或`{ok:false,code}`。先validateDocument，失敗原樣傳遞該schema錯誤碼；成功後用`JSON.stringify(normalized,null,2)+"\n"`建立字串，再以TextEncoder編成UTF-8 Uint8Array，無BOM；確認byteLength≤65536。編碼／序列化例外或此輸出上限失敗一律EXPORT_FAILED，不帶例外或原文。只輸出schema字段，不帶排名、日期、版本外meta、瀏覽器或裝置識別。下載adapter以`new Blob([result.value],{type:"application/json"})`使用bytes，不再JSON.stringify或二次編碼。
- `addOption/removeOption/addCriterion/removeCriterion` 回`{ok:true,value:全新document}`；增至超過上限回LIMIT_REACHED，刪至低於下限回MINIMUM_REQUIRED，無效引用回INVALID_REFERENCE，失敗原document不變。ID取當前未使用的最小正整數尾碼，移除後可重用。陣列增刪同步更新score行/列。新增名稱以原項目數+1起向上找最小未使用編號名稱（例如兩個預設方案之後是方案3）；禁止重排而不同步values。UI確認流程不放在純函式內。

## 匯入狀態與安全DOM

### U08 衍生比較契約

`core/comparison.mjs` 匯出 `compareLeadingPair(input)`，只呼叫既有 `scoreDocument`，不另寫 utility、validation 或排名公式。失敗原樣回固定錯誤／missingCount，沒有部分 value。成功 `{ok:true,value}` 保留 `totalWeight/ranked` 供原排行共用，另有 `firstOptionId/secondOptionId/firstRank/secondRank/firstRankOptionIds/secondRankOptionIds/totalDeltaNumerator/totalDeltaScore/tied/criteria`。

兩方案取 stable ranked 的前兩項，完整群組依原 rank 取得。每列 criterionId／weight／direction／active、原 raw score、兩個 part numerator／contribution 與 delta。raw scores 透過 optionId Map 查原文件列；準則維持文件順序。ΔN=firstPartN−secondPartN，Δ=25×ΔN/W；總ΔN=firstN−secondN，總Δ直接用整數總差，不減顯示值或加總 rounded 列。0權重列的 numerator/contribution/delta 為0，raw null不變。

`i18n.formatSignedPoints` 只格式化顯示：正 `+33.33`、負 Unicode minus `−33.33`、精確零及−0均 `0.00`。新增 view 不進 input、schema、serializeDocument 或 import。`refresh` 共用此成功 value 重建原 ranking 和整個比較 section；失敗 replaceChildren 後只留原無排名提示。比較表具 caption/th scope、有標名 tabindex=0 的局部橫捲區，整表不是 live region。

工作狀態`draft-invalid|incomplete|ready`；IO狀態`idle|reading|review|error`。開始選檔時記`generation++`，讀檔前檢查size，reading提供取消。每次await後先核對generation；舊結果一律丟棄。取消、另選檔、清空、pagehide使generation遞增。File.arrayBuffer本身不能可靠中止，取消表示取消後續套用並釋放引用，不聲稱立刻停止OS讀取。

合法匯入進review，候選與当前draft分離；背景編輯鎖定，確認取代才一次性套用全新document，取消保留原draft。file input value讀後清空，允許重選同檔；關閉還原焦點。失敗不改draft且可重選。沒有自動fetch與檔案系統任意路徑存取。

下載用Blob及單一Object URL、固定安全檔名；user click觸發a.download。每次新下載前撤銷前URL；觸發後至少留到下一個task，建議60秒後撤銷以避免瀏覽器過早失效，清空/pagehide也撤銷並清timeout。記錄URL與timer引用供測試，重複下載不可無限積累。沒有判斷瀏覽器下載成功的假回報。Blob API不可用只禁用IO，保留核心。

所有標題、label、import預覽用textContent/value，DOM id用程式固定id而非名稱。使用table/caption/th scope及表格內可focus捲動區；分數select accessible name包含方案名＋準則名＋方向。

## 官方依據與研究閘門

2026-09-23查閱：[W3C File API](https://w3c.github.io/FileAPI/)（使用者選檔、Blob與Object URL生命週期）、[WHATWG Encoding](https://encoding.spec.whatwg.org/#interface-textdecoder)（UTF-8解碼及fatal錯誤模式）、[ECMAScript Number](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-number.isfinite)（有限數與整數檢查）。公式與排名是本產品明定的加權模型，不代表官方替決策模型背書。

T01核對目標瀏覽器File.arrayBuffer、TextDecoder fatal、Blob下載與object URL撤銷的實際行為；記錄docs/RESEARCH.md的日期／版本／未測平台。不得因API缺少而上傳檔案到替代服務。
