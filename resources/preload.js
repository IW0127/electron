// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('HRMS', {
  onSystemInfo: (callback) => ipcRenderer.on('systemInfo', (_, data) => callback(data)),
  onTick: (callback) => ipcRenderer.on('tick', (_, data) => callback(data)),
});

window.addEventListener('load', (e) => {
  console.log('DOMContentLoaded', e.currentTarget.window.HRMS, window.HRMS);
});