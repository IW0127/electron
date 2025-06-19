// const { Worker } = require('worker_threads');
const { app, BrowserWindow, screen, ipcMain, net, Menu, Notification, powerMonitor, Tray, dialog, shell, nativeImage } = require('electron');
const common = require('./common/function');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const log = require("electron-log");
const semver = require('semver');
process.env.DEBUG = 'electron-updater';
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = "debug";
let worker;

let mainWindow;
let tray;
let isDownLoadWindowOpen = false;
let quitApp = false;
const filePath = `${__dirname}/common`;
// const workerpath = path.join(filePath, 'timer-worker.js');
app.setAppUserModelId('HRMS');
const version = app.getVersion(); // e.g., "1.2.3-beta.1"
log.info("🚀 ~ app.on ~ version:", version);
const prerelease = semver.prerelease(version);
log.info("🚀 ~ app.on ~ prerelease:", prerelease);
const channel = prerelease ? prerelease[0] : 'latest';
log.info("🚀 ~ app.on ~ channel:", channel);

// autoUpdater.allowDowngrade = true;
autoUpdater.allowPrerelease = true;
autoUpdater.autoDownload = false; // ❌ Prevent auto download
autoUpdater.channel = channel;
common.commonErrorLog(JSON.stringify({ 
    channel: channel,
    autoUpdaterChannel: autoUpdater.channel,
    version: version,
    isPrerelease: !!prerelease,
    releaseType: channel === 'latest' ? 'release' : 'prerelease'
}), null, 'electron channel');

app.on('ready', () => {
    // Initial check for updates
    autoUpdater.checkForUpdates();
    /* worker thread start */
    (async () => {
        try {
            /* let data = await net.fetch('https://testhrms-api.identixweb.com/node/admin_api/getLocalTime');
            data = await data.json();
            worker = new Worker(workerpath, { workerData: { serverNow: new Date(data.data).getTime() } });
            worker.on('message', ({ serverTime }) => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('tick', new Date(serverTime));
                }
            }); */
        } catch (error) {
            console.error('Error fetching local time:', error);
            // Handle the error as needed, e.g., show a message to the user or retry the request
        }
    })();

    powerMonitor.on('suspend', () => {
        console.log('System is going to sleep');
        common.commonErrorLog('System has resumed from sleep', null, 'electron2');
    });

    // Fired when the system resumes from sleep
    powerMonitor.on('resume', () => {
        common.commonErrorLog('System has resumed from sleep', null, 'electron3');
        console.log('System has resumed from sleep');
    });

    // Optional: detect lock/unlock too
    powerMonitor.on('lock-screen', () => {
        common.commonErrorLog('Screen is locked', null, 'electron4');
        console.log('Screen is locked');
    });

    powerMonitor.on('unlock-screen', () => {
        console.log('Screen is unlocked');
        common.commonErrorLog('session-end', null, 'electron5');
    });

    /* worker thread end */
    createWindow();
    // const menu = Menu.buildFromTemplate([]);
    // Menu.setApplicationMenu(menu);
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

    showNotification('HRMS App', `You have a new message! ${autoUpdater.currentVersion}`, 'normal', true);
});
// console.log(session);

app.on('session-end', (e) => {
    common.commonErrorLog('session-end', 'electron6');
    console.log('Windows is shutting down or user is logging off', e);
    // Optionally do cleanup or save state
});

// app.on('window-all-closed', (e) => {
//     try {
//         console.log('window-all-closed');
//         /*  worker.terminate();
//          if (process.platform == 'darwin') {
//              console.log();
//              if (mainWindow) {
//                  mainWindow.destroy();
//              }
//              app.quit();
//          } */

//     } catch (error) {
//         console.log('sdkfjsdfjsdfjk', error);
//     }
// });

app.on('before-quit', (e) => {
    try {
        const choice = dialog.showMessageBoxSync({
            type: 'question',
            buttons: ['Cancel', 'Quit'],
            defaultId: 1,
            title: 'Quit App',
            message: 'Are you sure you want to quit the app?'
        });
        console.log("🚀 ~ app.on ~ choice:", choice);
        console.log("🚀 ~ app.on ~ isDownLoadWindowOpen:", isDownLoadWindowOpen);
        if (choice === 0 && !isDownLoadWindowOpen) {
            e.preventDefault(); // Cancel quit

        } else {
            quitApp = true;
            // process.exit(0);
        }
    } catch (error) {
        console.log('sdfsdfsdf', error);
    }
});


