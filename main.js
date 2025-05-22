const { Worker } = require('worker_threads');
const { app, BrowserWindow, screen, ipcMain, net, Menu, Notification, powerMonitor, Tray, dialog } = require('electron');
const common = require('./common/function');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const log = require("electron-log");

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = "info";
let worker;

let mainWindow;
let tray;
let isDownLoadWindowOpen = false;

const filePath = `${__dirname}/common`;
const workerpath = path.join(filePath, 'timer-worker.js');
app.setAppUserModelId('HRMS');

app.on('ready', () => {
    autoUpdater.checkForUpdatesAndNotify();
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
        common.commonErrorLog('System has resumed from sleep', null, 'electron');
    });

    // Fired when the system resumes from sleep
    powerMonitor.on('resume', () => {
        common.commonErrorLog('System has resumed from sleep', null, 'electron');
        console.log('System has resumed from sleep');
    });

    // Optional: detect lock/unlock too
    powerMonitor.on('lock-screen', () => {
        common.commonErrorLog('Screen is locked', null, 'electron');
        console.log('Screen is locked');
    });

    powerMonitor.on('unlock-screen', () => {
        console.log('Screen is unlocked');
        common.commonErrorLog('session-end', null, 'electron');
    });

    /* worker thread end */
    createWindow();
    // const menu = Menu.buildFromTemplate([]);
    // Menu.setApplicationMenu(menu);
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });



    new Notification({
        title: 'HRMS App',
        body: 'You have a new message!',
        icon: path.join(__dirname, 'favicon.png')
    }).show();
});
// console.log(session);

app.on('session-end', (e) => {
    common.commonErrorLog('session-end', 'electron');
    console.log('Windows is shutting down or user is logging off', e);
    // Optionally do cleanup or save state
});

app.on('window-all-closed', (e) => {
    try {
        console.log('window-all-closed');
        /*  worker.terminate();
         if (process.platform == 'darwin') {
             console.log();
             if (mainWindow) {
                 mainWindow.destroy();
             }
             app.quit();
         } */

    } catch (error) {
        console.log('sdkfjsdfjsdfjk', error);
    }
});

app.on('before-quit', (e) => {
    try {
        const choice = dialog.showMessageBoxSync({
            type: 'question',
            buttons: ['Cancel', 'Quit'],
            defaultId: 1,
            title: 'Quit App',
            message: 'Are you sure you want to quit the app?'
        });
        if (choice === 0 && !isDownLoadWindowOpen) {
            e.preventDefault(); // Cancel quit
        } else {
            if (worker) {
                worker.terminate();
            }
            if (mainWindow) {
                mainWindow.destroy();
            }
        }
    } catch (error) {
        console.log(error);
    }
});


async function createWindow() {
    let data = await net.fetch('https://testhrms-api.identixweb.com/node/admin_api/getLocalTime');
    data = await data.json();
    worker = new Worker(workerpath, { workerData: { serverNow: new Date(data.data).getTime() } });
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
    mainWindow.webContents.openDevTools();
    mainWindow.on('close', (event) => {
        console.log('Window closed', event);
        event.preventDefault(); // Prevent the default close action
        mainWindow.hide(); // Hide the window instead
    });
    contextMenu();
    app.setLoginItemSettings({ openAtLogin: true });
}

function contextMenu() {
    tray = new Tray(path.join(__dirname, 'icon', process.platform === 'win32' ? 'tray_icon.ico' : 'tray_icon_22x22.png'));
    const menu = Menu.buildFromTemplate([
        { label: 'Open', click: () => mainWindow ? mainWindow.show() : createWindow() },
        { label: 'Quit', click: () => { mainWindow.destroy(); app.quit(); } },
    ]);
    tray.on('click', () => mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show());
    tray.on('right-click', (_e, bounds) => tray.popUpContextMenu(menu, { x: bounds.x, y: bounds.y - 30 }));
}


autoUpdater.on("update-available", () => {
    autoUpdater.downloadUpdate();
    log.info("Update available");
    common.commonErrorLog('Update available', null, 'electron');
});

autoUpdater.on("update-not-available", () => {
    log.info("No updates available");
    common.commonErrorLog("No updates available", null, 'electron');

});

autoUpdater.on("error", (error) => {
    log.error("Update error", error);
    common.commonErrorLog(`Update error ${error.stack}`, null, 'electron');
});

autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    log.info(log_message);
    common.commonErrorLog(`${log_message}`, null, 'electron');
    // mainWindow.webContents.send('download-progress', progressObj.percent);
});

autoUpdater.on("update-downloaded", (_event, releaseNotes, releaseName) => {
    isDownLoadWindowOpen = true;
    const dialogOpts = {
        type: 'info',
        buttons: ['Restart'],
        title: 'Application Update',
        message: process.platform === 'win32' ? releaseNotes : releaseName,
        detail: 'A new version has been downloaded. If you want to upgrade now, then click on the Restart button, or if you want to update later on then click on the above cross button to close it.',
        cancelId: 1
    };
    common.commonErrorLog(`${releaseNotes}`, null, 'electron');
    dialog.showMessageBox(mainWindow, dialogOpts)
        .then((returnValue) => {
            if (returnValue.response === 0) {
                isDownLoadWindowOpen = false;
                autoUpdater.
                    autoUpdater.quitAndInstall();
            }
        });
});
