const fs = require('fs');
const os = require('os');
const { app, BrowserWindow } = require('electron');
const path = require('path');

function configureWritableCachePath() {
  const cacheDir = path.join(os.tmpdir(), 'rnp-warehouse-cache');
  try {
    fs.mkdirSync(cacheDir, { recursive: true });
    app.commandLine.appendSwitch('disk-cache-dir', cacheDir);
    app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
  } catch (err) {
    // Keep default cache behavior when temp path setup fails.
    console.warn('Unable to configure cache path', err);
  }
}

configureWritableCachePath();

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 760,
    title: 'RNP จัดการคลังสินค้า',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
