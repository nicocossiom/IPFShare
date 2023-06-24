import { logger } from '@common/logger.js'
import { relaunchAsDaemon } from '@common/utils.js'
import { IPFSNodeManager } from '@ipfs/IPFSNodeManager.js'
import chalk from 'chalk'
import fs from 'fs'
import inquirer from 'inquirer'
import ora from 'ora'
import { env } from 'process'


export async function notSetupPrompt() {
    if (!process.env.IPFSHARE_HOME) {
        console.log(chalk.yellowBright(`IPFShare is not setup`))
        // request user to run ipfshare setup
        const {answer} = await inquirer.prompt([
            {
                name: `answer`,
                type: `list`,
                choices: [`Yes`, `No`],
                message: `Would you like to setup IPFShare now?`,

            }
        ])
        if (answer === `Yes`) {
            await setupPrompt()
        } else {
            console.log(chalk.yellow(`Exiting`))
            // process.exit(1)
        }
    }
    // TODO check if the folder is valid for real for real
}


export async function setupPrompt(pathArg?: string) {
    if (pathArg)
        return setAndCreateAppDataFolder(pathArg)
    await inquirer.prompt([
        {
            name: `answer`,
            type: `input`,
            message: `Where would you like to store your IPFShare config?`,
            prefix: `📁`,
            suffix: `  ⏎ for`,
            default: `${env.HOME}/.ipfshare`
        }
    ]).catch((err) => {
        console.log(chalk.red(err))
        throw err
    }).then(async ({ answer }: { answer: string }) => {
        const spinner = ora(chalk.bold(`🔧 Setting up IPFShare in ${answer}🔧`)).start()
        // sleep for 2 seconds
        await new Promise(resolve => setTimeout(resolve, 2000))
        setTimeout(() => {
            spinner.color = `yellow`
            spinner.text = chalk.bold(`📁 Creating IPFShare home folder 📁`)
        }, 2000)
        setAndCreateAppDataFolder(answer)
        spinner.stopAndPersist({ symbol: `✅`, text: chalk.bold.greenBright(`IPFShare setup done`) })
    })
}

function setAndCreateAppDataFolder(setupPath: string) {
    if (fs.mkdirSync(setupPath, { recursive: true }) === undefined) {
        console.log(`\n` + chalk.red(`Failed to create 📁 at ${`"` + setupPath + `"`}`) + `\n`)
        console.log(chalk.yellow(`Please try again\n`))
        return
    }
    console.log(`\n` + `Created 📁 and IPFShare home set to ${chalk.italic.green(`"` + setupPath + `"`)}`)
    logger.info(`Application data path: ${setupPath}`)
    process.env.IPFSHARE_HOME = setupPath
}

export async function resetup() {
    console.log(`IPFShare has already been configured at 📁${chalk.italic.green(`"` + process.env.IPFSHARE_HOME + `"`)}`)
    await inquirer.prompt([
        {
            name: `answer`,
            type: `list`,
            choices: [`Yes`, `No`],
            message: `Would you like to re-setup IPFShare?`,
        }
    ]).then(async ({ answer }) => {
        if (answer === `Yes`) {
            console.log(`Re-setting up IPFShare`)
            setAndCreateAppDataFolder(answer)
            
        } else {
            console.log(chalk.yellow(`Exiting`))
            // process.exit(1)
        }
    })
}

export async function daemonPromptIfNeeded() {
    await notSetupPrompt() // just in case
    // check if the repo.lock file exists
   
    // check if any process is using port 5002
    if (await IPFSNodeManager.isDaemonRunning()) return
    console.log(chalk.yellowBright(`IPFS daemon is not running`))
    const { answer } = await inquirer.prompt([
        {
            name: `answer`,
            type: `list`,
            choices: [`Yes`, `No`],
            message: `Would you like to start the IPFS daemon?`,
        }
    ])
    if (answer === `Yes`) {
        console.log(chalk.bold(`🔧 Starting IPFS daemon 🔧`))
        await relaunchAsDaemon()
        console.log(`\n✅ ${chalk.greenBright(`IPFS daemon started`)}\n`)
    }
}


