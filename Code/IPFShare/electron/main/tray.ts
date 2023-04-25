import { Menu, Tray, app, nativeImage } from "electron"
import { join } from "path"
import { createWindow } from "./index"


let tray : null| Tray =  null
function createTray() {
    const iconPath = join(process.env.PUBLIC, "assets/macOS/icons_without_background/trayIcon.png")
    const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 32, height: 32 })
    tray = new Tray(trayIcon)
    const contextMenu = Menu.buildFromTemplate([
        {
            label: "Show App",
            click: () => {
                createWindow()
            }
        },
        {
            label: "Quit",
            click: () => {
                app.quit() // actually quit the app.
            }
        },
    ])
    tray.setToolTip("This is my application.")
    tray.setContextMenu(contextMenu)
}

export { tray, createTray }