async function createWindow() {
    /* let data = await net.fetch('https://testhrms-api.identixweb.com/node/admin_api/getLocalTime');
    data = await data.json();
    worker = new Worker(workerpath, { workerData: { serverNow: new Date(data.data).getTime() } }); */
    const displays = screen.getAllDisplays();
    const secondDisplay = displays[1] || displays[0];
    const { width, height } = screen.getPrimaryDisplay().bounds;
    mainWindow = new BrowserWindow({
        x: secondDisplay.bounds.x + 50,
        y: secondDisplay.bounds.y + 50,
        icon: path.join(__dirname, 'favicon.png'),
        width: screen.getPrimaryDisplay().bounds.width,
        height: screen.getPrimaryDisplay().bounds.height,
        minWidth: width,
        minHeight: height,
        webPreferences: {
            preload: path.join(filePath, 'preload.js'),            // devTools: true,
            webviewTag: true
        },
    });
    mainWindow.loadURL('https://testhrms.identixweb.com');
    // mainWindow.loadURL('http://localhost:3001');
    // mainWindow.webContents.openDevTools();
    mainWindow.on('close', (event) => {
        console.log('Window closed', event);
        // Only prevent close if it's not for update installation
        if (!isDownLoadWindowOpen && !quitApp) {
            event.preventDefault(); // Prevent the default close action
            mainWindow.hide(); // Hide the window instead
        }
    });
    contextMenu();
    app.setLoginItemSettings({ openAtLogin: true });
}

function contextMenu() {
    tray = new Tray(path.join(__dirname, 'icon', process.platform === 'win32' ? 'tray_icon.ico' : 'tray_icon_22x22.png'));
    const menu = Menu.buildFromTemplate([
        {
            label: 'Open', click: () => {
                autoUpdater.checkForUpdatesAndNotify();
                mainWindow ? mainWindow.show() : createWindow();
            }
        },
        { label: 'Quit', click: () => { quitApp = true; app.quit(); } },
    ]);
    tray.on('click', () => mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show());
    tray.on('right-click', (_e, bounds) => tray.popUpContextMenu(menu, { x: bounds.x, y: bounds.y - 30 }));
}

// Add notification helper function
function showNotification(title, body, urgency = 'normal') {
    // Default to favicon.png which we know exists
    console.log(Notification.isSupported());
    if (Notification.isSupported()) {
        let iconPath = path.join(__dirname, 'favicon.png');

        const notification = new Notification({
            title: title,
            body: body,
            icon: nativeImage.createFromPath(iconPath),
            urgency: urgency, // 'normal', 'critical', or 'low'
        });

        notification.show();
        return notification;
    }
}

autoUpdater.on("update-available", (info) => {
    log.info("🚀 ~ autoUpdater.on ~ info:", info);
    const version = info.version || '';
    log.info("🚀 ~ autoUpdater.on ~ version:", version);
    const isAlpha = version.includes('alpha');
    const isBeta = version.includes('beta');
  
    let shouldDownload = false;
  
    if (channel === 'alpha' && isAlpha) shouldDownload = true;
    else if (channel === 'beta' && isBeta && !isAlpha) shouldDownload = true;
    else if (channel === 'latest' && !isAlpha && !isBeta) shouldDownload = true;
  
    if (!shouldDownload) {
      log.info(`Skipping version ${version} — doesn't match current channel: ${channel}`);
      return;
    }
  
    log.info(`Valid update found for channel ${channel}: ${version}`);
    showNotification("Update Available", `New version ${version} available for ${channel} channel.`);
    autoUpdater.downloadUpdate();
  });
  
// Handle no updates
autoUpdater.on("update-not-available", (info) => {
  log.info("No update available");
});
  
// Handle update download error
autoUpdater.on("error", (error) => {
  log.error("Update error:", error);
  showNotification("Update Error", `Error checking updates: ${error.message}`, "critical");
});

autoUpdater.on("update-not-available", (info) => {
    log.info("No updates available", info);
    common.commonErrorLog("No updates available", null, 'electron8');
});

autoUpdater.on("error", (error) => {
    log.error("Update error", error);
    common.commonErrorLog(`Update error: ${error.message}`, null, 'electron10');

    // Show error notification to user with sound
    showNotification('Update Error', `Failed to check for updates: ${error.message}`, 'critical', true);
});

autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    log.info(log_message);
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setProgressBar(progressObj.percent / 100);
    }
});

autoUpdater.on("update-downloaded", (_event, releaseNotes, releaseName) => {
    isDownLoadWindowOpen = true;
    const dialogOpts = {
        type: 'info',
        buttons: ['Restart Now', 'Later'],
        title: 'Application Update',
        message: `A new version has been downloaded for the ${channel} channel`,
        detail: 'Please restart the application to apply the updates.',
        cancelId: 1
    };

    dialog.showMessageBox(mainWindow, dialogOpts)
        .then((returnValue) => {
            if (returnValue.response === 0) {
                isDownLoadWindowOpen = false;
                app.removeAllListeners('window-all-closed');
                autoUpdater.quitAndInstall(false, true);
            }
        });
});
// shell.openExternal('https://github.com/IW0127/electron/releases/latest');