const {
  app,
  BrowserWindow,
  globalShortcut,
  desktopCapturer,
  screen,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
} = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let overlayWindow = null;
let tray = null;
let isQuitting = false;
let currentCapturedImage = null;
let currentDisplayInfo = null;

const DEV_SERVER_URL = 'http://localhost:5173';

async function isDevServerRunning() {
  try {
    const res = await fetch(DEV_SERVER_URL, { signal: AbortSignal.timeout(500) });
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

async function loadWindow(win, query = {}) {
  const isDev = await isDevServerRunning();
  const distPath = path.join(__dirname, '../frontend/dist/index.html');

  if (isDev) {
    const qs = new URLSearchParams(query).toString();
    const url = qs ? `${DEV_SERVER_URL}/?${qs}` : `${DEV_SERVER_URL}/`;
    console.log(`[SafeLens Main] Connecting to active Vite dev server at ${url}`);
    try {
      await win.loadURL(url);
      return;
    } catch (err) {
      console.warn('[SafeLens Main] Dev server unreachable, falling back to dist:', err.message);
    }
  }

  // Standalone mode: load pre-built production dist directly
  if (fs.existsSync(distPath)) {
    console.log('[SafeLens Main] Loading standalone dist bundle');
    await win.loadFile(distPath, { query });
  } else {
    console.error('[SafeLens Main] dist/index.html not found! Please run `npm run build` first.');
  }
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 900,
    minHeight: 650,
    backgroundColor: '#090b14',
    title: 'SafeLens - Scam & Phishing Protection',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  await loadWindow(mainWindow);

  // Hide window instead of closing when user clicks 'X' (run as tray app)
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      console.log('[SafeLens Main] Main window hidden to system tray');
    }
  });
}

/**
 * Requirement 3:
 * Create the overlay window ONCE at startup (hidden):
 * frameless, transparent, alwaysOnTop with level 'screen-saver', skipTaskbar,
 * covering the display under the cursor, visible on all workspaces.
 */
async function createOverlayWindow() {
  overlayWindow = new BrowserWindow({
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    enableLargerThanScreen: true,
    resizable: false,
    movable: false,
    focusable: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Set always-on-top level to 'screen-saver' and make visible across all workspaces
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  await loadWindow(overlayWindow, { overlay: 'true' });

  // Never destroy overlay window on close; hide it
  overlayWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      overlayWindow.hide();
    }
  });
}

/**
 * Requirement 4 & 5:
 * On hotkey:
 * 1. Capture screen with desktopCapturer FIRST.
 * 2. Send image and multi-monitor / DPI scale info to overlay.
 * 3. Show and focus overlay window so Esc and mouse drag work.
 */
async function triggerSnip() {
  try {
    // Log step 1: Hotkey fired
    console.log('[SafeLens Main] Hotkey fired: CommandOrControl+Shift+Space');

    // Multi-monitor detection: Determine the display currently under the cursor
    const cursorPoint = screen.getCursorScreenPoint();
    const currentDisplay = screen.getDisplayNearestPoint(cursorPoint);
    currentDisplayInfo = currentDisplay;

    // Calculate DPI-aware thumbnail size for native pixel fidelity
    const scaleFactor = currentDisplay.scaleFactor || 1;
    const thumbWidth = Math.round(currentDisplay.size.width * scaleFactor);
    const thumbHeight = Math.round(currentDisplay.size.height * scaleFactor);

    // 1. Capture the screen with desktopCapturer FIRST
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: thumbWidth, height: thumbHeight },
      fetchWindowIcons: false,
    });

    if (!sources || sources.length === 0) {
      console.error('[SafeLens Main] desktopCapturer found no screen sources');
      return;
    }

    // Match source by display_id or fallback to primary screen
    const targetSource =
      sources.find((s) => String(s.display_id) === String(currentDisplay.id)) || sources[0];

    currentCapturedImage = targetSource.thumbnail;
    const screenshotDataUrl = targetSource.thumbnail.toDataURL();

    // Log step 2: Capture done
    console.log(
      `[SafeLens Main] Capture done: captured screen for display id ${currentDisplay.id} (${thumbWidth}x${thumbHeight}, scaleFactor: ${scaleFactor})`
    );

    // Ensure overlay window exists
    if (!overlayWindow || overlayWindow.isDestroyed()) {
      createOverlayWindow();
    }

    // Position overlay window to cover the active display under cursor exactly
    overlayWindow.setBounds(currentDisplay.bounds);

    // Send the captured image and display metadata to overlay
    const payload = {
      dataUrl: screenshotDataUrl,
      display: {
        id: currentDisplay.id,
        bounds: currentDisplay.bounds,
        scaleFactor: scaleFactor,
        size: currentDisplay.size,
      },
    };

    if (overlayWindow.webContents.isLoading()) {
      overlayWindow.webContents.once('did-finish-load', () => {
        overlayWindow.webContents.send('snip:display-capture', payload);
      });
    } else {
      overlayWindow.webContents.send('snip:display-capture', payload);
    }

    // 2. Show, focus, and force top level so Esc and drag work over any application
    overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    overlayWindow.show();
    overlayWindow.focus();
    overlayWindow.moveTop();

    // Log step 3: Overlay shown
    console.log('[SafeLens Main] Overlay shown and focused');
  } catch (err) {
    console.error('[SafeLens Main] Error during triggerSnip execution:', err);
  }
}

