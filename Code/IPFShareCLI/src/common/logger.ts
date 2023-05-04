import { join } from 'path'
import { addColors, createLogger, format, transports } from 'winston'


export const addLoggerFileTransportsAfterHomeSet = () => {
    if (process.env.IPFSHARE_HOME === undefined){
        console.error('Trying to setup error file transport before $IPFSHARE_HOME is defined')
        return
    }
    const logsPath = join(process.env.IPFSHARE_HOME, 'logs')
    const errorFile = new transports.File({
        level: 'error',
        filename: join(logsPath, 'error.log')
    })

    // errorFile.on('finish', () => {
    //     process.exit(1)
    // })
    const combined = new transports.File({
        level: 'debug',
        filename: join(logsPath, 'combined.log')
    })
    logger.add(errorFile)
    logger.add(combined)
}



const { combine, timestamp, printf, splat } = format

addColors({
    info: 'bold blue', // fontStyle color
    warn: 'italic yellow',
    error: 'bold red',
    debug: 'green',
})

export const logger = createLogger({
    format: combine(
        timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
        splat(),
        printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
    ),
    transports: [
        new transports.Console({
            level: 'debug',
            silent: process.env.NODE_ENV === 'production'
        }),
    ]
})
