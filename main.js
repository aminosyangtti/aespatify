const { app, shell, BrowserWindow, ipcMain, screen, dialog } = require('electron');
const path = require('path');
const expressApp = require('./backend/server'); // Adjust the path

const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('App starting...');

app.commandLine.appendSwitch('enable-transparent-visuals');
app.commandLine.appendSwitch('disable-gpu');

const onAppReady = function () {

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  // 1920x1053 (my scurrent creen)

  const windowWidth = 430;
  const windowHeight = 280;




  let mainWindow = new BrowserWindow({
    
    width: windowWidth,
    height: windowHeight,

    
    transparent: true,
  
  
    frame: false,
    
    resizable: true,
    alwaysOnTop: true,
    // vibrancy: 'fullscreen-ui',    // on MacOS
    // backgroundMaterial: 'acrylic', // on Windows 11
    // vibrancy: {
    //   theme: 'dark', // (default) or 'dark' or '#rrggbbaa'
    //   effect: 'acrylic', // (default) or 'blur'
    //   disableOnBlur: true, // (default)
    // },

    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
      webSecurity: false
    }
  });





  mainWindow.loadFile(path.join(__dirname, 'backend', 'public', 'index.html'));

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({mode:'undocked'});
  }
  // mainWindow.webContents.openDevTools();
  // mainWindow.webContents.openDevTools({mode:'undocked'})



  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-available', (info) => {
    log.info('Update available.');
    dialog.showMessageBox({
      type: 'info',
      title: 'Update available',
      message: 'A new update is available. Downloading now...',
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded.');
    dialog.showMessageBox({
      type: 'info',
      title: 'Update ready',
      message: 'A new update is ready. It will be installed on restart. Restart now?',
      buttons: ['Yes', 'Later']
    }).then((returnValue) => {
      if (returnValue.response === 0) autoUpdater.quitAndInstall();
    });
  });

  autoUpdater.on('error', (err) => {
    log.error('Error in auto-updater. ' + err);
    dialog.showMessageBox({
      type: 'error',
      title: 'Update error',
      message: 'Error in auto-updater: ' + err,
    });
  });


  mainWindow.setMinimumSize(430, 180);

  mainWindow.on('resize', () => {
    const { width, height } = mainWindow.getBounds();
    mainWindow.webContents.send('window-resized', { width, height });
  });

  
  ipcMain.on('resize-window', (event) => {
    const { width, height } = mainWindow.getBounds();
  
    if (width >= 430 && height >= 180 && height < 280) {
      mainWindow.setSize(430, 280);
    } else if (width >= 430 && height >= 280 && width < 640 && height < 640) {
      mainWindow.setSize(640, 640);
    } else {
      mainWindow.setSize(430, 180);
    }
  });


  ipcMain.on('set-position', (event) => {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize

    mainWindow.setPosition(width - 430, 100);
  });
  ipcMain.on('minimize-window', () => {
    mainWindow.minimize();
  });

  ipcMain.on('open-auth-url', (event, url) => {
    shell.openExternal(url);
  });
  

  ipcMain.on('close-window', () => {
    mainWindow.close();
  });

  ipcMain.on('toMain', (event, data) => {
    console.log('Received in main:', data);
  });
}

app.on('ready', () => {

  setTimeout(onAppReady,1000);  // fix for the electron transparent bg bug

  
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    onAppReady();
  }
});



app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('restart-app', () => {
  app.relaunch();
  app.exit();
});


// Integrate Express server
expressApp.listen(3001, () => {
  console.log('Express server running on http://localhost:3001');
}).on('error', (err) => {
  console.error('Express server error:', err);
});
