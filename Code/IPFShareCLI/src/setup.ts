import { addLoggerFileTransportsAfterHomeSet, logger } from '@common/logger.js'
import { IPFSNodeManager } from '@ipfs/IPFSNodeManager.js'
import chalk from 'chalk'
import fs from 'fs'
import inquirer from 'inquirer'
import os from 'os'
import path from 'path'

async function setAndCreateAppDataFolder(): Promise<void> {
    return await inquirer.prompt([
        {
            name: 'answer',
            type: 'input',
            message: 'Where would you like to store your IPFShare config?',
            prefix: '📁',
            suffix: '  ⏎ for',
            default: '~/.ipfshare'
        }
    ]).catch((err) => {
        console.log(chalk.red(err))
        throw err
    }).then(async ({ answer }: { answer: string }) => {
        if (answer === '~/.ipfshare')
            answer = path.join(os.homedir(), '.ipfshare')
        if (fs.mkdirSync(answer, { recursive: true }) === undefined) {
            console.log('\n' + chalk.red(`Failed to create 📁 at ${'"' + answer + '"'}`) + '\n')
            console.log(chalk.yellow('Please try again\n'))
            return await setAndCreateAppDataFolder()
        }
        console.log('\n' + `Created 📁 and IPFShare home set to ${chalk.italic.green('"' + answer + '"')}`)
        logger.info(`dirnameee ${path.join(path.resolve(), '.env')}`)
        logger.info(`Application data path: ${answer}`)
        process.env.IPFSHARE_HOME = answer
    })
}


export async function resetup() {
    console.log(`IPFShare has already been configured at 📁${chalk.italic.green('"' + process.env.IPFSHARE_HOME + '"')}`)
    await inquirer.prompt([
        {
            name: 'answer',
            type: 'list',
            choices: ['Yes', 'No'],
            message: 'Would you like to re-setup IPFShare?',
        }
    ]).then(async ({ answer }) => {
        if (answer === 'Yes') {
            console.log('Re-setting up IPFShare')
            await setAndCreateAppDataFolder
            
        } else {
            console.log(chalk.yellow('Exiting'))
            // process.exit(1)
        }
    })
}

async function checkIfSetup() {
    if (!process.env.IPFSHARE_HOME) {
        console.log(chalk.yellowBright('IPFShare is not setup'))
        // request user to run ipfshare setup
        const {answer} = await inquirer.prompt([
            {
                name: 'answer',
                type: 'list',
                choices: ['Yes', 'No'],
                message: 'Would you like to setup IPFShare now?',

            }
        ])
        if (answer === 'Yes') {
            console.log(chalk.bold('🔧 Setting up IPFShare 🔧'))
            return false

        } else {
            console.log(chalk.yellow('Exiting'))
            // process.exit(1)
        }
    }
    // TODO check if the folder is valid for real for real
    return true
}

async function startIPFSManager() {
    const manager = new IPFSNodeManager()
    return await manager.createNode()
}

export async function initialSetup() {
    let isSetup = await checkIfSetup()
    if (!isSetup) {
        await setAndCreateAppDataFolder()
    }
    if (!process.env.IPFSHARE_HOME)
        throw new Error('IPFShare home not set')
    addLoggerFileTransportsAfterHomeSet()
    const node = await startIPFSManager()
    if (!isSetup) console.log('\n' + `✅ ${chalk.greenBright('IPFShare setup complete')}` + '\n')
    isSetup = true
    // relaunch this process
    return node
}

