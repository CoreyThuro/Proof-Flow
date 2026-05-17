import type { Context } from 'probot';
type InstallationContext = Context<'installation.created'> | Context<'installation_repositories.added'>;
export declare function handleInstallation(context: InstallationContext): Promise<void>;
export {};
//# sourceMappingURL=installation.d.ts.map