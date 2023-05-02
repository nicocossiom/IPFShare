import { BrowserWindow, app, ipcMain, shell } from "electron"
import * as fs from "fs"
import { release } from "node:os"
import { join } from "node:path"
// import type { OrbitDB } from "orbit-db"
import { Controller } from "ipfsd-ctl"
import { IPFSNodeManager } from "../ipfs_utils/IPFSNodeManager"
import { ensureModulesLoaded } from "./exporter"
import { startPrueba } from "./prueba"
import { createTray, tray } from "./tray"

//async anonymous function
// (async () => {
//     OrbitDBModule = await import("orbit-db")
// })()

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.js    > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.DIST_ELECTRON = join(__dirname, "../")
process.env.DIST = join(process.env.DIST_ELECTRON, "../dist")
process.env.PUBLIC = process.env.VITE_DEV_SERVER_URL
    ? join(process.env.DIST_ELECTRON, "../public")
    : process.env.DIST

// Disable GPU Acceleration for Windows 7
if (release().startsWith("6.1")) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === "win32") app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
    app.quit()
    process.exit(0)
}

// Remove electron security warnings
// This warning only shows in development mode
// Read more on https://www.electronjs.org/docs/latest/tutorial/security
process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true"

let win: BrowserWindow | null = null

// Here, you can also use other preload
const preload = join(__dirname, "../preload/index.js")
const url = process.env.VITE_DEV_SERVER_URL
const indexHtml = join(process.env.DIST, "index.html")
async function createWindow() {
    if (!tray) {
        createTray()
    }
    
    win = new BrowserWindow({
        title: "Main window",
        icon: join(process.env.PUBLIC, "assets/macOS/icons_with_background/icon_256x256@2x.png"),
        webPreferences: {
            preload,
            // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
            // Consider using contextBridge.exposeInMainWorld
            // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
            nodeIntegration: true,
            contextIsolation: false,
        },
    })

    if (url) { // electron-vite-vue#298
        win.loadURL(url)
        // Open devTool if the app is not packaged
        win.webContents.openDevTools()
    } else {
        win.loadFile(indexHtml)
    }

    // Test actively push message to the Electron-Renderer
    win.webContents.on("did-finish-load", () => {
        win?.webContents.send("main-process-message", new Date().toLocaleString())
    })

    // Make all links open with the browser, not with the application
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith("https:")) shell.openExternal(url)
        return { action: "deny" }
    })

}


if (process.platform === "darwin") {
    const ipfsharePath = join(app.getPath("home"), ".ipfshare")
    // check if it exists
    if (!fs.existsSync(ipfsharePath)) {
        fs.mkdirSync(ipfsharePath)
        // create a directory called goRepos
        fs.mkdirSync(join(ipfsharePath, "goRepos"))
        // create a directory called jsRepos
        fs.mkdirSync(join(ipfsharePath, "jsRepos"))
    }
    else {
        fs.stat(ipfsharePath, (err, stats) => {
            if (err) {
                console.log(err)
            }
            else {
                if (!stats.isDirectory()) {
                    fs.rmSync(ipfsharePath)
                    fs.mkdirSync(ipfsharePath)
                    // create a directory called goRepos
                    fs.mkdirSync(join(ipfsharePath, "goRepos"))
                    // create a directory called jsRepos
                    fs.mkdirSync(join(ipfsharePath, "jsRepos"))
                }
            }
        })
    }
    app.setPath("appData", ipfsharePath)
    console.log("Application data path: ", app.getPath("appData"))
}


let ctx: AppContext

interface AppContext {
    ipfsNodeManager: IPFSNodeManager, 
    appDataDir: string,
    ipfsNode: Controller<"go">
}


app.whenReady()
    // .then(createWindow)
    .then(ensureModulesLoaded)
    .then(startPrueba)


app.on("window-all-closed", () => {
    win = null
    app.dock.hide()  // macos
    
})

app.on("second-instance", () => {
    if (win) {
    // Focus on the main window if the user tried to open another
        if (win.isMinimized()) win.restore()
        win.focus()
    }
})

app.on("activate", () => {
    const allWindows = BrowserWindow.getAllWindows()
    if (allWindows.length) {
        allWindows[0].focus()
    } else {
        createWindow()
    }
})

// New window example arg: new windows url
ipcMain.handle("open-win", (_, arg) => {
    const childWindow = new BrowserWindow({
        webPreferences: {
            preload,
            nodeIntegration: true,
            contextIsolation: false,
        },
    })

    if (process.env.VITE_DEV_SERVER_URL) {
        childWindow.loadURL(`${url}#${arg}`)
    } else {
        childWindow.loadFile(indexHtml, { hash: arg })
    }
})


export { createWindow, ctx }

