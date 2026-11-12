# 🇪🇬 نبض البورصة المصرية | EGX Pulse

> **A responsive, clean, light-mode financial watchlist Progressive Web App (PWA) in full Arabic (RTL) dedicated to tracking live prices, session metrics, and weekly trends for Egyptian Exchange (EGX) stocks and key benchmarks (`EGX 30` & `EGX 70 EWI`).**

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?logo=tailwindcss)
![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite)
![PWA](https://img.shields.io/badge/PWA-Installable-emerald?logo=pwa)
![License](https://img.shields.io/badge/License-Apache--2.0-green)

---

## 📱 Overview

**EGX Pulse (نبض البورصة المصرية)** is a deterministic, fast, mobile-first personal watchlist application designed specifically for investors and traders in the Egyptian stock market. It is engineered to deliver zero-lag market insights natively in Egyptian Pounds (**ج.م** / EGP) without requiring app store installations or third-party accounts.

The application is 100% data-driven and free of AI chatbots or generative clutter, ensuring instant load times and reliable numeric calculations.

---

## ✨ Key Features

- **Full Arabic & RTL Experience (`dir="rtl"`)**:
  - Native Arabic typography loaded via Google Fonts (**Cairo** and **IBM Plex Sans Arabic**).
  - Tickers, percentage changes, prices, and sparklines use `dir="ltr"` and `tabular-nums` to prevent number reversal and keep columns aligned.
- **Clean 4-Letter Display Tickers**:
  - Displays familiar Egyptian stock symbols directly (e.g., `COMI`, `TMGH`, `SWDY`, `MFPC`, `EGAL`, `HELI`) by omitting the `.CA` exchange suffix.
- **Dynamic 1D vs. 7D Period Toggle**:
  - **1D (اليوم)**: Today's live trading session change (vs. yesterday's official close) and intraday trajectory.
  - **7D (٧ أيام)**: 7-day cumulative return (vs. price 7 days ago) with a 7-day SVG sparkline chart.
  - Percentage badges and tile heatmap borders dynamically reflect the selected period.
- **Daily Trading Activity**:
  - **Trading Volume (كمية التداول)**: Number of shares traded today (formatted in `K` and `M` shares).
  - **Trading Value (قيمة التداول)**: Total traded turnover today in Egyptian Pounds (`ج.م`).
  - **52-Week Range Bar**: Visual indicator showing where the current price sits between the annual low and high.
- **Top Benchmark Indices**:
  - **مؤشر EGX 30**: Real-time index points and session/weekly percentage.
  - **مؤشر EGX 70 EWI**: Real-time small/mid-cap index points and return.
- **Market Session Awareness**:
  - Automatically calculates Cairo Exchange trading hours (**09:30 AM to 02:45 PM Sun–Thu, Cairo Time**).
  - **Active Session**: Auto-refreshes stock prices every 2 minutes.
  - **Closed Session**: Pauses background polling and preserves the latest official closing prices to save device battery and mobile data.
- **Strict Egyptian Exchange Search**:
  - Search modal exclusively queries Egyptian Exchange (EGX) stocks, preventing irrelevant foreign exchange clutter.
  - Built-in catalog supporting popular Arabic company names and colloquial aliases (e.g., searching "طلعت مصطفى" directly maps to `TMGH`).
- **Zero-Login Multi-Device Cloud Sync**:
  - Share and synchronize your watchlist, refresh frequency, sorting, and chart range (`1D`/`7D`) between desktop and mobile using a short **Secret Sync Code** (e.g., `SYNC-4K9M`)—no Google Sign-In, accounts, or passwords required.
  - Automatic startup cloud pull when online and debounced auto-push on local changes, plus manual **Push**, **Pull**, **Copy**, and **Unlink** controls.
  - Offline JSON Export/Import fallback included directly inside the Sync & Backup modals.
- **Complete Watchlist Management**:
  - Reorder stocks up/down, edit custom display names or sectors, and remove items.
  - Full backup system: Export and import watchlist JSON files or reset to top EGX blue chips.

---

## 📲 PWA & Mobile Installation Guide

EGX Pulse is a certified **Progressive Web App (PWA)** that can be installed on your phone's home screen to run in standalone fullscreen mode just like a native app.

### On Android (Chrome / Brave / Edge / Samsung Internet):
1. Open your deployed URL or preview link in **Google Chrome**.
2. Tap the green **"تثبيت التطبيق"** (Install App) button in the header.
3. *Alternative:* Tap Chrome's menu (**⋮**) in the top-right corner and select **"Install app"** or **"Add to Home screen"**.
4. The EGX Pulse icon will be added to your home screen and app drawer.

### On iPhone & iPad (Safari):
1. Open the URL in **Safari**.
2. Tap the **"تثبيت على الآيفون"** button in the header for visual instructions, or tap the Safari **Share** icon at the bottom.
3. Scroll down the share sheet and tap **"Add to Home Screen"** (`+`).
4. Tap **"Add"** in the top-right corner.
5. Launch the app from your home screen with native status bar integration and no browser URL bar.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**:
  - React 19 + TypeScript
  - Vite 8 + `@tailwindcss/vite` (Tailwind CSS v4)
  - `vite-plugin-pwa` (Workbox Service Worker + Web App Manifest)
  - `lucide-react` (Feather-style UI icons)
- **Backend Proxy, Sync & Functions (Netlify)**:
  - `netlify/functions/quotes.ts`: Serverless function fetching live EGX stock & index quotes (`EGX30`, `EGX70EWI`), 1D/7D performance, volume, turnover, and 52-week ranges via TradingView's Egypt scanner API, merged with Yahoo Finance historical daily bars for 7-day sparklines.
  - `netlify/functions/search.ts`: Serverless search function querying Egyptian Exchange equities exclusively.
  - `netlify/functions/sync.ts`: Serverless cloud sync endpoint (`GET`/`POST /api/sync`) backed by **`@netlify/blobs`** with strong consistency for zero-login cross-device state persistence.
  - `devApiProxyPlugin` in `vite.config.ts`: Local development middleware mirroring `/api/quotes`, `/api/search`, and an in-memory `/api/sync` store for instant local testing without Netlify CLI.
  - `src/services/syncService.ts`: Client sync manager generating `SYNC-XXXX` codes, persisting local sync metadata, and coordinating auto-pull/debounced auto-push.
  - Public CORS fallback in `src/services/quotesService.ts` with stale-quote protection for static environments without serverless runtimes.

---

## 🚀 Local Development

### Prerequisites:
- **Node.js**: v18.0.0 or higher
- **npm**, **pnpm**, or **yarn**

### Quick Start:
```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/egx-watchlist.git
cd egx-watchlist

# 2. Install dependencies
npm install

# 3. Start the local dev server
npm run dev
```

Open your browser at `http://localhost:3000`.

### Production Build:
```bash
npm run build
```
Compiled production files will be output to the `dist/` directory.

---

## ☁️ Deployment

### Deploy to Netlify (Recommended)
This repository includes a pre-configured `netlify.toml` file:
1. Connect your GitHub repository to [Netlify](https://www.netlify.com/).
2. Netlify will automatically detect:
   - **Build Command**: `npm run build`
   - **Publish directory**: `dist`
   - **Functions directory**: `netlify/functions`
3. Click **Deploy**. Both the client PWA and serverless API endpoints will be live immediately.

### Deploy to Other Platforms (Vercel, Cloudflare Pages, GitHub Pages)
You can deploy the built `dist/` folder to any static hosting provider. The frontend includes an automatic CORS fallback to ensure live quotes continue working.

---

## 🔒 Security & Privacy (Safe for Public GitHub)

- **100% Safe for Public Repositories**: This project contains **no private API keys, secrets, access tokens, database passwords, or personal credentials**.
- **Public Data Source**: Stock data is obtained via public market endpoints without requiring paid accounts or authorization headers.
- **Privacy & Sync Model**: Watchlists and preferences stay in browser `localStorage` by default. When Multi-Device Cloud Sync is enabled, only your anonymous watchlist configuration is stored under your randomly generated `SYNC-XXXX` key in Netlify Blobs—with zero user accounts, emails, or personal identifiers. Keep your sync code private so only your devices can read or update that watchlist.
- **`.gitignore`**: Configured to ignore all `.env*` files, build output (`dist/`, `dev-dist/`, `.netlify/`), local caches, and dependencies.

---

## 📁 Project Structure

```text
├── netlify/
│   └── functions/
│       ├── quotes.ts        # Netlify function: live EGX quotes + 7D sparkline history
│       ├── search.ts        # Netlify function: strict EGX-only symbol & name search
│       └── sync.ts          # Netlify function: @netlify/blobs cloud sync (GET/POST /api/sync)
├── public/
│   ├── apple-touch-icon.png # 180x180 iOS home screen icon
│   ├── favicon.ico
│   ├── icon.svg
│   ├── manifest.json        # Web App Manifest
│   ├── pwa-192x192.png      # Android standard icon
│   ├── pwa-512x512.png      # High-res splash icon
│   └── pwa-maskable-512x512.png # Adaptive maskable icon
├── src/
│   ├── components/          # UI components (Tiles, Status Bar, Sync/Add/Backup Modals, Sparklines)
│   ├── data/                # Default EGX watchlist & popular stock catalog
│   ├── hooks/               # PWA install prompt hook
│   ├── services/            # Quotes fetching, cloud sync (syncService.ts), and caching
│   ├── types/               # TypeScript interfaces (StockQuote, StockItem, Sync types)
│   ├── utils/               # EGX market hours and Cairo timezone calculations
│   ├── App.tsx              # Root component, state & auto-sync lifecycle
│   ├── index.css            # Tailwind CSS v4 styling
│   └── main.tsx             # Application entry point
├── netlify.toml             # Netlify deployment configuration & redirects
├── package.json
└── vite.config.ts           # Vite, PWA plugin & local dev API proxy (/api/quotes, /api/search, /api/sync)
```

---

## 📄 License
This project is open-source and available under the **Apache-2.0 License**.
