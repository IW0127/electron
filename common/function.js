const os = require('os');

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
