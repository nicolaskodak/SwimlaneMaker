# FlowArchitect - 工作流程設計與管理系統

一個現代化的泳道圖 (Swimlane Diagram) 設計工具，用於視覺化和管理複雜的業務流程。支援多部門協作、流程連接、即時編輯和拖曳操作。

https://nicolaskodak.github.io/SwimlaneMaker/


## 🎯 功能特性

### 核心功能
- **泳道管理** - 建立和刪除部門泳道
- **流程步驟** - 為每個泳道添加、編輯、刪除步驟
- **流程連接** - 支援部門間的流程連接線繪製
- **拖曳操作** - 直觀的拖曳移動步驟
- **連接模式** - 切換為連接模式以繪製流程關係
- **視覺化編輯** - 實時查看流程設計結果

### 高級功能
- **全域設定**
  - 曲線偏移調整 (Bezier 入射角)
  - 線條顏色自訂
- **流程線自訂**
  - 可調整的曲線強度
  - 自訂連接線顏色
- **狀態管理** - 完整的撤銷/重做支援預留

## 🛠 技術架構

### 技術棧

| 層級 | 技術 | 版本 | 用途 |
|------|------|------|------|
| **前端框架** | React | 19.2.0 | UI 元件與狀態管理 |
| **構建工具** | Vite | 7.2.4 | 高效的開發和生產構建 |
| **樣式框架** | Tailwind CSS | 4.1.17 | 原子化 CSS 設計 |
| **圖標庫** | lucide-react | 0.555.0 | 現代化 SVG 圖標 |
| **CSS 處理** | PostCSS | 8.5.6 | CSS 轉換和優化 |
| **程式碼檢查** | ESLint | 9.39.1 | 程式碼品質保證 |

### 架構圖

```
┌─────────────────────────────────────────────┐
│         FlowArchitect 應用                   │
├─────────────────────────────────────────────┤
│  React 元件層                                │
│  ├─ App (主應用)                             │
│  ├─ Lane (泳道元件)                          │
│  ├─ Node (流程步驟)                          │
│  └─ Connection (連接線)                      │
├─────────────────────────────────────────────┤
│  狀態管理層 (React Hooks)                     │
│  ├─ lanes (泳道數據)                         │
│  ├─ nodes (步驟數據)                         │
│  └─ connections (連接數據)                   │
├─────────────────────────────────────────────┤
│  圖形渲染層 (SVG/Canvas)                      │
│  ├─ 貝茲曲線 (Bezier curves)                 │
│  └─ 流程連接線                               │
├─────────────────────────────────────────────┤
│  樣式層 (Tailwind CSS)                       │
│  └─ 響應式設計                               │
└─────────────────────────────────────────────┘
```

### 資料結構

```javascript
// 泳道數據
Lane = {
  id: string,           // 唯一識別符
  title: string,        // 部門名稱
  color: string        // Tailwind 顏色類
}

// 步驟節點
Node = {
  id: string,          // 唯一識別符
  laneId: string,      // 所屬泳道 ID
  title: string,       // 步驟標題
  content: string,     // 步驟描述
  rank: number         // 順序位置
}

// 流程連接
Connection = {
  from: string,        // 源節點 ID
  to: string,          // 目標節點 ID
  id: string           // 連接唯一識別符
}
```

## 🚀 快速開始

### 系統需求
- Node.js 16+
- npm 或 yarn
- 現代瀏覽器 (Chrome、Firefox、Safari、Edge)

### 安裝步驟

1. **複製專案**
```bash
git clone <repository-url>
cd SwimlaneMaker
```

2. **安裝依賴**
```bash
npm install
```

3. **啟動開發伺服器**
```bash
npm run dev
```

4. **打開瀏覽器**
```
http://localhost:5174
```

### 生產構建

```bash
# 構建優化版本
npm run build

# 預覽生產構建
npm run preview
```

## 📋 使用指南

### 基礎操作

#### 1. 建立泳道
- 點擊右上角「+ 新增部門泳道」按鈕
- 新泳道會自動添加到列表右側

