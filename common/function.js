const os = require('os');
const { net, autoUpdater } = require('electron');


exports.convertUTCToIST = (utcTimestampMs) => {
    const dateInIST = new Date(utcTimestampMs).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour12: false, // optional: for 24h format
    });
    return dateInIST;
};


exports.getSystemInfo = () => {
    return ({
        hostname: os.hostname(),
        platform: os.platform(),
        architecture: os.arch(),
        cpuCores: os.cpus().length,
        cpuModel: os.cpus()[0].model,
        totalMemory: `${(os.totalmem() / (1024 ** 3)).toFixed(2)} GB`,
        freeMemory: `${(os.freemem() / (1024 ** 3)).toFixed(2)} GB`,
        uptime: `${(os.uptime() / 3600).toFixed(2)} hours`,
        loadAverage: os.loadavg(),
        homeDir: os.homedir(),
        tempDir: os.tmpdir(),
        networkInterfaces: os.networkInterfaces(),
    });
};

exports.commonErrorLog = async (log, empId, type = 'Error boundary') => {
    const apiEndpoint = "https://testhrms-api.identixweb.com/node/admin_api";

    const body = {
        empId,
        log: `${log}\n type:${type}`,
    };
    fetch(`${apiEndpoint}/reactErrorLog`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(body),
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            console.log('hrms: Log created!');
        })
        .catch((error) => {
            console.error('hrms:', error);
        });
};
/* console.log(autoUpdater.checkForUpdates());

autoUpdater.setFeedURL({ url: 'https://your-update-server.com/updates/latest' });

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
    dialog.showMessageBox(mainWindow, dialogOpts).then((returnValue) => {
        if (returnValue.response === 0) {
            isDownLoadWindowOpen = false;
            autoUpdater.quitAndInstall();
        }
    });
});
 */