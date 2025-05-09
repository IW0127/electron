const { Worker } = require('worker_threads');
const { app, BrowserWindow, screen, ipcMain, net, Menu } = require('electron');
const common = require('./common/function');
const path = require('path');
let worker;

let mainWindow;

const filePath = `${__dirname}/common`;
const workerpath = path.join(filePath, 'timer-worker.js');
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
    /* worker thread end */
    createWindow();
    // const menu = Menu.buildFromTemplate([]);
    // Menu.setApplicationMenu(menu);
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
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
}