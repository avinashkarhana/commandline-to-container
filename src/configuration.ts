import * as vscode from 'vscode';

export class Configuration {
    constructor() { }
    createConfiguration(): void {
        const configuration = vscode.workspace.getConfiguration('commandlineToContainer');
        configuration.update('containerEngine', 'docker', vscode.ConfigurationTarget.Global);
        configuration.update('shellProgram', '/bin/sh', vscode.ConfigurationTarget.Global);
    }
    getContainerEngine(): string {
        const configuration = vscode.workspace.getConfiguration('commandlineToContainer');
        return configuration.get('containerEngine') || 'docker';
    }
    getShellProgram(): string {
        const configuration = vscode.workspace.getConfiguration('commandlineToContainer');
        return configuration.get('shellProgram') || '/bin/sh';
    }
    openSettings(): void {
        vscode.commands.executeCommand('workbench.action.openSettings', 'commandlineToContainer');
    }
}
