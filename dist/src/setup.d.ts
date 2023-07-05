export declare function usernamePrompt(validateFn: (value: string) => Promise<boolean>): Promise<string>;
export declare function intializeConfig(): Promise<void>;
export declare function notSetupPrompt(): Promise<void>;
export declare function setupPrompt(pathArg?: string): Promise<void>;
export declare function resetup(): Promise<void>;
export declare function daemonPromptIfNeeded(): Promise<void>;