#### 2. 添加流程步驟
- 在每個泳道中點擊「+ 加入步驟」按鈕
- 輸入步驟標題和描述
- 點擊保存

#### 3. 編輯步驟
- 點擊步驟卡片上的編輯按鈕（鉛筆圖標）
- 修改標題和描述
- 點擊保存

#### 4. 刪除步驟
- 點擊步驟右上角的刪除按鈕（垃圾桶圖標）
- 確認刪除

#### 5. 連接流程
- 點擊工具欄「連接模式」按鈕切換連接模式
- 點擊源步驟
- 點擊目標步驟完成連接
- 點擊連接線上的 × 圖標可刪除連接

### 高級操作

#### 模式切換
- **選取 / 拖曳模式** (預設) - 拖動步驟移動位置
- **連接模式** - 繪製部門間的流程連接

#### 全域設定
- 點擊左上角齒輪圖標開啟設定面板
- 調整「曲線偏移」以改變連接線曲度
- 使用色彩選擇器自訂連接線顏色

## 🎨 自訂配置

### 調整顏色方案

編輯 `src/App.jsx` 中的泳道初始化：

```javascript
const [lanes, setLanes] = useState([
  { 
    id: 'dept-1', 
    title: '業務部', 
    color: 'bg-blue-50 border-blue-200 text-blue-800' // 修改此處
  },
  // ...
]);
```

### Tailwind CSS 自訂

修改 `tailwind.config.js` 以自訂主題：

```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 自訂顏色
      }
    },
  },
}
```

## 📁 專案結構

```
SwimlaneMaker/
├── src/
│   ├── App.jsx              # 主應用元件
│   ├── index.css            # 全域樣式 (Tailwind)
│   ├── main.jsx             # 入口點
│   └── assets/              # 靜態資源
├── public/                  # 公開資源
├── index.html              # HTML 模板
├── vite.config.js          # Vite 配置
├── tailwind.config.js      # Tailwind 配置
├── postcss.config.js       # PostCSS 配置
├── package.json            # 依賴配置
└── README.md               # 本檔案
```

## 🔧 開發指南

### 新增功能

#### 1. 新增泳道顏色
在 `App.jsx` 的泳道初始化中添加新顏色組合

#### 2. 修改連接線樣式
編輯 `SVG` 路徑定義中的 `stroke` 和 `strokeWidth` 屬性

#### 3. 擴展步驟屬性
修改 `Node` 數據結構和相應的渲染邏輯

### 性能最佳實踐

- 使用 `React.memo()` 優化不必要的重新渲染
- 利用 `useCallback` 穩定事件處理函數
- 分拆大型元件為小元件

## 🐛 常見問題

### Q: 流程連接線顯示不正確？
**A:** 檢查是否已切換到「連接模式」，確保源節點和目標節點都存在。

### Q: 步驟無法拖曳？
**A:** 確認當前為「選取 / 拖曳」模式，而不是「連接模式」。

### Q: 樣式沒有應用？
**A:** 執行 `npm run dev` 重新啟動開發伺服器，並清除瀏覽器快取。

## 📦 相依套件說明

| 套件 | 用途 |
|------|------|
| react | 核心 UI 框架 |
| react-dom | React DOM 渲染 |
| vite | 現代化構建工具 |
| tailwindcss | 樣式框架 |
| lucide-react | 圖標庫 |
| postcss | CSS 轉換 |
| autoprefixer | 瀏覽器前綴支援 |

## 🔄 部署

### 部署到 Vercel (推薦)

```bash
# 安裝 Vercel CLI
npm i -g vercel

# 部署
vercel
```

### 部署到其他平台

1. **構建應用**
```bash
npm run build
```

2. **部署 `dist/` 目錄**
   - Netlify
   - GitHub Pages
   - 任何靜態網站託管服務

## 📝 變更日誌

### v0.0.1 (初始版本)
- ✅ 基礎泳道圖功能
- ✅ 流程步驟管理
- ✅ 連接線繪製
- ✅ 拖曳操作
- ✅ 全域設定面板

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

## 📄 授權

MIT License

---

**FlowArchitect** - 簡化複雜流程的視覺化工具 ✨
