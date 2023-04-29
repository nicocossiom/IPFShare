import react from "@vitejs/plugin-react"
import { rmSync } from "node:fs"
import path from "node:path"
import { defineConfig } from "vite"
import electron from "vite-plugin-electron"
import renderer from "vite-plugin-electron-renderer"
import pkg from "./package.json"

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
    rmSync("dist-electron", { recursive: true, force: true })

    const isServe = command === "serve"
    const isBuild = command === "build"
    const sourcemap = isServe || !!process.env.VSCODE_DEBUG
    // Retrieve the keys from dependencies and add "electron/main/exporter"
    const externalModules = [
        ...Object.keys("dependencies" in pkg ? pkg.dependencies : {}),
        // "electron/main/exporter.ts",
    ]
    return {
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "electron")
            },
        },
        envDir: "./", 
        plugins: [
            // topLevelAwait({
            //     // The export name of top-level await promise for each chunk module
            //     promiseExportName: "__tla",
            //     // The function to generate import names of top-level await promise in each chunk module
            //     promiseImportName: i => `__tla_${i}`
            // }), 
            react(),
            electron([
                {
                    // Main-Process entry file of the Electron App.
                    entry: "electron/main/index.ts",
                    onstart(options) {
                        if (process.env.VSCODE_DEBUG) {
                            console.log(/* For `.vscode/.debug.script.mjs` */"[startup] Electron App")
                        } else {
                            options.startup()
                        }
                    },
                    vite: {
                        build: {
                            target: "esnext",
                            sourcemap,
                            minify: isBuild,
                            outDir: "dist-electron/main",
                            rollupOptions: {
                                external: externalModules,
                            },
                        },
                    },
                },
                {
                    entry: "electron/preload/index.ts",
                    onstart(options) {
                        // Notify the Renderer-Process to reload the page when the Preload-Scripts build is complete, 
                        // instead of restarting the entire Electron App.
                        options.reload()
                    },
                    vite: {
                        build: {
                            target: "esnext",
                            sourcemap: sourcemap ? "inline" : undefined, // #332
                            minify: isBuild,
                            outDir: "dist-electron/preload",
                            rollupOptions: {
                                external: externalModules,
                            },
                        },
                    },
                }
            ]),
            // Use Node.js API in the Renderer-process
            renderer(),
        ],
        server: process.env.VSCODE_DEBUG && (() => {
            const url = new URL(pkg.debug.env.VITE_DEV_SERVER_URL)
            return {
                host: url.hostname,
                port: +url.port,
            }
        })(),
        clearScreen: false,
    }
})
