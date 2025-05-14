const { Worker } = require('worker_threads');
const { app, BrowserWindow, screen, ipcMain, net, Menu, Notification, powerMonitor, Tray } = require('electron');
const common = require('./common/function');
const path = require('path');
let worker;

let mainWindow;
let tray;

const filePath = `${__dirname}/common`;
const workerpath = path.join(filePath, 'timer-worker.js');

app.setAppUserModelId('HRMS');

app.on('ready', () => {
    /* worker thread start */
    (async () => {
        try {
            let data = await net.fetch('https://testhrms-api.identixweb.com/node/admin_api/getLocalTime');
            data = await data.json();
            worker = new Worker(workerpath, { workerData: { serverNow: new Date(data.data).getTime() } });
            worker.on('message', ({ serverTime }) => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('tick', new Date(serverTime));
                }
            });
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
    console.log('window-all-closed');
    worker.terminate();
    if (process.platform !== 'darwin') {
        app.quit();
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
    mainWindow.hookWindowMessage(0x11, () => { // 0x11 == WM_QUERYENDSESSION
        console.log('System shutdown or logoff detected (WM_QUERYENDSESSION)');
        // Do cleanup here, e.g. save state
    });
    mainWindow.on('close', (event) => {
        console.log('Window closed');
        event.preventDefault(); // Prevent the default close action
        mainWindow.hide(); // Hide the window instead
    });
    contextMenu();
    app.setLoginItemSettings({ openAtLogin: true });
}

function contextMenu() {
    tray = new Tray(path.join(__dirname, 'favicon.png'));
    const menu = Menu.buildFromTemplate([
        { label: 'Open', click: () => mainWindow ? mainWindow.show() : createWindow() },
        { label: 'Quit', click: () => app.quit() },
    ]);
    tray.on('click', () => mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show());
    tray.on('right-click', (_e, bounds) => tray.popUpContextMenu(menu, { x: bounds.x, y: bounds.y - 30 }));
}