/**
 * Requirement 2:
 * System Tray creation.
 */
function createTray() {
  let icon;
  const iconPath = path.join(__dirname, 'tray_icon.png');
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
  } else {
    // Fallback: 16x16 purple pixel
    icon = nativeImage.createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAHUlEQVR4nGNgGDRgsvGr/6TgUQNGDRiuBjAMFAAAluiCgFi+dY8AAAAASUVORK5CYII='
    );
  }

  tray = new Tray(icon);
  tray.setToolTip('SafeLens - Scam & Phishing Protection');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open SafeLens',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: 'Snip Screen (Ctrl+Shift+Space)',
      click: () => {
        triggerSnip();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit SafeLens',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    }
  });
}

/**
 * Requirement 1:
 * Register global shortcut in main process and log registration boolean result.
 */
function registerGlobalHotkeys() {
  const shortcut = 'CommandOrControl+Shift+Space';
  const ret = globalShortcut.register(shortcut, () => {
    triggerSnip();
  });

  console.log(`[SafeLens Main] Global shortcut registration result for '${shortcut}': ${ret}`);
  if (!ret) {
    console.error(`[SafeLens Main] Failed to register global shortcut: ${shortcut}`);
  }
}

// IPC Handlers
ipcMain.on('snip:cancel', () => {
  console.log('[SafeLens Main] Snip cancelled by user');
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.hide();
  }
});

ipcMain.on('snip:trigger-from-renderer', () => {
  triggerSnip();
});

ipcMain.on('snip:crop-selected', (event, { rect, display }) => {
  const scale = display?.scaleFactor || currentDisplayInfo?.scaleFactor || 1;
  const pixelX = Math.max(0, Math.round(rect.x * scale));
  const pixelY = Math.max(0, Math.round(rect.y * scale));
  const pixelW = Math.max(1, Math.round(rect.width * scale));
  const pixelH = Math.max(1, Math.round(rect.height * scale));

  console.log(
    `[SafeLens Main] Cropping selection (CSS: ${rect.width}x${rect.height} -> Native Pixels: ${pixelW}x${pixelH} @ scale ${scale})`
  );

  let croppedDataUrl = null;
  if (currentCapturedImage) {
    try {
      const croppedImage = currentCapturedImage.crop({
        x: pixelX,
        y: pixelY,
        width: pixelW,
        height: pixelH,
      });
      croppedDataUrl = croppedImage.toDataURL();
    } catch (e) {
      console.error('[SafeLens Main] Crop error:', e);
    }
  }

  // Hide overlay window
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.hide();
  }

  // Restore & focus main window and send cropped payload
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('snip:completed', {
      croppedDataUrl,
      rect,
      pixelBounds: { x: pixelX, y: pixelY, width: pixelW, height: pixelH },
      display,
    });
  }
});

// App Lifecycle
app.whenReady().then(async () => {
  createTray();
  await createMainWindow();
  await createOverlayWindow();
  registerGlobalHotkeys();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

/**
 * Requirement 2:
 * Make sure the app runs as a tray app and does NOT quit on window-all-closed.
 */
app.on('window-all-closed', (event) => {
  // Prevent quitting so app stays alive in system tray
  event.preventDefault();
  console.log('[SafeLens Main] window-all-closed intercepted: keeping SafeLens alive in tray');
});

app.on('before-quit', () => {
  isQuitting = true;
  globalShortcut.unregisterAll();
  console.log('[SafeLens Main] Global shortcuts unregistered. Quitting application.');
});
