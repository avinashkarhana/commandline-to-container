import * as vscode from 'vscode';
import { exec } from 'child_process';
import { Configuration } from './configuration';

export class Container extends vscode.TreeItem  {
    label: string;
    containerId: string;

    constructor(context : vscode.ExtensionContext, label: string, containerId: string, collapsibleState?: vscode.TreeItemCollapsibleState) {
        super(label, collapsibleState);
        this.label = (label === 'Running Containers') ? label : `${label} (${containerId})`;
        this.containerId = containerId;
        this.collapsibleState = collapsibleState || vscode.TreeItemCollapsibleState.None;
        this.iconPath = vscode.Uri.joinPath(context.extensionUri, "resources", "container.svg");
    }

    waitForContainerToBeRunning(containerId: string, containerEngine: string): Thenable<string> {
        return new Promise((resolve, reject) => {
            const inspectCommand = `${containerEngine} inspect --format='{{.State.Status}}' ${containerId}`;
            const MAX_RETRIES = 30;
            let retries = 0;
            const interval = setInterval(() => {
                exec(inspectCommand, (error, stdout, stderr) => {
                    if (error) {
                        vscode.window.showErrorMessage(`Error: ${error.message}`);
                        reject(error);
                    } else if (stderr) {
                        vscode.window.showErrorMessage(`Error: ${stderr}`);
                        reject(new Error(stderr));
                    } else {
                        if (stdout.trim() === 'running') {
                            clearInterval(interval);
                            resolve(containerId);
                        } else {
                            retries++;
                            if (retries > MAX_RETRIES) {
                                clearInterval(interval);
                                vscode.window.showErrorMessage(`Container ${containerId} did not start within ${MAX_RETRIES} seconds`);
                                reject(new Error(`Container ${containerId} did not start within ${MAX_RETRIES} seconds`));
                            }
                        }
                    }
                });
            }, 1000);
        });
    }

    startContainer(): Thenable<string> {
        return new Promise((resolve, reject) => {
            const configuration = new Configuration();
            const command = `${configuration.getContainerEngine()} start ${this.containerId}`;
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    vscode.window.showErrorMessage(`Error: ${error.message}`);
                    reject(error);
                } else if (stderr) {
                    vscode.window.showErrorMessage(`Error: ${stderr}`);
                    reject(new Error(stderr));
                } else {
                    this.waitForContainerToBeRunning(this.containerId, configuration.getContainerEngine()).then((containerRunning) => {
                        resolve(containerRunning);
                    });
                }
            });
        });
    }

    waitForContainerToExit(containerId: string, containerEngine: string): Thenable<boolean> {
        return new Promise((resolve, reject) => {
            const inspectCommand = `${containerEngine} inspect --format='{{.State.Status}}' ${containerId}`;
            let containerExited = false;
            const MAX_RETRIES = 30;
            let retries = 0;
            const interval = setInterval(() => {
                exec(inspectCommand, (error, stdout, stderr) => {
                    if (error) {
                        vscode.window.showErrorMessage(`Error: ${error.message}`);
                        reject(error);
                    } else if (stderr) {
                        vscode.window.showErrorMessage(`Error: ${stderr}`);
                        reject(new Error(stderr));
                    } else {
                        if (stdout.trim() === 'exited') {
                            clearInterval(interval);
                            containerExited = true;
                            resolve(containerExited);
                        } else {
                            retries++;
                            if (retries > MAX_RETRIES) {
                                clearInterval(interval);
                                vscode.window.showErrorMessage(`Container ${containerId} did not exit within ${MAX_RETRIES} seconds`);
                                reject(new Error(`Container ${containerId} did not exit within ${MAX_RETRIES} seconds`));
                            }
                        }
                    }
                });
            }, 1000);
        });
    }

    exitContainer(): Thenable<boolean> {
        return new Promise((resolve, reject) => {
            const configuration = new Configuration();
            const command = `${configuration.getContainerEngine()} stop ${this.containerId}`;
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    vscode.window.showErrorMessage(`Error: ${error.message}`);
                    reject(error);
                } else if (stderr) {
                    vscode.window.showErrorMessage(`Error: ${stderr}`);
                    reject(new Error(stderr));
                } else {
                    this.waitForContainerToExit(this.containerId, configuration.getContainerEngine()).then((containerExited) => {
                        resolve(containerExited);
                    });
                }
            });
        });
    }
}
