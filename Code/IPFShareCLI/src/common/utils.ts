import { createServer } from 'net'


/**
 * Checks if a given port is in use. Tries to craete a server and bind it to the port, if successful, closes the server, meaning the specified port it's not in use.
 * @param {number} port - The port number to check.
 * @returns {Promise<boolean>} A promise that resolves to `true` if the port is in use, `false` otherwise.
 */
export const isPortInUse = async (port: number): Promise<boolean> => {
    return new Promise((resolve) => {
        const server = createServer()
            .once(`error`, () => resolve(true))
            .once(`listening`, () => {
                server.close()
                resolve(false)
            })
            .listen(port)
    })
}

