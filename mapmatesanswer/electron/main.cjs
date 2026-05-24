// Electron main process for Mapmates
// Uses .cjs because package.json has "type": "module"
const { app, BrowserWindow, shell, session } = require('electron');
const path = require('path');

const isDev = !app.isPackaged;
const APP_NAME = 'Mapmates';
// Place your logo here: build/icon.png (512x512+) or build/icon.ico on Windows
const ICON_PATH = path.join(__dirname, '..', 'build', 'icon.png');

app.setName(APP_NAME);

let mainWindow = null;
let splashWindow = null;

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 480,
    height: 320,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    icon: ICON_PATH,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });

  const logoUrl = `file://${ICON_PATH.replace(/\\/g, '/')}`;
  const html = `
    <!doctype html><html><head><meta charset="utf-8"/>
    <style>
      html,body{margin:0;height:100%;background:transparent;font-family:system-ui,sans-serif;color:#fff;}
      .wrap{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;
        background:radial-gradient(circle at 50% 40%, #1a1a2e 0%, #0a0a14 70%);border-radius:16px;
        box-shadow:0 0 60px rgba(0,200,255,.25);}
      img{width:120px;height:120px;border-radius:24px;filter:drop-shadow(0 0 20px rgba(0,200,255,.6));}
      h1{margin:18px 0 4px;font-size:22px;letter-spacing:.2em;}
      p{margin:0;font-size:12px;opacity:.6;letter-spacing:.3em;text-transform:uppercase;}
      .bar{margin-top:22px;width:160px;height:2px;background:rgba(255,255,255,.1);overflow:hidden;border-radius:2px;}
      .bar i{display:block;height:100%;width:40%;background:linear-gradient(90deg,#00c8ff,#7a5cff);animation:l 1.2s infinite;}
      @keyframes l{0%{transform:translateX(-100%);}100%{transform:translateX(350%);}}
    </style></head><body><div class="wrap">
      <img src="${logoUrl}" onerror="this.style.display='none'"/>
      <h1>MAPMATES</h1><p>Loading desktop</p><div class="bar"><i></i></div>
    </div></body></html>`;
  splashWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    title: APP_NAME,
    icon: ICON_PATH,
    backgroundColor: '#0a0a14',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // CRITICAL: enables the <webview> tag for the in-app browser
      webviewTag: true,
    },
  });

  const startUrl = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '..', 'dist', 'index.html')}`;

  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    if (splashWindow) { splashWindow.destroy(); splashWindow = null; }
    mainWindow.show();
  });

  // Force any window.open / target=_blank to stay in-app via <webview>
  // by opening a child BrowserWindow only when the app explicitly requests it.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Keep navigation inside the app shell — do NOT spawn the system browser.
    // Returning 'deny' lets your in-app <webview> handle the URL.
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('mapmates:open-url', url);
    }
    return { action: 'deny' };
  });

  // Block top-level navigation away from the app shell.
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(startUrl)) {
      e.preventDefault();
      mainWindow.webContents.send('mapmates:open-url', url);
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// Strip headers that prevent sites from loading inside <webview>
function relaxEmbeddingHeaders() {
  const filter = { urls: ['*://*/*'] };
  session.defaultSession.webRequest.onHeadersReceived(filter, (details, cb) => {
    const headers = details.responseHeaders || {};
    for (const k of Object.keys(headers)) {
      const lk = k.toLowerCase();
      if (lk === 'x-frame-options' || lk === 'content-security-policy' ||
          lk === 'content-security-policy-report-only') {
        delete headers[k];
      }
    }
    cb({ responseHeaders: headers });
  });
}

app.whenReady().then(() => {
  relaxEmbeddingHeaders();
  createSplash();
  setTimeout(createMainWindow, 900);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Belt-and-suspenders: never let renderer spawn an OS browser window
app.on('web-contents-created', (_e, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('mapmates:open-url', url);
    }
    return { action: 'deny' };
  });
});
