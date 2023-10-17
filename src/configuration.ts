import * as vscode from 'vscode';

export class Configuration {
    constructor() { }
    getContainerEngine(): string {
        const configuration = vscode.workspace.getConfiguration('commandlineToContainer');
        return configuration.get('containerEngine') || 'docker';
    }
    getShellProgram(): string {
        const configuration = vscode.workspace.getConfiguration('commandlineToContainer');
        return configuration.get('shellProgram') || '/bin/sh';
    }
}
