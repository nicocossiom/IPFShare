import chalk from 'chalk';
import fs from 'fs';
import inquirer from 'inquirer';
import os from 'os';
import { join } from 'path';
import { IPFSNodeManager } from './ipfs/IPFSNodeManager.js';
export const appDir = os.homedir() + '/.ipfshare';
async function setAndCreateAppDataFolder() {
    return await inquirer.prompt([
        {
            name: 'answer',
            type: 'input',
            message: 'Where would you like to store your IPFShare config?',
            prefix: '📁',
            suffix: '  ⏎ for',
            default: '~/.ipfshare'
        }
    ]).then(async ({ answer }) => {
        if (answer === '~/.ipfshare')
            answer = appDir;
        if (fs.mkdirSync(answer, { recursive: true }) === undefined) {
            console.log('\n' + chalk.red(`Failed to create 📁 at ${'"' + answer + '"'}`) + '\n');
            console.log(chalk.yellow('Please try again\n'));
            return await setAndCreateAppDataFolder();
        }
        console.log('\n' + `Created 📁 and IPFShare home set to ${chalk.italic.green('"' + answer + '"')}`);
        // create a directory called goRepos
        fs.mkdirSync(join(appDir, 'goRepos'));
        // create a directory called jsRepos
        fs.mkdirSync(join(appDir, 'jsRepos'));
        process.env.IPFSHARE_HOME = appDir;
        console.log('Application data path: ', appDir);
    })
        .catch((err) => {
        console.log(chalk.red(err));
        throw err;
    });
}
export async function resetup() {
    console.log(`IPFShare has already been configured at 📁${chalk.italic.green('"' + process.env.IPFSHARE_HOME + '"')}`);
    await inquirer.prompt([
        {
            name: 'answer',
            type: 'list',
            choices: ['Yes', 'No'],
            message: 'Would you like to re-setup IPFShare?',
        }
    ]).then(async ({ answer }) => {
        if (answer === 'Yes') {
            console.log('Re-setting up IPFShare');
            await setAndCreateAppDataFolder;
        }
        else {
            console.log(chalk.yellow('Exiting'));
            process.exit(1);
        }
    });
}
async function checkIfSetup() {
    if (!process.env.IPFSHARE_HOME) {
        console.log(chalk.yellowBright('IPFShare is not setup'));
        // request user to run ipfshare setup
        const { answer } = await inquirer.prompt([
            {
                name: 'answer',
                type: 'list',
                choices: ['Yes', 'No'],
                message: 'Would you like to setup IPFShare now?',
            }
        ]);
        if (answer === 'Yes') {
            console.log(chalk.bold('🔧 Setting up IPFShare 🔧'));
            return false;
        }
        else {
            console.log(chalk.yellow('Exiting'));
            process.exit(1);
        }
    }
    // TODO check if the folder is valid for real for real
    return true;
}
async function startIPFSManager() {
    const manager = new IPFSNodeManager();
    const node = await manager.createNode();
    console.log(node);
}
export async function initialSetup() {
    const isSetup = await checkIfSetup();
    if (!isSetup)
        await setAndCreateAppDataFolder();
    await startIPFSManager();
    console.log('\n' + `✅ ${chalk.greenBright('IPFShare setup complete')}` + '\n');
}
//# sourceMappingURL=setup.js.map