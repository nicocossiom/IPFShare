import { join } from 'path'
import { createLogger, format, transports, Logger } from 'winston';

export let logger : Logger


export const loggerCreate = () => {
    if (process.env.IPFSHARE_HOME === undefined) {
        console.log('IPFShare is not setup -> $IPFSHARE_HOME is undefined')
        process.exit(1)
    }

    const logsPath = join(process.env.IPFSHARE_HOME, 'logs')

    const { combine, timestamp, printf, splat } = format

    const errorFile = new transports.File({
        level: 'error',
        filename: join(logsPath, 'error.log')
    })

    errorFile.on('finish', () => {
        process.exit(1)
    })
    return createLogger({
        format: combine(
            timestamp(),
            splat(),
            printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
        ),
        transports: [
            new transports.Console({
                level: 'debug',
                silent: process.env.NODE_ENV === 'production'
            }),
            errorFile,
            new transports.File({
                level: 'debug',
                filename: join(logsPath, 'combined.log')
            })
        ]
    })
}

