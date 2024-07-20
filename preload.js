const { contextBridge, shell, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    openExternal: (url) => shell.openExternal(url),
    restartApp: () => ipcRenderer.send('restart-app'),
    minimizeWindow: () => ipcRenderer.send('minimize-window'),
    closeWindow: () => ipcRenderer.send('close-window'),
    resizeWindow: () => ipcRenderer.send('resize-window'),
    setPosition: () => ipcRenderer.send('set-position'),
    onWindowResize: (callback) => ipcRenderer.on('window-resized', (event, data) => callback(data)),

    send: (channel, data) => {
      ipcRenderer.send(channel, data);
    },
    receive: (channel, func) => {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  });
  
  