import { daemonPromptIfNeeded, setupPromptIfNeeded } from './setup.js';
import chalk from 'chalk';
import { Command } from 'commander';
import figlet from 'figlet';
chalk.level = 3;
export const program = new Command();
program
    .version(`0.0.1`)
    .name(`ipfshare`)
    .addHelpText(`beforeAll`, `${chalk.yellow(figlet.textSync(`IPFShare`, { font: `Georgia11`, horizontalLayout: `default`, verticalLayout: `default` }))}`)
    .addHelpText(`before`, `An IPFS-based, encrypted file sharing CLI tool\n`)
    .action(async () => {
    // default action (no arguments or options specified)
    // checks if the program is setup, if not, asks the user if they want to setup
    // after setup, the user is prompted to start the daemon
    // if the daemon is not running the user is prompted to start it
    await setupPromptIfNeeded();
    await daemonPromptIfNeeded(); // checks if the daemon is running, if not it will prompt the user to start it
});
// TODO add more description
program.command(`setup`)
    .summary(`Run initial setup`)
    .description(`Runs the initial setup: 
    - Creates IPFShare home folder. This is where all files/folders program related are located
    - Generate the IPFS repository and config
    - Generates encryption keys
    - Etc.`)
    .argument(`[path]`, `Path to IPFShare home folder`, `~/.ipfshare`) // Square brackets around the argument make it optional
    .action((path) => {
    console.log(path);
});
program.command(`daemon`)
    .summary(`Start the Kubo (go-ipfs) daemon. This is a custom daemon for IPFShare. See daemon --help for more info.`)
    .description(`Starts the Kubo (go-ipfs) daemon. When no instances of the daemon are running, a new instance is spawned. Fails if an instance is already running.
    When first running the program after setup or resetup, the user is prompted to start the daemon. If no instances are running the user is prompted to start the dameon.`);
//# sourceMappingURL=cli.js.map