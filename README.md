# year-end-lottery 尾牙抽獎系統

手機優先、可投影大畫面的尾牙抽獎 PWA。PWA 是「可加入手機主畫面的網頁 App」，適合部署到 GitHub Pages。

GitHub Pages 網址：

```text
https://owen810929.github.io/year-end-lottery/
```

## 功能

- 抽獎頁：顯示活動名稱、目前獎項、抽獎動畫、最新中獎人與中獎清單。
- 人員設定：可新增、修改、刪除，也可從 Excel 或 Google Sheets 複製貼上匯入。
- 獎項設定：可新增、修改、刪除，也可從 Excel 或 Google Sheets 複製貼上匯入。
- 範例檔下載：人員與獎項頁都可下載 TSV 範例檔，填好後複製內容貼回系統。
- 資料檢查：開始抽獎前檢查人員、獎項、重複 ID、金額與名額。
- 公平抽選：使用 `crypto.getRandomValues()`，沒有使用 `Math.random()`。
- 本機儲存：資料存在瀏覽器的 `localStorage`，重新整理後仍可延續。
- A4 列印：抽獎完成後可列印中獎名單與簽收欄。
- Reset：只清除抽獎進度與中獎結果，保留活動名稱、人員與獎項。

## 貼上匯入格式

人員：

```text
部門	姓名	ID	是否參加抽獎
生產部	王小明	A001	是
業務部	陳小美	A002	是
管理部	林大明	A003	否
```

獎項：

```text
順序	獎項名稱	金額	名額	抽獎人	備註	抽獎池	中獎後
1	幸運獎	10000	20	總經理	現金	剩餘未中獎人	移出後續抽獎池
2	明年尾牙主辦	2000	3	主持人	特殊任務獎	全部可抽人員	仍可再中其他獎
3	特等獎	13000	1	董事長	壓軸獎	剩餘未中獎人	移出後續抽獎池
```

## 本機執行

```bash
npm install
npm run dev
```

正式打包：

```bash
npm run build
```

## GitHub Pages

此專案已設定 GitHub Pages 子路徑：

```ts
base: "/year-end-lottery/"
```

若發布後看到舊畫面，請關閉 Safari 分頁後重新開啟；必要時移除主畫面捷徑後重新加入。
