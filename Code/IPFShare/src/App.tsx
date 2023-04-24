console.log("[App.tsx]", `Hello world from Electron ${process.versions.electron}!`)

function App() {
    return (
        <div className='App'>
            IPFS Node Status: <span id='ipfs-status'>Loading...</span>
        </div>
    )
}

export default App
