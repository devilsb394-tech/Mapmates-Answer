# Mapmates – Electron Integration

These files add Electron desktop support **without touching your existing UI, state, Firebase, or styling**. Drop them into your project root.

## 1. Files to add

```
your-project/
├── electron/
│   └── main.cjs              ← NEW (Electron main process)
├── components/
│   └── SmartFrame.tsx        ← NEW (iframe ⇄ <webview> drop-in)
├── build/
│   ├── icon.png              ← place your Mapmates logo here (512×512 PNG)
│   └── icon.ico              ← Windows icon (for build:win)
└── package.json              ← REPLACE with the provided one
```

> The provided `package.json` keeps **every** existing dependency and script. It only **adds** Electron scripts and devDependencies. Your `vite.config.ts`, `tsconfig.json`, `main.tsx`, and `server.ts` stay untouched.

## 2. Install the new dev dependencies

```bash
npm install
```

(adds `electron`, `electron-builder`, `concurrently`, `cross-env`, `wait-on` — nothing else changes)

## 3. Run in desktop dev mode

```bash
npm run electron:start
```

Splash screen appears, then the main Mapmates window opens at 1400×900 loading your Vite dev server.

## 4. Package the Windows installer

```bash
npm run build:win
```

Output: `release/Mapmates Setup 1.0.0.exe`

(Also available: `npm run package:mac`, `npm run package:linux`.)

## 5. Swap iframes → in-app browser (App.tsx)

Only **add one import** and **rename `<iframe>` to `<SmartFrame>`** in the spots where external sites are rendered. Your logic, props, state, and styles stay 100% the same — `SmartFrame` accepts the same props you already pass.

### a) Add the import near the top of `App.tsx`
```tsx
import { SmartFrame } from './components/SmartFrame';
```

### b) Replace these 4 iframe occurrences (line numbers from your upload)

**Line 1053** – Mapmates AI embed:
```tsx
<SmartFrame src="https://mapmatesai.netlify.app" className="w-full h-full border-none" allow="microphone; camera; display-capture" />
```

**Line 1234** – video player (keep all existing props, just rename the tag):
```tsx
<SmartFrame
  src={finalVideoUrl}
  className="absolute inset-0 w-full h-full border-none bg-black"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  allowFullScreen
  referrerPolicy="no-referrer"
/>
```

**Line 1385** – second video player block: same rename.

**Line 1613** – the main external page viewer:
```tsx
<SmartFrame
  src={activeFrameUrl ? getSmartUrl(activeFrameUrl) : undefined}
  srcDoc={activeFrameHtml || undefined}
  className="w-full h-full border-none"
/>
```

That's it. `SmartFrame` automatically:
- Uses Electron's native `<webview>` when running in the desktop app → real browser engine, no X-Frame-Options blocks, `allowpopups` enabled, persistent session.
- Falls back to a regular `<iframe>` in normal web/browser mode, so your web build still works.
- Keeps inline HTML (`srcDoc`) rendering via iframe (webview doesn't support srcDoc).

## 6. Anti-redirect guarantee

`main.cjs` intercepts every `window.open(...)`, `target="_blank"`, and external `will-navigate`, so links can **never** escape to the system Chrome window — they're routed back into the app. Your existing `window.open(url, '_blank')` call (line 727) keeps working and now stays in-app.

## 7. Branding

- App name: **Mapmates** (set via `app.setName` + `productName` in package.json + window title)
- Icon: drop your existing Mapmates logo at `build/icon.png` (and `build/icon.ico` for Windows installer). The splash screen reads the same file automatically.
