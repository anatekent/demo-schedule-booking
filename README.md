# Demo Schedule（Vue 3＋純 JavaScript＋SharePoint Lists）

本專案使用 **Vue 3、JavaScript、Vite**。不含 TypeScript、`vue-tsc` 或 `.ts` 原始碼。畫面包含可新增、編輯及刪除的設備／分析項目、設備明細與 Booking，以及甘特排程、搜尋、狀態篩選和兩層日期衝突檢查。

## 1. 第一次啟動

請先安裝 Node.js 22 LTS、VS Code 與 Git。在專案資料夾執行：

```bash
npm install
npm run dev
```

開啟終端機顯示的網址，通常是 `http://localhost:5173`。停止時按 `Ctrl + C`。

## 2. Demo 模式

沒有 `.env.local` 時會自動使用 Demo 模式，資料來源是：

- `src/data/demoData.js`：設備與預約
- `src/services/scheduleRepository.js`：Demo 與 SharePoint 兩種 Repository

Demo 模式的新增／編輯只保留到重新整理前。

表頭的「新增」按鈕可建立設備／分析項目；設備列右上角的鉛筆按鈕可修改設備英文名稱、中文分析項目、Maker、Model、P/N、S/N 與 Accessories。SharePoint 模式下會將新增與修改寫回 `DemoEquipment`。

設備列左上角提供拖曳把手與上下移動按鈕，可自由調整顯示順序。SharePoint 模式會把順序存入 `DemoEquipment.SortOrder`；搜尋時需先清除搜尋條件再排序。

編輯預約或設備時，視窗左下角會顯示刪除按鈕。刪除前必須再次確認；仍有預約的設備不能刪除，需先刪除相關預約。

## 3. 連線 SharePoint Lists

先依 `docs/SHAREPOINT-INTEGRATION.md` 建立 `DemoEquipment` 與 `DemoBookings`。接著將 `.env.example` 複製為 `.env.local`：

```env
VITE_DATA_SOURCE=sharepoint
VITE_SHAREPOINT_SITE_URL=https://yourtenant.sharepoint.com/sites/Demo
VITE_EQUIPMENT_LIST=DemoEquipment
VITE_BOOKINGS_LIST=DemoBookings
```

修改後重新啟動：

```bash
npm run dev
```

成功時頁首會顯示「SharePoint Lists · 已連線」。失敗時畫面會顯示 SharePoint 回傳的狀態與檢查提示。

### 重要：登入與網域

SharePoint REST API 需要使用者已登入 Microsoft 365，且應讓應用程式在 SharePoint／SPFx 的受信任內容中執行。單純從 `localhost` 或其他網域直接呼叫 SharePoint，可能因 CORS 或 Cookie 政策被阻擋。

建議正式做法：

1. 先用 Demo 模式完成畫面修改。
2. 將 Vue 元件放進 SPFx Web Part。
3. 由 SPFx 提供 SharePoint Context 或同網站 REST 存取。
4. 部署 `.sppkg` 後在 SharePoint Workbench 與正式頁面測試。

## 4. 專案結構

```text
src/
├─ App.vue                         # 甘特圖與 Booking 流程
├─ main.js                         # Vue 入口
├─ styles.css                     # 畫面樣式
├─ config/sharepoint.js           # SharePoint 設定
├─ data/demoData.js               # Demo 資料
├─ services/scheduleRepository.js # Demo / SharePoint REST 資料層
└─ utils/date.js                  # 日期工具
```

## 5. 修改設備與畫面

Demo 設備與預約：`src/data/demoData.js`。

日期範圍：`src/App.vue`。畫面可選擇開始與結束日期，單次最多顯示 90 天。

```js
const DAY_WIDTH = 82;
const DEFAULT_DAYS_SHOWN = 14;
const MAX_RANGE_DAYS = 90;
```

顏色：`src/styles.css` 中的：

- `.status-preparing`
- `.status-active`
- `.status-reserved`
- `.status-completed`

## 6. SharePoint Repository 做什麼

`SharePointScheduleRepository` 已包含：

- 讀取啟用中的設備
- 讀取所有 Booking
- 建立 Booking
- 更新 Booking
- 更新設備／分析項目與設備明細
- 新增設備／分析項目與設備明細
- 刪除 Booking 與沒有關聯預約的設備
- 拖曳或按上下按鈕調整設備順序
- 取得 Request Digest
- 儲存前再次向 SharePoint 查詢日期衝突
- 使用 `If-Match: *` 與 `X-HTTP-Method: MERGE` 更新項目

若 SharePoint 欄位 Internal Name 不同，請修改 `src/services/scheduleRepository.js` 的 `$select` 與 `payload`。

## 7. 正式建置

```bash
npm run build
npm run preview
```

正式輸出位於 `dist/`。

## 8. 放到 GitHub

```bash
git init
git add .
git commit -m "Vue JavaScript SharePoint schedule"
git branch -M main
git remote add origin https://github.com/你的帳號/demo-schedule-booking.git
git push -u origin main
```

`.env.local` 不應提交 GitHub。它已由 `.gitignore` 排除；請勿把帳號、密碼或存取權杖寫入原始碼。

## 9. 限制

- 目前沒有 SharePoint Tenant 權限，因此 Repository 已完成但尚未用你的實際清單驗證。
- `Applicant`、`DemoOwner` 目前設計為文字欄位，方便第一階段直接使用。若要改成人員欄位，需加入 People Picker 及 SharePoint User ID 轉換。
- 正式環境建議使用 SPFx，避免跨網域 Cookie／CORS 問題。
- SPFx Microsoft 產生器本身可能包含少量 TypeScript 包裝檔；Vue 應用核心仍可全部使用 JavaScript。
