# SharePoint Lists 建立與連線說明

## 1. 建立 DemoEquipment

在現有 SharePoint Demo 網站建立空白 List，名稱使用 `DemoEquipment`。

| 顯示名稱 | Internal Name | 類型 | 必填 |
| --- | --- | --- | --- |
| 設備英文名稱 | Title | 單行文字 | 是 |
| 中文名稱 | NameZh | 單行文字 | 是 |
| 廠牌 | Maker | 單行文字 | 否 |
| 型號 | Model | 單行文字 | 否 |
| 料號 | PartNo | 單行文字 | 否 |
| 序號 | SerialNo | 單行文字 | 否 |
| 配件 | Accessories | 單行文字 | 否 |
| 顯示順序 | SortOrder | 數字 | 是，建議依現有順序填入 1、2、3… |
| 啟用 | Active | 是／否 | 是，預設 Yes |

## 2. 建立 DemoBookings

建立第二份 List，名稱使用 `DemoBookings`。

| 顯示名稱 | Internal Name | 類型 | 必填 |
| --- | --- | --- | --- |
| Demo 主題 | Title | 單行文字 | 是 |
| 設備 | Equipment | Lookup 至 DemoEquipment | 是 |
| 客戶 | Customer | 單行文字 | 是 |
| 聯絡窗口 | Contact | 單行文字 | 否 |
| 申請者 | Applicant | 單行文字 | 否 |
| Demo 人員 | DemoOwner | 單行文字 | 否 |
| 開始日期 | StartDate | 日期及時間 | 是 |
| 結束日期 | EndDate | 日期及時間 | 是 |
| 狀態 | Status | 選項 | 是 |

Status 選項值必須是：

```text
preparing
active
reserved
completed
```

## 3. 確認 Internal Name

程式使用 Internal Name，而不是畫面翻譯後的顯示名稱。可進入「List settings → 欄位」，從網址的 `Field=` 後方確認 Internal Name。設備拖曳排序需要數字欄位 `SortOrder`。

如果欄位名稱不同，修改 `src/services/scheduleRepository.js`：

- `getEquipment()` 的 `$select`
- `getBookings()` 的 `$select`
- `saveBooking()` 的 `payload`

## 4. 本機設定

複製 `.env.example` 為 `.env.local`：

```env
VITE_DATA_SOURCE=sharepoint
VITE_SHAREPOINT_SITE_URL=https://yourtenant.sharepoint.com/sites/Demo
VITE_EQUIPMENT_LIST=DemoEquipment
VITE_BOOKINGS_LIST=DemoBookings
```

環境變數是建置設定，不應放帳號、密碼或權杖。SharePoint 驗證應使用目前已登入使用者或 SPFx Context。

## 5. REST API 流程

程式使用下列 SharePoint REST 端點：

```text
GET  /_api/web/lists/GetByTitle('DemoEquipment')/items
GET  /_api/web/lists/GetByTitle('DemoBookings')/items
POST /_api/contextinfo
POST /_api/web/lists/GetByTitle('DemoBookings')/items
POST /_api/web/lists/GetByTitle('DemoBookings')/items(ID)
POST /_api/web/lists/GetByTitle('DemoEquipment')/items(ID)   # MERGE 或 DELETE
POST /_api/web/lists/GetByTitle('DemoBookings')/items(ID)    # MERGE 或 DELETE
```

更新項目時使用：

```text
If-Match: *
X-HTTP-Method: MERGE
X-RequestDigest: <FormDigestValue>
```

刪除項目時使用 `X-HTTP-Method: DELETE`。為避免 Lookup 關聯錯誤，畫面會阻止刪除仍有 Booking 的設備。

## 6. 衝突檢查

畫面儲存前會：

1. 先檢查目前瀏覽器已載入的資料。
2. SharePoint Repository 再查詢同設備、重疊日期的項目。
3. 只有兩次檢查都通過才送出新增或更新。

重疊條件：

```text
既有 StartDate <= 新 EndDate
AND
既有 EndDate >= 新 StartDate
```

## 7. SPFx 正式部署

推薦建立「No JavaScript framework」SPFx Web Part，再將 Vue 掛載到 Web Part 的 `domElement`。Vue 元件、Repository 與日期工具全部維持 JavaScript。

Microsoft SPFx 產生器可能建立 TypeScript Web Part 外殼；若公司要求完全零 TypeScript，可評估由既有 SPFx 團隊維護這一個薄包裝層，Vue 業務程式仍全部是 JavaScript。

正式部署順序：

1. 建立兩份 Lists 與測試資料。
2. 在 SharePoint Workbench 先測試只讀載入。
3. 測試建立與更新 Booking。
4. 測試重疊日期阻擋。
5. 建置並封裝 `.sppkg`。
6. 上傳 SharePoint App Catalog。
7. 加入現有 Demo 小組頁面。
8. 將該頁面加入 Teams 分頁。

## 8. 權限建議

| 群組 | 權限 |
| --- | --- |
| Demo Schedule Owners | 管理清單、欄位及套件 |
| Demo Schedule Editors | 新增及修改 Booking |
| Demo Schedule Viewers | 只讀 |

設備清單通常只讓 Owners 維護；Booking 清單讓 Editors 編輯。開啟版本歷程，保留每次異動。

## 9. 正式連線前仍需要的資料

- SharePoint Site URL
- 兩份 List 的實際名稱
- 每個欄位的 Internal Name
- App Catalog 是否可部署 SPFx
- Applicant／DemoOwner 要使用文字欄位或人員欄位
