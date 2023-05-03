import { initialSetup, resetup, } from './setup.js';
import { loggerCreate } from './common/logger.js';
import chalk from 'chalk';
import { Command } from 'commander';
import * as dotenv from 'dotenv';
import figlet from 'figlet';
chalk.level = 3;
dotenv.config();
export const program = new Command();
program
    .version('0.0.1')
    .addHelpText('beforeAll', `${chalk.yellow(figlet.textSync('IPFShare', { font: 'Georgia11', horizontalLayout: 'default', verticalLayout: 'default' }))}`)
    .addHelpText('before', 'An IPFS based encrypted file sharing CLI tool\n');
program.command('setup')
    .description('Rerun initial setup in case of errors or if you want to change the setup')
    .action(resetup);
async function programStart() {
    // if (process.env.NODE_ENV === 'debug') 
    await initialSetup();
    const logger = loggerCreate();
    logger.debug('Debug mode enabled');
    program.parse(process.argv);
}
export { programStart };
//# sourceMappingURL=cli.js.map