const { app, BrowserWindow } = require('electron')

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  });

  // and load the index.html of the app.
  mainWindow.loadFile("index.html");

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("ready", async () => {
  createWindow();
  const Ctl = await import('ipfsd-ctl')

const factory = Ctl.createFactory(
    {
        type: 'js',
        test: true,
        disposable: true,
        ipfsHttpModule,
        ipfsModule: (await import('ipfs')) // only if you gonna spawn 'proc' controllers
    },
    { // overrides per type
        js: {
            ipfsBin: ipfsModule.path()
        },
        go: {
            ipfsBin: goIpfsModule.path()
        }
    }
)
const ipfsd1 = await factory.spawn() // Spawns using options from `createFactory`
const ipfsd2 = await factory.spawn({ type: 'go' }) // Spawns using options from `createFactory` but overrides `type` to spawn a `go` controller

console.log(await ipfsd1.api.id())
console.log(await ipfsd2.api.id())

await factory.clean() // Clean all the controllers created by the factory calling `stop` on all of them.
});

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
