import { Command, OptionValues } from '@commander-js/extra-typings';
declare const program: Command<[], {}>;
declare const daemonCommand: Command<[], {}>;
type CommandOptions<T extends Command<unknown[], OptionValues>> = T extends Command<unknown[], infer O> ? O : never;
type CommandArguments<T extends Command<unknown[], OptionValues>> = T extends Command<infer A, OptionValues> ? A : never;
export type DaemonCommandOptions = CommandOptions<typeof daemonCommand>;
declare const friendsCommand: Command<[], {
    add?: string[] | undefined;
    remove?: string[] | undefined;
    list?: true | undefined;
}>;
export type FriendsCommandArguments = CommandArguments<typeof friendsCommand>;
export { program };
